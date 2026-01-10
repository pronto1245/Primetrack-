import { db } from "../../db";
import { playerSessions, offers, payouts, users } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

interface FinanceSummary {
  revenue: number;
  payouts: number;
  profit: number;
  roiPercent: number;
  totalFtd: number;
  totalRepeatDeposits: number;
  avgDepositAmount: number;
}

interface TrendPoint {
  periodStart: string;
  revenue: number;
  payouts: number;
  profit: number;
}

interface OfferBreakdown {
  offerId: string;
  offerName: string;
  revenue: number;
  payouts: number;
  profit: number;
  roiPercent: number;
  ftdCount: number;
}

interface PublisherBreakdown {
  publisherId: string;
  publisherName: string;
  revenue: number;
  payouts: number;
  profit: number;
  roiPercent: number;
  ftdCount: number;
}

export interface FinanceAnalytics {
  summary: FinanceSummary;
  trend: TrendPoint[];
  offerBreakdown: OfferBreakdown[];
  publisherBreakdown: PublisherBreakdown[];
  currency: string;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    interval: string;
  };
}

interface AnalyticsFilters {
  advertiserId: string;
  dateFrom?: Date;
  dateTo?: Date;
  interval?: "day" | "week" | "month";
}

export class AdvertiserFinanceService {
  async getAnalytics(filters: AnalyticsFilters): Promise<FinanceAnalytics> {
    const { advertiserId, dateFrom, dateTo, interval = "day" } = filters;
    
    const [summary, trend, offerBreakdown, publisherBreakdown] = await Promise.all([
      this.getSummary(advertiserId, dateFrom, dateTo),
      this.getTrend(advertiserId, dateFrom, dateTo, interval),
      this.getOfferBreakdown(advertiserId, dateFrom, dateTo),
      this.getPublisherBreakdown(advertiserId, dateFrom, dateTo),
    ]);
    
    return {
      summary,
      trend,
      offerBreakdown,
      publisherBreakdown,
      currency: "USD",
      filters: {
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        interval,
      },
    };
  }
  
  private async getSummary(advertiserId: string, dateFrom?: Date, dateTo?: Date): Promise<FinanceSummary> {
    const conditions: any[] = [eq(offers.advertiserId, advertiserId)];
    if (dateFrom) conditions.push(sql`COALESCE(${playerSessions.ftdAt}, ${playerSessions.clickAt}) >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`COALESCE(${playerSessions.ftdAt}, ${playerSessions.clickAt}) <= ${dateTo}`);
    
    const revenueResult = await db.select({
      totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${playerSessions.hasFtd} THEN ${playerSessions.ftdAmount}::numeric ELSE 0 END), 0)`,
      totalDeposits: sql<string>`COALESCE(SUM(${playerSessions.totalDeposits}::numeric), 0)`,
      ftdCount: sql<number>`COUNT(CASE WHEN ${playerSessions.hasFtd} THEN 1 END)::int`,
      repeatCount: sql<number>`COUNT(CASE WHEN ${playerSessions.hasRepeatDeposit} THEN 1 END)::int`,
    })
    .from(playerSessions)
    .innerJoin(offers, eq(playerSessions.offerId, offers.id))
    .where(and(...conditions));
    
    const payoutConditions: any[] = [eq(payouts.advertiserId, advertiserId)];
    if (dateFrom) payoutConditions.push(gte(payouts.createdAt, dateFrom));
    if (dateTo) payoutConditions.push(lte(payouts.createdAt, dateTo));
    payoutConditions.push(sql`${payouts.status} IN ('approved', 'paid', 'completed')`);
    
    const payoutResult = await db.select({
      totalPayouts: sql<string>`COALESCE(SUM(${payouts.amount}::numeric), 0)`,
    })
    .from(payouts)
    .where(and(...payoutConditions));
    
    const revenue = parseFloat(revenueResult[0]?.totalRevenue || "0");
    const totalDeposits = parseFloat(revenueResult[0]?.totalDeposits || "0");
    const payoutsTotal = parseFloat(payoutResult[0]?.totalPayouts || "0");
    const ftdCount = revenueResult[0]?.ftdCount || 0;
    const repeatCount = revenueResult[0]?.repeatCount || 0;
    
