import { db } from "../../db";
import { dailyStats, clicks, conversions, offers } from "@shared/schema";
import { sql, eq, and, gte, lte } from "drizzle-orm";

interface AggregationResult {
  processedDates: string[];
  rowsUpserted: number;
  errors: string[];
}

class AggregationService {
  private isRunning = false;
  private lastRun: Date | null = null;

  async runDailyAggregation(targetDate?: string): Promise<AggregationResult> {
    if (this.isRunning) {
      return { processedDates: [], rowsUpserted: 0, errors: ["Aggregation already in progress"] };
    }

    this.isRunning = true;
    const result: AggregationResult = { processedDates: [], rowsUpserted: 0, errors: [] };

    try {
      const dateToProcess = targetDate || this.getYesterdayDate();
      await this.aggregateDate(dateToProcess, result);
      this.lastRun = new Date();
    } catch (error) {
      result.errors.push(`Aggregation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  async backfill(startDate: string, endDate: string): Promise<AggregationResult> {
    if (this.isRunning) {
      return { processedDates: [], rowsUpserted: 0, errors: ["Aggregation already in progress"] };
    }

    this.isRunning = true;
    const result: AggregationResult = { processedDates: [], rowsUpserted: 0, errors: [] };

    try {
      const dates = this.getDateRange(startDate, endDate);
      
      for (const date of dates) {
        await this.aggregateDate(date, result);
      }
      
      this.lastRun = new Date();
    } catch (error) {
      result.errors.push(`Backfill failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  private async aggregateDate(dateStr: string, result: AggregationResult): Promise<void> {
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const clickAggregates = await db.select({
      advertiserId: offers.advertiserId,
      publisherId: clicks.publisherId,
      offerId: clicks.offerId,
      geo: clicks.geo,
      clicks: sql<number>`count(*)::int`,
      uniqueClicks: sql<number>`count(DISTINCT ${clicks.ip})::int`,
    })
    .from(clicks)
    .innerJoin(offers, eq(clicks.offerId, offers.id))
    .where(
      and(
        gte(clicks.createdAt, startOfDay),
        lte(clicks.createdAt, endOfDay)
      )
    )
    .groupBy(offers.advertiserId, clicks.publisherId, clicks.offerId, clicks.geo);

    const convAggregates = await db.select({
      advertiserId: offers.advertiserId,
      publisherId: conversions.publisherId,
      offerId: conversions.offerId,
      geo: clicks.geo,
      conversions: sql<number>`count(*)::int`,
      approvedConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved')::int`,
      rejectedConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'rejected')::int`,
      leads: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'lead')::int`,
      sales: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'sale')::int`,
      payout: sql<number>`COALESCE(sum(${conversions.publisherPayout}::numeric), 0)::float`,
      cost: sql<number>`COALESCE(sum(${conversions.advertiserCost}::numeric), 0)::float`,
    })
    .from(conversions)
    .innerJoin(offers, eq(conversions.offerId, offers.id))
    .leftJoin(clicks, eq(conversions.clickId, clicks.id))
    .where(
      and(
        gte(conversions.createdAt, startOfDay),
        lte(conversions.createdAt, endOfDay)
      )
    )
    .groupBy(offers.advertiserId, conversions.publisherId, conversions.offerId, clicks.geo);

    const mergedData = this.mergeClicksAndConversions(dateStr, clickAggregates, convAggregates);

    for (const row of mergedData) {
      await this.upsertDailyStat(row);
      result.rowsUpserted++;
    }

    result.processedDates.push(dateStr);
  }

  private mergeClicksAndConversions(
    date: string,
    clickData: any[],
    convData: any[]
  ): any[] {
    const merged = new Map<string, any>();

    for (const c of clickData) {
      const key = `${c.advertiserId || ''}|${c.publisherId || ''}|${c.offerId || ''}|${c.geo || ''}`;
      merged.set(key, {
        date,
        advertiserId: c.advertiserId,
        publisherId: c.publisherId,
        offerId: c.offerId,
        geo: c.geo,
        clicks: c.clicks,
        uniqueClicks: c.uniqueClicks,
        conversions: 0,
        approvedConversions: 0,
        rejectedConversions: 0,
        leads: 0,
        sales: 0,
        payout: 0,
        cost: 0,
      });
    }

    for (const c of convData) {
      const key = `${c.advertiserId || ''}|${c.publisherId || ''}|${c.offerId || ''}|${c.geo || ''}`;
      const existing = merged.get(key);
      
      if (existing) {
        existing.conversions = c.conversions;
        existing.approvedConversions = c.approvedConversions;
        existing.rejectedConversions = c.rejectedConversions;
        existing.leads = c.leads;
        existing.sales = c.sales;
        existing.payout = c.payout;
        existing.cost = c.cost;
      } else {
        merged.set(key, {
          date,
          advertiserId: c.advertiserId,
          publisherId: c.publisherId,
          offerId: c.offerId,
          geo: c.geo,
          clicks: 0,
          uniqueClicks: 0,
          conversions: c.conversions,
          approvedConversions: c.approvedConversions,
          rejectedConversions: c.rejectedConversions,
          leads: c.leads,
          sales: c.sales,
          payout: c.payout,
          cost: c.cost,
        });
      }
    }

    return Array.from(merged.values());
  }

  private async upsertDailyStat(row: any): Promise<void> {
    const advertiserId = row.advertiserId || '';
    const publisherId = row.publisherId || '';
    const offerId = row.offerId || '';
    const geo = row.geo || '';
    
    await db.execute(sql`
      INSERT INTO daily_stats (
        id, date, advertiser_id, publisher_id, offer_id, geo,
        clicks, unique_clicks, conversions, approved_conversions, rejected_conversions,
        leads, sales, payout, cost, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${row.date},
        ${advertiserId},
        ${publisherId},
        ${offerId},
        ${geo},
        ${row.clicks},
        ${row.uniqueClicks},
        ${row.conversions},
        ${row.approvedConversions},
        ${row.rejectedConversions},
        ${row.leads},
        ${row.sales},
        ${row.payout},
        ${row.cost},
        NOW()
      )
      ON CONFLICT (date, advertiser_id, publisher_id, offer_id, geo)
      DO UPDATE SET
        clicks = EXCLUDED.clicks,
        unique_clicks = EXCLUDED.unique_clicks,
        conversions = EXCLUDED.conversions,
        approved_conversions = EXCLUDED.approved_conversions,
        rejected_conversions = EXCLUDED.rejected_conversions,
        leads = EXCLUDED.leads,
        sales = EXCLUDED.sales,
        payout = EXCLUDED.payout,
        cost = EXCLUDED.cost,
        updated_at = NOW()
    `);
  }

  private getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  getStatus(): { isRunning: boolean; lastRun: Date | null } {
    return { isRunning: this.isRunning, lastRun: this.lastRun };
  }
}

export const aggregationService = new AggregationService();
