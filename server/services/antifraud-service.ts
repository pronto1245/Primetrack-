import { storage } from "../storage";
import type { AntifraudRule, InsertAntifraudLog } from "@shared/schema";

export interface FraudSignals {
  ip?: string;
  userAgent?: string;
  country?: string;
  isProxy: boolean;
  isVpn: boolean;
  isBot: boolean;
  isDatacenter: boolean;
  fraudScore: number;
  signals: string[];
}

export interface FraudEvaluation {
  action: "allow" | "block" | "hold" | "flag" | "reject";
  fraudScore: number;
  matchedRules: AntifraudRule[];
  signals: FraudSignals;
}

export class AntiFraudService {
  private rulesCache: Map<string, { rules: AntifraudRule[]; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  async evaluateClick(
    offerId: string,
    advertiserId: string,
    publisherId: string,
    signals: FraudSignals
  ): Promise<FraudEvaluation> {
    const rules = await this.getActiveRules(advertiserId);
    const matchedRules: AntifraudRule[] = [];
    let finalAction: "allow" | "block" | "hold" | "flag" | "reject" = "allow";

    for (const rule of rules) {
      if (!rule.isActive) continue;

      const isMatched = this.evaluateRule(rule, signals);
      if (isMatched) {
        matchedRules.push(rule);
        const ruleAction = rule.action as typeof finalAction;
        finalAction = this.getPriorityAction(finalAction, ruleAction);
      }
    }

    return {
      action: finalAction,
      fraudScore: signals.fraudScore,
      matchedRules,
      signals
    };
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

  private evaluateRule(rule: AntifraudRule, signals: FraudSignals): boolean {
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
      
      case "geo_mismatch":
        return signals.signals.includes("geo_mismatch");
      
      case "device_fingerprint":
        return signals.signals.includes("fingerprint_suspicious");
      
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

  async createDefaultRules(): Promise<void> {
    const existingRules = await storage.getAntifraudRules();
    if (existingRules.length > 0) return;

    const defaultRules = [
      {
        scope: "global" as const,
        name: "High Fraud Score",
        description: "Block clicks with fraud score >= 80",
        ruleType: "fraud_score",
        threshold: 80,
        action: "block" as const,
        priority: 10
      },
      {
        scope: "global" as const,
        name: "Proxy/VPN Detection",
        description: "Flag clicks from proxy or VPN",
        ruleType: "proxy_vpn",
        action: "flag" as const,
        priority: 20
      },
      {
        scope: "global" as const,
        name: "Bot Detection",
        description: "Block detected bots",
        ruleType: "bot",
        action: "block" as const,
        priority: 15
      },
      {
        scope: "global" as const,
        name: "Datacenter IPs",
        description: "Flag clicks from datacenter IPs",
        ruleType: "datacenter",
        action: "flag" as const,
        priority: 25
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