    const actualRevenue = totalDeposits > 0 ? totalDeposits : revenue;
    const profit = actualRevenue - payoutsTotal;
    const roiPercent = payoutsTotal > 0 ? (profit / payoutsTotal) * 100 : 0;
    const avgDeposit = ftdCount > 0 ? actualRevenue / ftdCount : 0;
    
    return {
      revenue: actualRevenue,
      payouts: payoutsTotal,
      profit,
      roiPercent,
      totalFtd: ftdCount,
      totalRepeatDeposits: repeatCount,
      avgDepositAmount: avgDeposit,
    };
  }
  
  private async getTrend(
    advertiserId: string, 
    dateFrom?: Date, 
    dateTo?: Date, 
    interval: "day" | "week" | "month" = "day"
  ): Promise<TrendPoint[]> {
    const truncFunc = interval === "month" ? "month" : interval === "week" ? "week" : "day";
    const activityDate = sql`COALESCE(${playerSessions.ftdAt}, ${playerSessions.clickAt})`;
    
    const conditions: any[] = [eq(offers.advertiserId, advertiserId)];
    if (dateFrom) conditions.push(sql`${activityDate} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${activityDate} <= ${dateTo}`);
    
    const revenueByPeriod = await db.select({
      period: sql<string>`DATE_TRUNC('${sql.raw(truncFunc)}', ${activityDate})::date::text`,
      ftdRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${playerSessions.hasFtd} THEN ${playerSessions.ftdAmount}::numeric ELSE 0 END), 0)`,
      totalDeposits: sql<string>`COALESCE(SUM(${playerSessions.totalDeposits}::numeric), 0)`,
    })
    .from(playerSessions)
    .innerJoin(offers, eq(playerSessions.offerId, offers.id))
    .where(and(...conditions))
    .groupBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${activityDate})`)
    .orderBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${activityDate})`);
    
    const payoutConditions: any[] = [eq(payouts.advertiserId, advertiserId)];
    if (dateFrom) payoutConditions.push(gte(payouts.createdAt, dateFrom));
    if (dateTo) payoutConditions.push(lte(payouts.createdAt, dateTo));
    payoutConditions.push(sql`${payouts.status} IN ('approved', 'paid', 'completed')`);
    
    const payoutsByPeriod = await db.select({
      period: sql<string>`DATE_TRUNC('${sql.raw(truncFunc)}', ${payouts.createdAt})::date::text`,
      payouts: sql<string>`COALESCE(SUM(${payouts.amount}::numeric), 0)`,
    })
    .from(payouts)
    .where(and(...payoutConditions))
    .groupBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${payouts.createdAt})`)
    .orderBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${payouts.createdAt})`);
    
    const payoutsMap = new Map(payoutsByPeriod.map(p => [p.period, parseFloat(p.payouts)]));
    
    return revenueByPeriod.map(r => {
      const ftdRevenue = parseFloat(r.ftdRevenue);
      const totalDeposits = parseFloat(r.totalDeposits);
      const revenue = totalDeposits > 0 ? totalDeposits : ftdRevenue;
      const payout = payoutsMap.get(r.period) || 0;
      return {
        periodStart: r.period,
        revenue,
        payouts: payout,
        profit: revenue - payout,
      };
    });
  }
  
  private async getOfferBreakdown(advertiserId: string, dateFrom?: Date, dateTo?: Date): Promise<OfferBreakdown[]> {
    const activityDate = sql`COALESCE(${playerSessions.ftdAt}, ${playerSessions.clickAt})`;
    const conditions: any[] = [eq(offers.advertiserId, advertiserId)];
    if (dateFrom) conditions.push(sql`${activityDate} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${activityDate} <= ${dateTo}`);
    
    const revenueByOffer = await db.select({
      offerId: offers.id,
      offerName: offers.name,
      ftdRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${playerSessions.hasFtd} THEN ${playerSessions.ftdAmount}::numeric ELSE 0 END), 0)`,
      totalDeposits: sql<string>`COALESCE(SUM(${playerSessions.totalDeposits}::numeric), 0)`,
      ftdCount: sql<number>`COUNT(CASE WHEN ${playerSessions.hasFtd} THEN 1 END)::int`,
    })
    .from(playerSessions)
    .innerJoin(offers, eq(playerSessions.offerId, offers.id))
    .where(and(...conditions))
    .groupBy(offers.id, offers.name);
    
    return revenueByOffer.map(r => {
      const ftdRevenue = parseFloat(r.ftdRevenue);
      const totalDeposits = parseFloat(r.totalDeposits);
      const revenue = totalDeposits > 0 ? totalDeposits : ftdRevenue;
      return {
        offerId: r.offerId,
        offerName: r.offerName,
        revenue,
        payouts: 0,
        profit: revenue,
        roiPercent: 0,
        ftdCount: r.ftdCount,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }
  
  private async getPublisherBreakdown(advertiserId: string, dateFrom?: Date, dateTo?: Date): Promise<PublisherBreakdown[]> {
    const activityDate = sql`COALESCE(${playerSessions.ftdAt}, ${playerSessions.clickAt})`;
    const conditions: any[] = [eq(offers.advertiserId, advertiserId)];
    if (dateFrom) conditions.push(sql`${activityDate} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${activityDate} <= ${dateTo}`);
    
    const revenueByPublisher = await db.select({
      publisherId: playerSessions.publisherId,
      ftdRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${playerSessions.hasFtd} THEN ${playerSessions.ftdAmount}::numeric ELSE 0 END), 0)`,
      totalDeposits: sql<string>`COALESCE(SUM(${playerSessions.totalDeposits}::numeric), 0)`,
      ftdCount: sql<number>`COUNT(CASE WHEN ${playerSessions.hasFtd} THEN 1 END)::int`,
    })
    .from(playerSessions)
    .innerJoin(offers, eq(playerSessions.offerId, offers.id))
    .where(and(...conditions))
    .groupBy(playerSessions.publisherId);
    
    const publisherIds = revenueByPublisher.map(r => r.publisherId).filter(Boolean);
    const publisherNames = new Map<string, string>();
    
    if (publisherIds.length > 0) {
      const publishers = await db.select({ id: users.id, username: users.username, companyName: users.companyName })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(publisherIds.map(id => sql`${id}`), sql`, `)})`);
      publishers.forEach(p => publisherNames.set(p.id, p.companyName || p.username));
    }
    
    const payoutConditions: any[] = [eq(payouts.advertiserId, advertiserId)];
    if (dateFrom) payoutConditions.push(gte(payouts.createdAt, dateFrom));
    if (dateTo) payoutConditions.push(lte(payouts.createdAt, dateTo));
    payoutConditions.push(sql`${payouts.status} IN ('approved', 'paid', 'completed')`);
    
    const payoutsByPublisher = await db.select({
      publisherId: payouts.publisherId,
      payouts: sql<string>`COALESCE(SUM(${payouts.amount}::numeric), 0)`,
    })
    .from(payouts)
    .where(and(...payoutConditions))
    .groupBy(payouts.publisherId);
    
    const payoutsMap = new Map(payoutsByPublisher.map(p => [p.publisherId, parseFloat(p.payouts)]));
    
    return revenueByPublisher
      .filter(r => r.publisherId)
      .map(r => {
        const ftdRevenue = parseFloat(r.ftdRevenue);
        const totalDeposits = parseFloat(r.totalDeposits);
        const revenue = totalDeposits > 0 ? totalDeposits : ftdRevenue;
        const payout = payoutsMap.get(r.publisherId!) || 0;
        const profit = revenue - payout;
        return {
          publisherId: r.publisherId!,
          publisherName: publisherNames.get(r.publisherId!) || r.publisherId!,
          revenue,
          payouts: payout,
          profit,
          roiPercent: payout > 0 ? (profit / payout) * 100 : 0,
          ftdCount: r.ftdCount,
        };
      }).sort((a, b) => b.revenue - a.revenue);
  }
}

export const advertiserFinanceService = new AdvertiserFinanceService();
