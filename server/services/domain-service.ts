import crypto from "crypto";
import dns from "dns";
import { promisify } from "util";
import { storage } from "../storage";
import type { CustomDomain } from "@shared/schema";

const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const resolveCname = promisify(resolver.resolveCname.bind(resolver));
const resolveTxt = promisify(resolver.resolveTxt.bind(resolver));

interface DomainVerificationResult {
  success: boolean;
  error?: string;
  verifiedAt?: Date;
}

interface DnsRecord {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
}

class DomainService {
  private platformDomain = process.env.PLATFORM_DOMAIN || "primetrack.pro";

  generateVerificationToken(): string {
    return `primetrack-verify-${crypto.randomBytes(16).toString("hex")}`;
  }

  getDnsInstructions(domain: string, verificationToken: string, method: "cname" | "txt" = "cname"): DnsRecord[] {
    if (method === "cname") {
      return [
        {
          type: "CNAME",
          name: domain,
          value: `tracking.${this.platformDomain}`,
        },
      ];
    } else {
      return [
        {
          type: "TXT",
          name: `_primetrack.${domain}`,
          value: verificationToken,
        },
        {
          type: "CNAME",
          name: domain,
          value: `tracking.${this.platformDomain}`,
        },
      ];
    }
  }

  async verifyDomain(domainId: string): Promise<DomainVerificationResult> {
    const domainRecord = await storage.getCustomDomain(domainId);
    if (!domainRecord) {
      return { success: false, error: "Domain not found" };
    }

    try {
      if (domainRecord.verificationMethod === "cname") {
        return await this.verifyCname(domainRecord);
      } else {
        return await this.verifyTxt(domainRecord);
      }
    } catch (error: any) {
      await storage.updateCustomDomain(domainId, {
        lastError: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  private async verifyCname(domain: CustomDomain): Promise<DomainVerificationResult> {
    try {
      const records = await resolveCname(domain.domain);
      const expectedCname = `tracking.${this.platformDomain}`;
      
      const isValid = records.some(
        record => record.toLowerCase() === expectedCname.toLowerCase()
      );

      if (isValid) {
        const verifiedAt = new Date();
        // SSL must be configured externally via Cloudflare
        await storage.updateCustomDomain(domain.id, {
          isVerified: true,
          verifiedAt,
          sslStatus: "pending_external", // User must configure SSL via Cloudflare
          lastError: null,
        });

        return { success: true, verifiedAt };
      } else {
        return {
          success: false,
          error: `CNAME record not found or incorrect. Expected: ${expectedCname}, Found: ${records.join(", ")}`,
        };
      }
    } catch (error: any) {
      if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
        return { success: false, error: "CNAME record not found. Please add the DNS record." };
      }
      throw error;
    }
  }

  private async verifyTxt(domain: CustomDomain): Promise<DomainVerificationResult> {
    try {
      const txtHost = `_primetrack.${domain.domain}`;
      const records = await resolveTxt(txtHost);
      const flatRecords = records.flat();
      
      const isValid = flatRecords.some(
        record => record === domain.verificationToken
      );

      if (!isValid) {
        return {
          success: false,
          error: `TXT record not found or incorrect. Expected: ${domain.verificationToken}`,
        };
      }

      const cnameRecords = await resolveCname(domain.domain).catch(() => []);
      const expectedCname = `tracking.${this.platformDomain}`;
      const hasCname = cnameRecords.some(
        record => record.toLowerCase() === expectedCname.toLowerCase()
      );

      if (!hasCname) {
        return {
          success: false,
          error: "TXT record verified, but CNAME record is still missing.",
        };
      }

      const verifiedAt = new Date();
      // SSL must be configured externally via Cloudflare
      await storage.updateCustomDomain(domain.id, {
        isVerified: true,
        verifiedAt,
        sslStatus: "pending_external", // User must configure SSL via Cloudflare
        lastError: null,
      });

      return { success: true, verifiedAt };
    } catch (error: any) {
      if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
        return { success: false, error: "TXT record not found. Please add the DNS record." };
      }
      throw error;
    }
  }

  // SSL provisioning via ACME is disabled - requires external configuration via Cloudflare
  // Keeping method for potential future use with dedicated servers
  private async provisionSsl(domainId: string): Promise<void> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain || !domain.isVerified) return;

    try {
      const { acmeService } = await import("./acme-service");
      const result = await acmeService.provisionCertificate(domainId);
      
      if (result.success) {
        console.log(`[Domain] SSL certificate issued via Let's Encrypt for ${domain.domain}`);
        return;
      }
      
      console.error(`[Domain] ACME provisioning failed for ${domain.domain}: ${result.error}`);
      
      await storage.updateCustomDomain(domainId, {
        sslStatus: "failed",
        lastError: result.error || "Certificate provisioning failed",
      });
    } catch (error: any) {
      console.error(`[Domain] SSL provisioning error for ${domain.domain}:`, error.message);
      
      await storage.updateCustomDomain(domainId, {
        sslStatus: "failed",
        lastError: error.message || "SSL provisioning error",
      });
    }
  }

