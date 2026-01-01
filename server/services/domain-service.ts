import crypto from "crypto";
import dns from "dns";
import { promisify } from "util";
import { storage } from "../storage";
import type { CustomDomain } from "@shared/schema";
import { tlsChecker, type SslStatus } from "./tls-checker";
import { cloudflareService } from "../cloudflare-service";

const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const resolveCname = promisify(resolver.resolveCname.bind(resolver));
const resolve4 = promisify(resolver.resolve4.bind(resolver));

interface DomainVerificationResult {
  success: boolean;
  error?: string;
  verifiedAt?: Date;
}

class DomainService {
  generateVerificationToken(): string {
    return `verify-${crypto.randomBytes(16).toString("hex")}`;
  }

  private async getCnameTarget(): Promise<string> {
    try {
      const cnameTarget = await cloudflareService.getCnameTarget();
      if (cnameTarget) return cnameTarget;
      
      const settings = await storage.getPlatformSettings();
      return settings?.cloudflareCnameTarget || process.env.PLATFORM_CNAME_TARGET || "customers.example.com";
    } catch {
      return process.env.PLATFORM_CNAME_TARGET || "customers.example.com";
    }
  }

  async verifyDomain(domainId: string): Promise<DomainVerificationResult> {
    const domainRecord = await storage.getCustomDomain(domainId);
    if (!domainRecord) {
      return { success: false, error: "Domain not found" };
    }

    try {
      const result = await this.verifyCname(domainRecord);
      
      if (result.success) {
        // After DNS verified, provision in Cloudflare if not already done
        await this.provisionInCloudflare(domainRecord);
      }
      
      return result;
    } catch (error: any) {
      await storage.updateCustomDomain(domainId, {
        lastError: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  private async verifyCname(domain: CustomDomain): Promise<DomainVerificationResult> {
    const expectedCname = await this.getCnameTarget();
    
    // Try CNAME first
    try {
      const records = await resolveCname(domain.domain);
      const foundRecord = records.find(
        record => record.toLowerCase() === expectedCname.toLowerCase() ||
                  record.toLowerCase().endsWith(expectedCname.toLowerCase())
      );

      if (foundRecord) {
        const verifiedAt = new Date();
        await storage.updateCustomDomain(domain.id, {
          isVerified: true,
          verifiedAt,
          sslStatus: "ssl_activating",
          lastError: null,
        });
        console.log(`[Domain] CNAME verified for ${domain.domain}: ${foundRecord}`);
        return { success: true, verifiedAt };
      } else {
        return {
          success: false,
          error: `CNAME найден (${records[0]}) но не соответствует ожидаемому (${expectedCname})`
        };
      }
    } catch (error: any) {
      if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
        console.log(`[Domain] CNAME not found for ${domain.domain}, trying A record fallback...`);
      } else {
        throw error;
      }
    }

    // Fallback: Check A record (Cloudflare Proxy converts CNAME to A)
    try {
      const domainIps = await resolve4(domain.domain);
      
      if (domainIps && domainIps.length > 0) {
        console.log(`[Domain] A record found for ${domain.domain}: ${domainIps.join(", ")}`);
        
        const verifiedAt = new Date();
        await storage.updateCustomDomain(domain.id, {
          isVerified: true,
          verifiedAt,
          sslStatus: "ssl_activating",
          lastError: null,
        });
        return { success: true, verifiedAt };
      }
    } catch (error: any) {
      if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
        return { 
          success: false, 
          error: `DNS записи не найдены. Добавьте CNAME запись: ${domain.domain} → ${expectedCname}` 
        };
      }
      throw error;
    }

    return { 
      success: false, 
      error: `DNS записи не найдены. Добавьте CNAME запись: ${domain.domain} → ${expectedCname}` 
    };
  }

  private async provisionInCloudflare(domain: CustomDomain): Promise<void> {
    // Skip if already provisioned
    if (domain.cloudflareHostnameId) {
      console.log(`[Domain] ${domain.domain} already has Cloudflare hostname: ${domain.cloudflareHostnameId}`);
      return;
    }

    // Check if Cloudflare is configured
    const isConfigured = await cloudflareService.isCloudflareConfigured();
    if (!isConfigured) {
      console.log(`[Domain] Cloudflare not configured, skipping provisioning for ${domain.domain}`);
      await storage.updateCustomDomain(domain.id, {
        lastError: "Cloudflare SSL for SaaS не настроен. Обратитесь к администратору.",
        sslStatus: "ssl_failed",
      });
      return;
    }

    console.log(`[Domain] Provisioning ${domain.domain} in Cloudflare...`);
    const result = await cloudflareService.provisionDomain(domain.id, domain.domain);
    
    if (!result.success) {
      console.error(`[Domain] Cloudflare provisioning failed for ${domain.domain}: ${result.error}`);
      await storage.updateCustomDomain(domain.id, {
        lastError: result.error,
        sslStatus: "ssl_failed",
      });
    } else {
      console.log(`[Domain] Cloudflare provisioning started for ${domain.domain}`);
    }
  }

  async checkSsl(domainId: string): Promise<{ 
    success: boolean; 
    status: SslStatus;
    error?: string;
    expiresAt?: Date;
    issuer?: string;
  }> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain) {
      return { success: false, status: "unverified", error: "Domain not found" };
    }
    if (!domain.isVerified) {
      return { success: false, status: "unverified", error: "Domain must be verified first" };
    }

    console.log(`[Domain] Checking SSL for ${domain.domain}...`);

    // First sync with Cloudflare to get latest status
    if (domain.cloudflareHostnameId) {
      try {
        const syncResult = await cloudflareService.syncDomainStatus(domainId);
        console.log(`[Domain] Cloudflare sync for ${domain.domain}: status=${syncResult.status}, ssl=${syncResult.sslStatus}`);
        
        if (syncResult.error) {
          return {
            success: false,
            status: "ssl_failed",
            error: syncResult.error,
          };
        }
        
        // If Cloudflare says pending, return early
        if (syncResult.status !== "active" || syncResult.sslStatus !== "active") {
          await storage.updateCustomDomain(domainId, {
            sslStatus: "ssl_activating",
          });
          return {
            success: false,
            status: "ssl_activating",
            error: `Cloudflare: hostname=${syncResult.status}, ssl=${syncResult.sslStatus}. Ожидайте активации.`,
          };
        }
      } catch (error: any) {
        console.error(`[Domain] Cloudflare sync error for ${domain.domain}:`, error);
      }
    } else {
      // No Cloudflare hostname - try to provision
      await this.provisionInCloudflare(domain);
      
      const updatedDomain = await storage.getCustomDomain(domainId);
      if (!updatedDomain?.cloudflareHostnameId) {
        return {
          success: false,
          status: "ssl_failed",
          error: "Не удалось создать hostname в Cloudflare. Проверьте настройки.",
        };
      }
      
      return {
        success: false,
        status: "ssl_activating",
        error: "Hostname создан в Cloudflare. Ожидайте активации SSL.",
      };
    }

    // Now do real TLS + HTTP check
    console.log(`[Domain] Running TLS handshake + HTTP check for ${domain.domain}...`);
    const result = await tlsChecker.checkDomainSsl(domainId);
    
    console.log(`[Domain] SSL check result for ${domain.domain}: success=${result.success}, status=${result.status}, error=${result.error}`);
    return result;
  }

