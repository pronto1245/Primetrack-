import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import type { PlatformApiKey } from "@shared/schema";

export type PlatformApiPermission = 
  | "offers:read"
  | "offers:write"
  | "partners:read"
  | "partners:write"
  | "clicks:read"
  | "conversions:read"
  | "conversions:write"
  | "payouts:read"
  | "payouts:write"
  | "stats:read";

export interface PlatformApiRequest extends Request {
  apiKey?: PlatformApiKey;
  apiKeyPermissions?: PlatformApiPermission[];
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function requirePlatformApiKey(requiredPermissions: PlatformApiPermission[] = []) {
  return async (req: PlatformApiRequest, res: Response, next: NextFunction) => {
    const apiKeyHeader = req.headers["x-api-key"] as string;
    
    if (!apiKeyHeader) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "X-API-Key header is required" 
      });
    }

    const keyHash = hashApiKey(apiKeyHeader);
    const apiKey = await storage.getPlatformApiKeyByHash(keyHash);

    if (!apiKey) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Invalid API key" 
      });
    }

    if (!apiKey.isActive) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "API key has been revoked" 
      });
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "API key has expired" 
      });
    }

    const permissions = apiKey.permissions as PlatformApiPermission[];
    
    for (const perm of requiredPermissions) {
      if (!permissions.includes(perm)) {
        return res.status(403).json({ 
          error: "Forbidden", 
          message: `Missing required permission: ${perm}` 
        });
      }
    }

    await storage.updatePlatformApiKey(apiKey.id, {
      lastUsedAt: new Date(),
      lastUsedIp: req.ip || req.socket.remoteAddress || null,
      lastUsedUserAgent: req.headers["user-agent"] || null,
    });

    storage.logPlatformApiKeyUsage({
      apiKeyId: apiKey.id,
      endpoint: req.path,
      method: req.method,
      ip: req.ip || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
      statusCode: null,
    }).catch(console.error);

    req.apiKey = apiKey;
    req.apiKeyPermissions = permissions;
    
    next();
  };
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = "pt_" + crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  const key = `${prefix}_${secret}`;
  const hash = hashApiKey(key);
  
  return { key, prefix, hash };
}
