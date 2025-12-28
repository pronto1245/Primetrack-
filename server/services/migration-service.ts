import { storage } from "../storage";
import { InsertOffer, InsertUser, InsertPublisherAdvertiser } from "@shared/schema";
import { db } from "../../db";
import { publisherAdvertisers } from "@shared/schema";

export type TrackerType = "scaleo" | "affilka" | "affise" | "voluum" | "keitaro";

interface MigrationResult {
  success: boolean;
  imported: {
    offers: number;
    publishers: number;
    conversions: number;
    clicks: number;
  };
  errors: string[];
}

interface ScaleoOffer {
  id: string;
  title: string;
  status: string;
  payout: number;
  revenue: number;
  geo: string[];
  vertical: string;
  landing_url: string;
}

interface ScaleoPublisher {
  id: string;
  email: string;
  login: string;
  status: string;
}

class MigrationService {
  async importFromTracker(
    tracker: TrackerType,
    apiUrl: string,
    apiKey: string,
    advertiserId: string,
    options: {
      importOffers?: boolean;
      importPublishers?: boolean;
      importConversions?: boolean;
      importClicks?: boolean;
    }
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      imported: { offers: 0, publishers: 0, conversions: 0, clicks: 0 },
      errors: [],
    };

    try {
      switch (tracker) {
        case "scaleo":
          return await this.importFromScaleo(apiUrl, apiKey, advertiserId, options, result);
        case "affilka":
          return await this.importFromAffilka(apiUrl, apiKey, advertiserId, options, result);
        case "affise":
          return await this.importFromAffise(apiUrl, apiKey, advertiserId, options, result);
        case "voluum":
          return await this.importFromVoluum(apiUrl, apiKey, advertiserId, options, result);
        case "keitaro":
          return await this.importFromKeitaro(apiUrl, apiKey, advertiserId, options, result);
        default:
          result.errors.push(`Unknown tracker: ${tracker}`);
          return result;
      }
    } catch (error: any) {
      result.errors.push(`Migration failed: ${error.message}`);
      return result;
    }
  }

  private async importFromScaleo(
    apiUrl: string,
    apiKey: string,
    advertiserId: string,
    options: any,
    result: MigrationResult
  ): Promise<MigrationResult> {
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (options.importOffers) {
      try {
        const response = await fetch(`${apiUrl}/v2/admin/offers`, { headers });
        if (response.ok) {
          const data = await response.json();
          const offers = data.info?.offers || data.offers || [];
          
          for (const offer of offers) {
            await this.createOfferFromScaleo(offer, advertiserId);
            result.imported.offers++;
          }
        } else {
          result.errors.push(`Failed to fetch offers: ${response.status}`);
        }
      } catch (e: any) {
        result.errors.push(`Offers import error: ${e.message}`);
      }
    }

    if (options.importPublishers) {
      try {
        const response = await fetch(`${apiUrl}/v2/admin/affiliates`, { headers });
        if (response.ok) {
          const data = await response.json();
          const publishers = data.info?.affiliates || data.affiliates || [];
          
          for (const pub of publishers) {
            await this.createPublisherFromScaleo(pub, advertiserId);
            result.imported.publishers++;
          }
        } else {
          result.errors.push(`Failed to fetch publishers: ${response.status}`);
        }
      } catch (e: any) {
        result.errors.push(`Publishers import error: ${e.message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private async importFromAffilka(
    apiUrl: string,
    apiKey: string,
    advertiserId: string,
    options: any,
    result: MigrationResult
  ): Promise<MigrationResult> {
    const headers = {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    };

    if (options.importOffers) {
      try {
        const response = await fetch(`${apiUrl}/api/v1/offers`, { headers });
        if (response.ok) {
          const offers = await response.json();
          
          for (const offer of offers.data || offers) {
            await this.createOfferFromAffilka(offer, advertiserId);
            result.imported.offers++;
          }
        } else {
          result.errors.push(`Failed to fetch offers: ${response.status}`);
        }
      } catch (e: any) {
        result.errors.push(`Offers import error: ${e.message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private async importFromAffise(
    apiUrl: string,
    apiKey: string,
    advertiserId: string,
    options: any,
    result: MigrationResult
  ): Promise<MigrationResult> {
    const headers = {
      "API-Key": apiKey,
      "Content-Type": "application/json",
    };

    if (options.importOffers) {
      try {
        const response = await fetch(`${apiUrl}/3.0/offers`, { headers });
        if (response.ok) {
          const data = await response.json();
          const offers = data.offers || [];
          
          for (const offer of offers) {
            await this.createOfferFromAffise(offer, advertiserId);
            result.imported.offers++;
          }
        } else {
          result.errors.push(`Failed to fetch offers: ${response.status}`);
        }
      } catch (e: any) {
        result.errors.push(`Offers import error: ${e.message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private async importFromVoluum(
    apiUrl: string,
    apiKey: string,
    advertiserId: string,
    options: any,
    result: MigrationResult
  ): Promise<MigrationResult> {
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (options.importOffers) {
      try {
        const response = await fetch(`${apiUrl}/offer`, { headers });
        if (response.ok) {
          const data = await response.json();
          const offers = data.offers || [];
          
          for (const offer of offers) {
            await this.createOfferFromVoluum(offer, advertiserId);
            result.imported.offers++;
          }
        } else {
          result.errors.push(`Failed to fetch offers: ${response.status}`);
        }
      } catch (e: any) {
        result.errors.push(`Offers import error: ${e.message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private async importFromKeitaro(
    apiUrl: string,
    apiKey: string,
    advertiserId: string,
    options: any,
    result: MigrationResult
  ): Promise<MigrationResult> {
    const headers = {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    };

    if (options.importOffers) {
      try {
        const response = await fetch(`${apiUrl}/admin_api/v1/offers`, { headers });
        if (response.ok) {
          const offers = await response.json();
          
          for (const offer of offers) {
            await this.createOfferFromKeitaro(offer, advertiserId);
            result.imported.offers++;
          }
        } else {
          result.errors.push(`Failed to fetch offers: ${response.status}`);
        }
      } catch (e: any) {
        result.errors.push(`Offers import error: ${e.message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private async createOfferFromScaleo(offer: any, advertiserId: string) {
    const payout = parseFloat(offer.payout) || 0;
    const revenue = parseFloat(offer.revenue) || payout;
    
    const newOffer: InsertOffer = {
      advertiserId,
      name: offer.title || offer.name || "Imported Offer",
      description: offer.description || "",
      status: offer.status === "active" ? "active" : "paused",
      geo: Array.isArray(offer.geo) ? offer.geo : (offer.geo ? [offer.geo] : ["WW"]),
      category: offer.vertical || "other",
      payoutModel: "CPA",
      partnerPayout: payout.toFixed(2),
      internalCost: revenue.toFixed(2),
      currency: offer.currency || "USD",
      holdPeriodDays: offer.hold_days || 7,
      trafficSources: offer.traffic_sources || [],
      appTypes: [],
      creativeLinks: [],
    };
    
    await storage.createOffer(newOffer);
  }

  private async createOfferFromAffilka(offer: any, advertiserId: string) {
    const payout = parseFloat(offer.payout) || 0;
    
    const newOffer: InsertOffer = {
      advertiserId,
      name: offer.name || "Imported Offer",
      description: offer.description || "",
      status: offer.is_active ? "active" : "paused",
      geo: Array.isArray(offer.countries) ? offer.countries : ["WW"],
      category: offer.category || "other",
      payoutModel: "CPA",
      partnerPayout: payout.toFixed(2),
      internalCost: payout.toFixed(2),
      currency: offer.currency || "USD",
      holdPeriodDays: 7,
      trafficSources: [],
      appTypes: [],
      creativeLinks: [],
    };
    
    await storage.createOffer(newOffer);
  }

  private async createOfferFromAffise(offer: any, advertiserId: string) {
    const payout = parseFloat(offer.payments?.payout) || 0;
    const revenue = parseFloat(offer.payments?.revenue) || payout;
    
    const newOffer: InsertOffer = {
      advertiserId,
      name: offer.title || "Imported Offer",
      description: offer.description || "",
      status: offer.status === "active" ? "active" : "paused",
      geo: Array.isArray(offer.countries) ? offer.countries : ["WW"],
      category: offer.categories?.[0] || "other",
      payoutModel: "CPA",
      partnerPayout: payout.toFixed(2),
      internalCost: revenue.toFixed(2),
      currency: offer.currency || "USD",
      holdPeriodDays: 7,
      trafficSources: offer.sources || [],
      appTypes: [],
      creativeLinks: [],
    };
    
    await storage.createOffer(newOffer);
  }

  private async createOfferFromVoluum(offer: any, advertiserId: string) {
    const payout = parseFloat(offer.payout) || 0;
    
    const newOffer: InsertOffer = {
      advertiserId,
      name: offer.name || "Imported Offer",
      description: offer.notes || "",
      status: "active",
      geo: offer.countries || ["WW"],
      category: "other",
      payoutModel: "CPA",
      partnerPayout: payout.toFixed(2),
      internalCost: payout.toFixed(2),
      currency: offer.currency || "USD",
      holdPeriodDays: 7,
      trafficSources: [],
      appTypes: [],
      creativeLinks: [],
    };
    
    await storage.createOffer(newOffer);
  }

  private async createOfferFromKeitaro(offer: any, advertiserId: string) {
    const payout = parseFloat(offer.payout) || 0;
    
    const newOffer: InsertOffer = {
      advertiserId,
      name: offer.name || "Imported Offer",
      description: offer.notes || "",
      status: offer.state === "active" ? "active" : "paused",
      geo: offer.countries || ["WW"],
      category: offer.group_id ? String(offer.group_id) : "other",
      payoutModel: "CPA",
      partnerPayout: payout.toFixed(2),
      internalCost: payout.toFixed(2),
      currency: offer.currency || "USD",
      holdPeriodDays: 7,
      trafficSources: [],
      appTypes: [],
      creativeLinks: [],
    };
    
    await storage.createOffer(newOffer);
  }

  private async createPublisherFromScaleo(pub: any, advertiserId: string) {
    const existingUser = await storage.getUserByEmail(pub.email);
    if (existingUser) {
      return;
    }

    const newUser: InsertUser = {
      username: pub.login || pub.email.split("@")[0],
      email: pub.email,
      password: "temp_" + Math.random().toString(36).substring(7),
      role: "publisher",
      status: pub.status === "active" ? "active" : "pending",
    };

    const user = await storage.createUser(newUser);
    
    await db.insert(publisherAdvertisers).values({
      publisherId: user.id,
      advertiserId,
      status: "active",
    });
  }

  getTrackerInfo(tracker: TrackerType): { name: string; apiUrlPlaceholder: string; apiKeyHelp: string } {
    const info: Record<TrackerType, { name: string; apiUrlPlaceholder: string; apiKeyHelp: string }> = {
      scaleo: {
        name: "Scaleo",
        apiUrlPlaceholder: "https://your-domain.scaleo.io",
        apiKeyHelp: "API ключ из Settings → API",
      },
      affilka: {
        name: "Affilka",
        apiUrlPlaceholder: "https://your-domain.affilka.com",
        apiKeyHelp: "API ключ из настроек аккаунта",
      },
      affise: {
        name: "Affise",
        apiUrlPlaceholder: "https://api-your.affise.com",
        apiKeyHelp: "API Key из Settings → Security",
      },
      voluum: {
        name: "Voluum",
        apiUrlPlaceholder: "https://api.voluum.com",
        apiKeyHelp: "Access Token из Settings → Access Tokens",
      },
      keitaro: {
        name: "Keitaro",
        apiUrlPlaceholder: "https://your-tracker.com",
        apiKeyHelp: "API Key из Maintenance → API",
      },
    };

    return info[tracker];
  }
}

export const migrationService = new MigrationService();
