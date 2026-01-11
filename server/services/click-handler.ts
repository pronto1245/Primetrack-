import crypto from "crypto";
import { storage } from "../storage";
import type { InsertClick } from "@shared/schema";
import { ipIntelService } from "./ip-intel-service";

interface ClickParams {
  offerId: string;
  partnerId: string;
  landingId?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
  sub5?: string;
  sub6?: string;
  sub7?: string;
  sub8?: string;
  sub9?: string;
  sub10?: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
  geo?: string;
  visitorId?: string;
  fingerprintConfidence?: number;
}

interface ClickResult {
  clickId: string;
  redirectUrl: string;
  fraudScore: number;
  isBlocked: boolean;
  capReached?: boolean;
  capRedirectUrl?: string;
}

interface ParsedUA {
  device: string;
  os: string;
  browser: string;
  isBot: boolean;
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
    
    // Check caps/limits (daily, monthly, total)
    const capsCheck = await storage.checkOfferCaps(params.offerId);
    if (capsCheck.dailyCapReached || capsCheck.monthlyCapReached || capsCheck.totalCapReached) {
      const capAction = offer.capReachedAction || "block";
      
      if (capAction === "redirect" && offer.capRedirectUrl) {
        return {
          clickId,
          redirectUrl: offer.capRedirectUrl,
          fraudScore: 0,
          isBlocked: false,
          capReached: true,
          capRedirectUrl: offer.capRedirectUrl
        };
      } else {
        return {
          clickId,
          redirectUrl: "",
          fraudScore: 0,
          isBlocked: true,
          capReached: true
        };
      }
    }
    
    const landings = await storage.getOfferLandings(params.offerId);
    const landing = this.selectLanding(landings, params.geo, params.landingId);
    
    if (!landing) {
      throw new Error("No landing available for this geo");
    }
    
    // Parse User-Agent for device/os/browser/bot detection
    const parsedUA = this.parseUserAgent(params.userAgent);
    
    // Get enhanced IP intelligence
    const ipIntel = params.ip ? await ipIntelService.getIpIntelligence(params.ip) : null;
    
    // Use IP intel for GEO if available, otherwise use provided geo
    const detectedGeo = ipIntel?.country || params.geo;
    
    // Check if GEO matches offer allowed GEOs
    const isGeoMatch = this.checkGeoMatch(detectedGeo, offer.geo);
    
    // Check if this click is unique (first from this IP+offer+publisher today)
    const isUnique = await this.checkUniqueness(params.ip, params.offerId, params.partnerId);
    
    // Combine basic fraud check with IP intel
    const basicFraudCheck = this.performBasicFraudCheck(params.ip, params.userAgent);
    const fraudCheck = this.mergeFraudChecks(basicFraudCheck, ipIntel);
    
    // Determine if click is suspicious and collect reasons
    const suspiciousAnalysis = this.analyzeSuspiciousTraffic({
      fraudScore: fraudCheck.score,
      isProxy: fraudCheck.isProxy,
      isVpn: fraudCheck.isVpn,
      isTor: fraudCheck.isTor,
      isDatacenter: fraudCheck.isDatacenter,
      isBot: parsedUA.isBot,
      isGeoMatch,
      isUnique,
    });
    
    const clickIdParam = landing.clickIdParam || "click_id";
    const redirectUrl = this.buildRedirectUrl(landing.landingUrl, clickId, params, clickIdParam);
    