  async retryProvisionSsl(domainId: string): Promise<{ success: boolean; error?: string }> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain) {
      return { success: false, error: "Domain not found" };
    }
    if (!domain.isVerified) {
      return { success: false, error: "Domain must be verified first" };
    }

    await storage.updateCustomDomain(domainId, {
      sslStatus: "provisioning",
      lastError: null,
    });

    try {
      await this.provisionSsl(domainId);
      const updated = await storage.getCustomDomain(domainId);
      return { 
        success: updated?.sslStatus === "active",
        error: updated?.lastError || undefined
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  getTrackingUrl(advertiserId: string, offerId: string, landingId: string, customDomain?: string): string {
    const baseUrl = customDomain 
      ? `https://${customDomain}`
      : `https://${this.platformDomain}`;
    
    return `${baseUrl}/click/${offerId}/${landingId}`;
  }

  async getPrimaryDomainForAdvertiser(advertiserId: string): Promise<string | null> {
    const domains = await storage.getCustomDomainsByAdvertiser(advertiserId);
    const primaryDomain = domains.find(d => d.isPrimary && d.isVerified && d.isActive);
    
    if (primaryDomain) {
      return primaryDomain.domain;
    }

    const anyVerifiedDomain = domains.find(d => d.isVerified && d.isActive);
    return anyVerifiedDomain?.domain || null;
  }

  async generateTrackingLinks(
    advertiserId: string,
    offerId: string,
    landingId: string
  ): Promise<{ platform: string; custom?: string }> {
    const platformUrl = `https://${this.platformDomain}/click/${offerId}/${landingId}`;
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
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    
    if (!domainRegex.test(domain)) {
      return { valid: false, error: "Invalid domain format" };
    }

    if (domain.length > 253) {
      return { valid: false, error: "Domain name too long" };
    }

    const parts = domain.split(".");
    for (const part of parts) {
      if (part.length > 63) {
        return { valid: false, error: "Domain label too long" };
      }
      if (part.startsWith("-") || part.endsWith("-")) {
        return { valid: false, error: "Domain labels cannot start or end with hyphens" };
      }
    }

    const reserved = ["localhost", "example.com", "test.com"];
    if (reserved.some(r => domain.includes(r))) {
      return { valid: false, error: "Reserved domain name" };
    }

    return { valid: true };
  }

  async checkDomainAvailability(domain: string, excludeDomainId?: string): Promise<{ available: boolean; error?: string }> {
    const existing = await storage.getCustomDomainByDomain(domain);
    
    if (existing && existing.id !== excludeDomainId) {
      return { available: false, error: "Domain already registered" };
    }

    return { available: true };
  }
}

export const domainService = new DomainService();
