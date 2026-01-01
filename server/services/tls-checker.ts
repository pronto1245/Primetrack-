import tls from "tls";
import { storage } from "../storage";

export type SslStatus = 
  | "unverified"
  | "verified_no_ssl"
  | "ssl_activating"
  | "ssl_active"
  | "ssl_failed";

interface TlsCheckResult {
  success: boolean;
  status: SslStatus;
  error?: string;
  expiresAt?: Date;
  issuer?: string;
}

class TlsChecker {
  private async checkHttpStatus(domain: string): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`https://${domain}/`, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      
      clearTimeout(timeoutId);
      
      if (response.status >= 500 && response.status < 600) {
        const errorMessages: Record<number, string> = {
          520: "Web server returned unknown error",
          521: "Web server is down",
          522: "Connection timed out to origin",
          523: "Origin is unreachable",
          524: "Origin timeout",
          525: "SSL handshake failed with origin (check Fallback Origin config)",
          526: "Invalid SSL certificate on origin",
          527: "Railgun error",
        };
        const msg = errorMessages[response.status] || "Origin server error";
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${msg}`,
          statusCode: response.status
        };
      }
      
      return { success: true, statusCode: response.status };
    } catch (error: any) {
      if (error.name === "AbortError") {
        return { success: false, error: "HTTP request timeout" };
      }
      console.log(`[TlsChecker] HTTP check error for ${domain}: ${error.message}`);
      return { success: false, error: `HTTP error: ${error.message}` };
    }
  }

  private performTlsCheck(domain: string, timeout: number): Promise<{
    success: boolean;
    error?: string;
    cert?: {
      validTo: Date;
      issuer: string;
      domains: string[];
    };
  }> {
    return new Promise((resolve) => {
      const socket = tls.connect(
        {
          host: domain,
          port: 443,
          servername: domain,
          rejectUnauthorized: false,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate();
            socket.end();

            if (!cert || !cert.subject) {
              resolve({ success: false, error: "No certificate found" });
              return;
            }

            const validTo = new Date(cert.valid_to);
            const validFrom = new Date(cert.valid_from);
            const now = new Date();

            if (now < validFrom || now > validTo) {
              resolve({ success: false, error: "Certificate expired or not yet valid" });
              return;
            }

            const certDomains: string[] = [];
            if (cert.subject?.CN) certDomains.push(cert.subject.CN);
            if (cert.subjectaltname) {
              const altNames = cert.subjectaltname
                .split(", ")
                .map((s: string) => s.replace("DNS:", ""));
              certDomains.push(...altNames);
            }

            const domainMatches = certDomains.some((certDomain) => {
              if (certDomain.startsWith("*.")) {
                const wildcardBase = certDomain.slice(2);
                const domainParts = domain.split(".");
                const baseParts = wildcardBase.split(".");
                if (domainParts.length === baseParts.length + 1) {
                  return domainParts.slice(1).join(".") === wildcardBase;
                }
                return false;
              }
              return certDomain.toLowerCase() === domain.toLowerCase();
            });

            if (!domainMatches) {
              resolve({ 
                success: false, 
                error: `Certificate does not match domain. Cert covers: ${certDomains.join(", ")}` 
              });
              return;
            }

            resolve({
              success: true,
              cert: {
                validTo,
                issuer: cert.issuer?.O || cert.issuer?.CN || "Unknown",
                domains: certDomains
              }
            });
          } catch (error: any) {
            socket.end();
            resolve({ success: false, error: error.message });
          }
        }
      );

      socket.on("error", (error: any) => {
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
          resolve({ success: false, error: "Cannot connect to domain on port 443" });
        } else if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
          resolve({ success: false, error: "Connection timeout - SSL may be propagating" });
        } else {
          resolve({ success: false, error: error.message || "TLS handshake failed" });
        }
      });

      socket.setTimeout(timeout, () => {
        socket.destroy();
        resolve({ success: false, error: "Connection timeout - SSL may be propagating" });
      });
    });
  }

  async checkSsl(domain: string, timeout = 10000): Promise<TlsCheckResult> {
    // Step 1: TLS handshake check
    const tlsResult = await this.performTlsCheck(domain, timeout);
    
    if (!tlsResult.success) {
      // Determine appropriate status based on error
      let status: SslStatus = "ssl_failed";
      if (tlsResult.error?.includes("Cannot connect")) {
        status = "verified_no_ssl";
      } else if (tlsResult.error?.includes("timeout") || tlsResult.error?.includes("propagating")) {
        status = "ssl_activating";
      }
      
      return {
        success: false,
        status,
        error: tlsResult.error
      };
    }

    // Step 2: HTTP status check (ensures origin is working, not just Cloudflare edge)
    const httpResult = await this.checkHttpStatus(domain);
    
    if (!httpResult.success) {
      return {
        success: false,
        status: "ssl_failed",
        error: httpResult.error,
        expiresAt: tlsResult.cert?.validTo,
        issuer: tlsResult.cert?.issuer
      };
    }

    // Both TLS and HTTP checks passed
    return {
      success: true,
      status: "ssl_active",
      expiresAt: tlsResult.cert?.validTo,
      issuer: tlsResult.cert?.issuer
    };
  }

  async checkDomainSsl(domainId: string): Promise<TlsCheckResult> {
    const domainRecord = await storage.getCustomDomain(domainId);
    if (!domainRecord) {
      return {
        success: false,
        status: "unverified",
        error: "Domain not found",
      };
    }

    if (!domainRecord.isVerified) {
      return {
        success: false,
        status: "unverified",
        error: "Domain DNS not verified yet",
      };
    }

    const result = await this.checkSsl(domainRecord.domain);

    await storage.updateCustomDomain(domainId, {
      sslStatus: result.status,
      sslExpiresAt: result.expiresAt || null,
      lastError: result.error || null,
    });

    return result;
  }
}

export const tlsChecker = new TlsChecker();
