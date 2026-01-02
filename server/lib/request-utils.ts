import type { Request } from "express";

// Worker secret is loaded from platform_settings and cached
let cachedWorkerSecret: string | null = null;
let secretLastFetched = 0;
const SECRET_CACHE_TTL = 60000; // 1 minute

/**
 * Sets the worker secret for validation (called from routes.ts on startup)
 */
export function setWorkerSecret(secret: string | null): void {
  cachedWorkerSecret = secret;
  secretLastFetched = Date.now();
}

/**
 * Gets the cached worker secret
 */
export function getWorkerSecret(): string | null {
  return cachedWorkerSecret;
}

/**
 * Checks if X-Forwarded-Host should be trusted based on Worker secret validation.
 * If no secret is configured, falls back to not trusting the header.
 */
function isWorkerRequestTrusted(req: Request): boolean {
  const workerAuth = req.headers["x-cf-worker-auth"] as string | undefined;
  
  // No secret configured - don't trust X-Forwarded-Host
  if (!cachedWorkerSecret) {
    return false;
  }
  
  // Validate secret matches
  return workerAuth === cachedWorkerSecret;
}

/**
 * Resolves the original hostname from request headers.
 * Supports Cloudflare Worker proxy which sets X-Forwarded-Host.
 * 
 * SECURITY: Only trusts X-Forwarded-Host if request includes valid Worker secret.
 * 
 * Priority (if Worker auth is valid):
 * 1. X-Forwarded-Host (set by Cloudflare Worker)
 * 2. X-Original-Host (legacy support)
 * 3. req.hostname (Express parsed Host header)
 * 
 * If Worker auth is invalid, only uses req.hostname.
 * 
 * @param req Express request object
 * @returns Original hostname in lowercase, or undefined if not available
 */
export function resolveRequestHost(req: Request): string | undefined {
  // Only trust forwarded headers if request came from our Worker
  if (isWorkerRequestTrusted(req)) {
    const xForwardedHost = req.headers["x-forwarded-host"] as string | undefined;
    const xOriginalHost = req.headers["x-original-host"] as string | undefined;
    
    if (xForwardedHost || xOriginalHost) {
      const host = xForwardedHost || xOriginalHost;
      return host?.toLowerCase();
    }
  }
  
  // Fall back to req.hostname (safe, parsed by Express)
  return req.hostname?.toLowerCase();
}

/**
 * Gets the full origin URL from request.
 * Accounts for Cloudflare Worker proxy headers.
 * 
 * @param req Express request object
 * @returns Full origin URL (e.g., https://click.partner.com)
 */
export function resolveRequestOrigin(req: Request): string {
  const host = resolveRequestHost(req);
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  
  return `${protocol}://${host}`;
}

/**
 * Logs request host information for debugging.
 * 
 * @param req Express request object
 * @param context Context string for logging
 */
export function logHostInfo(req: Request, context: string): void {
  const xForwardedHost = req.headers["x-forwarded-host"];
  const xOriginalHost = req.headers["x-original-host"];
  const host = req.headers.host;
  const hostname = req.hostname;
  
  console.log(`[${context}] Host resolution:`, {
    "x-forwarded-host": xForwardedHost,
    "x-original-host": xOriginalHost,
    host,
    hostname,
    resolved: resolveRequestHost(req),
  });
}