    const clickData: InsertClick = {
      clickId,
      offerId: params.offerId,
      publisherId: params.partnerId,
      landingId: landing.id,
      ip: params.ip,
      userAgent: params.userAgent,
      geo: detectedGeo,
      city: ipIntel?.city,
      region: ipIntel?.region,
      referer: params.referer,
      device: parsedUA.device,
      os: parsedUA.os,
      browser: parsedUA.browser,
      sub1: params.sub1,
      sub2: params.sub2,
      sub3: params.sub3,
      sub4: params.sub4,
      sub5: params.sub5,
      sub6: params.sub6,
      sub7: params.sub7,
      sub8: params.sub8,
      sub9: params.sub9,
      sub10: params.sub10,
      isUnique,
      isGeoMatch,
      isBot: parsedUA.isBot,
      fraudScore: fraudCheck.score,
      isProxy: fraudCheck.isProxy,
      isVpn: fraudCheck.isVpn,
      isTor: fraudCheck.isTor,
      isDatacenter: fraudCheck.isDatacenter,
      isSuspicious: suspiciousAnalysis.isSuspicious,
      suspiciousReasons: suspiciousAnalysis.reasons.length > 0 ? JSON.stringify(suspiciousAnalysis.reasons) : null,
      isp: ipIntel?.isp,
      asn: ipIntel?.asn,
      visitorId: params.visitorId,
      fingerprintConfidence: params.fingerprintConfidence?.toString(),
      redirectUrl,
    };
    
    const savedClick = await storage.createClick(clickData);
    
    // Send notification for suspicious traffic
    if (suspiciousAnalysis.isSuspicious) {
      this.notifySuspiciousTraffic(offer.advertiserId, params.offerId, clickId, suspiciousAnalysis.reasons);
    }
    
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
  
  private parseUserAgent(userAgent?: string): ParsedUA {
    if (!userAgent) {
      return { device: "unknown", os: "unknown", browser: "unknown", isBot: false };
    }
    
    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let device = "desktop";
    if (/mobile|android.*mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
      device = "mobile";
    } else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) {
      device = "tablet";
    }
    
    // Detect OS
    let os = "unknown";
    if (/windows nt|windows/i.test(ua)) {
      os = "Windows";
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = "iOS";
    } else if (/mac os x|macintosh/i.test(ua)) {
      os = "MacOS";
    } else if (/android/i.test(ua)) {
      os = "Android";
    } else if (/linux/i.test(ua)) {
      os = "Linux";
    } else if (/cros/i.test(ua)) {
      os = "ChromeOS";
    }
    
