import { storage } from "../storage";
import { db } from "../../db";
import { eq, and, sql } from "drizzle-orm";
import { velocityCounters, conversionFingerprints, publisherStatsCache } from "@shared/schema";
import type { AntifraudRule, InsertAntifraudLog } from "@shared/schema";
import crypto from "crypto";

export interface FraudSignals {
  ip?: string;
  userAgent?: string;
  country?: string;
  fingerprint?: string;
  isProxy: boolean;
  isVpn: boolean;
  isBot: boolean;
  isDatacenter: boolean;
  fraudScore: number;
  signals: string[];
}

export interface VelocityCheck {
  ipClicksMinute: number;
  ipClicksHour: number;
  ipClicksDay: number;
  fingerprintClicksHour: number;
  publisherClicksMinute: number;
}

export interface FraudEvaluation {
  action: "allow" | "block" | "hold" | "flag" | "reject";
  fraudScore: number;
  matchedRules: AntifraudRule[];
  signals: FraudSignals;
  velocityData?: VelocityCheck;
}

export class AntiFraudService {
  private rulesCache: Map<string, { rules: AntifraudRule[]; timestamp: number }> = new Map();
  private cacheTimeout = 60000;

  async evaluateClick(
    offerId: string,
    advertiserId: string,
    publisherId: string,
    signals: FraudSignals
  ): Promise<FraudEvaluation> {
    const rules = await this.getActiveRules(advertiserId);
    const matchedRules: AntifraudRule[] = [];
    let finalAction: "allow" | "block" | "hold" | "flag" | "reject" = "allow";

    const velocityData = await this.checkVelocity(
      signals.ip || "",
      signals.fingerprint || "",
      publisherId,
      advertiserId,
      offerId
    );

    this.addVelocitySignals(signals, velocityData, rules);

    for (const rule of rules) {
      if (!rule.isActive) continue;

      const isMatched = this.evaluateRule(rule, signals, velocityData);
      if (isMatched) {
        matchedRules.push(rule);
        const ruleAction = rule.action as typeof finalAction;
        finalAction = this.getPriorityAction(finalAction, ruleAction);
      }
    }

    await this.incrementVelocityCounters(
      signals.ip || "",
      signals.fingerprint || "",
      publisherId,
      advertiserId,
      offerId
    );

    return {
      action: finalAction,
      fraudScore: signals.fraudScore,
      matchedRules,
      signals,
      velocityData
    };
  }

