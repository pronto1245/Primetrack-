import { storage } from "../storage";
import { cloudflareService } from "../cloudflare-service";
import { tlsChecker } from "./tls-checker";
import dns from "dns/promises";

export type DomainStatus = 
  | "pending_dns"        // Waiting for DNS configuration
  | "dns_verified"       // DNS verified, ready for SSL
  | "ssl_provisioning"   // Cloudflare is provisioning SSL
  | "active"             // Fully working
  | "failed";            // Failed, check error

interface DnsVerificationResult {
  success: boolean;
  error?: string;
  method: "cname" | "txt";
  foundValue?: string;
}

interface ProvisioningResult {
  success: boolean;
  status: DomainStatus;
  error?: string;
  validationInstructions?: {
    type: "cname" | "txt";
    name: string;
    value: string;
  };
}

class DomainProvisioningService {
  private readonly DNS_RESOLVERS = ["8.8.8.8", "1.1.1.1", "8.8.4.4"];

  async addDomain(
    advertiserId: string, 
    domain: string
  ): Promise<ProvisioningResult> {
    const normalizedDomain = domain.toLowerCase().trim();
    
    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(normalizedDomain)) {
      return { success: false, status: "failed", error: "Invalid domain format" };
    }

    // Check if Cloudflare is configured
    const cfConfigured = await cloudflareService.isCloudflareConfigured();
    if (!cfConfigured) {
      return { 
        success: false, 
        status: "failed", 
        error: "Cloudflare SSL for SaaS not configured. Admin must set up Cloudflare in Settings." 
      };
    }

    // Get CNAME target from Cloudflare settings
    const cnameTarget = await cloudflareService.getCnameTarget();
    if (!cnameTarget) {
      return { 
        success: false, 
        status: "failed", 
        error: "CNAME target not configured in Cloudflare settings" 
      };
    }

    // Check if domain already exists
    const existing = await storage.getCustomDomainByDomain(normalizedDomain);
    if (existing) {
      return { success: false, status: "failed", error: "Domain already registered" };
    }

    // Generate verification token
    const verificationToken = `primetrack-verify-${crypto.randomUUID().slice(0, 8)}`;

    // Create domain record in pending_dns status
    const domainRecord = await storage.createCustomDomain({
      advertiserId,
      domain: normalizedDomain,
      verificationToken,
      verificationMethod: "cname",
      isVerified: false,
      sslStatus: "pending",
      dnsTarget: cnameTarget,
      isActive: true,
      isPrimary: false,
    });

