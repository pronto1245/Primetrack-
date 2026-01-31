import crypto from "crypto";
import { storage } from "../storage";
import type { InsertClick } from "@shared/schema";
import { ipIntelService } from "./ip-intel-service";
import { antiFraudService, type FraudSignals } from "./antifraud-service";
import { resolveLanguage, logClickMetric } from "./geo-language";
import { offerCache } from "./offer-cache";
import geoip from "geoip-lite";

const IP_INTEL_TIMEOUT_MS = 200;

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

type ClickStatus = "valid" | "blocked" | "rejected" | "error";
type ClickErrorReason = "offer_not_found" | "offer_inactive" | "no_landing" | "fraud_block" | "cap_reached" | "geo_mismatch";

interface ClickResult {
  id: string;  // Primary key of clicks table (for FK references)
  clickId: string;  // Unique click_id field (for external tracking)
  redirectUrl: string;
  fraudScore: number;
  isBlocked: boolean;
  status: ClickStatus;
  errorReason?: ClickErrorReason;
  capReached?: boolean;
}

const buildSystemUnavailableUrl = (lang: string): string => `/system/unavailable?lang=${lang}`;

interface ParsedUA {
  device: string;
  os: string;
  browser: string;
  isBot: boolean;
}

export class ClickHandler {
  async processClick(params: ClickParams): Promise<ClickResult> {
    const startTime = Date.now();
    const clickId = this.generateClickId();
    
    let errorReason: ClickErrorReason | undefined;
    let status: ClickStatus = "valid";
    let isBlocked = false;
    let capReached = false;
    
    // PHASE 1: Get offer (required for all other operations) - with negative cache
    const t1 = Date.now();
    let offer: any = null;
    const cachedOffer = offerCache.getOffer(params.offerId);
    if (cachedOffer) {
      offer = cachedOffer.data; // May be null for negative cache hit
    } else {
      offer = await storage.getOffer(params.offerId);
      offerCache.setOffer(params.offerId, offer); // Cache both found and not found
    }
    const offerTime = Date.now() - t1;
    
    if (!offer) {
      errorReason = "offer_not_found";
      status = "error";
      isBlocked = true;
    } else if (offer.status !== "active") {
      errorReason = "offer_inactive";
      status = "rejected";
      isBlocked = true;
    }
    
    // Early exit for invalid offers
    if (errorReason) {
      const lang = resolveLanguage(undefined, params.geo);
      console.log(`[CLICK-TIMING] clickId=${clickId} total=${Date.now() - startTime}ms (early exit: ${errorReason})`);
      const savedClick = await storage.createClick({
        clickId,
        offerId: params.offerId,
        publisherId: params.partnerId,
        status,
        errorReason,
        redirectUrl: buildSystemUnavailableUrl(lang),
        ip: params.ip,
        userAgent: params.userAgent,
        geo: params.geo,
      } as InsertClick);
      return {
        id: savedClick.id,
        clickId,
        redirectUrl: buildSystemUnavailableUrl(lang),
        fraudScore: 0,
        isBlocked: true,
        status,
        errorReason,
        capReached: false,
      };
    }
    
    // PHASE 2: Parallel operations - caps, landings, publisherOffer, uniqueness, IP intel with timeout
    const t2 = Date.now();
    const parsedUA = this.parseUserAgent(params.userAgent);
    
    // Fast GEO fallback using geoip-lite (local, instant)
    const fastGeo = params.ip ? geoip.lookup(params.ip)?.country : null;
    
    // IP Intel with timeout - don't block redirect for slow external API
    const ipIntelPromise = params.ip 
      ? Promise.race([
          ipIntelService.getIpIntelligence(params.ip),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), IP_INTEL_TIMEOUT_MS))
        ])
      : Promise.resolve(null);
    
    // Run all independent operations in parallel - with caching for landings/publisherOffer
    const cachedLandings = offerCache.getLandings(params.offerId);
    const cachedPublisherOffer = offerCache.getPublisherOffer(params.offerId, params.partnerId);
    
    // Determine which DB calls are needed (cache returns {found, data} or null)
    const needLandingsFromDb = !cachedLandings;
    const needPublisherOfferFromDb = !cachedPublisherOffer;
    
    const [capsCheck, landingsFromDb, publisherOfferFromDb, isUnique, ipIntel] = await Promise.all([
      storage.checkOfferCaps(params.offerId),
      needLandingsFromDb ? storage.getOfferLandings(params.offerId) : Promise.resolve(null),
      needPublisherOfferFromDb ? storage.getPublisherOffer(params.offerId, params.partnerId) : Promise.resolve(null),
      this.checkUniqueness(params.ip, params.offerId, params.partnerId),
      ipIntelPromise,
    ]);
    
    // Resolve final values from cache or DB
    let landings: any[] = cachedLandings?.data || [];
    let publisherOffer: any = cachedPublisherOffer?.data || null;
    
    if (needLandingsFromDb) {
      landings = landingsFromDb || [];
      offerCache.setLandings(params.offerId, landings);
    }
    if (needPublisherOfferFromDb) {
      publisherOffer = publisherOfferFromDb;
      offerCache.setPublisherOffer(params.offerId, params.partnerId, publisherOffer);
    }
    const parallelTime = Date.now() - t2;
    
    // Use IP intel GEO if available, otherwise fallback to fast geoip-lite
    const detectedGeo = ipIntel?.country || fastGeo || params.geo;
    
    // Check caps (offer is guaranteed to exist after early exit check)
    if (capsCheck.dailyCapReached || capsCheck.monthlyCapReached || capsCheck.totalCapReached) {
      errorReason = "cap_reached";
      status = "rejected";
      capReached = true;
      isBlocked = offer!.capReachedAction === "block";
    }
    
    // Select landing
    let landing: any = null;
    if (!errorReason) {
      landing = this.selectLanding(landings, detectedGeo, params.landingId);
      if (!landing) {
        errorReason = "no_landing";
        status = "error";
        isBlocked = true;
      }
    }
    
    // GEO matching
    let isOfferGeoMatch = true;
    let isPublisherGeoAllowed = true;
    let isGeoMatch = true;
    
    if (!errorReason) {
      isOfferGeoMatch = this.checkGeoMatch(detectedGeo, offer!.geo);
      isPublisherGeoAllowed = !publisherOffer?.approvedGeos || 
        publisherOffer.approvedGeos.length === 0 || 
        (detectedGeo ? publisherOffer.approvedGeos.includes(detectedGeo) : true);
      isGeoMatch = isOfferGeoMatch && isPublisherGeoAllowed;
    }
    
    // PHASE 3: Antifraud evaluation (must block before redirect)
    const t3 = Date.now();
    const basicFraudCheck = this.performBasicFraudCheck(params.ip, params.userAgent);
    const fraudCheck = this.mergeFraudChecks(basicFraudCheck, ipIntel);
    
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
    
    let antifraudResult = { action: "allow" as string, fraudScore: fraudCheck.score, matchedRules: [] as any[] };
    if (!errorReason) {
      const fraudSignals: FraudSignals = {
        ip: params.ip,
        userAgent: params.userAgent,
        country: detectedGeo,
        fingerprint: params.visitorId,
        isProxy: fraudCheck.isProxy,
        isVpn: fraudCheck.isVpn,
        isBot: parsedUA.isBot,
        isDatacenter: fraudCheck.isDatacenter,
        fraudScore: fraudCheck.score,
        signals: suspiciousAnalysis.reasons,
      };
      
      antifraudResult = await antiFraudService.evaluateClick(
        params.offerId,
        offer!.advertiserId,
        params.partnerId,
        fraudSignals
      );
      
      if (antifraudResult.action === "block" || fraudCheck.score >= 80) {
        errorReason = "fraud_block";
        status = "blocked";
        isBlocked = true;
      }
    }
    const antifraudTime = Date.now() - t3;
    
    // PHASE 4: Build redirect URL
    const clickIdParam = landing?.clickIdParam || "click_id";
    const lang = resolveLanguage(offer!.language, detectedGeo);
    let redirectUrl = buildSystemUnavailableUrl(lang);
    
    if (landing && !isBlocked) {
      redirectUrl = this.buildRedirectUrl(landing.landingUrl, clickId, params, clickIdParam);
    } else if (capReached && offer!.capRedirectUrl) {
      redirectUrl = offer!.capRedirectUrl;
    }
    
    // PHASE 5: Save click (synchronous - must not lose data)
    const t4 = Date.now();
    const clickData: InsertClick = {
      clickId,
      offerId: params.offerId,
      publisherId: params.partnerId,
      landingId: landing?.id || null,
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
      isSuspicious: suspiciousAnalysis.isSuspicious || antifraudResult.action !== "allow",
      suspiciousReasons: suspiciousAnalysis.reasons.length > 0 ? JSON.stringify(suspiciousAnalysis.reasons) : null,
      antifraudAction: antifraudResult.action,
      matchedRuleIds: antifraudResult.matchedRules.length > 0 
        ? JSON.stringify(antifraudResult.matchedRules.map(r => r.id)) 
        : null,
      isp: ipIntel?.isp,
      asn: ipIntel?.asn,
      visitorId: params.visitorId,
      fingerprintConfidence: params.fingerprintConfidence?.toString(),
      redirectUrl,
      status,
      errorReason: errorReason || null,
    };
    
    const savedClick = await storage.createClick(clickData);
    const saveTime = Date.now() - t4;
    
    // Log timing
    const totalTime = Date.now() - startTime;
    console.log(`[CLICK-TIMING] clickId=${clickId} total=${totalTime}ms offer=${offerTime}ms parallel=${parallelTime}ms antifraud=${antifraudTime}ms save=${saveTime}ms ipIntel=${ipIntel ? 'hit' : 'miss'}`);
    
    // PHASE 6: Fire-and-forget async operations (don't block redirect)
    const advertiserId = offer!.advertiserId;
    setImmediate(() => {
      // Antifraud log
      if (antifraudResult.action !== "allow" || antifraudResult.matchedRules.length > 0) {
        storage.createAntifraudLog({
          advertiserId,
          offerId: params.offerId,
          publisherId: params.partnerId,
          clickId: savedClick.id,
          action: antifraudResult.action,
          fraudScore: antifraudResult.fraudScore,
          isProxy: fraudCheck.isProxy,
          isVpn: fraudCheck.isVpn,
          isBot: parsedUA.isBot,
          isDatacenter: fraudCheck.isDatacenter,
          matchedRuleIds: antifraudResult.matchedRules.map(r => r.id),
          signals: JSON.stringify(suspiciousAnalysis.reasons),
          ip: params.ip,
          userAgent: params.userAgent,
          country: detectedGeo,
        }).catch((err) => console.error("Failed to create antifraud log:", err));
      }
      
      // Suspicious traffic notification
      if (suspiciousAnalysis.isSuspicious || antifraudResult.action !== "allow") {
        this.notifySuspiciousTraffic(advertiserId, params.offerId, clickId, suspiciousAnalysis.reasons);
      }
      
      // Click metric
      logClickMetric(status, detectedGeo || 'XX', errorReason);
    });
    
    return {
      id: savedClick.id,
      clickId,
      redirectUrl,
      fraudScore: antifraudResult.fraudScore,
      isBlocked,
      status,
      errorReason,
      capReached,
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
    console.log(`[buildRedirectUrl] INPUT: baseUrl=${baseUrl}, clickId=${clickId}, clickIdParam=${clickIdParam}`);
    let urlString = baseUrl;
    let clickIdReplaced = false;
    
    // Replace encoded placeholders ONLY (%7B = {, %7D = }) - don't decode entire URL
    // This preserves valid %20 and other encodings while handling %7Bclick_id%7D
    urlString = urlString.replace(/%7Bclick_id%7D/gi, clickId);
    urlString = urlString.replace(/%7Bclickid%7D/gi, clickId);
    if (/%7B(click_id|clickid)%7D/gi.test(baseUrl)) {
      clickIdReplaced = true;
      console.log(`[buildRedirectUrl] Replaced encoded %7Bclick_id%7D placeholder`);
    }
    
    // Replace standard {click_id} token (case-insensitive, handles {CLICK_ID}, {Click_Id}, etc.)
    if (/\{click_id\}/gi.test(urlString)) {
      urlString = urlString.replace(/\{click_id\}/gi, clickId);
      clickIdReplaced = true;
      console.log(`[buildRedirectUrl] Replaced {click_id} placeholder`);
    }
    
    // Replace custom click_id parameter token (e.g., {aff_click_id}, {subid}, {s2sclick_id})
    // Escape special regex characters in parameter name
    if (clickIdParam !== "click_id") {
      const escapedParam = clickIdParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Check encoded version first
      const encodedPlaceholder = `%7B${clickIdParam}%7D`;
      if (urlString.toLowerCase().includes(encodedPlaceholder.toLowerCase())) {
        urlString = urlString.replace(new RegExp(`%7B${escapedParam}%7D`, "gi"), clickId);
        clickIdReplaced = true;
        console.log(`[buildRedirectUrl] Replaced encoded %7B${clickIdParam}%7D placeholder`);
      }
      // Check regular version
      const customParamRegex = new RegExp(`\\{${escapedParam}\\}`, "gi");
      if (customParamRegex.test(urlString)) {
        urlString = urlString.replace(new RegExp(`\\{${escapedParam}\\}`, "gi"), clickId);
        clickIdReplaced = true;
        console.log(`[buildRedirectUrl] Replaced {${clickIdParam}} placeholder`);
      }
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
    
    // Handle URL with fragment - insert params before #
    const hashIndex = urlString.indexOf("#");
    const fragment = hashIndex !== -1 ? urlString.substring(hashIndex) : "";
    const urlWithoutFragment = hashIndex !== -1 ? urlString.substring(0, hashIndex) : urlString;
    
    const url = new URL(urlWithoutFragment);
    
    // Only add click_id parameter if it wasn't already replaced from placeholder
    if (!clickIdReplaced) {
      url.searchParams.set(clickIdParam, clickId);
    }
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
    
    const finalUrl = url.toString() + fragment;
    console.log(`[buildRedirectUrl] OUTPUT: ${finalUrl}, clickIdReplaced=${clickIdReplaced}`);
    return finalUrl;
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