  async checkDuplicateConversion(
    offerId: string,
    advertiserId: string,
    publisherId: string,
    email?: string,
    phone?: string,
    transactionId?: string,
    deviceFingerprint?: string
  ): Promise<{ isDuplicate: boolean; duplicateType?: string; originalConversionId?: string }> {
    const emailHash = email ? this.hashValue(email.toLowerCase().trim()) : null;
    const phoneHash = phone ? this.hashValue(phone.replace(/\D/g, '')) : null;

    if (transactionId) {
      const existing = await db.select()
        .from(conversionFingerprints)
        .where(and(
          eq(conversionFingerprints.offerId, offerId),
          eq(conversionFingerprints.transactionId, transactionId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return { isDuplicate: true, duplicateType: "transaction_id", originalConversionId: existing[0].conversionId || undefined };
      }
    }

    if (emailHash) {
      const existing = await db.select()
        .from(conversionFingerprints)
        .where(and(
          eq(conversionFingerprints.offerId, offerId),
          eq(conversionFingerprints.emailHash, emailHash)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return { isDuplicate: true, duplicateType: "email", originalConversionId: existing[0].conversionId || undefined };
      }
    }

    if (phoneHash) {
      const existing = await db.select()
        .from(conversionFingerprints)
        .where(and(
          eq(conversionFingerprints.offerId, offerId),
          eq(conversionFingerprints.phoneHash, phoneHash)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return { isDuplicate: true, duplicateType: "phone", originalConversionId: existing[0].conversionId || undefined };
      }
    }

    if (deviceFingerprint) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await db.select()
        .from(conversionFingerprints)
        .where(and(
          eq(conversionFingerprints.offerId, offerId),
          eq(conversionFingerprints.deviceFingerprint, deviceFingerprint),
          sql`${conversionFingerprints.createdAt} > ${oneDayAgo}`
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return { isDuplicate: true, duplicateType: "device_fingerprint", originalConversionId: existing[0].conversionId || undefined };
      }
    }

    return { isDuplicate: false };
  }

  async saveConversionFingerprint(
    offerId: string,
    advertiserId: string,
    publisherId: string,
    conversionId: string,
    clickId?: string,
    email?: string,
    phone?: string,
    transactionId?: string,
    deviceFingerprint?: string
  ): Promise<void> {
    const emailHash = email ? this.hashValue(email.toLowerCase().trim()) : null;
    const phoneHash = phone ? this.hashValue(phone.replace(/\D/g, '')) : null;

    await db.insert(conversionFingerprints).values({
      offerId,
      advertiserId,
      publisherId,
      conversionId,
      clickId,
      emailHash,
      phoneHash,
      transactionId,
      deviceFingerprint
    });
  }

  async checkPublisherAnomaly(
    publisherId: string,
    advertiserId?: string,
    offerId?: string
  ): Promise<{ isCrAnomaly: boolean; isArAnomaly: boolean; currentCr?: number; baselineCr?: number }> {
    const conditions: any[] = [eq(publisherStatsCache.publisherId, publisherId)];
    if (advertiserId) conditions.push(eq(publisherStatsCache.advertiserId, advertiserId));
    if (offerId) conditions.push(eq(publisherStatsCache.offerId, offerId));

    const stats = await db.select()
      .from(publisherStatsCache)
      .where(and(...conditions))
      .limit(1);

    if (stats.length === 0) {
      return { isCrAnomaly: false, isArAnomaly: false };
    }

    const stat = stats[0];
    return {
      isCrAnomaly: stat.isCrAnomaly || false,
      isArAnomaly: stat.isArAnomaly || false,
      currentCr: stat.conversionRate ? parseFloat(stat.conversionRate) : undefined,
      baselineCr: stat.baselineCr ? parseFloat(stat.baselineCr) : undefined
    };
  }

  async updatePublisherStats(
    publisherId: string,
    advertiserId: string,
    offerId: string,
    eventType: "click" | "conversion" | "approved" | "rejected"
  ): Promise<void> {
    const existing = await db.select()
      .from(publisherStatsCache)
      .where(and(
        eq(publisherStatsCache.publisherId, publisherId),
        eq(publisherStatsCache.advertiserId, advertiserId),
        eq(publisherStatsCache.offerId, offerId)
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(publisherStatsCache).values({
        publisherId,
        advertiserId,
        offerId,
        totalClicks: eventType === "click" ? 1 : 0,
        totalConversions: eventType === "conversion" ? 1 : 0,
        approvedConversions: eventType === "approved" ? 1 : 0,
        rejectedConversions: eventType === "rejected" ? 1 : 0
      });
    } else {
      const updates: any = { lastUpdated: new Date() };
      
      if (eventType === "click") {
        updates.totalClicks = sql`${publisherStatsCache.totalClicks} + 1`;
      } else if (eventType === "conversion") {
        updates.totalConversions = sql`${publisherStatsCache.totalConversions} + 1`;
      } else if (eventType === "approved") {
        updates.approvedConversions = sql`${publisherStatsCache.approvedConversions} + 1`;
      } else if (eventType === "rejected") {
        updates.rejectedConversions = sql`${publisherStatsCache.rejectedConversions} + 1`;
      }

      await db.update(publisherStatsCache)
        .set(updates)
        .where(eq(publisherStatsCache.id, existing[0].id));

      await this.recalculateAnomalies(existing[0].id);
    }
  }

  private async recalculateAnomalies(statsId: string): Promise<void> {
    const stats = await db.select()
      .from(publisherStatsCache)
      .where(eq(publisherStatsCache.id, statsId))
      .limit(1);

    if (stats.length === 0) return;

    const stat = stats[0];
    const currentCr = stat.totalClicks > 0 
      ? stat.totalConversions / stat.totalClicks 
      : 0;
    const currentAr = stat.totalConversions > 0 
      ? stat.approvedConversions / stat.totalConversions 
      : 0;

    let baselineCr = stat.baselineCr ? parseFloat(stat.baselineCr) : currentCr;
    let baselineAr = stat.baselineAr ? parseFloat(stat.baselineAr) : currentAr;

    if (!stat.baselineCr && stat.totalClicks >= 100) {
      baselineCr = currentCr;
    }
    if (!stat.baselineAr && stat.totalConversions >= 20) {
      baselineAr = currentAr;
    }

    const crDeviation = baselineCr > 0 ? Math.abs(currentCr - baselineCr) / baselineCr : 0;
    const arDeviation = baselineAr > 0 ? Math.abs(currentAr - baselineAr) / baselineAr : 0;

    const isCrAnomaly = crDeviation > 0.5 && stat.totalClicks >= 50;
    const isArAnomaly = arDeviation > 0.3 && stat.totalConversions >= 10;

    await db.update(publisherStatsCache)
      .set({
        conversionRate: currentCr.toFixed(4),
        approvalRate: currentAr.toFixed(4),
        baselineCr: baselineCr.toFixed(4),
        baselineAr: baselineAr.toFixed(4),
        isCrAnomaly,
        isArAnomaly,
        lastUpdated: new Date()
      })
      .where(eq(publisherStatsCache.id, statsId));
  }

  private async checkVelocity(
    ip: string,
    fingerprint: string,
    publisherId: string,
    advertiserId: string,
    offerId: string
  ): Promise<VelocityCheck> {
    const now = new Date();
    const result: VelocityCheck = {
      ipClicksMinute: 0,
      ipClicksHour: 0,
      ipClicksDay: 0,
      fingerprintClicksHour: 0,
      publisherClicksMinute: 0
    };

    // Parallelize all counter fetches
    const [ipCounter, fpCounter, pubCounter] = await Promise.all([
      ip ? this.getOrCreateCounter("ip", ip, advertiserId, offerId) : null,
      fingerprint ? this.getOrCreateCounter("fingerprint", fingerprint, advertiserId, offerId) : null,
      publisherId ? this.getOrCreateCounter("publisher", publisherId, advertiserId, offerId) : null,
    ]);

    if (ipCounter) {
      result.ipClicksMinute = this.getCounterValue(ipCounter, "minute", now);
      result.ipClicksHour = this.getCounterValue(ipCounter, "hour", now);
      result.ipClicksDay = this.getCounterValue(ipCounter, "day", now);
    }

    if (fpCounter) {
      result.fingerprintClicksHour = this.getCounterValue(fpCounter, "hour", now);
    }

    if (pubCounter) {
      result.publisherClicksMinute = this.getCounterValue(pubCounter, "minute", now);
    }

    return result;
  }

  private async getOrCreateCounter(
    type: string,
    key: string,
    advertiserId: string,
    offerId: string
  ): Promise<any> {
    const existing = await db.select()
      .from(velocityCounters)
      .where(and(
        eq(velocityCounters.counterType, type),
        eq(velocityCounters.counterKey, key),
        eq(velocityCounters.advertiserId, advertiserId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [newCounter] = await db.insert(velocityCounters)
      .values({
        counterType: type,
        counterKey: key,
        advertiserId,
        offerId
      })
      .returning();

    return newCounter;
  }

  private getCounterValue(counter: any, period: "minute" | "hour" | "day", now: Date): number {
    if (!counter) return 0;

    const resetField = `${period}Reset`;
    const countField = `clicks${period.charAt(0).toUpperCase() + period.slice(1)}`;
    
    const resetTime = new Date(counter[resetField]);
    const thresholds = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    };

    if (now.getTime() - resetTime.getTime() > thresholds[period]) {
      return 0;
    }

    return counter[countField] || 0;
  }

  private async incrementVelocityCounters(
    ip: string,
    fingerprint: string,
    publisherId: string,
    advertiserId: string,
    offerId: string
  ): Promise<void> {
    const now = new Date();

    // Parallelize all counter increments
    await Promise.all([
      ip ? this.incrementCounter("ip", ip, advertiserId, offerId, now) : null,
      fingerprint ? this.incrementCounter("fingerprint", fingerprint, advertiserId, offerId, now) : null,
      publisherId ? this.incrementCounter("publisher", publisherId, advertiserId, offerId, now) : null,
    ]);
  }

  private async incrementCounter(
    type: string,
    key: string,
    advertiserId: string,
    offerId: string,
    now: Date
  ): Promise<void> {
    const counter = await this.getOrCreateCounter(type, key, advertiserId, offerId);
    
    const updates: any = {
      updatedAt: now,
      clicksMinute: sql`${velocityCounters.clicksMinute} + 1`,
      clicksHour: sql`${velocityCounters.clicksHour} + 1`,
      clicksDay: sql`${velocityCounters.clicksDay} + 1`
    };

    const minuteThreshold = 60 * 1000;
    const hourThreshold = 60 * 60 * 1000;
    const dayThreshold = 24 * 60 * 60 * 1000;

    if (now.getTime() - new Date(counter.minuteReset).getTime() > minuteThreshold) {
      updates.clicksMinute = 1;
      updates.minuteReset = now;
    }
    if (now.getTime() - new Date(counter.hourReset).getTime() > hourThreshold) {
      updates.clicksHour = 1;
      updates.hourReset = now;
    }
    if (now.getTime() - new Date(counter.dayReset).getTime() > dayThreshold) {
      updates.clicksDay = 1;
      updates.dayReset = now;
    }

    await db.update(velocityCounters)
      .set(updates)
      .where(eq(velocityCounters.id, counter.id));
  }

  private addVelocitySignals(signals: FraudSignals, velocity: VelocityCheck, rules: AntifraudRule[]): void {
    for (const rule of rules) {
      if (!rule.isActive || !rule.threshold) continue;

      switch (rule.ruleType) {
        case "velocity_ip_minute":
          if (velocity.ipClicksMinute >= rule.threshold) {
            signals.signals.push("velocity_ip_minute");
            signals.fraudScore = Math.min(100, signals.fraudScore + 20);
          }
          break;
        case "velocity_ip_hour":
          if (velocity.ipClicksHour >= rule.threshold) {
            signals.signals.push("velocity_ip_hour");
            signals.fraudScore = Math.min(100, signals.fraudScore + 15);
          }
          break;
        case "velocity_ip_day":
          if (velocity.ipClicksDay >= rule.threshold) {
            signals.signals.push("velocity_ip_day");
            signals.fraudScore = Math.min(100, signals.fraudScore + 10);
          }
          break;
        case "velocity_fingerprint":
          if (velocity.fingerprintClicksHour >= rule.threshold) {
            signals.signals.push("velocity_fingerprint");
            signals.fraudScore = Math.min(100, signals.fraudScore + 25);
          }
          break;
        case "velocity_publisher":
          if (velocity.publisherClicksMinute >= rule.threshold) {
            signals.signals.push("velocity_publisher");
            signals.fraudScore = Math.min(100, signals.fraudScore + 15);
          }
          break;
      }
    }
  }

  async logEvaluation(
    clickId: string | undefined,
    offerId: string,
    advertiserId: string,
    publisherId: string,
    evaluation: FraudEvaluation
  ): Promise<void> {
    const logData: InsertAntifraudLog = {
      clickId,
      offerId,
      advertiserId,
      publisherId,
      fraudScore: evaluation.fraudScore,
      isProxy: evaluation.signals.isProxy,
      isVpn: evaluation.signals.isVpn,
      isBot: evaluation.signals.isBot,
      isDatacenter: evaluation.signals.isDatacenter,
      signals: JSON.stringify(evaluation.signals.signals),
      matchedRuleIds: evaluation.matchedRules.map(r => r.id),
      action: evaluation.action,
      ip: evaluation.signals.ip,
      userAgent: evaluation.signals.userAgent,
      country: evaluation.signals.country
    };

    await storage.createAntifraudLog(logData);
    await this.updateMetrics(advertiserId, offerId, evaluation);
  }

  private async updateMetrics(
    advertiserId: string,
    offerId: string,
    evaluation: FraudEvaluation
  ): Promise<void> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const metricData = {
      date: now,
      advertiserId,
      offerId,
      totalClicks: 1,
      blockedClicks: evaluation.action === "block" ? 1 : 0,
      flaggedClicks: evaluation.action === "flag" ? 1 : 0,
      proxyVpnCount: (evaluation.signals.isProxy || evaluation.signals.isVpn) ? 1 : 0,
      botCount: evaluation.signals.isBot ? 1 : 0,
      datacenterCount: evaluation.signals.isDatacenter ? 1 : 0,
      lowRiskCount: evaluation.fraudScore <= 30 ? 1 : 0,
      mediumRiskCount: evaluation.fraudScore > 30 && evaluation.fraudScore <= 60 ? 1 : 0,
      highRiskCount: evaluation.fraudScore > 60 ? 1 : 0,
    };

    await storage.upsertAntifraudMetric(metricData);
  }

  private async getActiveRules(advertiserId: string): Promise<AntifraudRule[]> {
    const cacheKey = advertiserId || "global";
    const cached = this.rulesCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.rules;
    }

    const rules = await storage.getAntifraudRules(advertiserId);
    this.rulesCache.set(cacheKey, { rules, timestamp: Date.now() });
    return rules;
  }

  private evaluateRule(rule: AntifraudRule, signals: FraudSignals, velocity?: VelocityCheck): boolean {
    switch (rule.ruleType) {
      case "fraud_score":
        return signals.fraudScore >= (rule.threshold || 80);
      
      case "proxy_vpn":
        return signals.isProxy || signals.isVpn;
      
      case "bot":
        return signals.isBot;
      
      case "datacenter":
        return signals.isDatacenter;
      
      case "duplicate_click":
        return signals.signals.includes("duplicate");
      
      case "duplicate_conversion":
        return signals.signals.includes("duplicate_conversion");
      
      case "geo_mismatch":
        return signals.signals.includes("geo_mismatch");
      
      case "device_fingerprint":
        return signals.signals.includes("fingerprint_suspicious");
      
      case "cr_anomaly":
        return signals.signals.includes("cr_anomaly");
      
      case "ar_anomaly":
        return signals.signals.includes("ar_anomaly");

      case "velocity_ip_minute":
        return velocity ? velocity.ipClicksMinute >= (rule.threshold || 10) : false;
      
      case "velocity_ip_hour":
        return velocity ? velocity.ipClicksHour >= (rule.threshold || 50) : false;
      
      case "velocity_ip_day":
        return velocity ? velocity.ipClicksDay >= (rule.threshold || 200) : false;
      
      case "velocity_fingerprint":
        return velocity ? velocity.fingerprintClicksHour >= (rule.threshold || 30) : false;
      
      case "velocity_publisher":
        return velocity ? velocity.publisherClicksMinute >= (rule.threshold || 100) : false;
      
      default:
        return false;
    }
  }

  private getPriorityAction(
    current: "allow" | "block" | "hold" | "flag" | "reject",
    newAction: "allow" | "block" | "hold" | "flag" | "reject"
  ): "allow" | "block" | "hold" | "flag" | "reject" {
    const priority: Record<string, number> = {
      "allow": 0,
      "flag": 1,
      "hold": 2,
      "reject": 3,
      "block": 4
    };
    return priority[newAction] > priority[current] ? newAction : current;
  }

  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  async createDefaultRules(): Promise<void> {
    const existingRules = await storage.getAntifraudRules();
    if (existingRules.length > 0) return;

    const defaultRules = [
      {
        scope: "global" as const,
        name: "High Fraud Score",
        description: "Блокировать клики с fraud score >= 80",
        ruleType: "fraud_score",
        threshold: 80,
        action: "block" as const,
        priority: 10
      },
      {
        scope: "global" as const,
        name: "Proxy/VPN Detection",
        description: "Помечать клики через прокси или VPN",
        ruleType: "proxy_vpn",
        action: "flag" as const,
        priority: 20
      },
      {
        scope: "global" as const,
        name: "Bot Detection",
        description: "Блокировать ботов",
        ruleType: "bot",
        action: "block" as const,
        priority: 15
      },
      {
        scope: "global" as const,
        name: "Datacenter IPs",
        description: "Помечать клики с IP датацентров",
        ruleType: "datacenter",
        action: "flag" as const,
        priority: 25
      },
      {
        scope: "global" as const,
        name: "IP Velocity (Minute)",
        description: "Лимит 10 кликов/минуту с одного IP",
        ruleType: "velocity_ip_minute",
        threshold: 10,
        action: "block" as const,
        priority: 5
      },
      {
        scope: "global" as const,
        name: "IP Velocity (Hour)",
        description: "Лимит 100 кликов/час с одного IP",
        ruleType: "velocity_ip_hour",
        threshold: 100,
        action: "flag" as const,
        priority: 6
      },
      {
        scope: "global" as const,
        name: "Duplicate Conversion",
        description: "Блокировать дубликаты конверсий",
        ruleType: "duplicate_conversion",
        action: "reject" as const,
        priority: 3
      },
      {
        scope: "global" as const,
        name: "CR Anomaly",
        description: "Помечать аномальный CR паблишера",
        ruleType: "cr_anomaly",
        action: "hold" as const,
        priority: 30
      }
    ];

    for (const rule of defaultRules) {
      await storage.createAntifraudRule(rule);
    }
  }

  clearCache(): void {
    this.rulesCache.clear();
  }
}

export const antiFraudService = new AntiFraudService();
