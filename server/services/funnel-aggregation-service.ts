import { db } from "../../db";
import { playerSessions, offers } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

interface FunnelStage {
  name: string;
  count: number;
  percent: number;
  dropoff: number;
}

interface FunnelData {
  stages: FunnelStage[];
  totalClicks: number;
  totalRegistrations: number;
  totalFtd: number;
  totalRepeatDeposits: number;
  conversionRates: {
    clickToReg: number;
    regToFtd: number;
    ftdToRepeat: number;
    clickToFtd: number;
  };
}

interface FunnelFilters {
  offerId?: string;
  publisherId?: string;
  advertiserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class FunnelAggregationService {
  async getFunnelData(filters: FunnelFilters): Promise<FunnelData> {
    const conditions: any[] = [];
    
    // CRITICAL: Always filter by advertiserId via offers join for tenant isolation
    if (filters.advertiserId) {
      conditions.push(eq(offers.advertiserId, filters.advertiserId));
    }
    if (filters.offerId) {
      conditions.push(eq(playerSessions.offerId, filters.offerId));
    }
    if (filters.publisherId) {
      conditions.push(eq(playerSessions.publisherId, filters.publisherId));
    }
    if (filters.dateFrom) {
      conditions.push(gte(playerSessions.clickAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(playerSessions.clickAt, filters.dateTo));
    }
    
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    const result = await db.select({
      totalClicks: sql<number>`count(*)::int`,
      totalRegistrations: sql<number>`sum(case when ${playerSessions.hasRegistration} = true then 1 else 0 end)::int`,
      totalFtd: sql<number>`sum(case when ${playerSessions.hasFtd} = true then 1 else 0 end)::int`,
      totalRepeatDeposits: sql<number>`sum(case when ${playerSessions.hasRepeatDeposit} = true then 1 else 0 end)::int`,
    })
    .from(playerSessions)
    .innerJoin(offers, eq(playerSessions.offerId, offers.id))
    .where(whereCondition);
    
    const row = result[0] || { totalClicks: 0, totalRegistrations: 0, totalFtd: 0, totalRepeatDeposits: 0 };
    const totalClicks = row.totalClicks || 0;
    const totalRegistrations = row.totalRegistrations || 0;
    const totalFtd = row.totalFtd || 0;
    const totalRepeatDeposits = row.totalRepeatDeposits || 0;
    
    const stages: FunnelStage[] = [
      {
        name: "Клики",
        count: totalClicks,
        percent: 100,
        dropoff: 0,
      },
      {
        name: "Регистрации",
        count: totalRegistrations,
        percent: totalClicks > 0 ? (totalRegistrations / totalClicks) * 100 : 0,
        dropoff: totalClicks > 0 ? ((totalClicks - totalRegistrations) / totalClicks) * 100 : 0,
      },
      {
        name: "FTD",
        count: totalFtd,
        percent: totalClicks > 0 ? (totalFtd / totalClicks) * 100 : 0,
        dropoff: totalRegistrations > 0 ? ((totalRegistrations - totalFtd) / totalRegistrations) * 100 : 0,
      },
      {
        name: "Повторные депозиты",
        count: totalRepeatDeposits,
        percent: totalClicks > 0 ? (totalRepeatDeposits / totalClicks) * 100 : 0,
        dropoff: totalFtd > 0 ? ((totalFtd - totalRepeatDeposits) / totalFtd) * 100 : 0,
      },
    ];
    
    const conversionRates = {
      clickToReg: totalClicks > 0 ? (totalRegistrations / totalClicks) * 100 : 0,
      regToFtd: totalRegistrations > 0 ? (totalFtd / totalRegistrations) * 100 : 0,
      ftdToRepeat: totalFtd > 0 ? (totalRepeatDeposits / totalFtd) * 100 : 0,
      clickToFtd: totalClicks > 0 ? (totalFtd / totalClicks) * 100 : 0,
    };
    
    return {
      stages,
      totalClicks,
      totalRegistrations,
      totalFtd,
      totalRepeatDeposits,
      conversionRates,
    };
  }
  
  async getFunnelByOffer(advertiserId: string, dateFrom?: Date, dateTo?: Date): Promise<Array<{
    offerId: string;
    offerName: string;
    funnel: FunnelData;
  }>> {
    const conditions: any[] = [eq(offers.advertiserId, advertiserId)];
    
    if (dateFrom) {
      conditions.push(gte(playerSessions.clickAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(playerSessions.clickAt, dateTo));
    }
    
    const result = await db.select({
      offerId: playerSessions.offerId,
      offerName: offers.name,
      totalClicks: sql<number>`count(*)::int`,
      totalRegistrations: sql<number>`sum(case when ${playerSessions.hasRegistration} = true then 1 else 0 end)::int`,
      totalFtd: sql<number>`sum(case when ${playerSessions.hasFtd} = true then 1 else 0 end)::int`,
      totalRepeatDeposits: sql<number>`sum(case when ${playerSessions.hasRepeatDeposit} = true then 1 else 0 end)::int`,
    })
    .from(playerSessions)
    .innerJoin(offers, eq(playerSessions.offerId, offers.id))
    .where(and(...conditions))
    .groupBy(playerSessions.offerId, offers.name)
    .orderBy(sql`count(*) desc`);
    
    return result.map((row) => {
      const totalClicks = row.totalClicks || 0;
      const totalRegistrations = row.totalRegistrations || 0;
      const totalFtd = row.totalFtd || 0;
      const totalRepeatDeposits = row.totalRepeatDeposits || 0;
      
      return {
        offerId: row.offerId,
        offerName: row.offerName,
        funnel: {
          stages: [
            { name: "Клики", count: totalClicks, percent: 100, dropoff: 0 },
            { name: "Регистрации", count: totalRegistrations, percent: totalClicks > 0 ? (totalRegistrations / totalClicks) * 100 : 0, dropoff: totalClicks > 0 ? ((totalClicks - totalRegistrations) / totalClicks) * 100 : 0 },
            { name: "FTD", count: totalFtd, percent: totalClicks > 0 ? (totalFtd / totalClicks) * 100 : 0, dropoff: totalRegistrations > 0 ? ((totalRegistrations - totalFtd) / totalRegistrations) * 100 : 0 },
            { name: "Повторные депозиты", count: totalRepeatDeposits, percent: totalClicks > 0 ? (totalRepeatDeposits / totalClicks) * 100 : 0, dropoff: totalFtd > 0 ? ((totalFtd - totalRepeatDeposits) / totalFtd) * 100 : 0 },
          ],
          totalClicks,
          totalRegistrations,
          totalFtd,
          totalRepeatDeposits,
          conversionRates: {
            clickToReg: totalClicks > 0 ? (totalRegistrations / totalClicks) * 100 : 0,
            regToFtd: totalRegistrations > 0 ? (totalFtd / totalRegistrations) * 100 : 0,
            ftdToRepeat: totalFtd > 0 ? (totalRepeatDeposits / totalFtd) * 100 : 0,
            clickToFtd: totalClicks > 0 ? (totalFtd / totalClicks) * 100 : 0,
          },
        },
      };
    });
  }
  
  async updatePlayerSessionFromConversion(
    clickId: string | null,
    playerId: string | null,
    offerId: string,
    publisherId: string,
    eventType: string,
    amount?: number
  ): Promise<void> {
    if (!clickId && !playerId) {
      console.log("Cannot update player session: no clickId or playerId");
      return;
    }
    
    const existingConditions: any[] = [];
    if (clickId) {
      existingConditions.push(eq(playerSessions.clickId, clickId));
    } else if (playerId) {
      existingConditions.push(eq(playerSessions.playerId, playerId));
      existingConditions.push(eq(playerSessions.offerId, offerId));
    }
    
    const existingSession = await db.select({ id: playerSessions.id, hasFtd: playerSessions.hasFtd })
      .from(playerSessions)
      .where(and(...existingConditions))
      .limit(1);
    
    if (existingSession.length === 0) {
      await db.insert(playerSessions).values({
        offerId,
        publisherId,
        clickId: clickId || undefined,
        playerId: playerId || undefined,
        hasClick: true,
        clickAt: new Date(),
      });
    }
    
    const updateData: any = { updatedAt: new Date() };
    
    switch (eventType) {
      case "lead":
      case "registration":
        updateData.hasRegistration = true;
        updateData.registrationAt = sql`COALESCE(${playerSessions.registrationAt}, NOW())`;
        break;
      case "sale":
      case "ftd":
      case "deposit":
        if (amount) {
          const isFirstDeposit = existingSession.length === 0 || !existingSession[0].hasFtd;
          if (isFirstDeposit) {
            updateData.hasFtd = true;
            updateData.ftdAt = sql`COALESCE(${playerSessions.ftdAt}, NOW())`;
            updateData.ftdAmount = amount.toString();
          } else {
            updateData.hasRepeatDeposit = true;
            updateData.repeatDepositAt = new Date();
          }
          updateData.totalDeposits = sql`COALESCE(${playerSessions.totalDeposits}, 0) + ${amount}`;
          updateData.depositCount = sql`${playerSessions.depositCount} + 1`;
        }
        break;
    }
    
    await db.update(playerSessions)
      .set(updateData)
      .where(and(...existingConditions));
  }
}

export const funnelAggregationService = new FunnelAggregationService();