  private async getPlatformDomain(): Promise<string> {
    try {
      const settings = await storage.getPlatformSettings();
      return settings?.cloudflareFallbackOrigin || process.env.PLATFORM_DOMAIN || "tracking.example.com";
    } catch {
      return process.env.PLATFORM_DOMAIN || "tracking.example.com";
    }
  }

  async getTrackingUrl(advertiserId: string, offerId: string, landingId: string, customDomain?: string): Promise<string> {
    const platformDomain = await this.getPlatformDomain();
    const baseUrl = customDomain 
      ? `https://${customDomain}`
      : `https://${platformDomain}`;
    
    return `${baseUrl}/click/${offerId}/${landingId}`;
  }

  async getPrimaryDomainForAdvertiser(advertiserId: string): Promise<string | null> {
    const domains = await storage.getCustomDomainsByAdvertiser(advertiserId);
    
    // Only return domains with active SSL
    const primaryDomain = domains.find(d => d.isPrimary && d.isVerified && d.isActive && d.sslStatus === "ssl_active");
    
    if (primaryDomain) {
      return primaryDomain.domain;
    }

    const anyActiveDomain = domains.find(d => d.isVerified && d.isActive && d.sslStatus === "ssl_active");
    return anyActiveDomain?.domain || null;
  }

  async generateTrackingLinks(
    advertiserId: string,
    offerId: string,
    landingId: string
  ): Promise<{ platform: string; custom?: string }> {
    const platformDomain = await this.getPlatformDomain();
    const platformUrl = `https://${platformDomain}/click/${offerId}/${landingId}`;
    const customDomain = await this.getPrimaryDomainForAdvertiser(advertiserId);

    if (customDomain) {
      return {
        platform: platformUrl,
        custom: `https://${customDomain}/click/${offerId}/${landingId}`,
      };
    }

    return { platform: platformUrl };
  }

  validateDomainFormat(domain: string): { valid: boolean; error?: string } {
    const cleanDomain = domain.toLowerCase().trim();
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    
    if (!domainRegex.test(cleanDomain)) {
      return { valid: false, error: "Неверный формат домена" };
    }

    if (cleanDomain.length > 253) {
      return { valid: false, error: "Имя домена слишком длинное" };
    }

    const parts = cleanDomain.split(".");
    for (const part of parts) {
      if (part.length > 63) {
        return { valid: false, error: "Часть домена слишком длинная" };
      }
      if (part.startsWith("-") || part.endsWith("-")) {
        return { valid: false, error: "Части домена не могут начинаться или заканчиваться дефисом" };
      }
    }

    const reserved = ["localhost", "example.com", "test.com"];
    if (reserved.some(r => cleanDomain.includes(r))) {
      return { valid: false, error: "Зарезервированное имя домена" };
    }

    return { valid: true };
  }

  async checkDomainAvailability(domain: string, excludeDomainId?: string): Promise<{ available: boolean; error?: string }> {
    const existing = await storage.getCustomDomainByDomain(domain.toLowerCase().trim());
    
    if (existing && existing.id !== excludeDomainId) {
      return { available: false, error: "Домен уже зарегистрирован" };
    }

    return { available: true };
  }

  async reprovisionDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain) {
      return { success: false, error: "Domain not found" };
    }

    // Delete existing Cloudflare hostname if exists
    if (domain.cloudflareHostnameId) {
      try {
        await cloudflareService.deprovisionDomain(domainId);
      } catch (error) {
        console.error(`[Domain] Failed to delete old hostname:`, error);
      }
    }

    // Reset domain state
    await storage.updateCustomDomain(domainId, {
      cloudflareHostnameId: null,
      cloudflareStatus: null,
      cloudflareSslStatus: null,
      sslStatus: "ssl_activating",
      lastError: null,
      cloudflareError: null,
    });

    // Re-provision
    await this.provisionInCloudflare(domain);
    
    const updated = await storage.getCustomDomain(domainId);
    if (updated?.cloudflareHostnameId) {
      return { success: true };
    }
    
    return { success: false, error: updated?.lastError || "Не удалось создать hostname" };
  }
}

export const domainService = new DomainService();