    return {
      success: true,
      status: "pending_dns",
      validationInstructions: {
        type: "cname",
        name: normalizedDomain,
        value: cnameTarget,
      },
    };
  }

  async verifyDns(domainId: string): Promise<DnsVerificationResult> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain) {
      return { success: false, error: "Domain not found", method: "cname" };
    }

    const cnameTarget = domain.dnsTarget || (await cloudflareService.getCnameTarget());
    if (!cnameTarget) {
      return { success: false, error: "CNAME target not configured", method: "cname" };
    }

    // Try CNAME verification
    try {
      const resolver = new dns.Resolver();
      resolver.setServers(this.DNS_RESOLVERS);
      
      const records = await resolver.resolveCname(domain.domain);
      
      if (records && records.length > 0) {
        const foundTarget = records[0].toLowerCase();
        const expectedTarget = cnameTarget.toLowerCase();
        
        if (foundTarget === expectedTarget || foundTarget.endsWith(expectedTarget)) {
          // DNS verified - now provision in Cloudflare
          await storage.updateCustomDomain(domainId, {
            isVerified: true,
            verifiedAt: new Date(),
            sslStatus: "ssl_provisioning",
          });

          // Trigger Cloudflare provisioning
          const provisionResult = await this.provisionInCloudflare(domainId);
          
          return { 
            success: true, 
            method: "cname", 
            foundValue: foundTarget 
          };
        } else {
          return { 
            success: false, 
            error: `CNAME found (${foundTarget}) but doesn't match expected (${expectedTarget})`,
            method: "cname",
            foundValue: foundTarget
          };
        }
      }
    } catch (error: any) {
      if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
        return { 
          success: false, 
          error: "CNAME record not found. Please add DNS record and wait for propagation.",
          method: "cname"
        };
      }
      console.error(`[DomainProvisioning] DNS lookup error for ${domain.domain}:`, error);
    }

    return { 
      success: false, 
      error: "DNS verification failed. Check that CNAME record is configured correctly.",
      method: "cname"
    };
  }

  private async provisionInCloudflare(domainId: string): Promise<ProvisioningResult> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain) {
      return { success: false, status: "failed", error: "Domain not found" };
    }

    // Skip if already provisioned
    if (domain.cloudflareHostnameId) {
      console.log(`[DomainProvisioning] Domain ${domain.domain} already has Cloudflare hostname`);
      return { success: true, status: "ssl_provisioning" };
    }

    const result = await cloudflareService.provisionDomain(domainId, domain.domain);
    
    if (!result.success) {
      await storage.updateCustomDomain(domainId, {
        sslStatus: "ssl_failed",
        lastError: result.error,
      });
      return { success: false, status: "failed", error: result.error };
    }

    return { success: true, status: "ssl_provisioning" };
  }

  async checkSslStatus(domainId: string): Promise<{
    success: boolean;
    status: DomainStatus;
    sslDetails?: {
      issuer?: string;
      expiresAt?: Date;
    };
    error?: string;
  }> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain) {
      return { success: false, status: "failed", error: "Domain not found" };
    }

    if (!domain.isVerified) {
      return { success: false, status: "pending_dns", error: "DNS not verified yet" };
    }

    // First sync with Cloudflare to get latest status
    if (domain.cloudflareHostnameId) {
      try {
        const syncResult = await cloudflareService.syncDomainStatus(domainId);
        
        // Check if Cloudflare reports active
        if (syncResult.status === "active" && syncResult.sslStatus === "active") {
          // Now do real TLS + HTTP check
          const tlsResult = await tlsChecker.checkSsl(domain.domain);
          
          if (tlsResult.success) {
            await storage.updateCustomDomain(domainId, {
              sslStatus: "ssl_active",
              lastError: null,
            });
            
            return {
              success: true,
              status: "active",
              sslDetails: {
                issuer: tlsResult.issuer,
                expiresAt: tlsResult.expiresAt,
              },
            };
          } else {
            await storage.updateCustomDomain(domainId, {
              sslStatus: "ssl_failed",
              lastError: tlsResult.error,
            });
            
            return {
              success: false,
              status: "failed",
              error: tlsResult.error,
            };
          }
        } else if (syncResult.status === "pending_validation" || syncResult.sslStatus === "pending_validation") {
          await storage.updateCustomDomain(domainId, {
            sslStatus: "ssl_activating",
          });
          return { success: false, status: "ssl_provisioning", error: "SSL is being provisioned by Cloudflare" };
        } else if (syncResult.error) {
          return { success: false, status: "failed", error: syncResult.error };
        }
      } catch (error: any) {
        return { success: false, status: "failed", error: error.message };
      }
    } else {
      // No Cloudflare hostname - try to provision
      const provisionResult = await this.provisionInCloudflare(domainId);
      return provisionResult;
    }

    return { success: false, status: "ssl_provisioning", error: "Waiting for SSL activation" };
  }

  async deleteDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain) {
      return { success: false, error: "Domain not found" };
    }

    // Delete from Cloudflare if provisioned
    if (domain.cloudflareHostnameId) {
      try {
        await cloudflareService.deprovisionDomain(domainId);
      } catch (error) {
        console.error(`[DomainProvisioning] Failed to delete from Cloudflare:`, error);
        // Continue with local deletion anyway
      }
    }

    await storage.deleteCustomDomain(domainId);
    return { success: true };
  }

  async getActiveTrackingDomain(advertiserId: string): Promise<string | null> {
    const domain = await storage.getActiveTrackingDomain(advertiserId);
    if (!domain) return null;
    
    // Only return if SSL is active
    const domainRecord = await storage.getCustomDomainByDomain(domain);
    if (domainRecord?.sslStatus === "ssl_active") {
      return domain;
    }
    return null;
  }

  async reprovisionDomain(domainId: string): Promise<ProvisioningResult> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain) {
      return { success: false, status: "failed", error: "Domain not found" };
    }

    // Delete existing Cloudflare hostname if exists
    if (domain.cloudflareHostnameId) {
      try {
        await cloudflareService.deprovisionDomain(domainId);
      } catch (error) {
        console.error(`[DomainProvisioning] Failed to delete old hostname:`, error);
      }
    }

    // Reset domain state
    await storage.updateCustomDomain(domainId, {
      cloudflareHostnameId: null,
      cloudflareStatus: null,
      cloudflareSslStatus: null,
      sslStatus: "pending",
      lastError: null,
      cloudflareError: null,
    });

    // First verify DNS
    const dnsResult = await this.verifyDns(domainId);
    if (!dnsResult.success) {
      return { 
        success: false, 
        status: "pending_dns", 
        error: dnsResult.error 
      };
    }

    return { success: true, status: "ssl_provisioning" };
  }
}

export const domainProvisioningService = new DomainProvisioningService();
