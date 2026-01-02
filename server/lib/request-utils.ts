import type { Request } from "express";

/**
 * Resolves the original hostname from request headers.
 * Supports Cloudflare Worker proxy which sets X-Forwarded-Host.
 * 
 * Priority:
 * 1. X-Forwarded-Host (set by Cloudflare Worker)
 * 2. X-Original-Host (legacy support)
 * 3. req.hostname (Express parsed Host header)
 * 
 * @param req Express request object
 * @returns Original hostname in lowercase, or undefined if not available
 */
export function resolveRequestHost(req: Request): string | undefined {
  const xForwardedHost = req.headers["x-forwarded-host"] as string | undefined;
  const xOriginalHost = req.headers["x-original-host"] as string | undefined;
  
  const host = xForwardedHost || xOriginalHost || req.hostname;
  
  return host?.toLowerCase();
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