    // Detect browser
    let browser = "unknown";
    if (/edg\//i.test(ua)) {
      browser = "Edge";
    } else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) {
      browser = "Chrome";
    } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
      browser = "Safari";
    } else if (/firefox|fxios/i.test(ua)) {
      browser = "Firefox";
    } else if (/opera|opr\//i.test(ua)) {
      browser = "Opera";
    } else if (/msie|trident/i.test(ua)) {
      browser = "IE";
    }
    
    // Detect bot
    const botPatterns = [
      "bot", "crawler", "spider", "scraper", "curl", "wget",
      "python", "java", "php", "perl", "ruby", "go-http",
      "googlebot", "bingbot", "yandexbot", "baiduspider",
      "facebookexternalhit", "twitterbot", "linkedinbot",
      "slurp", "duckduckbot", "semrushbot", "ahrefsbot"
    ];
    const isBot = botPatterns.some(pattern => ua.includes(pattern));
    
    return { device, os, browser, isBot };
  }
  
  private checkGeoMatch(clickGeo?: string, offerGeos?: string[]): boolean {
    if (!offerGeos || offerGeos.length === 0) {
      return true; // No GEO restrictions = all GEOs allowed
    }
    if (!clickGeo) {
      return false; // Unknown GEO when GEO restrictions exist
    }
    
    const normalizedClickGeo = clickGeo.toUpperCase();
    return offerGeos.some(geo => geo.toUpperCase() === normalizedClickGeo);
  }
  
  private async checkUniqueness(ip?: string, offerId?: string, publisherId?: string): Promise<boolean> {
    if (!ip || !offerId || !publisherId) {
      return true;
    }
    
    // Check if there's already a click from this IP for this offer+publisher today
    const existingClick = await storage.findClickByIpOfferPublisherToday(ip, offerId, publisherId);
    return !existingClick;
  }
  
  private selectLanding(landings: any[], geo?: string, landingId?: string) {
    if (!landings.length) return null;
    
    // If specific landing ID provided, use it
    if (landingId) {
      const specificLanding = landings.find(l => l.id === landingId);
      if (specificLanding) return specificLanding;
    }
    
    // Fallback to GEO-based selection
    if (geo) {
      const geoLanding = landings.find(l => 
        l.geo.toLowerCase() === geo.toLowerCase() ||
        l.geo.toLowerCase().includes(geo.toLowerCase())
      );
      if (geoLanding) return geoLanding;
    }
    
    return landings[0];
  }
  
  private buildRedirectUrl(baseUrl: string, clickId: string, params: ClickParams, clickIdParam: string = "click_id"): string {
    let urlString = baseUrl;
    
    // Replace standard {click_id} token
    urlString = urlString.replace(/\{click_id\}/gi, clickId);
    
    // Replace custom click_id parameter token (e.g., {aff_click_id}, {subid}, {s2sclick_id})
    if (clickIdParam !== "click_id") {
      const customParamRegex = new RegExp(`\\{${clickIdParam}\\}`, "gi");
      urlString = urlString.replace(customParamRegex, clickId);
    }
    
    urlString = urlString.replace(/\{sub1\}/gi, params.sub1 || "");
    urlString = urlString.replace(/\{sub2\}/gi, params.sub2 || "");
    urlString = urlString.replace(/\{sub3\}/gi, params.sub3 || "");
    urlString = urlString.replace(/\{sub4\}/gi, params.sub4 || "");
    urlString = urlString.replace(/\{sub5\}/gi, params.sub5 || "");
    urlString = urlString.replace(/\{sub6\}/gi, params.sub6 || "");
    urlString = urlString.replace(/\{sub7\}/gi, params.sub7 || "");
    urlString = urlString.replace(/\{sub8\}/gi, params.sub8 || "");
    urlString = urlString.replace(/\{sub9\}/gi, params.sub9 || "");
    urlString = urlString.replace(/\{sub10\}/gi, params.sub10 || "");
    
    const url = new URL(urlString);
    
    // Always set the click_id parameter with the configured name (overwrite if exists with placeholder)
    url.searchParams.set(clickIdParam, clickId);
    if (params.sub1 && !url.searchParams.has("sub1")) {
      url.searchParams.set("sub1", params.sub1);
    }
    if (params.sub2 && !url.searchParams.has("sub2")) {
      url.searchParams.set("sub2", params.sub2);
    }
    if (params.sub3 && !url.searchParams.has("sub3")) {
      url.searchParams.set("sub3", params.sub3);
    }
    if (params.sub4 && !url.searchParams.has("sub4")) {
      url.searchParams.set("sub4", params.sub4);
    }
    if (params.sub5 && !url.searchParams.has("sub5")) {
      url.searchParams.set("sub5", params.sub5);
    }
    if (params.sub6 && !url.searchParams.has("sub6")) {
      url.searchParams.set("sub6", params.sub6);
    }
    if (params.sub7 && !url.searchParams.has("sub7")) {
      url.searchParams.set("sub7", params.sub7);
    }
    if (params.sub8 && !url.searchParams.has("sub8")) {
      url.searchParams.set("sub8", params.sub8);
    }
    if (params.sub9 && !url.searchParams.has("sub9")) {
      url.searchParams.set("sub9", params.sub9);
    }
    if (params.sub10 && !url.searchParams.has("sub10")) {
      url.searchParams.set("sub10", params.sub10);
    }
    
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
    
    // Check for missing or suspicious user agent
    if (!userAgent || userAgent.length < 10) {
      score += 30;
    }
    
    // Check for known bot patterns
    if (userAgent?.toLowerCase().includes("bot") ||
        userAgent?.toLowerCase().includes("crawler") ||
        userAgent?.toLowerCase().includes("spider")) {
      score += 50;
    }
    
    // Check for automation tools in user agent
    const automationTools = ["selenium", "puppeteer", "headless", "phantomjs", "playwright"];
    if (userAgent && automationTools.some(tool => userAgent.toLowerCase().includes(tool))) {
      score += 40;
    }
    
    // Check for suspicious IP patterns (datacenter ranges - simplified detection)
    if (ip) {
      // Common datacenter/proxy IP prefixes
      const suspiciousPrefixes = [
        "104.16.", "104.17.", "104.18.", "104.19.", "104.20.", // Cloudflare
        "172.64.", "172.65.", "172.66.", "172.67.", // Cloudflare
        "185.199.", // GitHub Pages
        "151.101.", // Fastly
        "23.227.", // Shopify
      ];
      if (suspiciousPrefixes.some(prefix => ip.startsWith(prefix))) {
        score += 15;
        isProxy = true;
      }
      
      // Check for localhost/private IPs (suspicious in production)
      if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
        score += 10;
      }
    }
    
    // Check for common curl/wget patterns
    if (userAgent && /^(curl|wget|python-requests|python-urllib|java|httpclient|okhttp)/i.test(userAgent)) {
      score += 35;
    }
    
    // Check for missing common browser headers patterns
    if (userAgent && !/(mozilla|chrome|safari|firefox|edge|opera)/i.test(userAgent)) {
      score += 20;
    }
    
    return { score, isProxy, isVpn };
  }

  private mergeFraudChecks(
    basic: { score: number; isProxy: boolean; isVpn: boolean },
    ipIntel: { isProxy: boolean; isVpn: boolean; isTor: boolean; isDatacenter: boolean; fraudScore: number } | null
  ): { score: number; isProxy: boolean; isVpn: boolean; isTor: boolean; isDatacenter: boolean } {
    if (!ipIntel) {
      return { ...basic, isTor: false, isDatacenter: false };
    }

    return {
      score: Math.min(100, basic.score + ipIntel.fraudScore),
      isProxy: basic.isProxy || ipIntel.isProxy,
      isVpn: basic.isVpn || ipIntel.isVpn,
      isTor: ipIntel.isTor,
      isDatacenter: ipIntel.isDatacenter,
    };
  }

  private analyzeSuspiciousTraffic(data: {
    fraudScore: number;
    isProxy: boolean;
    isVpn: boolean;
    isTor: boolean;
    isDatacenter: boolean;
    isBot: boolean;
    isGeoMatch: boolean;
    isUnique: boolean;
  }): { isSuspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // High fraud score
    if (data.fraudScore >= 50) {
      reasons.push("high_fraud_score");
    }
    
    // Proxy/VPN/Tor detection
    if (data.isProxy) reasons.push("proxy_detected");
    if (data.isVpn) reasons.push("vpn_detected");
    if (data.isTor) reasons.push("tor_detected");
    if (data.isDatacenter) reasons.push("datacenter_ip");
    
    // Bot detection
    if (data.isBot) reasons.push("bot_detected");
    
    // GEO mismatch (potential fraud)
    if (!data.isGeoMatch) reasons.push("geo_mismatch");
    
    // Duplicate click (not unique)
    if (!data.isUnique) reasons.push("duplicate_click");
    
    // Consider suspicious if fraud score >= 50 OR any critical signals
    const isSuspicious = data.fraudScore >= 50 || 
                          data.isTor || 
                          data.isBot || 
                          (data.isProxy && data.isVpn);
    
    return { isSuspicious, reasons };
  }

  private async notifySuspiciousTraffic(
    advertiserId: string, 
    offerId: string, 
    clickId: string, 
    reasons: string[]
  ): Promise<void> {
    try {
      const { notificationService } = await import("./notification-service");
      
      const reasonLabels: Record<string, string> = {
        high_fraud_score: "Высокий fraud score",
        proxy_detected: "Обнаружен прокси",
        vpn_detected: "Обнаружен VPN",
        tor_detected: "Обнаружен Tor",
        datacenter_ip: "IP датацентра",
        bot_detected: "Обнаружен бот",
        geo_mismatch: "Несоответствие GEO",
        duplicate_click: "Дубликат клика",
      };
      
      const readableReasons = reasons.map(r => reasonLabels[r] || r).join(", ");
      
      await storage.createNotification({
        senderId: advertiserId,
        senderRole: "system",
        recipientId: advertiserId,
        advertiserScopeId: advertiserId,
        type: "antifraud",
        title: "Подозрительный трафик",
        body: `Обнаружен подозрительный клик: ${readableReasons}`,
        entityType: "click",
        entityId: clickId,
      });
    } catch (error) {
      console.error("Failed to send suspicious traffic notification:", error);
    }
  }
}

export const clickHandler = new ClickHandler();
