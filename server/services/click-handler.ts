import crypto from "crypto";
import { storage } from "../storage";
import type { InsertClick } from "@shared/schema";

interface ClickParams {
  offerId: string;
  partnerId: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
  sub5?: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
  geo?: string;
}

interface ClickResult {
  clickId: string;
  redirectUrl: string;
  fraudScore: number;
  isBlocked: boolean;
}

export class ClickHandler {
  async processClick(params: ClickParams): Promise<ClickResult> {
    const clickId = this.generateClickId();
    
    const offer = await storage.getOffer(params.offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }
    
    if (offer.status !== "active") {
      throw new Error("Offer is not active");
    }
    
    const landings = await storage.getOfferLandings(params.offerId);
    const landing = this.selectLanding(landings, params.geo);
    
    if (!landing) {
      throw new Error("No landing available for this geo");
    }
    
    const fraudCheck = this.performBasicFraudCheck(params.ip, params.userAgent);
    
    const redirectUrl = this.buildRedirectUrl(landing.landingUrl, clickId, params);
    
    const clickData: InsertClick = {
      clickId,
      offerId: params.offerId,
      publisherId: params.partnerId,
      landingId: landing.id,
      ip: params.ip,
      userAgent: params.userAgent,
      geo: params.geo,
      referer: params.referer,
      sub1: params.sub1,
      sub2: params.sub2,
      sub3: params.sub3,
      sub4: params.sub4,
      sub5: params.sub5,
      fraudScore: fraudCheck.score,
      isProxy: fraudCheck.isProxy,
      isVpn: fraudCheck.isVpn,
      redirectUrl,
    };
    
    await storage.createClick(clickData);
    
    return {
      clickId,
      redirectUrl,
      fraudScore: fraudCheck.score,
      isBlocked: fraudCheck.score >= 80,
    };
  }
  
  private generateClickId(): string {
    return crypto.randomUUID();
  }
  
  private selectLanding(landings: any[], geo?: string) {
    if (!landings.length) return null;
    
    if (geo) {
      const geoLanding = landings.find(l => 
        l.geo.toLowerCase() === geo.toLowerCase() ||
        l.geo.toLowerCase().includes(geo.toLowerCase())
      );
      if (geoLanding) return geoLanding;
    }
    
    return landings[0];
  }
  
  private buildRedirectUrl(baseUrl: string, clickId: string, params: ClickParams): string {
    const url = new URL(baseUrl);
    
    url.searchParams.set("click_id", clickId);
    if (params.sub1) url.searchParams.set("sub1", params.sub1);
    if (params.sub2) url.searchParams.set("sub2", params.sub2);
    if (params.sub3) url.searchParams.set("sub3", params.sub3);
    if (params.sub4) url.searchParams.set("sub4", params.sub4);
    if (params.sub5) url.searchParams.set("sub5", params.sub5);
    
    return url.toString();
  }
  
  private performBasicFraudCheck(ip?: string, userAgent?: string): {
    score: number;
    isProxy: boolean;
    isVpn: boolean;
  } {
    let score = 0;
    let isProxy = false;
    let isVpn = false;
    
    if (!userAgent || userAgent.length < 10) {
      score += 30;
    }
    
    if (userAgent?.toLowerCase().includes("bot") ||
        userAgent?.toLowerCase().includes("crawler") ||
        userAgent?.toLowerCase().includes("spider")) {
      score += 50;
    }
    
    return { score, isProxy, isVpn };
  }
}

export const clickHandler = new ClickHandler();
