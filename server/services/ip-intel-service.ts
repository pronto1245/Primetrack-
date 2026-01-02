import { storage } from "../storage";
import { HttpClient, ExternalApiError } from "../lib/http-client";

interface IpInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    relay: boolean;
    hosting: boolean;
  };
  asn?: {
    asn: string;
    name: string;
    domain?: string;
    route?: string;
    type?: string;
  };
}

export interface IpIntelligence {
  ip: string;
  country: string;
  city: string;
  region: string;
  isp: string;
  asn: string;
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  fraudScore: number;
}

class IpIntelService {
  private cache = new Map<string, { data: IpIntelligence; expires: number }>();
  private cacheTTL = 3600000;
  private tokenCache: { token: string | null; expires: number } | null = null;
  private tokenCacheTTL = 60000; // 1 minute

  private async getToken(): Promise<string | null> {
    // Check env first
    if (process.env.IPINFO_TOKEN) {
      return process.env.IPINFO_TOKEN;
    }
    
    // Check cached DB token
    if (this.tokenCache && this.tokenCache.expires > Date.now()) {
      return this.tokenCache.token;
    }
    
    // Fetch from DB
    try {
      const settings = await storage.getPlatformSettings();
      const token = settings?.ipinfoToken || null;
      this.tokenCache = { token, expires: Date.now() + this.tokenCacheTTL };
      return token;
    } catch (error) {
      console.error("[IpIntel] Failed to fetch token from DB:", error);
      return null;
    }
  }

  async getIpIntelligence(ip: string): Promise<IpIntelligence> {
    if (!ip || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return this.getLocalIpResult(ip);
    }

    const cached = this.cache.get(ip);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const token = await this.getToken();
    if (!token) {
      return this.getFallbackIntelligence(ip);
    }

    try {
      const client = new HttpClient("IPinfo", {
        baseUrl: "https://ipinfo.io",
        timeout: 5000,
        retries: 2,
      });

      const data: IpInfo = await client.get(`/${ip}?token=${token}`);
      const intel = this.parseIpInfo(ip, data);
      
      this.cache.set(ip, { data: intel, expires: Date.now() + this.cacheTTL });
      
      return intel;
    } catch (error: any) {
      if (error instanceof ExternalApiError) {
        console.warn(`[IpIntel] API error for ${ip}: ${error.message}`);
      } else {
        console.error(`[IpIntel] Unexpected error for ${ip}:`, error.message);
      }
      return this.getFallbackIntelligence(ip);
    }
  }

  private parseIpInfo(ip: string, data: IpInfo): IpIntelligence {
    const isProxy = data.privacy?.proxy ?? false;
    const isVpn = data.privacy?.vpn ?? false;
    const isTor = data.privacy?.tor ?? false;
    const isDatacenter = data.privacy?.hosting ?? this.detectDatacenter(data.org);

    let fraudScore = 0;
    if (isProxy) fraudScore += 25;
    if (isVpn) fraudScore += 20;
    if (isTor) fraudScore += 40;
    if (isDatacenter) fraudScore += 15;

    return {
      ip,
      country: data.country || "XX",
      city: data.city || "",
      region: data.region || "",
      isp: data.org || "",
      asn: data.asn?.asn || this.extractAsn(data.org),
      isProxy,
      isVpn,
      isTor,
      isDatacenter,
      fraudScore,
    };
  }

  private extractAsn(org?: string): string {
    if (!org) return "";
    const match = org.match(/^AS(\d+)/);
    return match ? `AS${match[1]}` : "";
  }

  private detectDatacenter(org?: string): boolean {
    if (!org) return false;
    const dcPatterns = [
      "amazon", "aws", "google", "microsoft", "azure", "digitalocean",
      "linode", "vultr", "ovh", "hetzner", "scaleway", "contabo",
      "cloudflare", "fastly", "akamai", "cdn", "hosting", "datacenter",
      "server", "vps", "cloud"
    ];
    const lowerOrg = org.toLowerCase();
    return dcPatterns.some(pattern => lowerOrg.includes(pattern));
  }

  private getLocalIpResult(ip: string): IpIntelligence {
    return {
      ip,
      country: "XX",
      city: "Local",
      region: "",
      isp: "Local Network",
      asn: "",
      isProxy: false,
      isVpn: false,
      isTor: false,
      isDatacenter: false,
      fraudScore: 0,
    };
  }

  private getFallbackIntelligence(ip: string): IpIntelligence {
    const isDatacenter = this.detectDatacenterByIp(ip);
    
    return {
      ip,
      country: "",
      city: "",
      region: "",
      isp: "",
      asn: "",
      isProxy: false,
      isVpn: false,
      isTor: false,
      isDatacenter,
      fraudScore: isDatacenter ? 15 : 0,
    };
  }

  private detectDatacenterByIp(ip: string): boolean {
    const dcRanges = [
      "104.16.", "104.17.", "104.18.", "104.19.", "104.20.",
      "172.64.", "172.65.", "172.66.", "172.67.",
      "185.199.",
      "151.101.",
      "23.227.",
      "13.32.", "13.33.", "13.34.", "13.35.",
      "52.84.", "52.85.", "52.86.",
      "34.64.", "34.65.", "34.66.",
      "35.186.", "35.187.", "35.188.", "35.189.",
    ];
    return dcRanges.some(prefix => ip.startsWith(prefix));
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const ipIntelService = new IpIntelService();
