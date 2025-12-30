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
  async checkSsl(domain: string, timeout = 10000): Promise<TlsCheckResult> {
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
              resolve({
                success: false,
                status: "verified_no_ssl",
                error: "No certificate found",
              });
              return;
            }

            const validTo = new Date(cert.valid_to);
            const validFrom = new Date(cert.valid_from);
            const now = new Date();

            if (now < validFrom || now > validTo) {
              resolve({
                success: false,
                status: "ssl_failed",
                error: "Certificate expired or not yet valid",
                expiresAt: validTo,
              });
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
                status: "ssl_failed",
                error: `Certificate does not match domain. Cert covers: ${certDomains.join(", ")}`,
              });
              return;
            }

            resolve({
              success: true,
              status: "ssl_active",
              expiresAt: validTo,
              issuer: cert.issuer?.O || cert.issuer?.CN || "Unknown",
            });
          } catch (error: any) {
            socket.end();
            resolve({
              success: false,
              status: "ssl_failed",
              error: error.message,
            });
          }
        }
      );

      socket.on("error", (error: any) => {
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
          resolve({
            success: false,
            status: "verified_no_ssl",
            error: "Cannot connect to domain on port 443",
          });
        } else if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
          resolve({
            success: false,
            status: "ssl_activating",
            error: "Connection timeout - SSL may be propagating",
          });
        } else {
          resolve({
            success: false,
            status: "ssl_failed",
            error: error.message || "TLS handshake failed",
          });
        }
      });

      socket.setTimeout(timeout, () => {
        socket.destroy();
        resolve({
          success: false,
          status: "ssl_activating",
          error: "Connection timeout - SSL may be propagating",
        });
      });
    });
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
