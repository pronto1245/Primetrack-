import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertOfferSchema, insertOfferLandingSchema, insertClickSchema, insertConversionSchema, insertOfferAccessRequestSchema, insertNotificationSchema, insertNewsPostSchema, publisherInvoices, insertAdvertiserSourceSchema } from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import session from "express-session";
import MemoryStore from "memorystore";
import pgSession from "connect-pg-simple";
import pg from "pg";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { ClickHandler } from "./services/click-handler";
import { Orchestrator } from "./services/orchestrator";
import { notificationService } from "./services/notification-service";
import { totpService } from "./services/totp-service";
import geoip from "geoip-lite";
import { resolveRequestHost, resolveRequestOrigin, setWorkerSecret } from "./lib/request-utils";
import { requireStaffWriteAccess } from "./staffAccessMiddleware";
import apiV1Router from "./routes/api-v1";

const clickHandler = new ClickHandler();
const orchestrator = new Orchestrator();

// ============================================
// HELPER: Санитизация числовых полей
// Конвертирует пустые строки, null, undefined в null
// Валидные числа парсит через parseFloat
// NaN и невалидные значения возвращают null
// ============================================
function sanitizeNumeric(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function sanitizeInteger(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : parseInt(value, 10);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

// Normalize Postgres array - handles both string "{a,b}" and actual array formats
function normalizePostgresArray(value: any): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Parse Postgres array format: "{val1,val2,val3}"
    if (value.startsWith('{') && value.endsWith('}')) {
      const inner = value.slice(1, -1);
      if (!inner) return [];
      return inner.split(',').map(s => s.trim());
    }
    return [value];
  }
  return null;
}

// For Drizzle numeric() fields which expect string type
function sanitizeNumericToString(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }
  return parsed.toString();
}

// Sanitize landing URL - remove any {click_id} placeholders (including encoded/uppercase variants)
// URLs should be stored clean, click_id is added dynamically by click-handler
// IMPORTANT: Don't decode entire URL to preserve valid %20 and other encodings
// ORDER MATTERS: Remove ENTIRE query params first, then standalone placeholders
function sanitizeLandingUrl(url: string): string {
  if (!url) return url;
  let sanitized = url;
  
  // STEP 1: Remove ENTIRE query params with encoded placeholders FIRST
  // Pattern: ?key=%7Bvalue%7D or &key=%7Bvalue%7D
  // Key pattern includes: letters, digits, underscore, hyphen (e.g., sub1, s2s_click, aff-id)
  sanitized = sanitized.replace(/[?&][a-zA-Z0-9_-]+=%7B[a-zA-Z0-9_-]+%7D/gi, '');
  
  // STEP 2: Remove ENTIRE query params with regular placeholders
  // Pattern: ?key={value} or &key={value}
  sanitized = sanitized.replace(/[?&][a-zA-Z0-9_-]+=\{[a-zA-Z0-9_-]+\}/gi, '');
  
  // STEP 3: Remove standalone ENCODED placeholders (rare, but possible in path)
  sanitized = sanitized.replace(/%7B[a-zA-Z0-9_-]+%7D/gi, '');
  
  // STEP 4: Remove standalone regular placeholders (in path or value)
  sanitized = sanitized.replace(/\{[a-zA-Z0-9_-]+\}/gi, '');
  
  // STEP 5: Clean up resulting URL
  // Fix double ampersands first
  sanitized = sanitized.replace(/&&+/g, '&');
  // Fix case where first param was removed: url&param -> url?param
  // Match: no ? in URL but has &param - replace first & with ?
  if (!sanitized.includes('?') && sanitized.includes('&')) {
    sanitized = sanitized.replace('&', '?');
  }
  // Fix ?& -> ?
  sanitized = sanitized.replace(/\?&/g, '?');
  // Fix trailing ? or &
  sanitized = sanitized.replace(/[?&]$/g, '');
  
  return sanitized;
}

// ============================================
// HELPER: Extract partner click_id from request
// Uses landing.storeClickIdIn config, fallback to sub1-sub10 list
// ============================================
function extractPartnerClickId(query: any, storeClickIdIn?: string): string | undefined {
  // 1. If storeClickIdIn is configured, use that parameter
  if (storeClickIdIn && query[storeClickIdIn]) {
    return query[storeClickIdIn] as string;
  }
  
  // 2. Fallback: check common tracker parameters
  // Keitaro: subid, Scaleo: aff_sub, Binom: cnv_id, Voluum: c/cid, RedTrack: ref_id
  const fallbackParams = [
    'sub1', 'subid', 'sub_id',
    'aff_click_id', 'clickid', 'click_id',
    'aff_sub', 'cnv_id', 'ref_id', 'c',
    'external_id', 'externalid',
    'tid', 'cid', 'uid'
  ];
  
  for (const param of fallbackParams) {
    if (query[param]) {
      return query[param] as string;
    }
  }
  
  return undefined;
}

// ============================================
// HELPER: Resolve ID (UUID vs shortId)
// Detects if the ID is a UUID (contains "-" or length > 10) or shortId (numeric)
// Returns the actual UUID from database
// ============================================
function isUUID(id: string): boolean {
  return id.includes("-") || id.length > 10;
}

// Format shortId with zero-padding (centralized helper)
function formatShortId(shortId: number | null | undefined, digits: number, fallback: string): string {
  if (shortId == null) return fallback;
  return shortId.toString().padStart(digits, '0');
}

async function resolveOfferId(idOrShortId: string): Promise<string | null> {
  if (isUUID(idOrShortId)) {
    const offer = await storage.getOffer(idOrShortId);
    return offer?.id || null;
  }
  const shortId = parseInt(idOrShortId, 10);
  if (isNaN(shortId)) return null;
  const offer = await storage.getOfferByShortId(shortId);
  return offer?.id || null;
}

async function resolvePublisherId(idOrShortId: string): Promise<string | null> {
  if (isUUID(idOrShortId)) {
    const user = await storage.getUser(idOrShortId);
    return user?.id || null;
  }
  const shortId = parseInt(idOrShortId, 10);
  if (isNaN(shortId)) return null;
  const user = await storage.getUserByShortId(shortId);
  return user?.id || null;
}

async function resolveLandingId(idOrShortId: string): Promise<string | null> {
  if (isUUID(idOrShortId)) {
    // Verify UUID exists in database
    const landing = await storage.getOfferLanding(idOrShortId);
    return landing?.id || null;
  }
  const shortId = parseInt(idOrShortId, 10);
  if (isNaN(shortId)) return null;
  const landing = await storage.getOfferLandingByShortId(shortId);
  return landing?.id || null;
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
    pending2FAUserId?: string;
    isStaff?: boolean;
    staffRole?: string;
    staffAdvertiserId?: string;
  }
}

function getEffectiveAdvertiserId(req: Request): string | null {
  if (req.session.isStaff && req.session.staffAdvertiserId) {
    return req.session.staffAdvertiserId;
  }
  if (req.session.role === "advertiser") {
    return req.session.userId || null;
  }
  return null;
}

// Staff role access control - uses shared/staffPermissions.ts
// Legacy inline middleware removed - now using requireStaffWriteAccess from staffAccessMiddleware.ts
// GET endpoints do NOT require middleware - all staff roles can view data they have canAccess() permission for
// Only POST/PUT/DELETE endpoints use requireStaffWriteAccess to block unauthorized writes

const MemorySessionStore = MemoryStore(session);
const PgSessionStore = pgSession(session);

async function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  const isReplit = !!process.env.REPL_ID;
  
  // Trust proxy for Replit deployment (multiple reverse proxies)
  // Replit uses multiple proxy hops, so we need to trust all of them
  app.set("trust proxy", true);
  
  // Always use PostgreSQL session store if DATABASE_URL is available
  let store;
  let storeType = "memory";
  
  if (process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
      });
      store = new PgSessionStore({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      });
      storeType = "postgresql";
      console.log("[session] Using PostgreSQL session store");
    } catch (err) {
      console.error("[session] Failed to connect to PostgreSQL, falling back to memory store:", err);
      store = new MemorySessionStore({ checkPeriod: 86400000 });
    }
  } else {
    console.log("[session] DATABASE_URL not found, using memory store (sessions will not persist)");
    store = new MemorySessionStore({
      checkPeriod: 86400000,
    });
  }
  
  // On Replit, always use secure cookies (HTTPS proxy)
  // In production, use secure cookies
  // In local development (no Replit), use non-secure cookies
  const useSecureCookies = isProduction || isReplit;
  
  // For Replit we need sameSite=none for iframe/cross-origin
  // For external deployments (Koyeb, etc) use sameSite=lax for better compatibility
  const sameSiteValue = isReplit ? "none" as const : "lax" as const;
  
  console.log(`[session] Cookie config: secure=${useSecureCookies}, sameSite=${sameSiteValue}, isReplit=${isReplit}`);
  
  app.use(
    session({
      name: "sid",
      secret: process.env.SESSION_SECRET || "affiliate-tracker-secret-key",
      resave: false,
      saveUninitialized: false,
      store,
      proxy: true,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: sameSiteValue,
        path: "/",
      },
    })
  );
}

async function seedUsers() {
  // Seed users only for initial setup - generates secure random passwords
  const crypto = await import("crypto");
  const generateSecurePassword = () => crypto.randomBytes(16).toString("hex");

  const testUsers = [
    { username: "admin", password: generateSecurePassword(), role: "admin", email: "admin@primetrack.pro" },
  ];

  for (const userData of testUsers) {
    const existing = await storage.getUserByUsername(userData.username);
    if (!existing) {
      await storage.createUser(userData);
      console.log(`[SETUP] Created admin user. Use /api/reset-admin-password with SETUP_KEY to set password.`);
    }
  }

  // Skip test advertisers in production - they should be created via UI
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return;
  }

  // Development only: create test advertisers with random passwords
  const testAdvertisers = [
    { username: "adv_casino", password: generateSecurePassword(), role: "advertiser", email: "casino@example.com", status: "active" },
    { username: "adv_crypto", password: generateSecurePassword(), role: "advertiser", email: "crypto@example.com", status: "active" },
    { username: "adv_dating", password: generateSecurePassword(), role: "advertiser", email: "dating@example.com", status: "active" },
    { username: "adv_nutra", password: generateSecurePassword(), role: "advertiser", email: "nutra@example.com", status: "pending" },
  ];

  const publisher = await storage.getUserByUsername("publisher");
  if (!publisher) return;

  for (const advData of testAdvertisers) {
    let advertiser = await storage.getUserByUsername(advData.username);
    if (!advertiser) {
      advertiser = await storage.createUser(advData);
      console.log(`Created test advertiser: ${advData.username}`);
    }

    // Link publisher to advertiser
    const existing = await storage.getAdvertisersForPublisher(publisher.id);
    const alreadyLinked = existing.some(r => r.advertiserId === advertiser!.id);
    if (!alreadyLinked) {
      await storage.addPublisherToAdvertiser(publisher.id, advertiser.id);
      console.log(`Linked publisher to ${advData.username}`);
    }
  }

  // Create offers for each advertiser
  const offerTemplates: Record<string, any[]> = {
    "adv_casino": [
      { name: "VulkanBet RU", description: "Казино для РФ", geo: ["RU"], category: "gambling", partnerPayout: "50", payoutModel: "CPA" },
      { name: "JetCasino EU", description: "Европа казино", geo: ["DE", "FR", "ES"], category: "gambling", partnerPayout: "80", payoutModel: "CPA" },
      { name: "SpinCity CIS", description: "СНГ казино", geo: ["RU", "UA", "KZ"], category: "gambling", partnerPayout: "45", payoutModel: "CPL" },
    ],
    "adv_crypto": [
      { name: "BitExchange Pro", description: "Криптобиржа", geo: ["WW"], category: "crypto", partnerPayout: "100", payoutModel: "CPA" },
      { name: "CryptoWallet App", description: "Криптокошелёк", geo: ["US", "GB"], category: "crypto", partnerPayout: "25", payoutModel: "CPI" },
    ],
    "adv_dating": [
      { name: "LoveMatch RU", description: "Дейтинг РФ", geo: ["RU"], category: "dating", partnerPayout: "5", payoutModel: "CPL" },
      { name: "DateNow EU", description: "Дейтинг Европа", geo: ["DE", "FR"], category: "dating", partnerPayout: "8", payoutModel: "CPL" },
      { name: "FlirtZone", description: "Мировой дейтинг", geo: ["WW"], category: "dating", partnerPayout: "3", payoutModel: "CPL" },
      { name: "PremiumDate", description: "Премиум дейтинг", geo: ["US", "GB", "AU"], category: "dating", partnerPayout: "15", payoutModel: "CPA" },
    ],
    "adv_nutra": [
      { name: "SlimFit Keto", description: "Нутра похудение", geo: ["US"], category: "nutra", partnerPayout: "35", payoutModel: "CPS" },
      { name: "VitaBoost", description: "Витамины", geo: ["RU", "UA"], category: "nutra", partnerPayout: "20", payoutModel: "CPA" },
    ],
  };

  for (const [advUsername, offers] of Object.entries(offerTemplates)) {
    const advertiser = await storage.getUserByUsername(advUsername);
    if (!advertiser) continue;
    
    // Check if publisher has active partnership with this advertiser
    const partnership = await storage.getPublisherAdvertiserRelation(publisher.id, advertiser.id);
    const isActive = partnership?.status === "active";

    const existingOffers = await storage.getOffersByAdvertiser(advertiser.id);
    if (existingOffers.length === 0) {
      for (const offerData of offers) {
        const offer = await storage.createOffer({
          ...offerData,
          advertiserId: advertiser.id,
          trafficSources: ["Facebook", "Google"],
          appTypes: ["PWA"],
          creativeLinks: [],
          holdPeriodDays: Math.floor(Math.random() * 14),
        });
        console.log(`Created offer: ${offerData.name}`);

        // Give publisher access only if partnership is active
        if (isActive) {
          await storage.createPublisherOffer({
            offerId: offer.id,
            publisherId: publisher.id,
          });
        }
      }
    }
  }
}

// Extend Express Request to include custom domain info
declare global {
  namespace Express {
    interface Request {
      customDomain?: {
        id: string;
        domain: string;
        advertiserId: string;
      };
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // CORS middleware for cross-origin requests in production
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && process.env.CORS_ORIGIN) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(o => o.trim());
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      }
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      next();
    });
  }

  // Load Worker secret for X-Forwarded-Host validation
  // Priority: env variable > platform_settings
  const envWorkerSecret = process.env.CLOUDFLARE_WORKER_SECRET;
  if (envWorkerSecret) {
    setWorkerSecret(envWorkerSecret);
    console.log("[WorkerAuth] Worker secret loaded from environment variable");
  } else {
    try {
      const platformSettings = await storage.getPlatformSettings();
      if (platformSettings?.cloudflareWorkerSecret) {
        setWorkerSecret(platformSettings.cloudflareWorkerSecret);
        console.log("[WorkerAuth] Worker secret loaded from platform_settings");
      }
    } catch (error) {
      console.log("[WorkerAuth] No worker secret configured");
    }
  }

  // Custom domain resolution middleware - must be before auth
  // This allows tracking links to work on custom domains without authentication
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Support Cloudflare Worker proxy - resolves X-Forwarded-Host, X-Original-Host, or hostname
      const hostname = resolveRequestHost(req);
      
      // Platform domain from env or default
      const platformDomain = process.env.PLATFORM_DOMAIN || 'primetrack.pro';
      const platformDomains = [platformDomain, `www.${platformDomain}`];
      
      // Skip for localhost, Replit domains, and platform domain
      // Platform domain is handled as first-party, not as custom domain
      if (!hostname || 
          hostname === 'localhost' || 
          hostname.includes('.replit.dev') || 
          hostname.includes('.replit.app') ||
          hostname.includes('.repl.co') ||
          platformDomains.includes(hostname)) {
        return next();
      }
      
      // Check if this is a custom domain
      const customDomain = await storage.getCustomDomainByDomain(hostname);
      
      if (customDomain && customDomain.isVerified && customDomain.isActive) {
        req.customDomain = {
          id: customDomain.id,
          domain: customDomain.domain,
          advertiserId: customDomain.advertiserId,
        };
        console.log(`[CustomDomain] Request from ${hostname} mapped to advertiser ${customDomain.advertiserId}`);
      }
    } catch (error) {
      console.error("[CustomDomain] Error resolving domain:", error);
    }
    next();
  });

  await setupAuth(app);
  
  // Platform API v1 (X-API-Key authentication for n8n/integrations)
  app.use("/api/v1", apiV1Router);

  // Health check endpoint for Cloud Run
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });
  await seedUsers();
  registerObjectStorageRoutes(app);

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      // First try to find regular user
      const user = await storage.getUserByUsername(username);
      
      if (user) {
        // Regular user login
        const isValidPassword = await storage.verifyPassword(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Блокировать вход для заблокированных пользователей
        if (user.status === "blocked") {
          return res.status(403).json({ message: "Ваш аккаунт заблокирован. Обратитесь к администратору." });
        }

        // Блокировать вход для партнёров без активного рекламодателя
        if (user.role === "publisher") {
          const advertisers = await storage.getAdvertisersForPublisher(user.id);
          // Проверяем только активные связи (не blocked/paused)
          const activeRelations = advertisers.filter(a => a.status === "active");
          if (activeRelations.length === 0) {
            // Проверяем есть ли заблокированные связи
            const hasBlockedRelation = advertisers.some(a => a.status === "blocked");
            if (hasBlockedRelation) {
              return res.status(403).json({ message: "Ваш аккаунт заблокирован рекламодателем." });
            }
            return res.status(403).json({ message: "Ваша заявка на рассмотрении. Ожидайте одобрения рекламодателем." });
          }
        }

        // Check if 2FA is enabled - don't create full session yet
        if (user.twoFactorEnabled) {
          req.session.pending2FAUserId = user.id;
          await new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          return res.json({ 
            requires2FA: true,
            userId: user.id 
          });
        }

        // Set session data
        req.session.userId = user.id;
        req.session.role = user.role;
        delete req.session.isStaff;
        delete req.session.staffRole;
        delete req.session.staffAdvertiserId;

        const needsSetup2FA = !user.twoFactorEnabled && !user.twoFactorSetupCompleted;

        return res.json({ 
          id: user.id, 
          username: user.username, 
          role: user.role,
          email: user.email,
          needsSetup2FA
        });
      }

      // Try staff login (username is email for staff)
      const staff = await storage.getAdvertiserStaffByEmailOnly(username);
      
      if (!staff) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify staff password
      const isValidStaffPassword = await storage.verifyPassword(password, staff.password);
      if (!isValidStaffPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set staff session data
      req.session.userId = staff.id;
      req.session.role = "advertiser";
      req.session.isStaff = true;
      req.session.staffRole = staff.staffRole;
      req.session.staffAdvertiserId = staff.advertiserId;
      
      console.log("[session] Staff session created for:", staff.email);

      res.json({ 
        id: staff.id, 
        username: staff.email, 
        role: "advertiser",
        email: staff.email,
        isStaff: true,
        staffRole: staff.staffRole,
        needsSetup2FA: false // Staff don't have 2FA for now
      });
    } catch (error) {
      console.error("[auth] Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Verify 2FA code and complete login
  app.post("/api/auth/verify-2fa", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const pendingUserId = req.session.pending2FAUserId;

      if (!pendingUserId) {
        return res.status(400).json({ message: "No pending 2FA verification" });
      }

      if (!token) {
        return res.status(400).json({ message: "2FA code required" });
      }

      const isValid = await totpService.verifyToken(pendingUserId, token);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid 2FA code" });
      }

      const user = await storage.getUser(pendingUserId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Повторная проверка блокировки после 2FA
      if (user.status === "blocked") {
        delete req.session.pending2FAUserId;
        return res.status(403).json({ message: "Ваш аккаунт заблокирован. Обратитесь к администратору." });
      }

      // Повторная проверка для партнёров
      if (user.role === "publisher") {
        const advertisers = await storage.getAdvertisersForPublisher(user.id);
        const activeRelations = advertisers.filter(a => a.status === "active");
        if (activeRelations.length === 0) {
          delete req.session.pending2FAUserId;
          const hasBlockedRelation = advertisers.some(a => a.status === "blocked");
          if (hasBlockedRelation) {
            return res.status(403).json({ message: "Ваш аккаунт заблокирован рекламодателем." });
          }
          return res.status(403).json({ message: "Ваша заявка на рассмотрении. Ожидайте одобрения рекламодателем." });
        }
      }

      // Set session after 2FA verification
      delete req.session.pending2FAUserId;
      req.session.userId = user.id;
      req.session.role = user.role;
      
      console.log("[session] 2FA verified, session created for:", user.username);

      res.json({ 
        id: user.id, 
        username: user.username, 
        role: user.role,
        email: user.email 
      });
    } catch (error) {
      console.error("[auth] 2FA verification error:", error);
      res.status(500).json({ message: "2FA verification failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const isReplit = !!process.env.REPL_ID;
    const isProduction = process.env.NODE_ENV === "production";
    const useSecureCookies = isProduction || isReplit;
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      // Clear the session cookie with same settings as when it was set
      res.clearCookie("sid", {
        path: "/",
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: isReplit ? "none" as const : "lax" as const,
      });
      res.json({ message: "Logged out" });
    });
  });

  // Session check endpoint - returns current user if authenticated
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if this is a staff session
    if (req.session.isStaff && req.session.staffAdvertiserId) {
      const staff = await storage.getAdvertiserStaffById(req.session.userId);
      if (!staff) {
        return res.status(401).json({ message: "Staff not found" });
      }
      return res.json({
        id: staff.id,
        username: staff.email,
        role: "advertiser",
        email: staff.email,
        isStaff: true,
        staffRole: staff.staffRole,
      });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Проверка блокировки при восстановлении сессии
    if (user.status === "blocked") {
      req.session.destroy(() => {});
      return res.status(403).json({ message: "Ваш аккаунт заблокирован" });
    }

    // Проверка для партнёров - заблокированные связи
    if (user.role === "publisher") {
      const advertisers = await storage.getAdvertisersForPublisher(user.id);
      const activeRelations = advertisers.filter(a => a.status === "active");
      if (activeRelations.length === 0) {
        req.session.destroy(() => {});
        const hasBlockedRelation = advertisers.some(a => a.status === "blocked");
        if (hasBlockedRelation) {
          return res.status(403).json({ message: "Ваш аккаунт заблокирован рекламодателем" });
        }
        return res.status(403).json({ message: "Нет активных рекламодателей" });
      }
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    });
  });

  // Public platform settings (no auth required) - for landing page branding
  app.get("/api/public/platform-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getPlatformSettings();
      
      // Default support bot for landing page (separate from notifications bot)
      const DEFAULT_SUPPORT_BOT = "primetrack_support_bot";
      // Notifications bot should NEVER be used for support on landing page
      const NOTIFICATIONS_BOT = "primetrack_notify_bot";
      
      // Get support telegram, but reject if it's the notifications bot
      let supportTelegram = settings?.supportTelegram || DEFAULT_SUPPORT_BOT;
      // Normalize and check - if it's the notifications bot, use support bot instead
      const normalizedHandle = supportTelegram.replace(/^@/, "").toLowerCase();
      if (normalizedHandle === NOTIFICATIONS_BOT.toLowerCase()) {
        console.warn("[platform-settings] supportTelegram was set to notifications bot, forcing to support bot");
        supportTelegram = DEFAULT_SUPPORT_BOT;
      }
      
      res.json({
        platformName: settings?.platformName || "Primetrack",
        platformDescription: settings?.platformDescription || null,
        platformLogoUrl: settings?.platformLogoUrl || null,
        platformFaviconUrl: settings?.platformFaviconUrl || null,
        supportEmail: settings?.supportEmail || null,
        supportPhone: settings?.supportPhone || null,
        // Always return support bot for landing page, never notifications bot
        supportTelegram: supportTelegram,
        copyrightText: settings?.copyrightText || null,
      });
    } catch (error) {
      res.json({ platformName: "Primetrack", supportTelegram: "primetrack_support_bot" });
    }
  });

  // Public roadmap (for landing page)
  app.get("/api/public/roadmap", async (req: Request, res: Response) => {
    try {
      const items = await storage.getPublishedRoadmapItems();
      res.json(items);
    } catch (error) {
      console.error("Failed to get roadmap:", error);
      res.json([]);
    }
  });

  // Public news (for landing page)
  app.get("/api/public/news", async (req: Request, res: Response) => {
    try {
      const news = await storage.getLandingNews();
      const sanitizedNews = news.map(post => ({
        id: post.id,
        title: post.title,
        category: post.category || 'Новость',
        shortDescription: post.shortDescription || post.body?.substring(0, 150) || '',
        body: post.body,
        icon: post.icon,
        createdAt: post.createdAt,
        publishedAt: post.publishedAt,
      }));
      res.json(sanitizedNews);
    } catch (error) {
      console.error("Failed to get landing news:", error);
      res.json([]);
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({ 
      id: user.id, 
      username: user.username, 
      role: user.role,
      email: user.email,
      referralCode: user.referralCode,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled || false,
      twoFactorSetupCompleted: user.twoFactorSetupCompleted || false,
      fullName: user.fullName,
      phone: user.phone,
      contactType: user.contactType,
      contactValue: user.contactValue,
      companyName: user.companyName,
      telegram: user.telegram,
      logoUrl: user.logoUrl,
      telegramChatId: user.telegramChatId,
      telegramNotifyLeads: user.telegramNotifyLeads,
      telegramNotifySales: user.telegramNotifySales,
      telegramNotifyPayouts: user.telegramNotifyPayouts,
      telegramNotifySystem: user.telegramNotifySystem,
    });
  });

  // Alias for /api/auth/me
  app.get("/api/user", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if this is a staff session
    if (req.session.isStaff && req.session.staffAdvertiserId) {
      const staff = await storage.getAdvertiserStaffById(req.session.userId);
      if (!staff) {
        return res.status(401).json({ message: "Staff not found" });
      }
      
      // Get advertiser info for display
      const advertiser = await storage.getUser(staff.advertiserId);
      
      return res.json({
        id: staff.id,
        username: staff.email,
        role: "advertiser",
        email: staff.email,
        fullName: staff.fullName,
        isStaff: true,
        staffRole: staff.staffRole,
        staffAdvertiserId: staff.advertiserId,
        advertiserName: advertiser?.username || advertiser?.companyName || "Unknown",
        twoFactorEnabled: false,
        twoFactorSetupCompleted: true,
      });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // For publishers, check if they have at least one approved advertiser
    let hasApprovedAdvertiser = false;
    if (user.role === "publisher") {
      const advertisers = await storage.getAdvertisersForPublisher(user.id);
      hasApprovedAdvertiser = advertisers.some((a: any) => a.status === "active");
    }

    res.json({ 
      id: user.id, 
      username: user.username, 
      role: user.role,
      email: user.email,
      referralCode: user.referralCode,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled || false,
      twoFactorSetupCompleted: user.twoFactorSetupCompleted || false,
      hasApprovedAdvertiser,
      fullName: user.fullName,
      phone: user.phone,
      contactType: user.contactType,
      contactValue: user.contactValue,
      companyName: user.companyName,
      telegram: user.telegram,
      logoUrl: user.logoUrl,
      telegramChatId: user.telegramChatId,
      telegramNotifyLeads: user.telegramNotifyLeads,
      telegramNotifySales: user.telegramNotifySales,
      telegramNotifyPayouts: user.telegramNotifyPayouts,
      telegramNotifySystem: user.telegramNotifySystem,
    });
  });

  app.get("/api/platform-manager", async (req: Request, res: Response) => {
    try {
      const admin = await storage.getFirstAdmin();
      if (!admin) {
        return res.status(404).json({ message: "No manager found" });
      }
      res.json({
        username: admin.username,
        fullName: admin.fullName,
        email: admin.email,
        telegram: admin.telegram,
        phone: admin.phone,
      });
    } catch (error) {
      console.error("Error getting platform manager:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, email, referralCode, fullName, phone, contactType, contactValue, advertiserId: directAdvertiserId, referrerId } = req.body;

      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, password and email are required" });
      }

      // ВАЖНО: Сначала проверяем email, потом username
      // Если email существует у publisher - показываем диалог привязки
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        // Если партнер существует, предлагаем привязать к новому рекламодателю
        if (referralCode && existingEmail.role === "publisher") {
          // Разрешаем referralCode чтобы вернуть advertiserId в ответе
          const advertiser = await storage.getUserByReferralCode(referralCode);
          if (!advertiser || advertiser.role !== "advertiser") {
            return res.status(400).json({ message: "Invalid referral code" });
          }
          
          // Проверяем не привязан ли уже к этому рекламодателю
          const existingRelation = await storage.getPublisherAdvertiserRelation(existingEmail.id, advertiser.id);
          if (existingRelation) {
            return res.status(400).json({ message: "Вы уже привязаны к этому рекламодателю" });
          }
          
          return res.status(409).json({ 
            message: "Email already exists with different advertiser",
            code: "EMAIL_EXISTS_DIFFERENT_ADVERTISER",
            advertiserId: advertiser.id,
            advertiserName: advertiser.companyName || advertiser.fullName || advertiser.username
          });
        }
        return res.status(400).json({ message: "Email already exists" });
      }

      // Теперь проверяем username (только если email новый)
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Определяем advertiserId и referrerId с серверной валидацией
      let advertiserId: string | null = null;
      let validatedReferrerId: string | null = null;
      
      // Если передан directAdvertiserId и referrerId - это партнёрский реферал
      if (directAdvertiserId && referrerId) {
        // Валидация: advertiser должен существовать и быть рекламодателем
        const advertiser = await storage.getUser(directAdvertiserId);
        if (!advertiser || advertiser.role !== "advertiser") {
          return res.status(400).json({ message: "Invalid advertiser" });
        }
        
        // Валидация: referrer должен существовать и быть партнёром
        const referrer = await storage.getUser(referrerId);
        if (!referrer || referrer.role !== "publisher") {
          return res.status(400).json({ message: "Invalid referrer" });
        }
        
        // Валидация: у referrer должна быть активная реферальная программа у этого рекламодателя
        const referralSettings = await storage.getPublisherReferralSettings(referrerId, directAdvertiserId);
        if (!referralSettings?.referralEnabled) {
          return res.status(400).json({ message: "Referral program not active" });
        }
        
        advertiserId = directAdvertiserId;
        validatedReferrerId = referrerId;
      } else if (referralCode) {
        // Стандартный реферальный код рекламодателя
        const advertiser = await storage.getUserByReferralCode(referralCode);
        if (!advertiser || advertiser.role !== "advertiser") {
          return res.status(400).json({ message: "Invalid referral code" });
        }
        advertiserId = advertiser.id;
      }

      const newUser = await storage.createUser({
        username,
        password,
        email,
        role: "publisher",
        fullName: fullName || null,
        phone: phone || null,
        contactType: contactType || null,
        contactValue: contactValue || null,
        telegram: contactType === "telegram" ? contactValue : null,
        referredByPublisherId: validatedReferrerId,
        referredByAdvertiserId: validatedReferrerId ? advertiserId : null,
      });

      if (advertiserId) {
        await storage.addPublisherToAdvertiser(newUser.id, advertiserId);
      }

      req.session.userId = newUser.id;
      req.session.role = newUser.role;

      res.json({
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email,
        linkedAdvertiserId: advertiserId,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Register advertiser
  app.post("/api/auth/register/advertiser", async (req: Request, res: Response) => {
    try {
      const { username, password, email, fullName, companyName, phone, contactType, contactValue } = req.body;

      if (!username || !password || !email || !fullName || !companyName || !phone || !contactType || !contactValue) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Generate referral code for advertiser
      const referralCode = `ADV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const newUser = await storage.createUser({
        username,
        password,
        email,
        role: "advertiser",
        status: "pending", // Рекламодатели начинают с pending статуса
        fullName,
        companyName,
        phone,
        contactType,
        contactValue,
        referralCode,
        telegram: contactType === "telegram" ? contactValue : null,
      });

      res.json({
        success: true,
        message: "Registration successful! Your account is pending approval.",
        username: newUser.username,
      });
    } catch (error) {
      console.error("Advertiser registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Forgot password - request reset link
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Не раскрываем существование email
        return res.json({ success: true, message: "Если email существует, инструкции будут отправлены" });
      }

      // Generate reset token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      // Invalidate existing tokens for this user
      await storage.deleteUserPasswordResetTokens(user.id);
      
      await storage.createPasswordResetToken(user.id, token, expiresAt);
      
      // Send email
      try {
        const { sendPasswordResetEmail } = await import("./services/email-service");
        await sendPasswordResetEmail(user.email, token, user.username);
        console.log(`[auth] Password reset email sent to: ${email}`);
      } catch (emailError) {
        console.error("[auth] Failed to send password reset email:", emailError);
        return res.status(500).json({ message: "Не удалось отправить письмо. Попробуйте позже." });
      }
      
      res.json({ success: true, message: "Инструкции для сброса пароля отправлены на email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Не удалось обработать запрос" });
    }
  });
  
  // Verify reset token
  app.get("/api/auth/verify-reset-token/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ valid: false, message: "Недействительная ссылка" });
      }
      
      if (resetToken.usedAt) {
        return res.status(400).json({ valid: false, message: "Ссылка уже использована" });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ valid: false, message: "Ссылка истекла" });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ valid: false, message: "Ошибка проверки" });
    }
  });
  
  // Reset password with token
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token и новый пароль обязательны" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Пароль должен быть не менее 6 символов" });
      }
      
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Недействительная ссылка сброса" });
      }
      
      if (resetToken.usedAt) {
        return res.status(400).json({ message: "Ссылка уже использована" });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "Ссылка истекла. Запросите новую." });
      }
      
      // Update password using dedicated method
      await storage.updateUserPassword(resetToken.userId, newPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);
      
      console.log(`[auth] Password reset successful for user: ${resetToken.userId}`);
      
      res.json({ success: true, message: "Пароль успешно изменён" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Не удалось сбросить пароль" });
    }
  });

  // Check email for existing publisher
  app.post("/api/auth/check-email", async (req: Request, res: Response) => {
    try {
      const { email, advertiserId } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ exists: false });
      }

      if (user.role !== "publisher") {
        return res.json({ exists: true, differentRole: true });
      }

      // Check if already linked to this advertiser
      if (advertiserId) {
        const relation = await storage.getPublisherAdvertiserRelation(user.id, advertiserId);
        if (relation) {
          return res.json({ exists: true, alreadyLinked: true });
        }
        return res.json({ exists: true, differentAdvertiser: true, username: user.username });
      }

      return res.json({ exists: true });
    } catch (error) {
      console.error("Check email error:", error);
      res.status(500).json({ message: "Failed to check email" });
    }
  });

  // Link existing publisher to new advertiser
  app.post("/api/auth/link-to-advertiser", async (req: Request, res: Response) => {
    try {
      const { username, password, advertiserId } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: "Введите логин" });
      }
      if (!password) {
        return res.status(400).json({ message: "Введите пароль" });
      }
      if (!advertiserId) {
        return res.status(400).json({ message: "Рекламодатель не указан. Перейдите по ссылке заново." });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await storage.verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.role !== "publisher") {
        return res.status(400).json({ message: "Only publishers can link to advertisers" });
      }

      // Check if already linked
      const existingRelation = await storage.getPublisherAdvertiserRelation(user.id, advertiserId);
      if (existingRelation) {
        return res.status(400).json({ message: "Already linked to this advertiser" });
      }

      // Add relation with pending status
      await storage.addPublisherToAdvertiser(user.id, advertiserId, "pending");

      req.session.userId = user.id;
      req.session.role = user.role;

      res.json({
        success: true,
        message: "Successfully linked to advertiser. Waiting for approval.",
        id: user.id,
        role: user.role,
      });
    } catch (error) {
      console.error("Link to advertiser error:", error);
      res.status(500).json({ message: "Failed to link account" });
    }
  });

  // Setup first admin (works only if no admins exist)
  app.post("/api/setup-admin", async (req: Request, res: Response) => {
    try {
      const { username, password, email, setupKey } = req.body;
      
      // Проверка секретного ключа (обязательно установить SETUP_KEY в Secrets)
      const validKey = process.env.SETUP_KEY;
      if (!validKey) {
        return res.status(403).json({ message: "SETUP_KEY not configured in Secrets" });
      }
      if (setupKey !== validKey) {
        return res.status(403).json({ message: "Invalid setup key" });
      }
      
      if (!username || !password || !email) {
        return res.status(400).json({ message: "All fields required" });
      }
      
      // Проверяем есть ли уже админы
      const existingAdmin = await storage.getUserByUsername("admin");
      const admins = await storage.getUsersByRole("admin");
      if (admins.length > 0) {
        return res.status(400).json({ message: "Admin already exists. Use login." });
      }
      
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const newAdmin = await storage.createUser({
        username,
        password,
        email,
        role: "admin",
        status: "active",
      });
      
      res.json({ 
        success: true, 
        message: "Admin created successfully!",
        username: newAdmin.username 
      });
    } catch (error) {
      console.error("Setup admin error:", error);
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  // Admin reset user password
  app.post("/api/admin/users/:id/reset-password", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId || req.session.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate random password
      const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      
      await storage.updateUserPassword(id, newPassword);

      res.json({ 
        success: true, 
        message: "Password reset successfully",
        newPassword,
        username: user.username
      });
    } catch (error) {
      console.error("Reset user password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Reset admin password (requires SETUP_KEY)
  app.post("/api/reset-admin-password", async (req: Request, res: Response) => {
    try {
      const { newPassword, setupKey } = req.body;
      
      const validKey = process.env.SETUP_KEY;
      if (!validKey) {
        return res.status(403).json({ message: "SETUP_KEY not configured" });
      }
      if (setupKey !== validKey) {
        return res.status(403).json({ message: "Invalid setup key" });
      }
      
      if (!newPassword) {
        return res.status(400).json({ message: "New password required" });
      }
      
      const admin = await storage.getUserByUsername("admin");
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      await storage.updateUserPassword(admin.id, newPassword);
      
      res.json({ success: true, message: "Admin password updated!" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/auth/validate-referral/:code", async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const { adv } = req.query;
      
      // Check if this is a publisher referral (has advertiser ID in query)
      if (adv && typeof adv === "string") {
        const publisher = await storage.getUserByReferralCode(code);
        if (!publisher || publisher.role !== "publisher") {
          return res.status(404).json({ valid: false, message: "Invalid referral code" });
        }
        
        const advertiser = await storage.getUser(adv);
        if (!advertiser || advertiser.role !== "advertiser") {
          return res.status(404).json({ valid: false, message: "Invalid advertiser" });
        }
        
        // Check if publisher has referral enabled for this advertiser
        const settings = await storage.getPublisherReferralSettings(publisher.id, adv);
        if (!settings?.referralEnabled) {
          return res.status(404).json({ valid: false, message: "Referral program not active" });
        }
        
        return res.json({
          valid: true,
          type: "publisher",
          referrerName: publisher.username,
          advertiserName: advertiser.companyName || advertiser.username,
          advertiserId: adv,
          referrerId: publisher.id,
        });
      }
      
      // Standard advertiser referral
      const advertiser = await storage.getUserByReferralCode(code);
      
      if (!advertiser || advertiser.role !== "advertiser") {
        return res.status(404).json({ valid: false, message: "Invalid referral code" });
      }

      res.json({
        valid: true,
        type: "advertiser",
        advertiserName: advertiser.companyName || advertiser.username,
      });
    } catch (error) {
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // Middleware для проверки аутентификации
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.session.role || !roles.includes(req.session.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      next();
    };
  };

  // REFERRAL CODE API
  app.post("/api/advertiser/referral-code", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.referralCode) {
        return res.json({ referralCode: user.referralCode });
      }

      const referralCode = crypto.randomBytes(6).toString("hex").toUpperCase();
      const updatedUser = await storage.updateUserReferralCode(user.id, referralCode);

      res.json({ referralCode: updatedUser?.referralCode });
    } catch (error) {
      console.error("Generate referral code error:", error);
      res.status(500).json({ message: "Failed to generate referral code" });
    }
  });

  app.get("/api/advertiser/referral-code", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ referralCode: user.referralCode || null });
    } catch (error) {
      res.status(500).json({ message: "Failed to get referral code" });
    }
  });

  // ADVERTISER STAFF (TEAM) API
  app.get("/api/advertiser/staff", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const advertiserId = req.session.role === "admin" 
        ? req.query.advertiserId as string 
        : getEffectiveAdvertiserId(req)!;
      
      if (!advertiserId) {
        return res.status(400).json({ message: "Advertiser ID required" });
      }
      
      const staff = await storage.getAdvertiserStaff(advertiserId);
      res.json(staff.map(s => ({ ...s, password: undefined })));
    } catch (error) {
      console.error("Get staff error:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post("/api/advertiser/staff", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("team"), async (req: Request, res: Response) => {
    try {
      const { email, fullName, staffRole, password, advertiserId: bodyAdvertiserId } = req.body;
      
      const advertiserId = req.session.role === "admin" 
        ? bodyAdvertiserId 
        : getEffectiveAdvertiserId(req)!;
      
      if (!email || !fullName || !staffRole || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!advertiserId) {
        return res.status(400).json({ message: "Advertiser ID required" });
      }

      const validRoles = ["manager", "analyst", "support", "finance"];
      if (!validRoles.includes(staffRole)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check if email is already used globally (prevents cross-tenant issues)
      const existingGlobal = await storage.getAdvertiserStaffByEmailOnly(email);
      if (existingGlobal) {
        return res.status(400).json({ message: "Этот email уже используется другим сотрудником" });
      }

      const staff = await storage.createAdvertiserStaff({
        advertiserId,
        email,
        fullName,
        staffRole,
        password,
        status: "active"
      });

      res.json({ ...staff, password: undefined });
    } catch (error) {
      console.error("Create staff error:", error);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  app.put("/api/advertiser/staff/:id", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("team"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { fullName, staffRole, status, password } = req.body;

      const staff = await storage.getAdvertiserStaffById(id);
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (req.session.role !== "admin" && staff.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (staffRole) {
        const validRoles = ["manager", "analyst", "support", "finance"];
        if (!validRoles.includes(staffRole)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        updateData.staffRole = staffRole;
      }
      if (status) updateData.status = status;
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        updateData.password = password;
      }

      const updated = await storage.updateAdvertiserStaff(id, updateData);
      res.json({ ...updated, password: undefined });
    } catch (error) {
      console.error("Update staff error:", error);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.delete("/api/advertiser/staff/:id", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("team"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const staff = await storage.getAdvertiserStaffById(id);
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (req.session.role !== "admin" && staff.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteAdvertiserStaff(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete staff error:", error);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // OFFERS API
  // Получить офферы текущего advertiser
  app.get("/api/offers", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId && req.session.role !== "admin") {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      // Admin без advertiserId получает все активные офферы
      if (!advertiserId) {
        const allOffers = await storage.getActiveOffers();
        const landingsMap = await storage.getLandingsForOffers(allOffers.map(o => o.id));
        const offersWithLandings = allOffers.map(offer => ({
          ...offer,
          landings: landingsMap.get(offer.id) || []
        }));
        return res.json(offersWithLandings);
      }
      const offers = await storage.getOffersByAdvertiser(advertiserId);
      const landingsMap = await storage.getLandingsForOffers(offers.map(o => o.id));
      const offersWithLandings = offers.map(offer => ({
        ...offer,
        landings: landingsMap.get(offer.id) || []
      }));
      res.json(offersWithLandings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // Статистика офферов (CR%)
  app.get("/api/offers/stats", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId && req.session.role !== "admin") {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      // Для admin без advertiserId возвращаем пустой массив статистики
      if (!advertiserId) {
        return res.json([]);
      }
      const stats = await storage.getOfferPerformanceByAdvertiser(advertiserId);
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch offer stats:", error);
      res.status(500).json({ message: "Failed to fetch offer stats" });
    }
  });

  // Статистика офферов для партнёра (CR%)
  app.get("/api/publisher/offers/stats", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const stats = await storage.getOfferPerformanceByPublisher(req.session.userId!);
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch publisher offer stats:", error);
      res.status(500).json({ message: "Failed to fetch offer stats" });
    }
  });

  // Создать оффер с лендингами
  app.post("/api/offers", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("offers"), async (req: Request, res: Response) => {
    try {
      const { landings, ...rawOfferData } = req.body;
      
      // Санитизация всех полей - numeric() в Drizzle ожидает string
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      const sanitizedData = {
        ...rawOfferData,
        revSharePercent: sanitizeNumericToString(rawOfferData.revSharePercent),
        holdPeriodDays: sanitizeInteger(rawOfferData.holdPeriodDays),
        partnerPayout: sanitizeNumericToString(rawOfferData.partnerPayout),
        internalCost: sanitizeNumericToString(rawOfferData.internalCost),
        dailyCap: sanitizeInteger(rawOfferData.dailyCap),
        monthlyCap: sanitizeInteger(rawOfferData.monthlyCap),
        totalCap: sanitizeInteger(rawOfferData.totalCap),
        capReachedAction: rawOfferData.capReachedAction || "block",
        capRedirectUrl: rawOfferData.capRedirectUrl || null,
        advertiserId: effectiveAdvertiserId,
        geo: Array.isArray(rawOfferData.geo) ? rawOfferData.geo.filter((g: string) => g && g.trim()) : [],
        trafficSources: Array.isArray(rawOfferData.trafficSources) ? rawOfferData.trafficSources : [],
        appTypes: Array.isArray(rawOfferData.appTypes) ? rawOfferData.appTypes : [],
        creativeLinks: Array.isArray(rawOfferData.creativeLinks) ? rawOfferData.creativeLinks : [],
      };
      
      console.log("[POST /api/offers] Creating offer:", sanitizedData.name, "for advertiser:", sanitizedData.advertiserId);
      
      // Validate required fields before schema validation
      if (!sanitizedData.geo || sanitizedData.geo.length === 0) {
        return res.status(400).json({ message: "GEO is required. Please select at least one country." });
      }
      
      if (!sanitizedData.name || !sanitizedData.name.trim()) {
        return res.status(400).json({ message: "Offer name is required." });
      }
      
      if (!sanitizedData.category || !sanitizedData.category.trim()) {
        return res.status(400).json({ message: "Category is required." });
      }
      
      // Ensure description has a default value if empty
      if (!sanitizedData.description || !sanitizedData.description.trim()) {
        sanitizedData.description = sanitizedData.name; // Use name as default description
      }
      
      const result = insertOfferSchema.safeParse(sanitizedData);

      if (!result.success) {
        console.error("[POST /api/offers] Validation failed:", result.error.issues);
        return res.status(400).json({ message: "Invalid offer data", errors: result.error.issues });
      }

      const offer = await storage.createOffer(result.data);
      console.log("[POST /api/offers] Created offer:", offer.id, "shortId:", offer.shortId);
      
      // Create landings if provided
      if (landings && Array.isArray(landings)) {
        for (const landing of landings) {
          // Validate landing data
          if (!landing.geo || !landing.landingUrl) {
            continue;
          }
          
          // Санитизация для landings - numeric() в Drizzle ожидает string
          const payout = sanitizeNumericToString(landing.partnerPayout);
          const landingData = {
            geo: landing.geo,
            landingName: landing.landingName || null,
            landingUrl: sanitizeLandingUrl(landing.landingUrl),
            partnerPayout: payout || "0", // Default to "0" if empty
            internalCost: sanitizeNumericToString(landing.internalCost),
            currency: landing.currency || "USD",
            clickIdParam: landing.clickIdParam || "click_id",
            offerId: offer.id,
          };
          const createdLanding = await storage.createOfferLanding(landingData);
        }
      }

      const createdLandings = await storage.getOfferLandings(offer.id);
      res.status(201).json({ ...offer, landings: createdLandings });
    } catch (error: any) {
      console.error("[POST /api/offers] Create offer error:", error);
      const errorMessage = error?.message || "Unknown error";
      res.status(500).json({ message: "Failed to create offer", error: errorMessage });
    }
  });

  // Получить архивированные офферы (ВАЖНО: этот route должен быть ДО /api/offers/:id)
  app.get("/api/offers/archived", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const archivedOffers = await storage.getArchivedOffersByAdvertiser(advertiserId);
      const landingsMap = await storage.getLandingsForOffers(archivedOffers.map(o => o.id));
      const offersWithLandings = archivedOffers.map(offer => ({
        ...offer,
        landings: landingsMap.get(offer.id) || []
      }));
      res.json(offersWithLandings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch archived offers" });
    }
  });

  // Получить один оффер с лендингами
  app.get("/api/offers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      // Для publisher проверяем доступ - БЕЗ доступа НЕ показываем landing URLs
      if (req.session.role === "publisher") {
        const hasAccess = await storage.hasPublisherAccessToOffer(offer.id, req.session.userId!);
        const { internalCost, ...safeOffer } = offer;
        
        if (!hasAccess) {
          // Проверяем статус заявки
          const accessRequest = await storage.getOfferAccessRequestByOfferAndPublisher(offer.id, req.session.userId!);
          const accessStatus = accessRequest?.status || null;
          // Без доступа - показываем лендинги с payout но БЕЗ trackingUrl
          const allLandings = await storage.getOfferLandings(offer.id);
          const safeLandings = allLandings.map(({ internalCost, ...rest }) => ({
            ...rest,
            trackingUrl: null,  // No tracking URL for unapproved offers
            isApproved: false,
          }));
          return res.json({ ...safeOffer, landings: safeLandings, hasAccess: false, accessStatus });
        }
        
        // С доступом - показываем ВСЕ лендинги, trackingUrl только для одобренных
        const allLandings = await storage.getOfferLandings(offer.id);
        const customDomain = await storage.getActiveTrackingDomain(offer.advertiserId);
        const trackingDomain = customDomain || process.env.PLATFORM_DOMAIN || "primetrack.pro";
        const publisherId = req.session.userId!;
        
        // Get approved landings list
        const publisherOffer = await storage.getPublisherOffer(offer.id, publisherId);
        const approvedLandings = normalizePostgresArray(publisherOffer?.approvedLandings);
        
        // Get shortIds for compact tracking URLs
        const publisher = await storage.getUser(publisherId);
        const offerShortId = formatShortId(offer.shortId, 4, offer.id);
        const publisherShortId = formatShortId(publisher?.shortId, 3, publisherId);
        
        // Show ALL landings, but trackingUrl only for approved ones
        const safeLandings = allLandings.map(({ internalCost, ...rest }) => {
          const landingShortId = formatShortId(rest.shortId, 4, rest.id);
          const isApproved = !approvedLandings || approvedLandings.length === 0 || approvedLandings.includes(rest.id);
          return {
            ...rest,
            trackingUrl: isApproved 
              ? `https://${trackingDomain}/click/${offerShortId}/${landingShortId}?partner_id=${publisherShortId}`
              : null,
            isApproved,
          };
        });
        const requestedLandings = normalizePostgresArray(publisherOffer?.requestedLandings);
        return res.json({ 
          ...safeOffer, 
          landings: safeLandings, 
          hasAccess: true, 
          accessStatus: 'approved',
          requestedLandings: requestedLandings || null,
          extensionRequestedAt: publisherOffer?.extensionRequestedAt || null
        });
      }
      
      // Для advertiser/admin - полная информация
      const landings = await storage.getOfferLandings(offer.id);
      res.json({ ...offer, landings });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offer" });
    }
  });

  // Обновить оффер
  app.put("/api/offers/:id", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("offers"), async (req: Request, res: Response) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (offer.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { landings, ...rawOfferData } = req.body;
      
      // Санитизация всех полей - numeric() в Drizzle ожидает string
      const offerData = {
        ...rawOfferData,
        revSharePercent: sanitizeNumericToString(rawOfferData.revSharePercent),
        holdPeriodDays: sanitizeInteger(rawOfferData.holdPeriodDays),
        partnerPayout: sanitizeNumericToString(rawOfferData.partnerPayout),
        internalCost: sanitizeNumericToString(rawOfferData.internalCost),
        dailyCap: sanitizeInteger(rawOfferData.dailyCap),
        monthlyCap: sanitizeInteger(rawOfferData.monthlyCap),
        totalCap: sanitizeInteger(rawOfferData.totalCap),
        capReachedAction: rawOfferData.capReachedAction,
        capRedirectUrl: rawOfferData.capRedirectUrl,
      };
      
      // Обновить оффер
      const updated = await storage.updateOffer(req.params.id, offerData);
      
      // Обновление landings: обновляем существующие, создаём новые, УДАЛЯЕМ отсутствующие
      if (landings && Array.isArray(landings)) {
        const existingLandings = await storage.getOfferLandings(req.params.id);
        const existingLandingIds = new Set(existingLandings.map(l => l.id));
        
        // Собираем ID лендингов из payload (только существующие)
        const payloadLandingIds = new Set(
          landings.filter(l => l.id && existingLandingIds.has(l.id)).map(l => l.id)
        );
        
        // Удаляем лендинги, которых нет в payload
        for (const existing of existingLandings) {
          if (!payloadLandingIds.has(existing.id)) {
            await storage.deleteOfferLandingById(existing.id);
          }
        }
        
        // Обновляем/создаём лендинги
        for (const landing of landings) {
          const payout = sanitizeNumericToString(landing.partnerPayout);
          const sanitizedLanding = {
            geo: landing.geo,
            landingName: landing.landingName || null,
            landingUrl: sanitizeLandingUrl(landing.landingUrl),
            partnerPayout: payout || "0",
            internalCost: sanitizeNumericToString(landing.internalCost),
            currency: landing.currency || "USD",
            clickIdParam: landing.clickIdParam || "click_id",
          };
          
          if (landing.id && existingLandingIds.has(landing.id)) {
            // Обновить существующий landing
            await storage.updateOfferLanding(landing.id, sanitizedLanding);
          } else {
            // Создать новый landing
            await storage.createOfferLanding({
              ...sanitizedLanding,
              offerId: req.params.id,
            });
          }
        }
      }
      
      // Пересчитываем geo оффера на основе оставшихся лендингов
      const updatedLandings = await storage.getOfferLandings(req.params.id);
      const uniqueGeos = Array.from(new Set(updatedLandings.map(l => l.geo).filter(Boolean)));
      await storage.updateOffer(req.params.id, { geo: uniqueGeos });
      
      // Вернуть обновлённый оффер с landings
      const finalOffer = await storage.getOffer(req.params.id);
      res.json({ ...finalOffer, landings: updatedLandings });
    } catch (error) {
      console.error("Update offer error:", error);
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  // Архивировать оффер
  app.patch("/api/offers/:id/archive", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("offers"), async (req: Request, res: Response) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (offer.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const archived = await storage.archiveOffer(req.params.id);
      res.json(archived);
    } catch (error) {
      console.error("Archive offer error:", error);
      res.status(500).json({ message: "Failed to archive offer" });
    }
  });

  // Восстановить оффер из архива
  app.patch("/api/offers/:id/restore", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("offers"), async (req: Request, res: Response) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (offer.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const restored = await storage.restoreOffer(req.params.id);
      res.json(restored);
    } catch (error) {
      console.error("Restore offer error:", error);
      res.status(500).json({ message: "Failed to restore offer" });
    }
  });

  // Add landing to offer
  app.post("/api/offers/:offerId/landings", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("offers"), async (req: Request, res: Response) => {
    try {
      const offer = await storage.getOffer(req.params.offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (offer.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const result = insertOfferLandingSchema.safeParse({
        ...req.body,
        offerId: req.params.offerId,
      });

      if (!result.success) {
        return res.status(400).json({ message: "Invalid landing data", errors: result.error.issues });
      }

      const landing = await storage.createOfferLanding(result.data);
      res.status(201).json(landing);
    } catch (error) {
      console.error("Create landing error:", error);
      res.status(500).json({ message: "Failed to create landing" });
    }
  });

  // MARKETPLACE API - все активные офферы для publishers (без internalCost и landingUrl до одобрения)
  app.get("/api/marketplace", requireAuth, async (req: Request, res: Response) => {
    try {
      const offers = await storage.getActiveOffers();
      const isPublisher = req.session.role === "publisher";
      const publisherId = req.session.userId!;
      
      // Batch load all data to avoid N+1
      const offerIds = offers.map(o => o.id);
      const landingsMap = await storage.getLandingsForOffers(offerIds);
      const accessSet = isPublisher 
        ? await storage.getPublisherAccessMap(offerIds, publisherId)
        : new Set(offerIds); // Non-publishers have access to all
      
      const offersWithLandings = offers.map(offer => {
        const { internalCost, ...safeOffer } = offer;
        const hasAccess = accessSet.has(offer.id);
        
        if (!hasAccess) {
          return { ...safeOffer, landings: [] };
        }
        
        const landings = landingsMap.get(offer.id) || [];
        const safeLandings = landings.map(({ internalCost, ...rest }) => rest);
        return { ...safeOffer, landings: safeLandings };
      });
      
      res.json(offersWithLandings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch marketplace" });
    }
  });

  // TRACKING API
  // Записать клик
  app.post("/api/clicks", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const clickId = crypto.randomUUID();
      const result = insertClickSchema.safeParse({
        offerId: req.body.offerId,
        publisherId: req.session.userId,
        clickId,
        ip: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
        userAgent: req.headers["user-agent"] || null,
        geo: req.body.geo || null,
      });

      if (!result.success) {
        return res.status(400).json({ message: "Invalid click data", errors: result.error.issues });
      }

      const click = await storage.createClick(result.data);
      res.status(201).json(click);
    } catch (error) {
      res.status(500).json({ message: "Failed to record click" });
    }
  });

  // Получить клики publisher
  app.get("/api/clicks", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const clicks = await storage.getClicksByPublisher(req.session.userId!);
      res.json(clicks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clicks" });
    }
  });

  // Postback для конверсий (вызывается advertiser)
  app.post("/api/conversions", async (req: Request, res: Response) => {
    try {
      const { clickId, payout, status: inputStatus, conversionType = "lead" } = req.body;
      
      if (!clickId) {
        return res.status(400).json({ message: "clickId is required" });
      }

      const click = await storage.getClickByClickId(clickId);
      if (!click) {
        return res.status(404).json({ message: "Click not found" });
      }

      // Get offer to determine pricing and hold period
      const offer = await storage.getOffer(click.offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      // Calculate advertiser cost and publisher payout from offer
      const advertiserCost = payout || offer.internalCost || "0";
      const publisherPayout = offer.partnerPayout || "0";

      // Determine initial status based on hold period
      let finalStatus = inputStatus || "approved";
      let holdUntil: Date | null = null;
      
      if (offer.holdPeriodDays && offer.holdPeriodDays > 0 && finalStatus === "approved") {
        finalStatus = "hold";
        holdUntil = new Date();
        holdUntil.setDate(holdUntil.getDate() + offer.holdPeriodDays);
      }

      const result = insertConversionSchema.safeParse({
        clickId: click.id,
        offerId: click.offerId,
        publisherId: click.publisherId,
        advertiserCost,
        publisherPayout,
        conversionType,
        status: finalStatus,
        holdUntil,
      });

      if (!result.success) {
        return res.status(400).json({ message: "Invalid conversion data" });
      }

      const conversion = await storage.createConversion(result.data);
      res.status(201).json(conversion);
    } catch (error) {
      res.status(500).json({ message: "Failed to record conversion" });
    }
  });

  // Получить конверсии publisher
  app.get("/api/conversions", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const conversions = await storage.getConversionsByPublisher(req.session.userId!);
      res.json(conversions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversions" });
    }
  });

  // Статистика для publisher
  app.get("/api/stats/publisher", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const clicks = await storage.getClicksByPublisher(req.session.userId!);
      const conversions = await storage.getConversionsByPublisher(req.session.userId!);
      
      const totalClicks = clicks.length;
      const totalConversions = conversions.length;
      const totalEarnings = conversions.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      const cr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const epc = totalClicks > 0 ? totalEarnings / totalClicks : 0;

      res.json({
        totalClicks,
        totalConversions,
        totalEarnings,
        cr: cr.toFixed(2),
        epc: epc.toFixed(2),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Статистика для advertiser - optimized with SQL aggregation
  app.get("/api/stats/advertiser", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      // Use optimized cached method instead of N+1 loop
      const stats = await storage.getAdvertiserStats(advertiserId);
      const offers = await storage.getOffersByAdvertiser(advertiserId);

      res.json({
        totalOffers: offers.length,
        totalClicks: stats.totalClicks,
        totalConversions: stats.totalConversions,
        totalSpent: stats.publisherPayout,
        cr: stats.cr.toFixed(2),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ============================================
  // MINI-TRACKER ENDPOINTS
  // ============================================

  // Split test redirect handler (public, no auth required)
  // Format: /t/s/:shortCode?sub1=...&sub2=...
  // Selects a random offer based on weights and redirects through click handler
  app.get("/t/s/:shortCode", async (req: Request, res: Response) => {
    try {
      const { shortCode } = req.params;
      const { sub2, sub3, sub4, sub5, sub6, sub7, sub8, sub9, sub10, visitor_id, fp_confidence } = req.query;

      // Get split test by short code
      const splitTest = await storage.getSplitTestByShortCode(shortCode);
      if (!splitTest || splitTest.status !== 'active') {
        return res.status(404).json({ error: "Split test not found or inactive" });
      }

      // Get split test items
      const items = await storage.getSplitTestItems(splitTest.id);
      if (items.length === 0) {
        return res.status(404).json({ error: "No items in split test" });
      }

      // Select item based on weighted random
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedItem = items[0];
      
      for (const item of items) {
        random -= item.weight;
        if (random <= 0) {
          selectedItem = item;
          break;
        }
      }

      // Get offer and landing
      const offer = await storage.getOffer(selectedItem.offerId);
      if (!offer || offer.status !== 'active') {
        return res.status(404).json({ error: "Selected offer not found or inactive" });
      }

      // Determine landing ID - use item's landingId or first available landing
      let landingId = selectedItem.landingId;
      let landing = landingId ? await storage.getOfferLanding(landingId) : null;
      if (!landing) {
        const landings = await storage.getOfferLandings(offer.id);
        if (landings.length > 0) {
          landing = landings[0];
          landingId = landing.id;
        }
      }

      if (!landingId || !landing) {
        return res.status(404).json({ error: "No active landing for selected offer" });
      }

      // Extract partner click_id using landing config
      const effectiveSub1 = extractPartnerClickId(req.query, landing.storeClickIdIn);

      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                 req.socket.remoteAddress || 
                 "unknown";
      const userAgent = req.headers["user-agent"] || "";
      const referer = req.headers["referer"] || "";
      
      let geoCode = (req.headers["cf-ipcountry"] as string) ||
                    (req.headers["x-country-code"] as string);
      
      if (!geoCode && ip && ip !== "unknown") {
        const geoData = geoip.lookup(ip);
        if (geoData?.country) {
          geoCode = geoData.country;
        }
      }
      
      if (!geoCode) {
        geoCode = "XX";
      }

      console.log(`[SplitTest] Processing click: splitTest=${shortCode}, selectedOffer=${offer.id}, landing=${landingId}, publisher=${splitTest.publisherId}`);

      const result = await clickHandler.processClick({
        offerId: offer.id,
        landingId,
        partnerId: splitTest.publisherId,
        sub1: effectiveSub1,
        sub2: sub2 as string,
        sub3: sub3 as string,
        sub4: sub4 as string,
        sub5: sub5 as string,
        sub6: sub6 as string,
        sub7: sub7 as string,
        sub8: sub8 as string,
        sub9: sub9 as string,
        sub10: sub10 as string,
        ip,
        userAgent,
        referer,
        geo: geoCode,
        visitorId: visitor_id as string,
        fingerprintConfidence: fp_confidence ? parseFloat(fp_confidence as string) : undefined,
      });

      res.redirect(302, result.redirectUrl);
    } catch (error: any) {
      console.error("Split test click handler error:", error);
      // Always redirect, never return HTTP errors for clicks
      res.redirect(302, "/stub?error=split_test_error");
    }
  });

  // Path-based click tracking (public, no auth required)
  // Format: /click/:offerId/:landingId?partner_id=XXX&sub1=...
  // Supports both UUID and shortId (e.g. /click/1/1?partner_id=1 or /click/uuid/uuid?partner_id=uuid)
  app.get("/click/:offerId/:landingId", async (req: Request, res: Response) => {
    let rawClickId: string | null = null;
    
    try {
      const { offerId: rawOfferId, landingId: rawLandingId } = req.params;
      const { partner_id: rawPartnerId, sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8, sub9, sub10, visitor_id, fp_confidence } = req.query;
      
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                 req.socket.remoteAddress || 
                 "unknown";
      const userAgent = req.headers["user-agent"] || "";
      const referer = req.headers["referer"] || "";
      
      // GEO from headers or IP geolocation
      let geoCode = (req.headers["cf-ipcountry"] as string) ||
                    (req.headers["x-country-code"] as string);
      
      if (!geoCode && ip && ip !== "unknown") {
        const geoData = geoip.lookup(ip);
        if (geoData?.country) {
          geoCode = geoData.country;
        }
      }
      
      if (!geoCode) {
        geoCode = "XX";
      }

      // Create raw_click record immediately
      const rawClick = await storage.createRawClick({
        rawOfferId,
        rawLandingId,
        rawPartnerId: rawPartnerId as string || null,
        ip,
        userAgent,
        referer,
        path: req.path,
        rawQuery: JSON.stringify(req.query),
        geo: geoCode,
        sub1: sub1 as string,
        sub2: sub2 as string,
        sub3: sub3 as string,
        sub4: sub4 as string,
        sub5: sub5 as string,
        sub6: sub6 as string,
        sub7: sub7 as string,
        sub8: sub8 as string,
        sub9: sub9 as string,
        sub10: sub10 as string,
        status: "pending",
      });
      rawClickId = rawClick.id;
      
      if (!rawPartnerId) {
        await storage.updateRawClickStatus(rawClickId, "rejected", "missing_partner_id");
        return res.status(400).json({ 
          error: "Missing required parameter: partner_id" 
        });
      }

      // Resolve shortId or UUID to actual UUIDs
      console.log(`[CLICK DEBUG] rawOfferId=${rawOfferId}, rawLandingId=${rawLandingId}, rawPartnerId=${rawPartnerId}`);
      const offerId = await resolveOfferId(rawOfferId);
      const landingId = await resolveLandingId(rawLandingId);
      const partnerId = await resolvePublisherId(rawPartnerId as string);
      console.log(`[CLICK DEBUG] resolved offerId=${offerId}, landingId=${landingId}, partnerId=${partnerId}`);

      // Get offer for advertiser ID
      const offer = offerId ? await storage.getOffer(offerId) : null;

      if (!offerId) {
        console.log(`[CLICK DEBUG] Offer not found for rawOfferId=${rawOfferId}`);
        await storage.updateRawClickStatus(rawClickId, "rejected", "offer_not_found", undefined, {
          checkStage: "offer",
        });
        return res.status(404).json({ error: "Offer not found" });
      }
      if (!landingId) {
        await storage.updateRawClickStatus(rawClickId, "rejected", "landing_not_found", undefined, {
          resolvedOfferId: offerId,
          advertiserId: offer?.advertiserId,
          checkStage: "landing",
        });
        return res.status(404).json({ error: "Landing not found" });
      }
      if (!partnerId) {
        await storage.updateRawClickStatus(rawClickId, "rejected", "partner_not_found", undefined, {
          resolvedOfferId: offerId,
          resolvedLandingId: landingId,
          advertiserId: offer?.advertiserId,
          checkStage: "landing",
        });
        return res.status(404).json({ error: "Partner not found" });
      }

      // Get landing for storeClickIdIn config
      const landing = await storage.getOfferLanding(landingId);
      const effectiveSub1 = extractPartnerClickId(req.query, landing?.storeClickIdIn);

      const result = await clickHandler.processClick({
        offerId,
        landingId,
        partnerId,
        sub1: effectiveSub1,
        sub2: sub2 as string,
        sub3: sub3 as string,
        sub4: sub4 as string,
        sub5: sub5 as string,
        sub6: sub6 as string,
        sub7: sub7 as string,
        sub8: sub8 as string,
        sub9: sub9 as string,
        sub10: sub10 as string,
        ip,
        userAgent,
        referer,
        geo: geoCode,
        visitorId: visitor_id as string,
        fingerprintConfidence: fp_confidence ? parseFloat(fp_confidence as string) : undefined,
      });

      const rawClickStatus = result.isBlocked ? "rejected" : "processed";
      const rejectReason = result.isBlocked ? (result.capReached ? "cap_reached" : "fraud_blocked") : undefined;
      const checkStage = result.isBlocked 
        ? (result.capReached ? "cap" : "fraud")
        : "redirect";
      await storage.updateRawClickStatus(rawClickId, rawClickStatus, rejectReason, result.id, {
        resolvedOfferId: offerId,
        resolvedLandingId: landingId,
        resolvedPublisherId: partnerId,
        advertiserId: offer?.advertiserId,
        checkStage,
      });

      res.redirect(302, result.redirectUrl);
    } catch (error: any) {
      console.error("Click handler error:", error);
      if (rawClickId) {
        await storage.updateRawClickStatus(rawClickId, "rejected", `error: ${error.message}`, undefined, {
          checkStage: "click",
        }).catch(() => {});
      }
      // Always redirect, never return HTTP errors for clicks
      res.redirect(302, "/system/unavailable?lang=en");
    }
  });

  // Custom domain click handler - simplified URLs without /click prefix
  // Works only when request comes from a verified custom domain
  // Usage: /{offerId}/{landingId}?partner_id=XXX or /{offerId}/{landingId}?a=XXX
  app.get("/:offerId/:landingId", async (req: Request, res: Response, next: NextFunction) => {
    // Only process if this is a custom domain request
    if (!req.customDomain) {
      return next();
    }

    try {
      const { offerId: rawOfferId, landingId: rawLandingId } = req.params;
      const rawPartnerId = (req.query.partner_id || req.query.a) as string;
      const { sub2, sub3, sub4, sub5, sub6, sub7, sub8, sub9, sub10, visitor_id, fp_confidence } = req.query;

      if (!rawPartnerId) {
        return res.status(400).json({ 
          error: "Missing required parameter: partner_id or a" 
        });
      }

      // Resolve shortId or UUID to actual UUIDs
      const offerId = await resolveOfferId(rawOfferId);
      const landingId = await resolveLandingId(rawLandingId);
      const partnerId = await resolvePublisherId(rawPartnerId);

      if (!offerId) {
        return res.status(404).json({ error: "Offer not found" });
      }
      if (!landingId) {
        return res.status(404).json({ error: "Landing not found" });
      }
      if (!partnerId) {
        return res.status(404).json({ error: "Partner not found" });
      }

      // Verify offer belongs to the custom domain's advertiser
      const offer = await storage.getOffer(offerId);
      if (!offer || offer.advertiserId !== req.customDomain.advertiserId) {
        return res.status(404).json({ error: "Offer not found for this domain" });
      }

      // Get landing for storeClickIdIn config
      const landing = await storage.getOfferLanding(landingId);
      const effectiveSub1 = extractPartnerClickId(req.query, landing?.storeClickIdIn);

      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                 req.socket.remoteAddress || 
                 "unknown";
      const userAgent = req.headers["user-agent"] || "";
      const referer = req.headers["referer"] || "";
      
      let geoCode = (req.headers["cf-ipcountry"] as string) ||
                    (req.headers["x-country-code"] as string);
      
      if (!geoCode && ip && ip !== "unknown") {
        const geoData = geoip.lookup(ip);
        if (geoData?.country) {
          geoCode = geoData.country;
        }
      }
      
      if (!geoCode) {
        geoCode = "XX";
      }

      console.log(`[CustomDomain] Processing click: domain=${req.customDomain.domain}, offer=${rawOfferId}, landing=${rawLandingId}, partner=${rawPartnerId}`);

      const result = await clickHandler.processClick({
        offerId,
        landingId,
        partnerId,
        sub1: effectiveSub1,
        sub2: sub2 as string,
        sub3: sub3 as string,
        sub4: sub4 as string,
        sub5: sub5 as string,
        sub6: sub6 as string,
        sub7: sub7 as string,
        sub8: sub8 as string,
        sub9: sub9 as string,
        sub10: sub10 as string,
        ip,
        userAgent,
        referer,
        geo: geoCode,
        visitorId: visitor_id as string,
        fingerprintConfidence: fp_confidence ? parseFloat(fp_confidence as string) : undefined,
      });

      res.redirect(302, result.redirectUrl);
    } catch (error: any) {
      console.error("[CustomDomain] Click handler error:", error);
      // Always redirect, never return HTTP errors for clicks
      res.redirect(302, "/stub?error=custom_domain_error");
    }
  });

  // Click tracking endpoint (public, no auth required)
  // Usage: /api/click?offer_id=XXX&partner_id=YYY&geo=US&sub1=...&sub2=...
  // Query-based click tracking (public, no auth required)
  // Usage: /api/click?offer_id=XXX&partner_id=YYY or /api/click?o=1&a=1&link_id=1
  // Supports both UUID and shortId
  app.get("/api/click", async (req: Request, res: Response) => {
    let rawClickId: string | null = null;
    
    try {
      // Support both naming conventions: offer_id/partner_id OR o/a/link_id (Scaleo style)
      const rawOfferId = (req.query.offer_id || req.query.o) as string;
      const rawPartnerId = (req.query.partner_id || req.query.a) as string;
      const rawLandingId = req.query.link_id as string;
      const { geo, sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8, sub9, sub10, visitor_id, fp_confidence } = req.query;

      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                 req.socket.remoteAddress || 
                 "unknown";
      const userAgent = req.headers["user-agent"] || "";
      const referer = req.headers["referer"] || "";
      
      // GEO: from query param, headers, or IP geolocation
      let geoCode = (geo as string) || 
                    (req.headers["cf-ipcountry"] as string) ||
                    (req.headers["x-country-code"] as string);
      
      // Fallback to IP geolocation if no GEO provided
      if (!geoCode && ip && ip !== "unknown") {
        const geoData = geoip.lookup(ip);
        if (geoData?.country) {
          geoCode = geoData.country;
        }
      }
      
      // Final fallback for localhost/private IPs that can't be geolocated
      if (!geoCode) {
        geoCode = "XX";
      }

      // Create raw_click record immediately
      const rawClick = await storage.createRawClick({
        rawOfferId: rawOfferId || null,
        rawLandingId: rawLandingId || null,
        rawPartnerId: rawPartnerId || null,
        ip,
        userAgent,
        referer,
        path: req.path,
        rawQuery: JSON.stringify(req.query),
        geo: geoCode,
        sub1: sub1 as string,
        sub2: sub2 as string,
        sub3: sub3 as string,
        sub4: sub4 as string,
        sub5: sub5 as string,
        sub6: sub6 as string,
        sub7: sub7 as string,
        sub8: sub8 as string,
        sub9: sub9 as string,
        sub10: sub10 as string,
        status: "pending",
      });
      rawClickId = rawClick.id;

      if (!rawOfferId || !rawPartnerId) {
        await storage.updateRawClickStatus(rawClickId, "rejected", "missing_required_params");
        return res.status(400).json({ 
          error: "Missing required parameters", 
          required: ["offer_id (or o)", "partner_id (or a)"] 
        });
      }

      // Resolve shortId or UUID to actual UUIDs
      const offerId = await resolveOfferId(rawOfferId);
      const partnerId = await resolvePublisherId(rawPartnerId);

      // Get offer for advertiser ID
      const offer = offerId ? await storage.getOffer(offerId) : null;

      if (!offerId) {
        await storage.updateRawClickStatus(rawClickId, "rejected", "offer_not_found");
        return res.status(404).json({ error: "Offer not found" });
      }
      if (!partnerId) {
        await storage.updateRawClickStatus(rawClickId, "rejected", "partner_not_found", undefined, {
          resolvedOfferId: offerId,
          advertiserId: offer?.advertiserId,
        });
        return res.status(404).json({ error: "Partner not found" });
      }
      
      // Resolve landing ID if provided - return 404 if specified but not found
      let landingId: string | undefined;
      let landing: any = null;
      if (rawLandingId) {
        const resolvedLandingId = await resolveLandingId(rawLandingId);
        if (!resolvedLandingId) {
          await storage.updateRawClickStatus(rawClickId, "rejected", "landing_not_found", undefined, {
            resolvedOfferId: offerId,
            resolvedPublisherId: partnerId,
            advertiserId: offer?.advertiserId,
          });
          return res.status(404).json({ error: "Landing not found" });
        }
        landingId = resolvedLandingId;
        landing = await storage.getOfferLanding(landingId);
      }

      // Extract partner click_id using landing config (if available)
      const effectiveSub1 = extractPartnerClickId(req.query, landing?.storeClickIdIn);

      const result = await clickHandler.processClick({
        offerId,
        partnerId,
        landingId,
        sub1: effectiveSub1,
        sub2: sub2 as string,
        sub3: sub3 as string,
        sub4: sub4 as string,
        sub5: sub5 as string,
        sub6: sub6 as string,
        sub7: sub7 as string,
        sub8: sub8 as string,
        sub9: sub9 as string,
        sub10: sub10 as string,
        ip,
        userAgent,
        referer,
        geo: geoCode,
        visitorId: visitor_id as string,
        fingerprintConfidence: fp_confidence ? parseFloat(fp_confidence as string) : undefined,
      });

      const rawClickStatus = result.isBlocked ? "rejected" : "processed";
      const rejectReason = result.isBlocked ? (result.capReached ? "cap_reached" : "fraud_blocked") : undefined;
      const checkStage = result.isBlocked 
        ? (result.capReached ? "cap" : "fraud")
        : "redirect";
      await storage.updateRawClickStatus(rawClickId, rawClickStatus, rejectReason, result.id, {
        resolvedOfferId: offerId,
        resolvedLandingId: landingId,
        resolvedPublisherId: partnerId,
        advertiserId: offer?.advertiserId,
        checkStage,
      });

      res.redirect(302, result.redirectUrl);
    } catch (error: any) {
      console.error("Click handler error:", error);
      if (rawClickId) {
        await storage.updateRawClickStatus(rawClickId, "rejected", `error: ${error.message}`, undefined, {
          checkStage: "click",
        }).catch(() => {});
      }
      // Always redirect, never return HTTP errors for clicks
      res.redirect(302, "/system/unavailable?lang=en");
    }
  });

  // Universal Postback endpoint (public, called by external trackers)
  // Usage: /api/postback?click_id=XXX&status=lead|sale&payout=123.45
  // The click_id contains all information about offer and publisher - no need to specify them
  // Supports multiple parameter names: click_id/clickid/subid/subid_1/tid/sub1
  app.get("/api/postback", async (req: Request, res: Response) => {
    try {
      const query = req.query;
      const requestPayload = JSON.stringify(query);
      
      // Try multiple common parameter names for click_id
      // Supports: Keitaro, Binom, Voluum, Scaleo, Affise, Alanbase and custom trackers
      const clickId = (
        query.click_id || query.clickid || query.aff_click_id ||
        query.subid || query.sub_id || query.subid_1 ||
        query.externalid || query.external_id ||
        query.tid || query.cid ||
        query.sub1 || query.sub2 || query.sub3 || query.sub4 || query.sub5 ||
        query.sub6 || query.sub7 || query.sub8 || query.sub9 || query.sub10 ||
        query.s2s_click || query.transaction_id || query.txid
      ) as string;
      
      if (!clickId) {
        await storage.createPostbackLog({
          direction: "inbound",
          recipientType: "system",
          url: req.originalUrl,
          method: "GET",
          requestPayload,
          success: false,
          errorMessage: "Missing click_id parameter"
        });
        return res.status(400).json({ 
          error: "Missing required parameter: click_id",
          hint: "Supported params: click_id, clickid, aff_click_id, subid, sub_id, externalid, tid, cid, sub1-10, s2s_click, transaction_id"
        });
      }

      // Find click by click_id - this contains all offer/publisher info
      // First try to find by internal clickId (PrimeTrack UUID)
      // If not found, search by sub1 (partner's external click_id)
      let click = await storage.getClickByClickId(clickId);
      if (!click) {
        click = await storage.getClickBySub1(clickId);
      }
      if (!click) {
        await storage.createPostbackLog({
          direction: "inbound",
          recipientType: "system",
          url: req.originalUrl,
          method: "GET",
          requestPayload,
          success: false,
          errorMessage: `Click not found: ${clickId}`
        });
        return res.status(404).json({ 
          error: "Click not found",
          clickId
        });
      }

      // Get offer for advertiser context
      const offer = await storage.getOffer(click.offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Extract status and payout from various param names
      const rawStatus = (
        (query.status || query.event || query.action || query.goal) as string
      )?.toLowerCase() || "lead";
      
      const payoutValue = query.payout || query.sum || query.revenue || query.amount;

      // Status mapping - supports common tracker formats
      // Note: "confirmed" = lead (регистрация подтверждена), NOT sale
      // For sale/deposit use explicit: sale, dep, deposit, ftd, payment
      const statusMappings: Record<string, string> = {
        lead: "lead", reg: "lead", registration: "lead", signup: "lead", 
        confirm: "lead", confirmed: "lead", approved_lead: "lead",
        sale: "sale", dep: "sale", deposit: "sale", purchase: "sale", ftd: "sale", payment: "sale",
        rebill: "sale", approved: "sale", approved_sale: "sale",
        install: "install", app_install: "install",
        rejected: "rejected", decline: "rejected", declined: "rejected", cancel: "rejected",
        "1": "lead", "2": "sale", "3": "rejected"
      };
      
      const mappedStatus = statusMappings[rawStatus] || rawStatus;
      const validStatuses = ["lead", "sale", "install", "rejected"];
      
      if (!validStatuses.includes(mappedStatus)) {
        await storage.createPostbackLog({
          direction: "inbound",
          recipientType: "advertiser",
          recipientId: offer.advertiserId,
          offerId: click.offerId,
          publisherId: click.publisherId,
          url: req.originalUrl,
          method: "GET",
          requestPayload,
          success: false,
          errorMessage: `Invalid status: ${rawStatus}`
        });
        return res.status(400).json({ 
          error: "Invalid status", 
          received: rawStatus,
          validStatuses: ["lead", "sale", "install", "rejected"]
        });
      }

      // Handle rejected status
      if (mappedStatus === "rejected") {
        await storage.createPostbackLog({
          direction: "inbound",
          recipientType: "advertiser",
          recipientId: offer.advertiserId,
          offerId: click.offerId,
          publisherId: click.publisherId,
          url: req.originalUrl,
          method: "GET",
          requestPayload,
          success: true,
          responseCode: 200
        });
        return res.json({
          success: true,
          message: "Rejection recorded",
          clickId,
          offerId: click.offerId,
          publisherId: click.publisherId,
          status: "rejected"
        });
      }

      const result = await orchestrator.processConversion({
        clickId,
        status: mappedStatus as "lead" | "sale" | "install",
        sum: payoutValue ? parseFloat(payoutValue as string) : undefined,
        externalId: query.external_id as string,
      });

      // Log successful inbound postback
      await storage.createPostbackLog({
        direction: "inbound",
        recipientType: "advertiser",
        recipientId: offer.advertiserId,
        offerId: click.offerId,
        publisherId: click.publisherId,
        conversionId: result.id,
        url: req.originalUrl,
        method: "GET",
        requestPayload,
        success: true,
        responseCode: 200
      });

      res.json({
        success: true,
        conversionId: result.id,
        clickId: result.clickId,
        offerId: click.offerId,
        publisherId: click.publisherId,
        status: result.status,
        advertiserCost: result.advertiserCost,
        publisherPayout: result.publisherPayout,
      });
    } catch (error: any) {
      console.error("Postback handler error:", error);
      res.status(400).json({ 
        error: error.message || "Failed to process postback" 
      });
    }
  });

  // DEPRECATED: Old Keitaro/Binom endpoints removed
  // Use universal /api/postback?o={offer_id}&a={publisher_id}&click_id=XXX&status=lead|sale&payout=123.45
  // These endpoints redirect to the new universal postback for backwards compatibility
  app.get("/api/postbacks/keitaro", async (req: Request, res: Response) => {
    res.status(410).json({
      error: "This endpoint is deprecated",
      message: "Please use /api/postback?o={offer_id}&a={publisher_id}&click_id={click_id}&status={status}&payout={payout}",
      documentation: "/docs/postbacks"
    });
  });

  app.get("/api/postbacks/binom", async (req: Request, res: Response) => {
    res.status(410).json({
      error: "This endpoint is deprecated",
      message: "Please use /api/postback?o={offer_id}&a={publisher_id}&click_id={click_id}&status={status}&payout={payout}",
      documentation: "/docs/postbacks"
    });
  });

  // ============================================
  // INCOMING POSTBACK CONFIGS (Advertiser parameter mapping)
  // ============================================

  app.get("/api/incoming-postback-configs", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const configs = await storage.getIncomingPostbackConfigsByAdvertiser(advertiserId);
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch postback configs" });
    }
  });

  app.post("/api/incoming-postback-configs", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { label, offerId, clickIdParam, statusParam, payoutParam, storeClickIdIn, statusMappings } = req.body;
      
      const config = await storage.createIncomingPostbackConfig({
        advertiserId,
        label: label || "Default",
        offerId: offerId || null,
        clickIdParam: clickIdParam || "click_id",
        statusParam: statusParam || "status",
        payoutParam: payoutParam || "payout",
        storeClickIdIn: storeClickIdIn || "click_id",
        statusMappings: statusMappings ? JSON.stringify(statusMappings) : undefined
      });
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to create postback config" });
    }
  });

  app.put("/api/incoming-postback-configs/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      const { label, clickIdParam, statusParam, payoutParam, storeClickIdIn, statusMappings, isActive } = req.body;
      
      const configs = await storage.getIncomingPostbackConfigsByAdvertiser(advertiserId);
      const config = configs.find(c => c.id === id);
      if (!config) {
        return res.status(404).json({ message: "Config not found" });
      }

      const updateData: any = {};
      if (label !== undefined) updateData.label = label;
      if (clickIdParam !== undefined) updateData.clickIdParam = clickIdParam;
      if (statusParam !== undefined) updateData.statusParam = statusParam;
      if (payoutParam !== undefined) updateData.payoutParam = payoutParam;
      if (storeClickIdIn !== undefined) updateData.storeClickIdIn = storeClickIdIn;
      if (statusMappings !== undefined) updateData.statusMappings = JSON.stringify(statusMappings);
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await storage.updateIncomingPostbackConfig(id, updateData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update postback config" });
    }
  });

  app.delete("/api/incoming-postback-configs/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const configs = await storage.getIncomingPostbackConfigsByAdvertiser(advertiserId);
      const config = configs.find(c => c.id === id);
      if (!config) {
        return res.status(404).json({ message: "Config not found" });
      }

      await storage.deleteIncomingPostbackConfig(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete postback config" });
    }
  });

  // ============================================
  // PUBLISHER POSTBACK ENDPOINTS (Outgoing to publisher's tracker)
  // ============================================

  app.get("/api/publisher-postback-endpoints", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const endpoints = await storage.getPublisherPostbackEndpoints(req.session.userId!);
      res.json(endpoints);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch postback endpoints" });
    }
  });

  app.post("/api/publisher-postback-endpoints", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { label, offerId, trackerType, baseUrl, httpMethod, clickIdParam, statusParam, payoutParam, statusMappings, statusFilter } = req.body;
      
      if (!baseUrl) {
        return res.status(400).json({ message: "baseUrl is required" });
      }

      const endpoint = await storage.createPublisherPostbackEndpoint({
        publisherId: req.session.userId!,
        label: label || "Default",
        offerId: offerId || null,
        trackerType: trackerType || "custom",
        baseUrl,
        httpMethod: httpMethod || "GET",
        clickIdParam: clickIdParam || "subid",
        statusParam: statusParam || "status",
        payoutParam: payoutParam || "payout",
        statusMappings: statusMappings ? JSON.stringify(statusMappings) : undefined,
        statusFilter: statusFilter ? JSON.stringify(statusFilter) : undefined
      });
      res.json(endpoint);
    } catch (error) {
      res.status(500).json({ message: "Failed to create postback endpoint" });
    }
  });

  app.put("/api/publisher-postback-endpoints/:id", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { label, baseUrl, httpMethod, clickIdParam, statusParam, payoutParam, statusMappings, statusFilter, isActive } = req.body;
      
      const endpoints = await storage.getPublisherPostbackEndpoints(req.session.userId!);
      const endpoint = endpoints.find(e => e.id === id);
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }

      const updateData: any = {};
      if (label !== undefined) updateData.label = label;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (httpMethod !== undefined) updateData.httpMethod = httpMethod;
      if (clickIdParam !== undefined) updateData.clickIdParam = clickIdParam;
      if (statusParam !== undefined) updateData.statusParam = statusParam;
      if (payoutParam !== undefined) updateData.payoutParam = payoutParam;
      if (statusMappings !== undefined) updateData.statusMappings = JSON.stringify(statusMappings);
      if (statusFilter !== undefined) updateData.statusFilter = JSON.stringify(statusFilter);
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await storage.updatePublisherPostbackEndpoint(id, updateData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update postback endpoint" });
    }
  });

  app.delete("/api/publisher-postback-endpoints/:id", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const endpoints = await storage.getPublisherPostbackEndpoints(req.session.userId!);
      const endpoint = endpoints.find(e => e.id === id);
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }

      await storage.deletePublisherPostbackEndpoint(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete postback endpoint" });
    }
  });

  // ============================================
  // OFFER ACCESS SYSTEM
  // ============================================

  // Marketplace for publishers - shows offers WITHOUT landing URLs
  // Publishers must request access to see landing URLs
  app.get("/api/marketplace/offers", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const offers = await storage.getActiveOffers();
      const publisherId = req.session.userId!;
      
      const offersWithAccess = await Promise.all(
        offers.map(async (offer) => {
          // Check if publisher has active partnership with this advertiser
          const partnership = await storage.getPublisherAdvertiserRelation(publisherId, offer.advertiserId);
          const partnershipStatus = partnership?.status || null;
          
          // Only show offers if partnership is active - hide completely for pending/inactive
          const isPartnershipActive = partnershipStatus === "active";
          
          // If partnership is not active, return null to filter out
          if (!isPartnershipActive) {
            return null;
          }
          
          const hasAccess = await storage.hasPublisherAccessToOffer(offer.id, publisherId);
          const existingRequest = await storage.getOfferAccessRequestByOfferAndPublisher(offer.id, publisherId);
          
          const { internalCost, ...safeOffer } = offer;
          
          if (hasAccess) {
            const allLandings = await storage.getOfferLandings(offer.id);
            const customDomain = await storage.getActiveTrackingDomain(offer.advertiserId);
            const trackingDomain = customDomain || process.env.PLATFORM_DOMAIN || "primetrack.pro";
            
            // Get shortIds for compact tracking URLs
            const publisher = await storage.getUser(publisherId);
            const offerShortId = formatShortId(offer.shortId, 4, offer.id);
            const publisherShortId = formatShortId(publisher?.shortId, 3, publisherId);
            
            // Get approved GEOs and landings for this publisher
            const publisherOffer = await storage.getPublisherOffer(offer.id, publisherId);
            const approvedGeos = normalizePostgresArray(publisherOffer?.approvedGeos);
            const approvedLandings = normalizePostgresArray(publisherOffer?.approvedLandings);
            
            // Show ALL landings, trackingUrl only for approved
            const safeLandings = allLandings.map(({ internalCost, ...rest }) => {
              const landingShortId = formatShortId(rest.shortId, 4, rest.id);
              const isApproved = !approvedLandings || approvedLandings.length === 0 || approvedLandings.includes(rest.id);
              return {
                ...rest,
                trackingUrl: isApproved 
                  ? `https://${trackingDomain}/click/${offerShortId}/${landingShortId}?partner_id=${publisherShortId}`
                  : null,
                isApproved,
              };
            });
            return { 
              ...safeOffer, 
              landings: safeLandings,
              accessStatus: "approved" as const,
              hasAccess: true,
              partnershipStatus,
              approvedGeos
            };
          }
          
          // For unapproved offers: show landings with payout but WITHOUT trackingUrl
          const allLandings = await storage.getOfferLandings(offer.id);
          const safeLandings = allLandings.map(({ internalCost, ...rest }) => ({
            ...rest,
            trackingUrl: null,  // No tracking URL for unapproved offers
            isApproved: false,
          }));
          
          return { 
            ...safeOffer, 
            landings: safeLandings,
            accessStatus: existingRequest?.status || null,
            hasAccess: false,
            partnershipStatus
          };
        })
      );
      
      // Filter out null values (offers from non-active partnerships)
      res.json(offersWithAccess.filter(o => o !== null));
    } catch (error) {
      console.error("[marketplace/offers] Error:", error);
      res.status(500).json({ message: "Failed to fetch marketplace offers" });
    }
  });

  // Publisher requests access to an offer
  app.post("/api/offers/:id/request-access", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const offerId = req.params.id;
      const publisherId = req.session.userId!;
      const { message } = req.body;

      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      if (offer.status !== "active") {
        return res.status(400).json({ message: "Offer is not active" });
      }

      const existingRequest = await storage.getOfferAccessRequestByOfferAndPublisher(offerId, publisherId);
      if (existingRequest) {
        return res.status(400).json({ 
          message: "Access request already exists", 
          status: existingRequest.status 
        });
      }

      const hasAccess = await storage.hasPublisherAccessToOffer(offerId, publisherId);
      if (hasAccess) {
        return res.status(400).json({ message: "You already have access to this offer" });
      }

      const request = await storage.createOfferAccessRequest({
        offerId,
        publisherId,
        status: "pending",
        message: message || null,
      });

      // Notify advertiser about new access request
      const publisher = await storage.getUser(publisherId);
      if (publisher) {
        notificationService.notifyAccessRequest(
          offer.advertiserId,
          publisher.username,
          offer.name,
          request.id
        ).catch(console.error);
      }

      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to create access request" });
    }
  });

  // Publisher requests additional landings for an offer they already have access to
  app.post("/api/offers/:id/request-landings", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const offerId = req.params.id;
      const publisherId = req.session.userId!;
      const { landingIds } = req.body;

      if (!landingIds || !Array.isArray(landingIds) || landingIds.length === 0) {
        return res.status(400).json({ message: "landingIds is required and must be a non-empty array" });
      }

      // Check publisher has access to this offer
      const access = await storage.getPublisherOffer(offerId, publisherId);
      if (!access) {
        return res.status(403).json({ message: "You don't have access to this offer" });
      }

      // Check if there's already a pending request
      if (access.requestedLandings && access.requestedLandings.length > 0) {
        return res.status(400).json({ message: "You already have a pending landing extension request" });
      }

      // Validate that requested landings exist in the offer
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      const offerLandings = await storage.getOfferLandings(offerId);
      const offerLandingIds = new Set(offerLandings.map((l) => l.id));
      const invalidLandings = landingIds.filter((id: string) => !offerLandingIds.has(id));
      if (invalidLandings.length > 0) {
        return res.status(400).json({ message: "Some landing IDs are not valid for this offer" });
      }

      // Filter out already approved landings
      const approvedSet = new Set(access.approvedLandings || []);
      const newLandings = landingIds.filter((id: string) => !approvedSet.has(id));
      if (newLandings.length === 0) {
        return res.status(400).json({ message: "All requested landings are already approved" });
      }

      const result = await storage.requestLandingsExtension(offerId, publisherId, newLandings);
      
      // Notify advertiser about landing extension request
      const publisher = await storage.getUser(publisherId);
      if (publisher) {
        notificationService.notifySystemMessage(
          offer.advertiserId,
          "Запрос на расширение",
          `Партнер ${publisher.username} запросил доступ к дополнительным лендингам для оффера "${offer.name}"`
        ).catch(console.error);
      }

      res.json(result);
    } catch (error) {
      console.error("[request-landings] Error:", error);
      res.status(500).json({ message: "Failed to request landings" });
    }
  });

  // Publisher's advertisers (for multi-advertiser context switcher)
  app.get("/api/publisher/advertisers", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const advertisers = await storage.getAdvertisersForPublisher(req.session.userId!);
      const safeAdvertisers = advertisers.map(({ advertiser, ...rel }) => ({
        id: rel.id,
        advertiserId: advertiser.id,
        advertiserName: advertiser.username,
        advertiserEmail: advertiser.email,
        status: rel.status,
        createdAt: rel.createdAt
      }));
      res.json(safeAdvertisers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch advertisers" });
    }
  });

  // Publisher's advertisers extended (with offers count and partnership status)
  app.get("/api/publisher/advertisers-extended", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const publisherId = req.session.userId!;
      const relationships = await storage.getAdvertisersForPublisher(publisherId);
      
      // Load publisher offers once (O(1) instead of O(n))
      const publisherOffers = await storage.getPublisherOffersByPublisher(publisherId);
      const publisherOfferIds = new Set(publisherOffers.map(po => po.offerId));
      
      const extendedAdvertisers = await Promise.all(
        relationships.map(async ({ advertiser, ...rel }) => {
          const advertiserOffers = await storage.getOffersByAdvertiser(advertiser.id);
          const offersCount = advertiserOffers.filter(o => publisherOfferIds.has(o.id)).length;
          
          // Get white-label settings
          const advSettings = await storage.getAdvertiserSettings(advertiser.id);
          
          return {
            id: advertiser.id,
            username: advertiser.username,
            email: advertiser.email,
            offersCount,
            status: rel.status as "active" | "pending" | "inactive" | "rejected",
            logoUrl: advSettings?.logoUrl || (advertiser as any).logoUrl || null,
            telegram: (advertiser as any).telegram || null,
            phone: (advertiser as any).phone || null,
            companyName: advSettings?.brandName || (advertiser as any).companyName || null,
            // White-label
            brandName: advSettings?.brandName || null,
            primaryColor: advSettings?.primaryColor || null,
            customDomain: advSettings?.customDomain || null,
            hidePlatformBranding: advSettings?.hidePlatformBranding || false,
          };
        })
      );
      
      res.json(extendedAdvertisers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch extended advertisers" });
    }
  });

  // Publisher's access requests history
  app.get("/api/publisher/access-requests", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const requests = await storage.getAccessRequestsByPublisher(req.session.userId!);
      
      const requestsWithOffers = await Promise.all(
        requests.map(async (request) => {
          const offer = await storage.getOffer(request.offerId);
          return { ...request, offer: offer ? { id: offer.id, name: offer.name, category: offer.category } : null };
        })
      );
      
      res.json(requestsWithOffers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch access requests" });
    }
  });

  // Publisher's approved offers (with landing URLs)
  app.get("/api/publisher/offers", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const publisherId = req.session.userId!;
      const publisherOffers = await storage.getPublisherOffersByPublisher(publisherId);
      const publisher = await storage.getUser(publisherId);
      const publisherShortId = formatShortId(publisher?.shortId, 3, publisherId);
      
      const offersWithDetails = await Promise.all(
        publisherOffers.map(async (po) => {
          const offer = await storage.getOffer(po.offerId);
          if (!offer) return null;
          
          const allLandings = await storage.getOfferLandings(offer.id);
          const customDomain = await storage.getActiveTrackingDomain(offer.advertiserId);
          const trackingDomain = customDomain || process.env.PLATFORM_DOMAIN || "primetrack.pro";
          const offerShortId = formatShortId(offer.shortId, 4, offer.id);
          const { internalCost, ...safeOffer } = offer;
          
          // Show ALL landings with isApproved flag and trackingUrl for approved
          const approvedLandings = normalizePostgresArray(po.approvedLandings);
          const safeLandings = allLandings.map(({ internalCost, ...rest }) => {
            const landingShortId = formatShortId(rest.shortId, 4, rest.id);
            const isApproved = !approvedLandings || approvedLandings.length === 0 || approvedLandings.includes(rest.id);
            return { 
              ...rest, 
              trackingUrl: isApproved 
                ? `https://${trackingDomain}/click/${offerShortId}/${landingShortId}?partner_id=${publisherShortId}`
                : null,
              isApproved 
            };
          });
          
          return { 
            ...safeOffer, 
            landings: safeLandings,
            approvedAt: po.approvedAt 
          };
        })
      );
      
      res.json(offersWithDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publisher offers" });
    }
  });

  // Publisher's approved offers for link generation (with advertiser filter)
  app.get("/api/publisher/offers-approved", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { advertiser_id } = req.query;
      const publisherId = req.session.userId!;
      const publisherOffers = await storage.getPublisherOffersByPublisher(publisherId);
      const publisher = await storage.getUser(publisherId);
      const publisherShortId = formatShortId(publisher?.shortId, 3, publisherId);
      
      const offersWithDetails = await Promise.all(
        publisherOffers.map(async (po) => {
          const offer = await storage.getOffer(po.offerId);
          if (!offer) return null;
          
          // Filter by advertiser if specified
          if (advertiser_id && offer.advertiserId !== advertiser_id) return null;
          
          const allLandings = await storage.getOfferLandings(offer.id);
          const customDomain = await storage.getActiveTrackingDomain(offer.advertiserId);
          const trackingDomain = customDomain || process.env.PLATFORM_DOMAIN || "primetrack.pro";
          const offerShortId = formatShortId(offer.shortId, 4, offer.id);
          
          // Show ALL landings with isApproved flag and trackingUrl for approved
          const approvedLandings = normalizePostgresArray(po.approvedLandings);
          
          return { 
            id: offer.id,
            name: offer.name,
            logoUrl: offer.logoUrl,
            category: offer.category,
            payoutModel: offer.payoutModel,
            landings: allLandings.map(l => {
              const landingShortId = formatShortId(l.shortId, 4, l.id);
              const isApproved = !approvedLandings || approvedLandings.length === 0 || approvedLandings.includes(l.id);
              return {
                id: l.id,
                offerId: l.offerId,
                geo: l.geo,
                landingName: l.landingName,
                landingUrl: l.landingUrl,
                partnerPayout: l.partnerPayout,
                currency: l.currency,
                trackingUrl: isApproved 
                  ? `https://${trackingDomain}/click/${offerShortId}/${landingShortId}?partner_id=${publisherShortId}`
                  : null,
                isApproved,
              };
            }),
          };
        })
      );
      
      res.json(offersWithDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch approved offers" });
    }
  });

  // ============================================
  // POSTBACK MANAGEMENT
  // ============================================
  
  // Get advertiser's postback settings (global + per-offer)
  app.get("/api/advertiser/postbacks", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      // Get global settings from advertiser_settings
      const advertiserSettings = await storage.getAdvertiserSettings(advertiserId);
      
      // Get per-offer postback settings
      const offerSettings = await storage.getOfferPostbackSettingsByAdvertiser(advertiserId);
      
      // Get postback logs for this advertiser only
      const logs = await storage.getPostbackLogs({ advertiserId, limit: 50 });
      
      res.json({
        globalSettings: advertiserSettings ? {
          postbackUrl: advertiserSettings.postbackUrl,
          postbackMethod: advertiserSettings.postbackMethod,
          leadPostbackUrl: advertiserSettings.leadPostbackUrl,
          leadPostbackMethod: advertiserSettings.leadPostbackMethod,
          salePostbackUrl: advertiserSettings.salePostbackUrl,
          salePostbackMethod: advertiserSettings.salePostbackMethod,
        } : null,
        offerSettings,
        logs,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch postback settings" });
    }
  });
  
  // Update advertiser's global postback settings
  app.put("/api/advertiser/postbacks/global", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { 
        postbackUrl, postbackMethod,
        leadPostbackUrl, leadPostbackMethod,
        salePostbackUrl, salePostbackMethod 
      } = req.body;
      
      const existing = await storage.getAdvertiserSettings(advertiserId);
      
      const updateData: Record<string, string | null | undefined> = {};
      if (postbackUrl !== undefined) updateData.postbackUrl = postbackUrl;
      if (postbackMethod !== undefined) updateData.postbackMethod = postbackMethod;
      if (leadPostbackUrl !== undefined) updateData.leadPostbackUrl = leadPostbackUrl;
      if (leadPostbackMethod !== undefined) updateData.leadPostbackMethod = leadPostbackMethod;
      if (salePostbackUrl !== undefined) updateData.salePostbackUrl = salePostbackUrl;
      if (salePostbackMethod !== undefined) updateData.salePostbackMethod = salePostbackMethod;
      
      if (existing) {
        const updated = await storage.updateAdvertiserSettings(advertiserId, updateData);
        res.json(updated);
      } else {
        const created = await storage.createAdvertiserSettings({
          advertiserId,
          ...updateData,
        });
        res.json(created);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update global postback settings" });
    }
  });
  
  // Create/Update per-offer postback settings
  app.put("/api/advertiser/postbacks/offer/:offerId", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { offerId } = req.params;
      const { postbackUrl, httpMethod, sendOnLead, sendOnSale, sendOnRejected, isActive } = req.body;
      
      // Verify offer belongs to advertiser
      const offer = await storage.getOffer(offerId);
      if (!offer || offer.advertiserId !== advertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const existing = await storage.getOfferPostbackSetting(offerId);
      
      if (existing) {
        const updated = await storage.updateOfferPostbackSetting(offerId, {
          postbackUrl,
          httpMethod,
          sendOnLead,
          sendOnSale,
          sendOnRejected,
          isActive,
        });
        res.json(updated);
      } else {
        const created = await storage.createOfferPostbackSetting({
          offerId,
          advertiserId,
          postbackUrl,
          httpMethod,
          sendOnLead,
          sendOnSale,
          sendOnRejected,
          isActive,
        });
        res.json(created);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update offer postback settings" });
    }
  });
  
  // Delete per-offer postback settings
  app.delete("/api/advertiser/postbacks/offer/:offerId", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { offerId } = req.params;
      
      // Verify offer belongs to advertiser
      const offer = await storage.getOffer(offerId);
      if (!offer || offer.advertiserId !== advertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteOfferPostbackSetting(offerId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete offer postback settings" });
    }
  });
  
  // Get postback logs for advertiser
  app.get("/api/advertiser/postbacks/logs", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const logs = await storage.getPostbackLogs({ advertiserId, limit: 100 });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch postback logs" });
    }
  });
  
  // Publisher postback logs (read-only)
  app.get("/api/publisher/postback-logs", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const publisherId = req.session.userId!;
      const logs = await storage.getPostbackLogs({ publisherId, limit: 50 });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch postback logs" });
    }
  });
  
  // Admin postback logs (all logs)
  app.get("/api/admin/postback-logs", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const logs = await storage.getPostbackLogs({ limit: 100 });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch postback logs" });
    }
  });

  // ============================================
  // UNIVERSAL POSTBACK SETTINGS (for all roles)
  // ============================================
  
  // Get user postback settings
  app.get("/api/postback-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const settings = await storage.getUserPostbackSettings(userId);
      res.json(settings || {
        leadPostbackUrl: null,
        leadPostbackMethod: "GET",
        salePostbackUrl: null,
        salePostbackMethod: "GET"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch postback settings" });
    }
  });
  
  // Update user postback settings
  app.put("/api/postback-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { leadPostbackUrl, leadPostbackMethod, salePostbackUrl, salePostbackMethod } = req.body;
      
      const settings = await storage.upsertUserPostbackSettings(userId, {
        leadPostbackUrl: leadPostbackUrl || null,
        leadPostbackMethod: leadPostbackMethod || "GET",
        salePostbackUrl: salePostbackUrl || null,
        salePostbackMethod: salePostbackMethod || "GET"
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating postback settings:", error);
      res.status(500).json({ message: "Failed to update postback settings" });
    }
  });
  
  // Get postback logs (universal for all roles)
  app.get("/api/postback-logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.role!;
      const limit = parseInt(req.query.limit as string) || 50;
      
      let logs;
      if (role === 'admin') {
        logs = await storage.getPostbackLogs({ limit });
      } else if (role === 'advertiser') {
        const advertiserId = getEffectiveAdvertiserId(req);
        if (!advertiserId) {
          return res.status(401).json({ message: "Not authorized as advertiser" });
        }
        logs = await storage.getPostbackLogs({ advertiserId, limit });
      } else {
        logs = await storage.getPostbackLogs({ publisherId: userId, limit });
      }
      
      res.json(logs || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch postback logs" });
    }
  });

  // Test postback URL (universal for all roles)
  app.post("/api/postback-test", requireAuth, async (req: Request, res: Response) => {
    try {
      const { url, method = "GET" } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      // Replace test macros
      const testUrl = url
        .replace("{click_id}", "test_click_123")
        .replace("{status}", "lead")
        .replace("{sum}", "10.00")
        .replace("{payout}", "5.00")
        .replace("{sub1}", "test_sub1")
        .replace("{sub2}", "test_sub2")
        .replace("{sub3}", "test_sub3")
        .replace("{sub4}", "test_sub4")
        .replace("{sub5}", "test_sub5");
      
      const startTime = Date.now();
      
      try {
        const response = await fetch(testUrl, { method });
        const responseTime = Date.now() - startTime;
        const responseText = await response.text();
        
        res.json({
          success: response.ok,
          url: testUrl,
          status: response.status,
          responseTime,
          responseBody: responseText.substring(0, 500),
        });
      } catch (fetchError: any) {
        res.json({
          success: false,
          url: testUrl,
          error: fetchError.message,
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to test postback" });
    }
  });

  // Advertiser views access requests for their offers
  app.get("/api/advertiser/access-requests", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const requests = await storage.getAccessRequestsByAdvertiser(advertiserId);
      
      const safeRequests = await Promise.all(requests.map(async r => {
        const landings = await storage.getOfferLandings(r.offer.id);
        return {
          ...r,
          publisher: {
            id: r.publisher.id,
            username: r.publisher.username,
            email: r.publisher.email,
          },
          offer: {
            id: r.offer.id,
            name: r.offer.name,
            category: r.offer.category,
            geo: r.offer.geo,
            landings: landings.map(l => ({ id: l.id, name: l.landingName || `Лендинг ${l.geo}`, geo: l.geo })),
          },
        };
      }));
      
      res.json(safeRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch access requests" });
    }
  });

  // Get extension requests (publishers requesting additional landings)
  app.get("/api/advertiser/extension-requests", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      const extensionRequests = await storage.getExtensionRequestsByAdvertiser(advertiserId);
      
      const result = await Promise.all(extensionRequests.map(async (ext) => {
        const landings = await storage.getOfferLandings(ext.offer.id);
        const requestedIds = normalizePostgresArray(ext.requestedLandings) || [];
        const requestedLandingDetails = landings
          .filter(l => requestedIds.includes(l.id))
          .map(l => ({
            id: l.id,
            name: l.landingName || `Лендинг ${l.geo}`,
            geo: l.geo,
            payout: l.partnerPayout,
            currency: l.currency
          }));
        
        return {
          id: `ext-${ext.access.id}`,
          offerId: ext.offer.id,
          publisherId: ext.publisher.id,
          type: "extension",
          status: "pending",
          createdAt: ext.access.extensionRequestedAt?.toISOString() || new Date().toISOString(),
          offer: {
            id: ext.offer.id,
            name: ext.offer.name,
            category: ext.offer.category,
            geo: ext.offer.geo
          },
          publisher: {
            id: ext.publisher.id,
            username: ext.publisher.username,
            email: ext.publisher.email
          },
          requestedLandings: requestedLandingDetails
        };
      }));
      
      res.json(result);
    } catch (error) {
      console.error("[extension-requests] Error:", error);
      res.status(500).json({ message: "Failed to fetch extension requests" });
    }
  });

  // Advertiser approves or rejects access request
  app.put("/api/advertiser/access-requests/:id", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("requests"), async (req: Request, res: Response) => {
    try {
      const requestId = req.params.id;
      const { action, rejectionReason, approvedGeos, approvedLandings } = req.body;

      if (!action || !["approve", "reject", "revoke"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Use 'approve', 'reject', or 'revoke'" });
      }

      const request = await storage.getOfferAccessRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Access request not found" });
      }

      if (action === "revoke" && request.status !== "approved") {
        return res.status(400).json({ message: "Can only revoke approved requests" });
      }

      if (action !== "revoke" && request.status !== "pending" && request.status !== "revoked") {
        return res.status(400).json({ message: "Request already processed" });
      }

      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      const offer = await storage.getOffer(request.offerId);
      if (!offer || offer.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (action === "approve") {
        await storage.updateOfferAccessRequest(requestId, { status: "approved" });
        
        // Validate approvedGeos if provided - must be subset of offer.geo
        // Empty array or no valid geos = null (access to all geos)
        const filteredGeos = Array.isArray(approvedGeos) 
          ? approvedGeos.filter((g: string) => offer.geo.includes(g))
          : null;
        const validGeos = filteredGeos && filteredGeos.length > 0 ? filteredGeos : null;
        
        // Validate approvedLandings if provided - must be subset of offer landings
        const offerLandings = await storage.getOfferLandings(request.offerId);
        const offerLandingIds = offerLandings.map(l => l.id);
        const filteredLandings = Array.isArray(approvedLandings)
          ? approvedLandings.filter((id: string) => offerLandingIds.includes(id))
          : null;
        const validLandings = filteredLandings && filteredLandings.length > 0 ? filteredLandings : null;
        
        // Upsert logic: check if publisher_offer exists, then update or create
        const existingAccess = await storage.getPublisherOffer(request.offerId, request.publisherId);
        if (existingAccess) {
          await storage.updatePublisherOffer(request.offerId, request.publisherId, {
            approvedGeos: validGeos,
            approvedLandings: validLandings,
          });
        } else {
          await storage.createPublisherOffer({
            offerId: request.offerId,
            publisherId: request.publisherId,
            approvedGeos: validGeos,
            approvedLandings: validLandings,
          });
        }
        
        // Send notification to publisher
        notificationService.notifyAccessApproved(
          request.publisherId,
          effectiveAdvertiserId!,
          offer.name
        ).catch(console.error);
        
        res.json({ message: "Access request approved" });
      } else if (action === "revoke") {
        await storage.deletePublisherOffer(request.offerId, request.publisherId);
        // Отзываем ВСЕ access requests от этого партнёра на этот оффер
        await storage.revokeAllAccessRequests(request.offerId, request.publisherId);
        
        res.json({ message: "Access revoked" });
      } else {
        await storage.updateOfferAccessRequest(requestId, { 
          status: "rejected",
          rejectionReason: rejectionReason || null,
        });
        
        // Send notification to publisher
        notificationService.notifyAccessRejected(
          request.publisherId,
          effectiveAdvertiserId!,
          offer.name,
          rejectionReason
        ).catch(console.error);
        
        res.json({ message: "Access request rejected" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to process access request" });
    }
  });

  // Get publishers with access to a specific offer (for advertiser)
  app.get("/api/offers/:id/publishers", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (offer.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const publisherOffers = await storage.getPublisherOffersByOffer(offer.id);
      
      const publishers = await Promise.all(
        publisherOffers.map(async (po) => {
          const user = await storage.getUser(po.publisherId);
          return user ? {
            id: user.id,
            username: user.username,
            email: user.email,
            approvedAt: po.approvedAt,
          } : null;
        })
      );

      res.json(publishers.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publishers" });
    }
  });

  // ============================================
  // ADVERTISER DASHBOARD API (with filters)
  // ============================================

  // Advanced statistics with filters
  app.get("/api/advertiser/stats", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { dateFrom, dateTo, offerIds, publisherIds, geo, status } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (publisherIds) filters.publisherIds = (publisherIds as string).split(',');
      if (geo) filters.geo = (geo as string).split(',');
      if (status) filters.status = (status as string).split(',');

      const stats = await storage.getAdvertiserStats(advertiserId, filters);
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get all publishers for advertiser (for filter dropdown)
  // Get all partner relations for advertiser with status filter
  app.get("/api/advertiser/partners", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { status } = req.query;
      const relations = await storage.getPublisherAdvertiserRelations(
        advertiserId, 
        status as string | undefined
      );
      
      // Get stats for each publisher
      const result = await Promise.all(relations.map(async (rel) => {
        const stats = await storage.getPublisherStatsForAdvertiser(rel.publisherId, advertiserId);
        return {
          id: rel.id,
          publisherId: rel.publisherId,
          username: rel.publisher.username,
          email: rel.publisher.email,
          telegram: rel.publisher.telegram,
          phone: rel.publisher.phone,
          companyName: rel.publisher.companyName,
          status: rel.status,
          createdAt: rel.createdAt,
          clicks: stats.clicks,
          conversions: stats.conversions,
          payout: stats.payout
        };
      }));
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  // Update partner status (approve, block, pause)
  app.put("/api/advertiser/partners/:id/status", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("partners"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["pending", "active", "paused", "blocked"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.updatePublisherAdvertiserStatus(id, status);
      if (!updated) {
        return res.status(404).json({ message: "Partner relation not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update partner status" });
    }
  });

  // Get partner profile with full details and metrics
  app.get("/api/advertiser/partners/:publisherId", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { publisherId } = req.params;
      
      // Get publisher user data
      const publisher = await storage.getUser(publisherId);
      if (!publisher) {
        return res.status(404).json({ message: "Publisher not found" });
      }
      
      // Get relation status
      const relation = await storage.getPublisherAdvertiserRelation(publisherId, advertiserId);
      if (!relation) {
        return res.status(404).json({ message: "Partner relation not found" });
      }
      
      // Get stats
      const stats = await storage.getPublisherStatsForAdvertiser(publisherId, advertiserId);
      
      res.json({
        id: publisher.id,
        username: publisher.username,
        email: publisher.email,
        telegram: publisher.telegram,
        phone: publisher.phone,
        companyName: publisher.companyName,
        createdAt: publisher.createdAt,
        status: relation.status,
        relationCreatedAt: relation.createdAt,
        clicks: stats.clicks,
        conversions: stats.conversions,
        payout: stats.payout
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch partner details" });
    }
  });

  // Get offers connected to partner with their status
  app.get("/api/advertiser/partners/:publisherId/offers", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { publisherId } = req.params;
      
      // Verify relation exists
      const relation = await storage.getPublisherAdvertiserRelation(publisherId, advertiserId);
      if (!relation) {
        return res.status(404).json({ message: "Partner relation not found" });
      }
      
      // Get all offers for this advertiser
      const offers = await storage.getOffersByAdvertiser(advertiserId);
      
      // Get publisher's access to each offer
      const result = await Promise.all(offers.map(async (offer) => {
        const access = await storage.getPublisherOfferAccess(publisherId, offer.id);
        const stats = await storage.getPublisherOfferStats(publisherId, offer.id);
        const landings = await storage.getOfferLandings(offer.id);
        
        // Check access request status
        const accessRequest = await storage.getOfferAccessRequest(offer.id, publisherId);
        
        // Determine access status:
        // 1. If explicitly revoked -> revoked (партнёр НЕ видит ссылки)
        // 2. If has explicit access record (publisher_offers) -> approved
        // 3. If has approved access_request -> approved
        // 4. If has pending access_request -> pending
        // 5. Otherwise -> not_requested
        let accessStatus = "not_requested";
        if (accessRequest?.status === "revoked") {
          accessStatus = "revoked";
        } else if (access) {
          accessStatus = "approved";
        } else if (accessRequest?.status === "approved") {
          accessStatus = "approved";
        } else if (accessRequest?.status === "pending") {
          accessStatus = "pending";
        }
        
        // Get payout from offer or first landing
        let payout = offer.partnerPayout;
        if (!payout && landings.length > 0) {
          payout = landings[0].partnerPayout;
        }
        
        return {
          id: offer.id,
          name: offer.name,
          logoUrl: offer.logoUrl,
          status: offer.status,
          accessStatus,
          payout,
          payoutModel: offer.payoutModel,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          landings: landings.map(l => ({ id: l.id, name: l.landingName || `Лендинг ${l.geo}`, url: l.landingUrl, geo: l.geo, payout: l.partnerPayout, currency: l.currency })),
          approvedLandings: access?.approvedLandings || null,
          requestedLandings: access?.requestedLandings || null,
          extensionRequestedAt: access?.extensionRequestedAt || null
        };
      }));
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch partner offers" });
    }
  });

  // Update partner's offer access status
  app.put("/api/advertiser/partners/:publisherId/offers/:offerId", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("partners"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { publisherId: rawPublisherId, offerId: rawOfferId } = req.params;
      const { status, approvedLandings } = req.body;
      
      // Resolve IDs (support both UUID and shortId)
      const offerId = await resolveOfferId(rawOfferId);
      const publisherId = await resolvePublisherId(rawPublisherId);
      
      if (!offerId) {
        return res.status(404).json({ message: "Offer not found" });
      }
      if (!publisherId) {
        return res.status(404).json({ message: "Publisher not found" });
      }
      
      console.log(`[partners/offers] Updating access: publisher=${publisherId}, offer=${offerId}, status=${status}`);
      
      if (!["approved", "rejected", "revoked"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Verify advertiser owns this offer
      const offer = await storage.getOffer(offerId);
      if (!offer || offer.advertiserId !== advertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate approvedLandings if provided (must be subset of offer landings)
      let validatedLandings: string[] | undefined = undefined;
      if (status === "approved" && approvedLandings !== undefined) {
        // Validate input type
        if (!Array.isArray(approvedLandings) || !approvedLandings.every((id: unknown) => typeof id === "string")) {
          return res.status(400).json({ message: "approvedLandings must be an array of strings" });
        }
        
        // Empty array means "all landings allowed"
        if (approvedLandings.length === 0) {
          validatedLandings = null as any;
        } else {
          // Validate all IDs exist in offer landings
          const offerLandings = await storage.getOfferLandings(offerId);
          const offerLandingIds = offerLandings.map(l => l.id);
          const invalidIds = approvedLandings.filter((id: string) => !offerLandingIds.includes(id));
          if (invalidIds.length > 0) {
            return res.status(400).json({ message: `Invalid landing IDs: ${invalidIds.join(", ")}` });
          }
          validatedLandings = approvedLandings;
        }
      }
      
      const updated = await storage.updatePublisherOfferAccess(publisherId, offerId, status, undefined, validatedLandings);
      res.json(updated);
    } catch (error) {
      console.error("[partners/offers] Error:", error);
      res.status(500).json({ message: "Failed to update offer access" });
    }
  });

  // Approve partner's requested landings extension
  app.post("/api/advertiser/partners/:publisherId/offers/:offerId/approve-landings", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("partners"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { publisherId, offerId } = req.params;
      
      // Verify advertiser owns this offer
      const offer = await storage.getOffer(offerId);
      if (!offer || offer.advertiserId !== advertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if there's a pending request
      const access = await storage.getPublisherOffer(offerId, publisherId);
      if (!access || !access.requestedLandings || access.requestedLandings.length === 0) {
        return res.status(400).json({ message: "No pending landing extension request" });
      }
      
      const result = await storage.approveLandingsExtension(offerId, publisherId);
      
      // Notify publisher about approval
      const publisher = await storage.getUser(publisherId);
      if (publisher) {
        notificationService.notifySystemMessage(
          publisherId,
          "Запрос одобрен",
          `Ваш запрос на дополнительные лендинги для оффера "${offer.name}" одобрен`
        ).catch(console.error);
      }
      
      res.json(result);
    } catch (error) {
      console.error("[approve-landings] Error:", error);
      res.status(500).json({ message: "Failed to approve landing extension" });
    }
  });

  // Reject partner's requested landings extension
  app.post("/api/advertiser/partners/:publisherId/offers/:offerId/reject-landings", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("partners"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { publisherId, offerId } = req.params;
      
      // Verify advertiser owns this offer
      const offer = await storage.getOffer(offerId);
      if (!offer || offer.advertiserId !== advertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if there's a pending request
      const access = await storage.getPublisherOffer(offerId, publisherId);
      if (!access || !access.requestedLandings || access.requestedLandings.length === 0) {
        return res.status(400).json({ message: "No pending landing extension request" });
      }
      
      const result = await storage.rejectLandingsExtension(offerId, publisherId);
      
      // Notify publisher about rejection
      const publisher = await storage.getUser(publisherId);
      if (publisher) {
        notificationService.notifySystemMessage(
          publisherId,
          "Запрос отклонён",
          `Ваш запрос на дополнительные лендинги для оффера "${offer.name}" отклонён`
        ).catch(console.error);
      }
      
      res.json(result);
    } catch (error) {
      console.error("[reject-landings] Error:", error);
      res.status(500).json({ message: "Failed to reject landing extension" });
    }
  });

  // Get/Generate registration link for advertiser
  app.get("/api/advertiser/registration-link", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      let referralCode = await storage.getAdvertiserReferralCode(advertiserId);
      
      if (!referralCode) {
        // Generate a new referral code
        referralCode = `ref_${advertiserId.slice(0, 8)}_${Date.now().toString(36)}`;
        await storage.setAdvertiserReferralCode(advertiserId, referralCode);
      }
      
      // Use PLATFORM_DOMAIN or APP_DOMAIN env or fallback to request host
      const platformDomain = process.env.PLATFORM_DOMAIN || process.env.APP_DOMAIN;
      let baseUrl: string;
      
      if (platformDomain) {
        baseUrl = platformDomain.startsWith('http') ? platformDomain : `https://${platformDomain}`;
      } else {
        baseUrl = resolveRequestOrigin(req);
      }
      const registrationLink = `${baseUrl}/register?ref=${referralCode}`;
      
      res.json({ referralCode, registrationLink });
    } catch (error) {
      res.status(500).json({ message: "Failed to get registration link" });
    }
  });

  // Legacy endpoint for backwards compatibility
  app.get("/api/advertiser/publishers", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const publishers = await storage.getPublishersForAdvertiser(req.session.userId!);
      res.json(publishers.map(p => ({ 
        id: p.id, 
        username: p.username, 
        email: p.email,
        shortId: p.shortId != null ? p.shortId.toString().padStart(3, '0') : '-',
        fullName: p.fullName || null
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publishers" });
    }
  });

  // ============================================
  // ADVERTISER SOURCES (Partner-advertisers who provide offers)
  // ============================================

  // List all sources for advertiser
  app.get("/api/advertiser/sources", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const sources = await storage.getAdvertiserSources(advertiserId);
      // Mask passwords in response
      const safeSources = sources.map(s => ({
        ...s,
        hasPassword: !!s.passwordEncrypted,
        passwordEncrypted: undefined,
      }));
      res.json(safeSources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sources" });
    }
  });

  // Get single source
  app.get("/api/advertiser/sources/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const source = await storage.getAdvertiserSourceById(req.params.id, advertiserId);
      if (!source) {
        return res.status(404).json({ message: "Source not found" });
      }
      res.json({
        ...source,
        hasPassword: !!source.passwordEncrypted,
        passwordEncrypted: undefined,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch source" });
    }
  });

  // Create source
  app.post("/api/advertiser/sources", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("settings"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      const parsed = insertAdvertiserSourceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
      }
      
      const source = await storage.createAdvertiserSource(advertiserId, parsed.data);
      res.json({
        ...source,
        hasPassword: !!source.passwordEncrypted,
        passwordEncrypted: undefined,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create source" });
    }
  });

  // Update source
  app.put("/api/advertiser/sources/:id", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("settings"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      const parsed = insertAdvertiserSourceSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
      }
      
      const source = await storage.updateAdvertiserSource(req.params.id, advertiserId, parsed.data);
      if (!source) {
        return res.status(404).json({ message: "Source not found" });
      }
      res.json({
        ...source,
        hasPassword: !!source.passwordEncrypted,
        passwordEncrypted: undefined,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update source" });
    }
  });

  // Delete source
  app.delete("/api/advertiser/sources/:id", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("settings"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const deleted = await storage.deleteAdvertiserSource(req.params.id, advertiserId);
      if (!deleted) {
        return res.status(404).json({ message: "Source not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete source" });
    }
  });

  // Get conversions with filters
  app.get("/api/advertiser/conversions", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, offerIds, publisherIds, geo, status } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (publisherIds) filters.publisherIds = (publisherIds as string).split(',');
      if (geo) filters.geo = (geo as string).split(',');
      if (status) filters.status = (status as string).split(',');

      const conversions = await storage.getConversionsForAdvertiser(req.session.userId!, filters);
      
      const safeConversions = conversions.map(c => ({
        id: c.id,
        clickId: c.clickId,
        offerId: c.offerId,
        offerName: c.offer.name,
        publisherId: c.publisherId,
        publisherName: c.publisher.username,
        publisherShortId: c.publisher.shortId != null ? c.publisher.shortId.toString().padStart(3, '0') : '-',
        conversionType: c.conversionType,
        advertiserCost: c.advertiserCost,
        publisherPayout: c.publisherPayout,
        status: c.status,
        geo: c.click.geo,
        createdAt: c.createdAt,
      }));
      
      res.json(safeConversions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversions" });
    }
  });

  // Approve, reject, or hold conversion manually
  app.put("/api/advertiser/conversions/:id/status", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const conversionId = req.params.id;
      const { status, reason, holdDays } = req.body;
      
      if (!status || !["approved", "rejected", "hold"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved', 'rejected', or 'hold'" });
      }
      
      const conversion = await storage.getConversion(conversionId);
      if (!conversion) {
        return res.status(404).json({ message: "Conversion not found" });
      }
      
      // Check if advertiser owns this offer
      const offer = await storage.getOffer(conversion.offerId);
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      const user = await storage.getUser(req.session.userId!);
      if (!offer || (offer.advertiserId !== effectiveAdvertiserId && user?.role !== "admin")) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (status === "rejected") {
        // Use orchestrator for full rejection flow (balance update, postback)
        await orchestrator.rejectConversion(conversionId, reason);
      } else if (status === "hold") {
        // Use orchestrator for hold flow (balance transfer, postback)
        await orchestrator.holdConversion(conversionId, holdDays);
      } else if (status === "approved") {
        // Use orchestrator for approval flow (balance update, postback)
        await orchestrator.approveConversion(conversionId);
      }
      
      res.json({ message: `Conversion ${status}`, id: conversionId, status, reason });
    } catch (error) {
      console.error("Error updating conversion status:", error);
      res.status(500).json({ message: "Failed to update conversion status" });
    }
  });

  // Get clicks with filters
  app.get("/api/advertiser/clicks", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, offerIds, publisherIds, geo } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (publisherIds) filters.publisherIds = (publisherIds as string).split(',');
      if (geo) filters.geo = (geo as string).split(',');

      const clicks = await storage.getClicksForAdvertiser(req.session.userId!, filters);
      
      // Get all conversions to calculate per-click stats
      const allConversions = await storage.getConversionsForAdvertiser(req.session.userId!, {});
      
      // Track unique IPs per offer for isUnique calculation
      const uniqueIpsByOffer: Map<string, Set<string>> = new Map();
      
      const safeClicks = await Promise.all(clicks.map(async c => {
        // Get conversions for this click
        const clickConversions = allConversions.filter(conv => conv.clickId === c.id);
        const hasConversion = clickConversions.length > 0;
        const payout = clickConversions.reduce((sum, conv) => sum + parseFloat(conv.publisherPayout || '0'), 0);
        const cost = clickConversions.reduce((sum, conv) => sum + parseFloat(conv.advertiserCost || '0'), 0);
        const margin = cost - payout;
        const roi = cost > 0 ? ((margin / cost) * 100) : 0;
        // Payable = has payout > 0, CR = has payable conversion
        const payableConversions = clickConversions.filter(conv => parseFloat(conv.publisherPayout || '0') > 0);
        const approvedPayable = payableConversions.filter(conv => conv.status === 'approved');
        const cr = payableConversions.length > 0 ? 100 : 0;
        const ar = payableConversions.length > 0 ? Math.round((approvedPayable.length / payableConversions.length) * 100) : 0;
        const epc = payout; // EPC for single click = its payout
        
        // Check if this is unique IP for the offer
        if (!uniqueIpsByOffer.has(c.offerId)) {
          uniqueIpsByOffer.set(c.offerId, new Set());
        }
        const ipSet = uniqueIpsByOffer.get(c.offerId)!;
        const isUnique = c.ip ? !ipSet.has(c.ip) : true;
        if (c.ip) ipSet.add(c.ip);
        
        return {
          id: c.id,
          clickId: c.clickId,
          offerId: c.offerId,
          offerName: c.offer.name,
          publisherId: c.publisherId,
          publisherName: c.publisher.username,
          publisherShortId: c.publisher.shortId != null ? c.publisher.shortId.toString().padStart(3, '0') : '-',
          ip: c.ip,
          geo: c.geo,
          userAgent: c.userAgent,
          sub1: c.sub1,
          sub2: c.sub2,
          sub3: c.sub3,
          sub4: c.sub4,
          sub5: c.sub5,
          createdAt: c.createdAt,
          isUnique,
          hasConversion,
          payout,
          advertiserCost: cost,
          margin,
          roi,
          cr,
          ar,
          epc,
        };
      }));
      
      res.json(safeClicks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clicks" });
    }
  });

  // Get raw clicks (incoming requests log) for advertiser
  app.get("/api/advertiser/raw-clicks", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, offerId, publisherId, status, limit, offset } = req.query;
      
      const filters: any = {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      };
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerId) filters.offerId = offerId as string;
      if (publisherId) filters.publisherId = publisherId as string;
      if (status) filters.status = status as string;

      // Admin sees all raw clicks, advertiser sees only their own
      const user = await storage.getUser(req.session.userId!);
      const result = user?.role === 'admin' 
        ? await storage.getRawClicksAll(filters)
        : await storage.getRawClicksForAdvertiser(req.session.userId!, filters);
      
      // Enrich with offer/publisher names
      const enrichedData = await Promise.all(result.data.map(async (rc) => {
        let offerName = null;
        let publisherName = null;
        let publisherShortId = null;
        
        if (rc.resolvedOfferId) {
          const offer = await storage.getOffer(rc.resolvedOfferId);
          offerName = offer?.name;
        }
        if (rc.resolvedPublisherId) {
          const publisher = await storage.getUser(rc.resolvedPublisherId);
          publisherName = publisher?.fullName || publisher?.username;
          publisherShortId = publisher?.shortId != null ? publisher.shortId.toString().padStart(3, '0') : null;
        }
        
        return {
          ...rc,
          offerName,
          publisherName,
          publisherShortId,
        };
      }));
      
      res.json({ data: enrichedData, total: result.total });
    } catch (error) {
      console.error("Error fetching raw clicks:", error);
      res.status(500).json({ message: "Failed to fetch raw clicks" });
    }
  });

  // Export stats to CSV
  app.get("/api/advertiser/export/csv", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { type, dateFrom, dateTo, offerIds, publisherIds, geo, status } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (publisherIds) filters.publisherIds = (publisherIds as string).split(',');
      if (geo) filters.geo = (geo as string).split(',');
      if (status) filters.status = (status as string).split(',');

      let csvContent = '';
      let filename = 'export.csv';

      if (type === 'conversions') {
        const conversions = await storage.getConversionsForAdvertiser(req.session.userId!, filters);
        csvContent = 'ID,Click ID,Offer,Publisher,Type,Advertiser Cost,Publisher Payout,Status,GEO,Date\n';
        conversions.forEach(c => {
          csvContent += `"${c.id}","${c.clickId}","${c.offer.name}","${c.publisher.username}","${c.conversionType}","${c.advertiserCost}","${c.publisherPayout}","${c.status}","${c.click.geo || ''}","${new Date(c.createdAt).toISOString()}"\n`;
        });
        filename = 'conversions.csv';
      } else if (type === 'clicks') {
        const clicks = await storage.getClicksForAdvertiser(req.session.userId!, filters);
        csvContent = 'ID,Click ID,Offer,Publisher,IP,GEO,User Agent,Sub1,Sub2,Sub3,Date\n';
        clicks.forEach(c => {
          csvContent += `"${c.id}","${c.clickId}","${c.offer.name}","${c.publisher.username}","${c.ip || ''}","${c.geo || ''}","${(c.userAgent || '').replace(/"/g, '""')}","${c.sub1 || ''}","${c.sub2 || ''}","${c.sub3 || ''}","${new Date(c.createdAt).toISOString()}"\n`;
        });
        filename = 'clicks.csv';
      } else {
        const stats = await storage.getAdvertiserStats(req.session.userId!, filters);
        csvContent = 'Offer,Clicks,Leads,Sales,Advertiser Cost,Publisher Payout,Margin,CR%\n';
        stats.byOffer.forEach(o => {
          csvContent += `"${o.offerName}","${o.clicks}","${o.leads}","${o.sales}","${o.advertiserCost.toFixed(2)}","${o.publisherPayout.toFixed(2)}","${o.margin.toFixed(2)}","${o.cr.toFixed(2)}"\n`;
        });
        filename = 'stats.csv';
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Get offer caps status
  app.get("/api/offers/:id/caps", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOffer(id);
      
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      // Verify ownership (unless admin)
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "admin" && offer.advertiserId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const capsCheck = await storage.checkOfferCaps(id);
      const today = new Date().toISOString().split('T')[0];
      const yearMonth = today.substring(0, 7);
      const todayStats = await storage.getOfferCapsStats(id, today);
      const totalConversions = await storage.getOfferTotalConversions(id);
      
      res.json({
        dailyCap: offer.dailyCap,
        monthlyCap: offer.monthlyCap,
        totalCap: offer.totalCap,
        capReachedAction: offer.capReachedAction,
        capRedirectUrl: offer.capRedirectUrl,
        dailyConversions: todayStats?.dailyConversions || 0,
        monthlyConversions: todayStats?.monthlyConversions || 0,
        totalConversions,
        dailyCapReached: capsCheck.dailyCapReached,
        monthlyCapReached: capsCheck.monthlyCapReached,
        totalCapReached: capsCheck.totalCapReached
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offer caps" });
    }
  });

  // Update offer caps
  app.put("/api/offers/:id/caps", requireAuth, requireRole("advertiser", "admin"), requireStaffWriteAccess("offers"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { dailyCap, monthlyCap, totalCap, capReachedAction, capRedirectUrl } = req.body;
      
      const offer = await storage.getOffer(id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      // Verify ownership (unless admin)
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "admin" && offer.advertiserId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updated = await storage.updateOffer(id, {
        dailyCap: dailyCap !== undefined ? dailyCap : offer.dailyCap,
        monthlyCap: monthlyCap !== undefined ? monthlyCap : offer.monthlyCap,
        totalCap: totalCap !== undefined ? totalCap : offer.totalCap,
        capReachedAction: capReachedAction || offer.capReachedAction,
        capRedirectUrl: capRedirectUrl !== undefined ? capRedirectUrl : offer.capRedirectUrl
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update offer caps" });
    }
  });

  // ============================================
  // PUBLISHER INVOICES
  // ============================================

  app.get("/api/publisher/invoices", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const invoices = await db.select().from(publisherInvoices)
        .where(eq(publisherInvoices.publisherId, req.session.userId!))
        .orderBy(desc(publisherInvoices.createdAt));
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id/pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const { invoicePdfService } = await import("./services/invoice-pdf-service");
      
      const [invoice] = await db.select().from(publisherInvoices).where(eq(publisherInvoices.id, req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.publisherId !== req.session.userId && invoice.advertiserId !== req.session.userId) {
        const user = await storage.getUser(req.session.userId!);
        if (user?.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const pdfBuffer = await invoicePdfService.generateInvoicePdf(req.params.id);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${invoice.shortId || req.params.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate invoice PDF" });
    }
  });

  // ============================================
  // CONVERSION FUNNEL
  // ============================================

  app.get("/api/advertiser/funnel", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { funnelAggregationService } = await import("./services/funnel-aggregation-service");
      const user = await storage.getUser(req.session.userId!);
      const isAdmin = user?.role === "admin";
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      
      // Admins can access any data, advertisers need effective ID
      if (!isAdmin && !effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { offerId, dateFrom, dateTo, advertiserId: queryAdvertiserId } = req.query;
      
      // Determine which advertiser's data to fetch
      let targetAdvertiserId = effectiveAdvertiserId;
      if (isAdmin && queryAdvertiserId) {
        targetAdvertiserId = queryAdvertiserId as string;
      }
      
      // Verify offer ownership if offerId provided (skip for admin)
      if (offerId && !isAdmin) {
        const offer = await storage.getOffer(offerId as string);
        if (!offer || offer.advertiserId !== effectiveAdvertiserId) {
          return res.status(403).json({ message: "Access denied to this offer" });
        }
      }
      
      const filters: any = {};
      if (targetAdvertiserId) filters.advertiserId = targetAdvertiserId;
      if (offerId) filters.offerId = offerId as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      
      const funnel = await funnelAggregationService.getFunnelData(filters);
      res.json(funnel);
    } catch (error) {
      console.error("Error fetching funnel data:", error);
      res.status(500).json({ message: "Failed to fetch funnel data" });
    }
  });

  app.get("/api/advertiser/funnel/by-offer", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { funnelAggregationService } = await import("./services/funnel-aggregation-service");
      const user = await storage.getUser(req.session.userId!);
      const isAdmin = user?.role === "admin";
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      
      // Admins can access any data, advertisers need effective ID
      if (!isAdmin && !effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { dateFrom, dateTo, advertiserId: queryAdvertiserId } = req.query;
      
      // Determine which advertiser's data to fetch
      let targetAdvertiserId = effectiveAdvertiserId;
      if (isAdmin && queryAdvertiserId) {
        targetAdvertiserId = queryAdvertiserId as string;
      }
      
      const data = await funnelAggregationService.getFunnelByOffer(
        targetAdvertiserId || "",
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching funnel by offer:", error);
      res.status(500).json({ message: "Failed to fetch funnel data" });
    }
  });

  // ============================================
  // ADVERTISER FINANCIAL ANALYTICS
  // ============================================

  app.get("/api/advertiser/finance/analytics", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { advertiserFinanceService } = await import("./services/advertiser-finance-service");
      const user = await storage.getUser(req.session.userId!);
      const isAdmin = user?.role === "admin";
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      
      if (!isAdmin && !effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { dateFrom, dateTo, interval, advertiserId: queryAdvertiserId } = req.query;
      
      let targetAdvertiserId = effectiveAdvertiserId;
      if (isAdmin && queryAdvertiserId) {
        targetAdvertiserId = queryAdvertiserId as string;
      }
      
      if (!targetAdvertiserId) {
        return res.status(400).json({ message: "Advertiser ID required" });
      }
      
      const analytics = await advertiserFinanceService.getAnalytics({
        advertiserId: targetAdvertiserId,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        interval: (interval as "day" | "week" | "month") || "day",
      });
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching finance analytics:", error);
      res.status(500).json({ message: "Failed to fetch finance analytics" });
    }
  });

  app.get("/api/advertiser/finance/export", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { advertiserFinanceService } = await import("./services/advertiser-finance-service");
      const user = await storage.getUser(req.session.userId!);
      const isAdmin = user?.role === "admin";
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      
      if (!isAdmin && !effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { dateFrom, dateTo, interval, format, advertiserId: queryAdvertiserId } = req.query;
      
      let targetAdvertiserId = effectiveAdvertiserId;
      if (isAdmin && queryAdvertiserId) {
        targetAdvertiserId = queryAdvertiserId as string;
      }
      
      if (!targetAdvertiserId) {
        return res.status(400).json({ message: "Advertiser ID required" });
      }
      
      const analytics = await advertiserFinanceService.getAnalytics({
        advertiserId: targetAdvertiserId,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        interval: (interval as "day" | "week" | "month") || "day",
      });
      
      const exportFormat = (format as string)?.toLowerCase() || "csv";
      const filename = `finance-analytics-${new Date().toISOString().split('T')[0]}`;
      
      if (exportFormat === "csv") {
        const csvRows = [
          ["Metric", "Value"],
          ["Revenue", analytics.summary.revenue.toFixed(2)],
          ["Payouts", analytics.summary.payouts.toFixed(2)],
          ["Profit", analytics.summary.profit.toFixed(2)],
          ["ROI %", analytics.summary.roiPercent.toFixed(2)],
          ["Total FTD", analytics.summary.totalFtd.toString()],
          ["Repeat Deposits", analytics.summary.totalRepeatDeposits.toString()],
          [""],
          ["Offer Breakdown"],
          ["Offer", "Revenue", "Payouts", "Profit", "ROI %", "FTD Count"],
          ...analytics.offerBreakdown.map(o => [
            o.offerName, o.revenue.toFixed(2), o.payouts.toFixed(2), 
            o.profit.toFixed(2), o.roiPercent.toFixed(2), o.ftdCount.toString()
          ]),
          [""],
          ["Publisher Breakdown"],
          ["Publisher", "Revenue", "Payouts", "Profit", "ROI %", "FTD Count"],
          ...analytics.publisherBreakdown.map(p => [
            p.publisherName, p.revenue.toFixed(2), p.payouts.toFixed(2),
            p.profit.toFixed(2), p.roiPercent.toFixed(2), p.ftdCount.toString()
          ]),
        ];
        
        const csv = csvRows.map(row => row.join(",")).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        return res.send(csv);
      }
      
      if (exportFormat === "xlsx") {
        const { default: ExcelJS } = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        
        const summarySheet = workbook.addWorksheet("Summary");
        summarySheet.columns = [{ header: "Metric", width: 20 }, { header: "Value", width: 15 }];
        summarySheet.addRows([
          ["Revenue", `$${analytics.summary.revenue.toFixed(2)}`],
          ["Payouts", `$${analytics.summary.payouts.toFixed(2)}`],
          ["Profit", `$${analytics.summary.profit.toFixed(2)}`],
          ["ROI", `${analytics.summary.roiPercent.toFixed(2)}%`],
          ["Total FTD", analytics.summary.totalFtd],
          ["Repeat Deposits", analytics.summary.totalRepeatDeposits],
        ]);
        
        const offersSheet = workbook.addWorksheet("By Offer");
        offersSheet.columns = [
          { header: "Offer", width: 25 },
          { header: "Revenue", width: 12 },
          { header: "Payouts", width: 12 },
          { header: "Profit", width: 12 },
          { header: "ROI %", width: 10 },
          { header: "FTD", width: 8 },
        ];
        analytics.offerBreakdown.forEach(o => {
          offersSheet.addRow([o.offerName, o.revenue, o.payouts, o.profit, o.roiPercent, o.ftdCount]);
        });
        
        const pubSheet = workbook.addWorksheet("By Publisher");
        pubSheet.columns = [
          { header: "Publisher", width: 25 },
          { header: "Revenue", width: 12 },
          { header: "Payouts", width: 12 },
          { header: "Profit", width: 12 },
          { header: "ROI %", width: 10 },
          { header: "FTD", width: 8 },
        ];
        analytics.publisherBreakdown.forEach(p => {
          pubSheet.addRow([p.publisherName, p.revenue, p.payouts, p.profit, p.roiPercent, p.ftdCount]);
        });
        
        const trendSheet = workbook.addWorksheet("Trend");
        trendSheet.columns = [
          { header: "Period", width: 15 },
          { header: "Revenue", width: 12 },
          { header: "Payouts", width: 12 },
          { header: "Profit", width: 12 },
        ];
        analytics.trend.forEach(t => {
          trendSheet.addRow([t.periodStart, t.revenue, t.payouts, t.profit]);
        });
        
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
        return res.send(Buffer.from(buffer));
      }
      
      if (exportFormat === "pdf") {
        const { financePdfService } = await import("./services/finance-pdf-service");
        const user = await storage.getUser(req.session.userId!);
        
        const pdfBuffer = await financePdfService.generateReport({
          analytics,
          advertiserName: user?.companyName || user?.username || undefined,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined,
        });
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
        return res.send(pdfBuffer);
      }
      
      res.status(400).json({ message: "Invalid format. Use csv, xlsx, or pdf" });
    } catch (error) {
      console.error("Error exporting finance analytics:", error);
      res.status(500).json({ message: "Failed to export finance analytics" });
    }
  });

  // ============================================
  // PUBLISHER DASHBOARD API (NO advertiser_cost, NO antifraud)
  // ============================================

  // Publisher statistics with filters
  app.get("/api/publisher/stats", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, offerIds, geo, status, advertiserId } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (geo) filters.geo = (geo as string).split(',');
      if (status) filters.status = (status as string).split(',');
      if (advertiserId) filters.advertiserId = advertiserId as string;

      const stats = await storage.getPublisherStats(req.session.userId!, filters);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publisher stats" });
    }
  });

  // Publisher conversions (NO advertiser_cost)
  app.get("/api/publisher/conversions", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, offerIds, status } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (status) filters.status = (status as string).split(',');

      const conversions = await storage.getConversionsForPublisher(req.session.userId!, filters);
      res.json(conversions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversions" });
    }
  });

  // Publisher clicks (NO antifraud data, NO advertiser_cost)
  app.get("/api/publisher/clicks", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, offerIds, geo } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (geo) filters.geo = (geo as string).split(',');

      const clicks = await storage.getClicksForPublisher(req.session.userId!, filters);
      
      // Get conversions to calculate per-click stats
      const allConversions = await storage.getConversionsForPublisher(req.session.userId!, {});
      
      // Track unique IPs per offer
      const uniqueIpsByOffer: Map<string, Set<string>> = new Map();
      
      const enrichedClicks = clicks.map(c => {
        // Get conversions for this click
        const clickConversions = allConversions.filter(conv => conv.clickId === c.id);
        const hasConversion = clickConversions.length > 0;
        const payout = clickConversions.reduce((sum, conv) => sum + conv.payout, 0);
        // Payable = has payout > 0, CR = has payable conversion
        const payableConversions = clickConversions.filter(conv => conv.payout > 0);
        const approvedPayable = payableConversions.filter(conv => conv.status === 'approved');
        const cr = payableConversions.length > 0 ? 100 : 0;
        const ar = payableConversions.length > 0 ? Math.round((approvedPayable.length / payableConversions.length) * 100) : 0;
        const epc = payout; // EPC for single click = its payout
        
        // Check if unique IP (approximate - based on order in results)
        if (!uniqueIpsByOffer.has(c.offerId)) {
          uniqueIpsByOffer.set(c.offerId, new Set());
        }
        const ipSet = uniqueIpsByOffer.get(c.offerId)!;
        // We don't have IP in publisher results, so mark first occurrence as unique
        const isUnique = true; // Simplified for publisher
        
        return {
          ...c,
          isUnique,
          hasConversion,
          payout,
          cr,
          ar,
          epc,
        };
      });
      
      res.json(enrichedClicks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clicks" });
    }
  });

  // Get raw clicks (incoming requests log) for publisher
  app.get("/api/publisher/raw-clicks", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, offerId, status, limit, offset } = req.query;
      
      const filters: any = {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      };
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerId) filters.offerId = offerId as string;
      if (status) filters.status = status as string;

      const result = await storage.getRawClicksForPublisher(req.session.userId!, filters);
      
      // Enrich with offer names
      const enrichedData = await Promise.all(result.data.map(async (rc) => {
        let offerName = null;
        
        if (rc.resolvedOfferId) {
          const offer = await storage.getOffer(rc.resolvedOfferId);
          offerName = offer?.name;
        }
        
        return {
          ...rc,
          offerName,
        };
      }));
      
      res.json({ data: enrichedData, total: result.total });
    } catch (error) {
      console.error("Error fetching raw clicks:", error);
      res.status(500).json({ message: "Failed to fetch raw clicks" });
    }
  });

  // Publisher offers list (for filter dropdown)
  app.get("/api/publisher/offers-list", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { advertiserId } = req.query;
      const offers = await storage.getOffersForPublisher(req.session.userId!, advertiserId as string | undefined);
      res.json(offers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // Publisher export CSV (NO advertiser_cost)
  app.get("/api/publisher/export/csv", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { type, dateFrom, dateTo, offerIds, status, advertiserId } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (status) filters.status = (status as string).split(',');
      if (advertiserId) filters.advertiserId = advertiserId as string;

      let csvContent = '';
      let filename = 'export.csv';

      if (type === 'conversions') {
        const conversions = await storage.getConversionsForPublisher(req.session.userId!, filters);
        csvContent = 'ID,Click ID,Offer,Type,Payout,Status,GEO,Sub1,Sub2,Sub3,Date\n';
        conversions.forEach(c => {
          csvContent += `"${c.id}","${c.clickId}","${c.offerName}","${c.conversionType}","${c.payout.toFixed(2)}","${c.status}","${c.geo || ''}","${c.sub1 || ''}","${c.sub2 || ''}","${c.sub3 || ''}","${new Date(c.createdAt).toISOString()}"\n`;
        });
        filename = 'conversions.csv';
      } else if (type === 'clicks') {
        const clicks = await storage.getClicksForPublisher(req.session.userId!, filters);
        csvContent = 'ID,Click ID,Offer,GEO,Sub1,Sub2,Sub3,Date\n';
        clicks.forEach(c => {
          csvContent += `"${c.id}","${c.clickId}","${c.offerName}","${c.geo || ''}","${c.sub1 || ''}","${c.sub2 || ''}","${c.sub3 || ''}","${new Date(c.createdAt).toISOString()}"\n`;
        });
        filename = 'clicks.csv';
      } else {
        const stats = await storage.getPublisherStats(req.session.userId!, filters);
        csvContent = 'Offer,Clicks,Leads,Sales,Payout,Hold,Approved,CR%\n';
        stats.byOffer.forEach(o => {
          csvContent += `"${o.offerName}","${o.clicks}","${o.leads}","${o.sales}","${o.payout.toFixed(2)}","${o.holdPayout.toFixed(2)}","${o.approvedPayout.toFixed(2)}","${o.cr.toFixed(2)}"\n`;
        });
        filename = 'stats.csv';
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // ============================================
  // PUBLISHER SPLIT TESTS (A/B тестирование)
  // ============================================
  
  // Get all split tests for publisher
  app.get("/api/publisher/split-tests", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const tests = await storage.getSplitTestsByPublisher(req.session.userId!);
      
      // Enrich with items
      const enrichedTests = await Promise.all(tests.map(async (test) => {
        const items = await storage.getSplitTestItems(test.id);
        // Get offer names for items
        const enrichedItems = await Promise.all(items.map(async (item) => {
          const offer = await storage.getOffer(item.offerId);
          let landingName = null;
          let landingGeo = null;
          
          if (item.landingId) {
            const landing = await storage.getOfferLanding(item.landingId);
            landingName = landing?.landingName || null;
            landingGeo = landing?.geo?.toUpperCase() || null;
          } else if (offer) {
            // Если landingId не указан, берём первый лендинг оффера
            const landings = await storage.getOfferLandings(offer.id);
            if (landings.length > 0) {
              landingName = landings[0].landingName || null;
              landingGeo = landings[0].geo?.toUpperCase() || null;
            }
          }
          
          return {
            ...item,
            offerName: offer?.name || 'Unknown',
            offerLogoUrl: offer?.logoUrl || null,
            landingName,
            landingGeo,
          };
        }));
        return {
          ...test,
          items: enrichedItems,
          itemCount: items.length,
        };
      }));
      
      res.json(enrichedTests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch split tests" });
    }
  });

  // Get single split test
  app.get("/api/publisher/split-tests/:id", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const test = await storage.getSplitTest(req.params.id);
      if (!test || test.publisherId !== req.session.userId!) {
        return res.status(404).json({ message: "Split test not found" });
      }
      
      const items = await storage.getSplitTestItems(test.id);
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const offer = await storage.getOffer(item.offerId);
        let landingName = null;
        let landingGeo = null;
        
        if (item.landingId) {
          const landing = await storage.getOfferLanding(item.landingId);
          landingName = landing?.landingName || null;
          landingGeo = landing?.geo?.toUpperCase() || null;
        } else if (offer) {
          // Если landingId не указан, берём первый лендинг оффера
          const landings = await storage.getOfferLandings(offer.id);
          if (landings.length > 0) {
            landingName = landings[0].landingName || null;
            landingGeo = landings[0].geo?.toUpperCase() || null;
          }
        }
        
        return {
          ...item,
          offerName: offer?.name || 'Unknown',
          offerLogoUrl: offer?.logoUrl || null,
          landingGeo,
          landingName,
        };
      }));
      
      res.json({ ...test, items: enrichedItems });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch split test" });
    }
  });

  // Create split test
  app.post("/api/publisher/split-tests", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { name, description, items } = req.body;
      
      if (!name || !items || !Array.isArray(items) || items.length < 2) {
        return res.status(400).json({ message: "Name and at least 2 items are required" });
      }
      
      // Validate that all offers exist and publisher has access
      for (const item of items) {
        const offer = await storage.getOffer(item.offerId);
        if (!offer) {
          return res.status(400).json({ message: `Offer ${item.offerId} not found` });
        }
        // Check publisher access
        const access = await storage.getPublisherOfferAccess(req.session.userId!, item.offerId);
        if (!access) {
          return res.status(400).json({ message: `No access to offer ${offer.name}` });
        }
        // Validate landing if specified
        if (item.landingId) {
          const landing = await storage.getOfferLanding(item.landingId);
          if (!landing || landing.offerId !== item.offerId) {
            return res.status(400).json({ message: `Landing not found for offer ${offer.name}` });
          }
        }
      }
      
      // Validate weights sum to 100
      const totalWeight = items.reduce((sum: number, item: any) => sum + (item.weight || 0), 0);
      if (totalWeight !== 100) {
        return res.status(400).json({ message: "Weights must sum to 100%" });
      }
      
      // Generate short code
      const shortCode = Math.random().toString(36).substring(2, 10);
      
      // Create split test
      const test = await storage.createSplitTest({
        publisherId: req.session.userId!,
        name,
        description: description || null,
        shortCode,
        status: 'active',
      });
      
      // Create items
      for (const item of items) {
        await storage.createSplitTestItem({
          splitTestId: test.id,
          offerId: item.offerId,
          landingId: item.landingId || null,
          weight: item.weight,
        });
      }
      
      res.status(201).json(test);
    } catch (error) {
      console.error("Error creating split test:", error);
      res.status(500).json({ message: "Failed to create split test" });
    }
  });

  // Update split test
  app.put("/api/publisher/split-tests/:id", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const test = await storage.getSplitTest(req.params.id);
      if (!test || test.publisherId !== req.session.userId!) {
        return res.status(404).json({ message: "Split test not found" });
      }
      
      const { name, description, status, items } = req.body;
      
      // Update test
      const updated = await storage.updateSplitTest(test.id, {
        name: name || test.name,
        description: description !== undefined ? description : test.description,
        status: status || test.status,
      });
      
      // If items provided, update them
      if (items && Array.isArray(items)) {
        // Validate minimum 2 items
        if (items.length < 2) {
          return res.status(400).json({ message: "At least 2 items are required" });
        }
        
        // Validate weights sum to 100
        const totalWeight = items.reduce((sum: number, item: any) => sum + (item.weight || 0), 0);
        if (totalWeight !== 100) {
          return res.status(400).json({ message: "Weights must sum to 100%" });
        }
        
        // Validate offers access
        for (const item of items) {
          const offer = await storage.getOffer(item.offerId);
          if (!offer) {
            return res.status(400).json({ message: `Offer ${item.offerId} not found` });
          }
          const access = await storage.getPublisherOfferAccess(req.session.userId!, item.offerId);
          if (!access) {
            return res.status(400).json({ message: `No access to offer ${offer.name}` });
          }
        }
        
        // Delete old items and create new
        await storage.deleteSplitTestItems(test.id);
        for (const item of items) {
          await storage.createSplitTestItem({
            splitTestId: test.id,
            offerId: item.offerId,
            landingId: item.landingId || null,
            weight: item.weight,
          });
        }
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update split test" });
    }
  });

  // Delete split test (soft delete)
  app.delete("/api/publisher/split-tests/:id", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const test = await storage.getSplitTest(req.params.id);
      if (!test || test.publisherId !== req.session.userId!) {
        return res.status(404).json({ message: "Split test not found" });
      }
      
      await storage.deleteSplitTest(test.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete split test" });
    }
  });

  // ============================================
  // ADMIN ROUTES
  // ============================================

  // Get all users with filters
  app.get("/api/admin/users", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { role, status, search } = req.query;
      const filters: { role?: string; status?: string; search?: string } = {};
      
      if (role && role !== "all") filters.role = role as string;
      if (status && status !== "all") filters.status = status as string;
      if (search) filters.search = search as string;
      
      const users = await storage.getAllUsers(filters);
      
      // Don't return passwords
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt
      }));
      
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user status (approve, block)
  app.put("/api/admin/users/:id/status", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["pending", "active", "blocked"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.updateUserStatus(id, status);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        createdAt: updated.createdAt
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Get all publishers with their advertisers
  app.get("/api/admin/publishers", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const publishers = await storage.getAllPublishersWithAdvertiser();
      
      const safePublishers = publishers.map(p => ({
        id: p.id,
        username: p.username,
        email: p.email,
        shortId: p.shortId != null ? p.shortId.toString().padStart(3, '0') : '-',
        fullName: p.fullName || null,
        status: p.status,
        createdAt: p.createdAt,
        advertiserId: p.advertiserId,
        advertiserName: p.advertiserName
      }));
      
      res.json(safePublishers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publishers" });
    }
  });

  // Admin stats
  app.get("/api/admin/stats", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Admin platform financial stats
  // OPTIMIZED: SQL aggregation instead of loading all data into memory
  app.get("/api/admin/platform-stats", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      // SQL aggregation for conversions - avoid loading 10000 records
      const financialStats = await storage.getPlatformFinancialStats();
      
      res.json(financialStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  // Admin all payout requests
  app.get("/api/admin/all-payout-requests", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const requests = await storage.getAllPayoutRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payout requests" });
    }
  });

  // ============================================
  // DETAILED REPORTS API
  // Full click/conversion logs with filters
  // ============================================

  // Detailed clicks report - for all roles with proper access control
  app.get("/api/reports/clicks", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.role!;
      
      const {
        offerId,
        publisherId,
        advertiserId,
        dateFrom,
        dateTo,
        geo,
        device,
        os,
        browser,
        isUnique,
        isGeoMatch,
        isBot,
        sub1,
        sub2,
        sub3,
        sub4,
        sub5,
        search, // free text search by offer name
        groupBy, // date, geo, publisher, offer, device, os, browser, sub1-5
        dateMode = "click", // "click" = filter by click date, "conversion" = filter by conversion date
        page = "1",
        limit = "50"
      } = req.query;

      const filters: any = {};
      
      // Handle free text search - filter offers by name
      if (search && typeof search === 'string' && search.trim()) {
        filters.search = search.trim();
      }
      
      // Role-based access control
      if (role === "publisher") {
        filters.publisherId = userId;
        // Filter by selected advertiser's offers
        if (advertiserId) {
          const advertiserOffers = await storage.getOffersByAdvertiser(advertiserId as string);
          if (advertiserOffers.length > 0) {
            filters.offerIds = advertiserOffers.map(o => o.id);
          } else {
            return res.json({ clicks: [], total: 0, page: 1, limit: 50, summary: { clicks: 0, unique: 0, leads: 0, sales: 0, conversions: 0, payout: 0, cost: 0, margin: 0, roi: 0, cr: 0 } });
          }
        }
      } else if (role === "advertiser") {
        // Advertiser sees only clicks on their offers - use getEffectiveAdvertiserId for staff support
        const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
        if (!effectiveAdvertiserId) {
          return res.json({ clicks: [], total: 0, page: 1, limit: 50, summary: { clicks: 0, unique: 0, leads: 0, sales: 0, conversions: 0, payout: 0, cost: 0, margin: 0, roi: 0, cr: 0 } });
        }
        const advertiserOffers = await storage.getOffersByAdvertiser(effectiveAdvertiserId);
        if (advertiserOffers.length > 0) {
          filters.offerIds = advertiserOffers.map(o => o.id);
        } else {
          return res.json({ clicks: [], total: 0, page: 1, limit: 50, summary: { clicks: 0, unique: 0, leads: 0, sales: 0, conversions: 0, payout: 0, cost: 0, margin: 0, roi: 0, cr: 0 } });
        }
      }
      // Admin sees everything

      if (offerId) filters.offerId = offerId as string;
      if (publisherId && role !== "publisher") filters.publisherId = publisherId as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      filters.dateMode = dateMode as string; // "click" or "conversion"
      if (geo) filters.geo = geo as string;
      if (device) filters.device = device as string;
      if (os) filters.os = os as string;
      if (browser) filters.browser = browser as string;
      if (isUnique !== undefined) filters.isUnique = isUnique === "true";
      if (isGeoMatch !== undefined) filters.isGeoMatch = isGeoMatch === "true";
      if (isBot !== undefined) filters.isBot = isBot === "true";
      if (sub1) filters.sub1 = sub1 as string;
      if (sub2) filters.sub2 = sub2 as string;
      if (sub3) filters.sub3 = sub3 as string;
      if (sub4) filters.sub4 = sub4 as string;
      if (sub5) filters.sub5 = sub5 as string;

      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 1000);

      // Use optimized method with SQL-based pagination and aggregation
      const result = await storage.getClicksReportOptimized(filters, pageNum, limitNum);
      
      // Remove anti-fraud data for publishers
      if (role === "publisher") {
        result.clicks = result.clicks.map((click: any) => {
          const { fraudScore, isProxy, isVpn, fingerprint, ...safeClick } = click;
          return safeClick;
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Reports clicks error:", error);
      res.status(500).json({ message: "Failed to fetch clicks report" });
    }
  });

  // Detailed conversions report
  app.get("/api/reports/conversions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.role!;
      
      const {
        offerId,
        publisherId,
        advertiserId,
        dateFrom,
        dateTo,
        status,
        conversionType,
        search, // free text search by offer name
        groupBy,
        page = "1",
        limit = "50"
      } = req.query;

      const filters: any = {};
      
      // Handle free text search - filter offers by name
      if (search && typeof search === 'string' && search.trim()) {
        filters.search = search.trim();
      }
      
      if (role === "publisher") {
        filters.publisherId = userId;
        // Filter by selected advertiser's offers
        if (advertiserId) {
          const advertiserOffers = await storage.getOffersByAdvertiser(advertiserId as string);
          if (advertiserOffers.length > 0) {
            filters.offerIds = advertiserOffers.map(o => o.id);
          } else {
            // No offers for this advertiser - return empty
            return res.json({ conversions: [], total: 0, page: 1, limit: 50 });
          }
        }
      } else if (role === "advertiser") {
        // Use getEffectiveAdvertiserId for staff support
        const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
        if (!effectiveAdvertiserId) {
          return res.json({ conversions: [], total: 0, page: 1, limit: 50 });
        }
        const advertiserOffers = await storage.getOffersByAdvertiser(effectiveAdvertiserId);
        if (advertiserOffers.length > 0) {
          filters.offerIds = advertiserOffers.map(o => o.id);
        } else {
          // Advertiser has no offers - return empty
          return res.json({ conversions: [], total: 0, page: 1, limit: 50 });
        }
      }

      if (offerId) filters.offerId = offerId as string;
      if (publisherId && role !== "publisher") filters.publisherId = publisherId as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (status) filters.status = status as string;
      if (conversionType) filters.conversionType = conversionType as string;

      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 1000);

      const result = await storage.getConversionsReport(filters, groupBy as string, pageNum, limitNum);
      
      // For publishers, hide all advertiser financial data - only show payout
      if (role === "publisher") {
        result.conversions = result.conversions.map((conv: any) => {
          // Remove advertiserCost - publisher should only see their payout
          const { advertiserCost, ...safeConv } = conv;
          return safeConv;
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Reports conversions error:", error);
      res.status(500).json({ message: "Failed to fetch conversions report" });
    }
  });

  // Grouped statistics report
  app.get("/api/reports/grouped", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.role!;
      
      const {
        offerId,
        publisherId,
        advertiserId,
        dateFrom,
        dateTo,
        search, // free text search by offer name
        groupBy = "date" // date, geo, publisher, offer, device, os, browser, sub1-5
      } = req.query;

      const filters: any = {};
      
      // Handle free text search - filter offers by name
      if (search && typeof search === 'string' && search.trim()) {
        filters.search = search.trim();
      }
      
      if (role === "publisher") {
        filters.publisherId = userId;
        // Filter by selected advertiser's offers
        if (advertiserId) {
          const advertiserOffers = await storage.getOffersByAdvertiser(advertiserId as string);
          if (advertiserOffers.length > 0) {
            filters.offerIds = advertiserOffers.map(o => o.id);
          } else {
            return res.json({ data: [], totals: {} });
          }
        }
      } else if (role === "advertiser") {
        // Use getEffectiveAdvertiserId for staff support
        const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
        if (!effectiveAdvertiserId) {
          return res.json({ data: [], totals: {} });
        }
        const advertiserOffers = await storage.getOffersByAdvertiser(effectiveAdvertiserId);
        if (advertiserOffers.length > 0) {
          filters.offerIds = advertiserOffers.map(o => o.id);
        } else {
          return res.json({ data: [], totals: {} });
        }
      }

      if (offerId) filters.offerId = offerId as string;
      if (publisherId && role !== "publisher") filters.publisherId = publisherId as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);

      const result = await storage.getGroupedReport(filters, groupBy as string, role);
      
      // Remove all advertiser financial data for publisher - only show payout
      if (role === "publisher") {
        result.data = result.data.map((row: any) => {
          // Publisher sees only: clicks, uniqueClicks, leads, sales, conversions, cr, payout
          // Does NOT see: cost, margin, roi (all derived from advertiser data)
          const { cost, ...safeRow } = row;
          return safeRow;
        });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Grouped report error:", error);
      res.status(500).json({ message: "Failed to fetch grouped report" });
    }
  });

  // ============================================
  // PAYMENT METHODS (Advertiser)
  // ============================================
  
  // Get advertiser's payment methods
  app.get("/api/advertiser/payment-methods", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const methods = await storage.getPaymentMethodsByAdvertiser(effectiveAdvertiserId);
      res.json(methods);
    } catch (error: any) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });
  
  // Create payment method
  app.post("/api/advertiser/payment-methods", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { methodType, methodName, currency, minPayout, maxPayout, feePercent, feeFixed, instructions } = req.body;
      
      if (!methodType || !methodName || !currency) {
        return res.status(400).json({ message: "methodType, methodName, and currency are required" });
      }
      
      const method = await storage.createPaymentMethod({
        advertiserId: effectiveAdvertiserId,
        methodType,
        methodName,
        currency,
        minPayout: minPayout || "0",
        maxPayout: maxPayout || null,
        feePercent: feePercent || "0",
        feeFixed: feeFixed || "0",
        instructions: instructions || null,
        isActive: true
      });
      
      res.status(201).json(method);
    } catch (error: any) {
      console.error("Create payment method error:", error);
      res.status(500).json({ message: "Failed to create payment method" });
    }
  });
  
  // Update payment method
  app.put("/api/advertiser/payment-methods/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getPaymentMethod(id);
      if (!existing || existing.advertiserId !== effectiveAdvertiserId) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      
      const updated = await storage.updatePaymentMethod(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Update payment method error:", error);
      res.status(500).json({ message: "Failed to update payment method" });
    }
  });
  
  // Delete payment method
  app.delete("/api/advertiser/payment-methods/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getPaymentMethod(id);
      if (!existing || existing.advertiserId !== effectiveAdvertiserId) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      
      await storage.deletePaymentMethod(id);
      res.json({ message: "Payment method deleted" });
    } catch (error: any) {
      console.error("Delete payment method error:", error);
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });
  
  // ============================================
  // PUBLISHER WALLETS
  // ============================================
  
  // Get publisher's wallets for specific advertiser
  app.get("/api/publisher/wallets/:advertiserId", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { advertiserId } = req.params;
      
      const wallets = await storage.getPublisherWalletsByPublisher(userId, advertiserId);
      res.json(wallets);
    } catch (error: any) {
      console.error("Get publisher wallets error:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });
  
  // Get advertiser's payment methods (for publisher to see)
  app.get("/api/publisher/advertiser-payment-methods/:advertiserId", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { advertiserId } = req.params;
      const methods = await storage.getPaymentMethodsByAdvertiser(advertiserId);
      // Only return active methods
      const activeMethods = methods.filter(m => m.isActive);
      res.json(activeMethods);
    } catch (error: any) {
      console.error("Get advertiser payment methods error:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });
  
  // Create publisher wallet
  app.post("/api/publisher/wallets", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { advertiserId, paymentMethodId, walletAddress, accountName, additionalInfo } = req.body;
      
      if (!advertiserId || !paymentMethodId || !walletAddress) {
        return res.status(400).json({ message: "advertiserId, paymentMethodId, and walletAddress are required" });
      }
      
      // Verify payment method exists and belongs to advertiser
      const method = await storage.getPaymentMethod(paymentMethodId);
      if (!method || method.advertiserId !== advertiserId) {
        return res.status(400).json({ message: "Invalid payment method" });
      }
      
      const wallet = await storage.createPublisherWallet({
        publisherId: userId,
        advertiserId,
        paymentMethodId,
        walletAddress,
        accountName: accountName || null,
        additionalInfo: additionalInfo || null,
        isVerified: false,
        isDefault: false
      });
      
      res.status(201).json(wallet);
    } catch (error: any) {
      console.error("Create publisher wallet error:", error);
      res.status(500).json({ message: "Failed to create wallet" });
    }
  });
  
  // Update publisher wallet
  app.put("/api/publisher/wallets/:id", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const existing = await storage.getPublisherWallet(id);
      if (!existing || existing.publisherId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      const updated = await storage.updatePublisherWallet(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Update publisher wallet error:", error);
      res.status(500).json({ message: "Failed to update wallet" });
    }
  });
  
  // Delete publisher wallet
  app.delete("/api/publisher/wallets/:id", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const existing = await storage.getPublisherWallet(id);
      if (!existing || existing.publisherId !== userId) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      await storage.deletePublisherWallet(id);
      res.json({ message: "Wallet deleted" });
    } catch (error: any) {
      console.error("Delete publisher wallet error:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });
  
  // ============================================
  // PUBLISHER BALANCE
  // ============================================
  
  // Get publisher's balance for specific advertiser
  app.get("/api/publisher/balance/:advertiserId", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { advertiserId } = req.params;
      
      const balance = await storage.calculatePublisherBalance(userId, advertiserId);
      res.json(balance);
    } catch (error: any) {
      console.error("Get publisher balance error:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });
  
  // Get all publisher balances (for advertiser)
  app.get("/api/advertiser/publisher-balances", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Get all publishers connected to this advertiser
      const publishers = await storage.getPublishersByAdvertiser(userId);
      
      const balances = [];
      for (const pub of publishers) {
        const balance = await storage.calculatePublisherBalance(pub.publisherId, userId);
        const user = await storage.getUser(pub.publisherId);
        if (user) {
          balances.push({
            publisherId: pub.publisherId,
            publisherName: user.username,
            publisherShortId: user.shortId != null ? user.shortId.toString().padStart(3, '0') : '-',
            publisherEmail: user.email,
            ...balance
          });
        }
      }
      
      res.json(balances);
    } catch (error: any) {
      console.error("Get publisher balances error:", error);
      res.status(500).json({ message: "Failed to fetch balances" });
    }
  });
  
  // ============================================
  // PAYOUT REQUESTS
  // ============================================
  
  // Publisher: Get my payout requests
  app.get("/api/publisher/payout-requests/:advertiserId", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { advertiserId } = req.params;
      
      const requests = await storage.getPayoutRequestsByPublisher(userId, advertiserId);
      res.json(requests);
    } catch (error: any) {
      console.error("Get payout requests error:", error);
      res.status(500).json({ message: "Failed to fetch payout requests" });
    }
  });
  
  // Publisher: Create payout request
  app.post("/api/publisher/payout-requests", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { advertiserId, walletId, requestedAmount, publisherNote } = req.body;
      
      if (!advertiserId || !walletId || !requestedAmount) {
        return res.status(400).json({ message: "advertiserId, walletId, and requestedAmount are required" });
      }
      
      // Verify wallet belongs to publisher
      const wallet = await storage.getPublisherWallet(walletId);
      if (!wallet || wallet.publisherId !== userId) {
        return res.status(400).json({ message: "Invalid wallet" });
      }
      
      // Check available balance
      const balance = await storage.calculatePublisherBalance(userId, advertiserId);
      if (parseFloat(requestedAmount) > balance.available) {
        return res.status(400).json({ message: "Requested amount exceeds available balance" });
      }
      
      // Get payment method for currency
      const method = await storage.getPaymentMethod(wallet.paymentMethodId);
      if (!method) {
        return res.status(400).json({ message: "Invalid payment method" });
      }
      
      // Check minimum payout
      if (parseFloat(requestedAmount) < parseFloat(method.minPayout)) {
        return res.status(400).json({ message: `Minimum payout is ${method.minPayout} ${method.currency}` });
      }
      
      const request = await storage.createPayoutRequest({
        publisherId: userId,
        advertiserId,
        walletId,
        paymentMethodId: wallet.paymentMethodId,
        requestedAmount,
        currency: method.currency,
        status: "pending",
        publisherNote: publisherNote || null
      });
      
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Create payout request error:", error);
      res.status(500).json({ message: "Failed to create payout request" });
    }
  });
  
  // Advertiser: Get all payout requests
  app.get("/api/advertiser/payout-requests", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const requests = await storage.getPayoutRequestsByAdvertiser(userId);
      // Include wallet details for advertiser to see payout requisites
      const enrichedRequests = requests.map(req => ({
        ...req,
        publisherName: req.publisher.username,
        publisherShortId: req.publisher.shortId != null ? req.publisher.shortId.toString().padStart(3, '0') : '-',
        publisherEmail: req.publisher.email,
        walletAddress: req.wallet.walletAddress,
        walletAccountName: req.wallet.accountName,
        walletAdditionalInfo: req.wallet.additionalInfo,
        methodName: req.paymentMethod.methodName,
        methodType: req.paymentMethod.methodType,
      }));
      res.json(enrichedRequests);
    } catch (error: any) {
      console.error("Get payout requests error:", error);
      res.status(500).json({ message: "Failed to fetch payout requests" });
    }
  });
  
  // Advertiser: Update payout request (approve, reject, partial, pay)
  app.put("/api/advertiser/payout-requests/:id", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("finance"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { status, approvedAmount, advertiserNote, rejectionReason, transactionId } = req.body;
      
      const request = await storage.getPayoutRequest(id);
      if (!request || request.advertiserId !== userId) {
        return res.status(404).json({ message: "Payout request not found" });
      }
      
      // Update request
      const updateData: any = { status };
      if (approvedAmount !== undefined) updateData.approvedAmount = approvedAmount;
      if (advertiserNote) updateData.advertiserNote = advertiserNote;
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
      if (transactionId) updateData.transactionId = transactionId;
      if (status === "paid") updateData.paidAt = new Date();
      
      const updated = await storage.updatePayoutRequest(id, updateData);
      
      // If paid, create payout record
      if (status === "paid" && updated) {
        const wallet = await storage.getPublisherWallet(request.walletId);
        const method = await storage.getPaymentMethod(request.paymentMethodId);
        
        if (wallet && method) {
          const amount = parseFloat(approvedAmount || request.requestedAmount);
          const feePercent = parseFloat(method.feePercent || "0");
          const feeFixed = parseFloat(method.feeFixed || "0");
          const feeAmount = (amount * feePercent / 100) + feeFixed;
          const netAmount = amount - feeAmount;
          
          await storage.createPayout({
            payoutRequestId: request.id,
            publisherId: request.publisherId,
            advertiserId: userId,
            paymentMethodId: request.paymentMethodId,
            walletAddress: wallet.walletAddress,
            amount: amount.toString(),
            feeAmount: feeAmount.toString(),
            netAmount: netAmount.toString(),
            currency: request.currency,
            payoutType: "manual",
            transactionId: transactionId || null,
            note: advertiserNote || null,
            status: "completed"
          });
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update payout request error:", error);
      res.status(500).json({ message: "Failed to update payout request" });
    }
  });
  
  // ============================================
  // PAYOUTS
  // ============================================
  
  // Publisher: Get my payouts
  app.get("/api/publisher/payouts/:advertiserId", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { advertiserId } = req.params;
      
      const payoutsList = await storage.getPayoutsByPublisher(userId, advertiserId);
      res.json(payoutsList);
    } catch (error: any) {
      console.error("Get payouts error:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });
  
  // Advertiser: Get all payouts
  app.get("/api/advertiser/payouts", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const payoutsList = await storage.getPayoutsByAdvertiser(userId);
      const enrichedPayouts = payoutsList.map(p => ({
        ...p,
        publisherShortId: p.publisher.shortId != null ? p.publisher.shortId.toString().padStart(3, '0') : '-'
      }));
      res.json(enrichedPayouts);
    } catch (error: any) {
      console.error("Get payouts error:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });
  
  // Advertiser: Create bonus payout
  app.post("/api/advertiser/payouts/bonus", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("finance"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { publisherId, paymentMethodId, walletAddress, amount, currency, note } = req.body;
      
      if (!publisherId || !paymentMethodId || !walletAddress || !amount || !currency) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const payout = await storage.createPayout({
        publisherId,
        advertiserId: userId,
        paymentMethodId,
        walletAddress,
        amount,
        feeAmount: "0",
        netAmount: amount,
        currency,
        payoutType: "bonus",
        note: note || "Bonus payment",
        status: "completed"
      });
      
      res.status(201).json(payout);
    } catch (error: any) {
      console.error("Create bonus payout error:", error);
      res.status(500).json({ message: "Failed to create bonus payout" });
    }
  });

  // Advertiser: Mass payout (pay multiple approved requests at once)
  app.post("/api/advertiser/mass-payout", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("finance"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { requestIds } = req.body;
      
      if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({ message: "requestIds array is required" });
      }
      
      const results = [];
      for (const requestId of requestIds) {
        const request = await storage.getPayoutRequest(requestId);
        if (!request || request.advertiserId !== userId) {
          continue;
        }
        
        if (request.status !== "approved") {
          continue;
        }
        
        const wallet = await storage.getPublisherWallet(request.walletId);
        const method = await storage.getPaymentMethod(request.paymentMethodId);
        
        if (!wallet || !method) {
          continue;
        }
        
        const amount = parseFloat(request.approvedAmount || request.requestedAmount);
        const feePercent = parseFloat(method.feePercent || "0");
        const feeFixed = parseFloat(method.feeFixed || "0");
        const feeAmount = (amount * feePercent / 100) + feeFixed;
        const netAmount = amount - feeAmount;
        
        await storage.updatePayoutRequest(requestId, {
          status: "paid",
          paidAt: new Date()
        });
        
        const payout = await storage.createPayout({
          payoutRequestId: request.id,
          publisherId: request.publisherId,
          advertiserId: userId,
          paymentMethodId: request.paymentMethodId,
          walletAddress: wallet.walletAddress,
          amount: amount.toString(),
          feeAmount: feeAmount.toString(),
          netAmount: netAmount.toString(),
          currency: request.currency,
          payoutType: "manual",
          status: "completed"
        });
        
        results.push(payout);
      }
      
      res.json({ success: true, payoutsCount: results.length, payouts: results });
    } catch (error: any) {
      console.error("Mass payout error:", error);
      res.status(500).json({ message: "Failed to process mass payout" });
    }
  });
  
  // Advertiser: Bulk auto-payout
  app.post("/api/advertiser/payouts/bulk", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("finance"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { publisherIds, paymentMethodId, note } = req.body;
      
      if (!publisherIds || !Array.isArray(publisherIds) || publisherIds.length === 0) {
        return res.status(400).json({ message: "publisherIds array is required" });
      }
      
      const results = [];
      const errors = [];
      
      for (const publisherId of publisherIds) {
        try {
          // Calculate balance
          const balance = await storage.calculatePublisherBalance(publisherId, userId);
          
          if (balance.available <= 0) {
            errors.push({ publisherId, error: "No available balance" });
            continue;
          }
          
          // Get publisher's default wallet for this payment method
          const wallets = await storage.getPublisherWalletsByPublisher(publisherId, userId);
          
          let wallet = wallets.find(w => w.paymentMethodId === paymentMethodId && w.isDefault);
          if (!wallet) {
            wallet = wallets.find(w => w.paymentMethodId === paymentMethodId);
          }
          
          if (!wallet) {
            errors.push({ publisherId, error: "No wallet configured for this payment method" });
            continue;
          }
          
          const method = await storage.getPaymentMethod(wallet.paymentMethodId);
          if (!method) {
            errors.push({ publisherId, error: "Invalid payment method" });
            continue;
          }
          
          const amount = balance.available;
          const feePercent = parseFloat(method.feePercent || "0");
          const feeFixed = parseFloat(method.feeFixed || "0");
          const feeAmount = (amount * feePercent / 100) + feeFixed;
          const netAmount = amount - feeAmount;
          
          const payout = await storage.createPayout({
            publisherId,
            advertiserId: userId,
            paymentMethodId: wallet.paymentMethodId,
            walletAddress: wallet.walletAddress,
            amount: amount.toString(),
            feeAmount: feeAmount.toString(),
            netAmount: netAmount.toString(),
            currency: method.currency,
            payoutType: "auto",
            note: note || "Auto-payout",
            status: "completed"
          });
          
          results.push(payout);
        } catch (err: any) {
          errors.push({ publisherId, error: err.message });
        }
      }
      
      res.json({ payouts: results, errors });
    } catch (error: any) {
      console.error("Bulk payout error:", error);
      res.status(500).json({ message: "Failed to process bulk payout" });
    }
  });

  // ============================================
  // CRYPTO PAYOUT API
  // Advertiser: automated crypto payouts via exchange APIs
  // ============================================

  // Get available crypto providers
  app.get("/api/advertiser/crypto/providers", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const { cryptoPayoutService } = await import("./services/crypto-payout-service");
      const userId = req.session.userId!;
      const providers = await cryptoPayoutService.getAvailableProvidersForAdvertiser(userId);
      res.json({ providers });
    } catch (error: any) {
      console.error("Get crypto providers error:", error);
      res.status(500).json({ message: "Failed to fetch crypto providers" });
    }
  });

  // Get crypto balances
  app.get("/api/advertiser/crypto/balances", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const { cryptoPayoutService } = await import("./services/crypto-payout-service");
      const userId = req.session.userId!;
      const balances = await cryptoPayoutService.getBalancesForAdvertiser(userId);
      res.json(balances);
    } catch (error: any) {
      console.error("Get crypto balances error:", error);
      res.status(500).json({ message: "Failed to fetch crypto balances" });
    }
  });

  // Send crypto payout
  app.post("/api/advertiser/crypto/payout", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("finance"), async (req: Request, res: Response) => {
    try {
      const { cryptoPayoutService } = await import("./services/crypto-payout-service");
      const userId = req.session.userId!;
      const { provider, walletAddress, amount, currency, network, publisherId, note } = req.body;
      
      if (!provider || !walletAddress || !amount || !currency || !publisherId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const result = await cryptoPayoutService.sendPayoutForAdvertiser(userId, provider, {
        walletAddress,
        amount,
        currency,
        network,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      const method = (await storage.getPaymentMethodsByAdvertiser(userId))
        .find(m => m.methodType?.toLowerCase().includes(provider));
      
      if (method) {
        const payout = await storage.createPayout({
          publisherId,
          advertiserId: userId,
          paymentMethodId: method.id,
          walletAddress,
          amount,
          feeAmount: "0",
          netAmount: amount,
          currency,
          payoutType: "auto",
          transactionId: result.transactionId,
          transactionHash: result.transactionHash,
          note: note || `Auto crypto payout via ${provider}`,
          status: "completed"
        });
        
        res.json({ success: true, payout, transaction: result });
      } else {
        res.json({ success: true, transaction: result });
      }
    } catch (error: any) {
      console.error("Crypto payout error:", error);
      res.status(500).json({ message: "Failed to process crypto payout" });
    }
  });

  // ============================================
  // ADVERTISER CRYPTO KEYS MANAGEMENT (v2 - exchangeApiKeys table)
  // Encrypted storage of per-advertiser exchange API keys
  // ============================================

  // Get all exchange API keys for advertiser (masked, no secrets)
  app.get("/api/advertiser/crypto/keys", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const keys = await storage.getExchangeApiKeys(effectiveAdvertiserId);
      const maskedKeys = keys.map(k => ({
        id: k.id,
        exchange: k.exchange,
        name: k.name,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        lastError: k.lastError,
        createdAt: k.createdAt,
        hasApiKey: !!k.apiKeyEncrypted,
        hasPassphrase: !!k.passphraseEncrypted,
      }));
      res.json(maskedKeys);
    } catch (error: any) {
      console.error("Get exchange API keys error:", error);
      res.status(500).json({ message: "Failed to fetch exchange API keys" });
    }
  });

  // Get crypto keys status (never return actual keys)
  app.get("/api/advertiser/crypto/keys/status", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const status = await storage.getExchangeApiKeysStatus(effectiveAdvertiserId);
      res.json(status);
    } catch (error: any) {
      console.error("Get crypto keys status error:", error);
      res.status(500).json({ message: "Failed to fetch crypto keys status" });
    }
  });

  // Create exchange API key (encrypted)
  app.post("/api/advertiser/crypto/keys", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { exchange, apiKey, secretKey, passphrase, name } = req.body;

      const validExchanges = ["binance", "bybit", "kraken", "coinbase", "exmo", "mexc", "okx"];
      if (!exchange || !validExchanges.includes(exchange)) {
        return res.status(400).json({ message: `Invalid exchange. Use one of: ${validExchanges.join(", ")}` });
      }

      if (!apiKey || !secretKey) {
        return res.status(400).json({ message: "API Key and Secret Key are required" });
      }

      if ((exchange === 'okx' || exchange === 'coinbase') && !passphrase) {
        return res.status(400).json({ message: `${exchange.toUpperCase()} requires passphrase` });
      }

      const existing = await storage.getExchangeApiKeyByExchange(effectiveAdvertiserId, exchange);
      if (existing) {
        await storage.updateExchangeApiKey(existing.id, {
          apiKey,
          apiSecret: secretKey,
          passphrase: passphrase || null,
          name: name || `${exchange} API Key`,
          isActive: true,
        });
      } else {
        await storage.createExchangeApiKey({
          advertiserId: effectiveAdvertiserId,
          exchange,
          name: name || `${exchange} API Key`,
          apiKey,
          apiSecret: secretKey,
          passphrase: passphrase || null,
          isActive: true,
        });
      }

      const status = await storage.getExchangeApiKeysStatus(effectiveAdvertiserId);
      
      res.json({ 
        success: true, 
        message: `${exchange} API keys saved successfully`,
        status 
      });
    } catch (error: any) {
      console.error("Save crypto keys error:", error);
      res.status(500).json({ message: "Failed to save crypto keys" });
    }
  });

  // Delete exchange API key by ID or exchange name
  app.delete("/api/advertiser/crypto/keys/:idOrExchange", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
      if (!effectiveAdvertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { idOrExchange } = req.params;

      // Check if it's a UUID (id) or exchange name
      const validExchanges = ["binance", "bybit", "kraken", "coinbase", "exmo", "mexc", "okx"];
      let key;
      
      if (validExchanges.includes(idOrExchange.toLowerCase())) {
        // Find by exchange name
        key = await storage.getExchangeApiKeyByExchange(effectiveAdvertiserId, idOrExchange.toLowerCase());
      } else {
        // Find by ID
        key = await storage.getExchangeApiKey(idOrExchange);
      }

      if (!key) {
        return res.status(404).json({ message: "API key not found" });
      }
      if (key.advertiserId !== effectiveAdvertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteExchangeApiKey(key.id);
      const status = await storage.getExchangeApiKeysStatus(effectiveAdvertiserId);
      
      res.json({ 
        success: true, 
        message: `${key.exchange} API keys deleted`,
        status 
      });
    } catch (error: any) {
      console.error("Delete crypto keys error:", error);
      res.status(500).json({ message: "Failed to delete crypto keys" });
    }
  });

  // ============================================
  // ANTI-FRAUD API
  // Admin: full access to all data
  // Advertiser: only their own offers/data
  // Publisher: NO ACCESS (per business requirement)
  // ============================================

  // Get antifraud rules (admin: all, advertiser: global + own)
  app.get("/api/antifraud/rules", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.session.role!;

      if (role === "publisher") {
        return res.status(403).json({ message: "Access denied" });
      }

      const advertiserId = role === "advertiser" ? getEffectiveAdvertiserId(req) : undefined;
      const rules = await storage.getAntifraudRules(advertiserId || undefined);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch antifraud rules" });
    }
  });

  // Create antifraud rule
  app.post("/api/antifraud/rules", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.session.role!;

      if (role === "publisher") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, description, ruleType, threshold, action, priority } = req.body;
      
      if (!name || !ruleType) {
        return res.status(400).json({ message: "Name and ruleType are required" });
      }

      // Build safe rule data - never trust client for scope/advertiserId
      const safeRuleData: any = {
        name,
        description,
        ruleType,
        threshold: threshold || null,
        action: action || "flag",
        priority: priority || 100,
      };

      // Advertisers can ONLY create rules for themselves
      if (role === "advertiser") {
        const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
        if (!effectiveAdvertiserId) {
          return res.status(401).json({ message: "Not authorized as advertiser" });
        }
        safeRuleData.scope = "advertiser";
        safeRuleData.advertiserId = effectiveAdvertiserId;
      } else if (role === "admin") {
        // Admin can choose scope
        safeRuleData.scope = req.body.scope || "global";
        safeRuleData.advertiserId = req.body.scope === "advertiser" ? req.body.advertiserId : null;
      }

      const rule = await storage.createAntifraudRule(safeRuleData);
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: "Failed to create antifraud rule" });
    }
  });

  // Update antifraud rule
  app.patch("/api/antifraud/rules/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.session.role!;
      const ruleId = req.params.id;

      if (role === "publisher") {
        return res.status(403).json({ message: "Access denied" });
      }

      const existingRule = await storage.getAntifraudRule(ruleId);
      if (!existingRule) {
        return res.status(404).json({ message: "Rule not found" });
      }

      // Advertisers can only edit their own (non-global) rules
      if (role === "advertiser") {
        const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
        if (existingRule.scope === "global" || existingRule.advertiserId !== effectiveAdvertiserId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Build safe update data - only allow safe fields
      const { name, description, ruleType, threshold, action, priority, isActive } = req.body;
      const safeUpdateData: any = {};
      
      if (name !== undefined) safeUpdateData.name = name;
      if (description !== undefined) safeUpdateData.description = description;
      if (ruleType !== undefined) safeUpdateData.ruleType = ruleType;
      if (threshold !== undefined) safeUpdateData.threshold = threshold;
      if (action !== undefined) safeUpdateData.action = action;
      if (priority !== undefined) safeUpdateData.priority = priority;
      if (isActive !== undefined) safeUpdateData.isActive = isActive;
      
      // Advertisers can NEVER change scope or advertiserId
      // Admin can only change these fields (scope, advertiserId excluded for safety)

      const rule = await storage.updateAntifraudRule(ruleId, safeUpdateData);
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: "Failed to update antifraud rule" });
    }
  });

  // Delete antifraud rule
  app.delete("/api/antifraud/rules/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.session.role!;
      const ruleId = req.params.id;

      if (role === "publisher") {
        return res.status(403).json({ message: "Access denied" });
      }

      const existingRule = await storage.getAntifraudRule(ruleId);
      if (!existingRule) {
        return res.status(404).json({ message: "Rule not found" });
      }

      // Advertisers can only delete their own rules
      if (role === "advertiser") {
        const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
        if (existingRule.advertiserId !== effectiveAdvertiserId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Only admin can delete global rules
      if (existingRule.scope === "global" && role !== "admin") {
        return res.status(403).json({ message: "Only admin can delete global rules" });
      }

      await storage.deleteAntifraudRule(ruleId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete antifraud rule" });
    }
  });

  // Get antifraud logs
  app.get("/api/antifraud/logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.session.role!;

      if (role === "publisher") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { offerId, publisherId, dateFrom, dateTo, action, limit } = req.query;

      const filters: any = {};
      
      // Advertisers can only see logs for their offers
      if (role === "advertiser") {
        filters.advertiserId = getEffectiveAdvertiserId(req);
      }

      if (offerId) filters.offerId = offerId as string;
      if (publisherId) filters.publisherId = publisherId as string;
      if (action) filters.action = action as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (limit) filters.limit = parseInt(limit as string);

      const logs = await storage.getAntifraudLogs(filters);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch antifraud logs" });
    }
  });

  // Get suspicious clicks
  app.get("/api/antifraud/suspicious-clicks", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.session.role!;

      if (role === "publisher") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { offerId, publisherId, advertiserId, limit } = req.query;

      const filters: any = {};
      
      // Advertisers can only see their offers' suspicious clicks
      if (role === "advertiser") {
        filters.advertiserId = getEffectiveAdvertiserId(req);
      } else if (role === "admin") {
        // Admins MUST specify advertiserId OR offerId to prevent cross-tenant exposure
        // Check BEFORE allowing any other filters
        if (!advertiserId && !offerId) {
          return res.json([]);
        }
        if (advertiserId) {
          filters.advertiserId = advertiserId as string;
        }
        if (offerId) {
          filters.offerId = offerId as string;
        }
      }

      // Only add publisherId filter if tenant scope is already set
      if (publisherId && filters.advertiserId) {
        filters.publisherId = publisherId as string;
      }
      
      // For advertisers, allow offerId filter within their scope
      if (role === "advertiser" && offerId) {
        filters.offerId = offerId as string;
      }
      
      // Parse limit with caps
      const requestedLimit = limit ? parseInt(limit as string) : 100;
      filters.limit = Math.min(requestedLimit, 500);

      const suspiciousClicks = await storage.getSuspiciousClicks(filters);
      res.json(suspiciousClicks);
    } catch (error) {
      console.error("Failed to fetch suspicious clicks:", error);
      res.status(500).json({ message: "Failed to fetch suspicious clicks" });
    }
  });

  // Get antifraud summary/dashboard data
  app.get("/api/antifraud/summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.session.role!;

      if (role === "publisher") {
        return res.status(403).json({ message: "Access denied" });
      }

      const advertiserId = role === "advertiser" ? getEffectiveAdvertiserId(req) : undefined;
      const summary = await storage.getAntifraudSummary(advertiserId || undefined);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch antifraud summary" });
    }
  });

  // Get antifraud metrics
  app.get("/api/antifraud/metrics", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = req.session.role!;

      if (role === "publisher") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { offerId, dateFrom, dateTo } = req.query;

      const filters: any = {};
      
      if (role === "advertiser") {
        filters.advertiserId = getEffectiveAdvertiserId(req);
      }

      if (offerId) filters.offerId = offerId as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);

      const metrics = await storage.getAntifraudMetrics(filters);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch antifraud metrics" });
    }
  });

  // ============================================
  // SETTINGS API ENDPOINTS (with Zod validation)
  // ============================================

  // Validation schemas
  const profileUpdateSchema = z.object({
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().nullable(),
    telegram: z.string().optional().nullable(),
    logoUrl: z.string().optional().nullable().or(z.literal("")),
    companyName: z.string().optional().nullable(),
  });

  const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  });

  const twoFactorToggleSchema = z.object({
    enabled: z.boolean(),
  });

  const telegramNotificationsSchema = z.object({
    telegramChatId: z.string().optional(),
    telegramNotifyLeads: z.boolean().optional(),
    telegramNotifySales: z.boolean().optional(),
    telegramNotifyPayouts: z.boolean().optional(),
    telegramNotifySystem: z.boolean().optional(),
  });

  const whitelabelSchema = z.object({
    brandName: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.literal("")),
    faviconUrl: z.string().url().optional().or(z.literal("")),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    customDomain: z.string().optional(),
    hidePlatformBranding: z.boolean().optional(),
    customCss: z.string().optional(),
    emailLogoUrl: z.string().url().optional().or(z.literal("")),
    emailFooterText: z.string().optional(),
  });

  // Sentinel value constant for encrypted fields - API returns this instead of real secrets
  const SENTINEL_CONFIGURED = "***configured***";
  
  // Helper for secret fields - accepts actual value, empty string (clear), sentinel (no-op), or undefined (skip)
  const secretFieldSchema = z.union([
    z.string().min(1),        // New secret value
    z.literal(""),            // Clear the secret
    z.literal(SENTINEL_CONFIGURED)  // Keep existing (no-op)
  ]).optional();
  
  const emailSettingsSchema = z.object({
    emailNotifyLeads: z.boolean().optional(),
    emailNotifySales: z.boolean().optional(),
    emailNotifyPayouts: z.boolean().optional(),
    emailNotifySystem: z.boolean().optional(),
    smtpHost: z.string().optional().or(z.literal("")),
    smtpPort: z.number().optional(),
    smtpUser: z.string().optional().or(z.literal("")),
    smtpPassword: secretFieldSchema,
    smtpFromEmail: z.string().email().optional().or(z.literal("")),
    smtpFromName: z.string().optional().or(z.literal("")),
    telegramBotToken: secretFieldSchema,
  });

  // Helper for optional URL fields - accepts valid URL, relative path, empty string, null, undefined
  const optionalUrlField = z.string().optional().nullable().transform((val) => {
    if (!val || val.trim() === "") return null;
    // Accept relative paths (e.g. /objects/uploads/...)
    if (val.startsWith("/")) return val;
    // Accept full URLs
    try {
      new URL(val);
      return val;
    } catch {
      return null;
    }
  });
  
  // Helper for optional email fields - accepts valid email, empty string, or undefined  
  const optionalEmailField = z.union([
    z.string().email(),
    z.literal("")
  ]).optional();

  const platformSettingsSchema = z.object({
    platformName: z.string().optional(),
    platformDescription: z.string().optional().nullable(),
    platformLogoUrl: optionalUrlField,
    platformFaviconUrl: optionalUrlField,
    supportEmail: optionalEmailField,
    supportPhone: z.string().optional().nullable(),
    supportTelegram: z.string().optional().nullable(),
    copyrightText: z.string().optional().nullable(),
    defaultTelegramBotToken: secretFieldSchema,
    stripeSecretKey: secretFieldSchema,
    ipinfoToken: secretFieldSchema,
    fingerprintjsApiKey: secretFieldSchema,
    allowPublisherRegistration: z.boolean().optional(),
    allowAdvertiserRegistration: z.boolean().optional(),
    requireAdvertiserApproval: z.boolean().optional(),
    enableProxyDetection: z.boolean().optional(),
    enableVpnDetection: z.boolean().optional(),
    enableFingerprintTracking: z.boolean().optional(),
    maxFraudScore: z.number().optional().nullable(),
    cloudflareZoneId: z.string().optional().or(z.literal("")),
    cloudflareApiToken: secretFieldSchema,
    cloudflareCnameTarget: z.string().optional().or(z.literal("")),
    cloudflareFallbackOrigin: z.string().optional().or(z.literal("")),
    cloudflareWorkerOrigin: z.string().optional().or(z.literal("")),
    cloudflareWorkerSecret: secretFieldSchema,
  });

  // Update user profile (all roles)
  app.patch("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const parseResult = profileUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid data", errors: parseResult.error.errors });
      }
      const { email, phone, telegram, logoUrl, companyName } = parseResult.data;
      
      // Get current user to compare email
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check email uniqueness only if actually changing
      const normalizedNewEmail = email?.trim().toLowerCase();
      const normalizedCurrentEmail = currentUser.email?.trim().toLowerCase();
      if (normalizedNewEmail && normalizedNewEmail !== normalizedCurrentEmail && email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }
      
      const user = await storage.updateUserProfile(userId, { 
        email: email || undefined, 
        phone: phone ?? undefined, 
        telegram: telegram ?? undefined, 
        logoUrl: logoUrl ?? undefined, 
        companyName: companyName ?? undefined 
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email,
        phone: user.phone,
        telegram: user.telegram,
        logoUrl: user.logoUrl,
        companyName: user.companyName,
        role: user.role
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Feature suggestion - send to support email
  const featureSuggestionSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
    description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  });
  
  app.post("/api/feature-suggestion", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const parseResult = featureSuggestionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: parseResult.error.errors[0]?.message || "Invalid data" });
      }
      const { title, description } = parseResult.data;
      
      if (!process.env.RESEND_API_KEY) {
        return res.status(503).json({ message: "Email service not configured" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Escape HTML to prevent injection
      const escapeHtml = (str: string) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      
      const safeTitle = escapeHtml(title);
      const safeDescription = escapeHtml(description).replace(/\n/g, '<br/>');
      const safeUsername = escapeHtml(user.username);
      const safeEmail = escapeHtml(user.email || '');
      
      // Send email using Resend
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: "PrimeTrack <noreply@primetrack.pro>",
        to: "support@primetrack.pro",
        subject: `[Feature Request] ${safeTitle}`,
        html: `
          <h2>Новое предложение фичи</h2>
          <p><strong>От:</strong> ${safeUsername} (${safeEmail})</p>
          <p><strong>Роль:</strong> ${user.role}</p>
          <p><strong>Название:</strong> ${safeTitle}</p>
          <hr/>
          <p><strong>Описание:</strong></p>
          <p>${safeDescription}</p>
        `,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Feature suggestion error:", error);
      res.status(500).json({ message: "Failed to send suggestion" });
    }
  });

  // Change password (all roles)
  app.patch("/api/user/password", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const parseResult = passwordChangeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: parseResult.error.errors[0]?.message || "Invalid data" });
      }
      const { currentPassword, newPassword } = parseResult.data;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValid = await storage.verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      await storage.updateUserPassword(userId, newPassword);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Generate TOTP secret and QR code for 2FA setup
  app.post("/api/user/2fa/setup", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { totpService } = await import("./services/totp-service");
      const { secret, qrCode, otpAuthUrl } = await totpService.generateSecret(userId);
      res.json({ secret, qrCode, otpAuthUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate 2FA secret" });
    }
  });

  // Enable 2FA with TOTP verification
  app.post("/api/user/2fa/enable", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { secret, token } = req.body;
      
      if (!secret || !token) {
        return res.status(400).json({ message: "Secret and token are required" });
      }

      const { totpService } = await import("./services/totp-service");
      const success = await totpService.enableTwoFactor(userId, secret, token);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      res.json({ success: true, message: "2FA enabled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to enable 2FA" });
    }
  });

  // Disable 2FA with TOTP verification
  app.post("/api/user/2fa/disable", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Verification code is required" });
      }

      const { totpService } = await import("./services/totp-service");
      const success = await totpService.disableTwoFactor(userId, token);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      res.json({ success: true, message: "2FA disabled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to disable 2FA" });
    }
  });

  // Verify 2FA token during login
  app.post("/api/user/2fa/verify", async (req: Request, res: Response) => {
    try {
      const { userId, token } = req.body;
      
      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and token are required" });
      }

      const { totpService } = await import("./services/totp-service");
      const success = await totpService.verifyToken(userId, token);
      
      if (!success) {
        return res.status(401).json({ message: "Invalid verification code" });
      }
      
      // Complete login by setting session
      req.session.userId = userId;
      const user = await storage.getUser(userId);
      
      res.json({ 
        success: true, 
        user: user ? {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
        } : null
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to verify 2FA" });
    }
  });

  // Update Telegram notifications (all roles)
  app.post("/api/user/notifications/telegram", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const parseResult = telegramNotificationsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const { telegramChatId, telegramNotifyLeads, telegramNotifySales, telegramNotifyPayouts, telegramNotifySystem } = parseResult.data;
      
      const user = await storage.updateUserTelegramNotifications(userId, {
        telegramChatId,
        telegramNotifyLeads,
        telegramNotifySales,
        telegramNotifyPayouts,
        telegramNotifySystem
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ success: true, message: "Telegram settings saved" });
    } catch (error) {
      res.status(500).json({ message: "Failed to save Telegram settings" });
    }
  });

  // Test Telegram notification
  app.post("/api/user/notifications/telegram/test", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.telegramChatId) {
        return res.status(400).json({ message: "Укажите Chat ID и сохраните настройки." });
      }
      
      // Check if any bot token is configured
      const platformSettings = await storage.getPlatformSettings();
      const hasPlatformToken = !!platformSettings?.defaultTelegramBotToken;
      
      // For advertisers, check if they have their own token
      let hasAdvertiserToken = false;
      if (user.role === "advertiser") {
        const advSettings = await storage.getAdvertiserSettings(userId);
        hasAdvertiserToken = !!advSettings?.telegramBotToken;
      }
      
      if (!hasPlatformToken && !hasAdvertiserToken) {
        return res.status(400).json({ 
          message: "Токен бота платформы не настроен. Обратитесь к администратору." 
        });
      }
      
      const { telegramService } = await import("./services/telegram-service");
      const sent = await telegramService.notifyUser(
        userId, 
        "system", 
        "Тестовое уведомление", 
        { Статус: "Telegram интеграция работает корректно!" }
      );
      
      if (sent) {
        res.json({ success: true, message: "Тестовое сообщение отправлено!" });
      } else {
        res.status(500).json({ message: "Не удалось отправить сообщение. Проверьте Chat ID и убедитесь что вы написали боту." });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to send test message" });
    }
  });

  // Generate Telegram link code
  app.post("/api/user/telegram/link-code", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { telegramService } = await import("./services/telegram-service");
      const code = await telegramService.generateLinkCode(userId);
      
      res.json({ 
        success: true, 
        code,
        expiresIn: "10 минут",
        instruction: `Отправьте боту команду: /link ${code}`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate link code" });
    }
  });

  // Unlink Telegram account
  app.post("/api/user/telegram/unlink", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { telegramService } = await import("./services/telegram-service");
      await telegramService.unlinkAccount(userId);
      
      res.json({ success: true, message: "Telegram отвязан" });
    } catch (error) {
      res.status(500).json({ message: "Failed to unlink Telegram" });
    }
  });

  // Webhook for Telegram bot (public endpoint)
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    try {
      const { telegramSupportService } = await import("./services/telegram-support-service");
      await telegramSupportService.handleUpdate(req.body);
      res.sendStatus(200);
    } catch (error) {
      console.error("[Telegram Webhook] Error:", error);
      res.sendStatus(200);
    }
  });

  // Generate API token (publisher/advertiser)
  app.post("/api/user/api-token/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const token = await storage.generateApiToken(userId);
      res.json({ success: true, token });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate API token" });
    }
  });

  // Revoke API token
  app.post("/api/user/api-token/revoke", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      await storage.revokeApiToken(userId);
      res.json({ success: true, message: "API token revoked" });
    } catch (error) {
      res.status(500).json({ message: "Failed to revoke API token" });
    }
  });

  // Get advertiser settings
  app.get("/api/advertiser/settings", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      let settings = await storage.getAdvertiserSettings(advertiserId);
      
      if (!settings) {
        settings = await storage.createAdvertiserSettings({ advertiserId });
      }
      
      // Don't send encrypted values
      res.json({
        ...settings,
        smtpPassword: settings.smtpPassword ? SENTINEL_CONFIGURED : null,
        telegramBotToken: settings.telegramBotToken ? SENTINEL_CONFIGURED : null
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update white-label settings
  app.patch("/api/advertiser/settings/whitelabel", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("settings"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const parseResult = whitelabelSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid data", errors: parseResult.error.errors });
      }
      const { 
        brandName, logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor,
        customDomain, hidePlatformBranding, customCss, emailLogoUrl, emailFooterText 
      } = parseResult.data;
      
      const settings = await storage.updateAdvertiserSettings(advertiserId, {
        brandName,
        logoUrl,
        faviconUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        customDomain,
        hidePlatformBranding,
        customCss,
        emailLogoUrl,
        emailFooterText
      });
      
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      res.json({ success: true, settings });
    } catch (error) {
      res.status(500).json({ message: "Failed to update white-label settings" });
    }
  });

  // Update email/SMTP settings (advertiser)
  app.post("/api/advertiser/settings/email", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("settings"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const parseResult = emailSettingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid data", errors: parseResult.error.errors });
      }
      const { 
        emailNotifyLeads, emailNotifySales, emailNotifyPayouts, emailNotifySystem,
        smtpHost, smtpPort, smtpUser, smtpPassword, smtpFromEmail, smtpFromName,
        telegramBotToken
      } = parseResult.data;
      
      const updateData: any = {
        emailNotifyLeads,
        emailNotifySales,
        emailNotifyPayouts,
        emailNotifySystem,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpFromEmail,
        smtpFromName
      };
      
      // Handle secret fields: new value = update, empty string = clear, sentinel = no-op
      if (smtpPassword !== undefined && smtpPassword !== SENTINEL_CONFIGURED) {
        updateData.smtpPassword = smtpPassword === "" ? null : smtpPassword;
      }
      
      if (telegramBotToken !== undefined && telegramBotToken !== SENTINEL_CONFIGURED) {
        updateData.telegramBotToken = telegramBotToken === "" ? null : telegramBotToken;
      }
      
      const settings = await storage.updateAdvertiserSettings(advertiserId, updateData);
      
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      res.json({ success: true, message: "Email settings saved" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  // Get platform settings (admin)
  app.get("/api/admin/platform-settings", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      let settings = await storage.getPlatformSettings();
      
      if (!settings) {
        settings = await storage.updatePlatformSettings({
          platformName: "Primetrack"
        });
      }
      
      // Don't send encrypted values
      res.json({
        ...settings,
        defaultTelegramBotToken: settings.defaultTelegramBotToken ? SENTINEL_CONFIGURED : null,
        stripeSecretKey: settings.stripeSecretKey ? SENTINEL_CONFIGURED : null,
        ipinfoToken: settings.ipinfoToken ? SENTINEL_CONFIGURED : null,
        fingerprintjsApiKey: settings.fingerprintjsApiKey ? SENTINEL_CONFIGURED : null,
        cloudflareApiToken: settings.cloudflareApiToken ? SENTINEL_CONFIGURED : null,
        cloudflareWorkerSecret: settings.cloudflareWorkerSecret ? SENTINEL_CONFIGURED : null
      });
    } catch (error) {
      console.error("Failed to fetch platform settings:", error);
      res.status(500).json({ message: "Failed to fetch platform settings" });
    }
  });

  // Update platform settings (admin)
  app.patch("/api/admin/platform-settings", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const parseResult = platformSettingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.error("[PATCH platform-settings] Validation error:", parseResult.error.errors.map(e => e.path.join('.') + ': ' + e.message).join(', '));
        return res.status(400).json({ message: "Invalid data", errors: parseResult.error.errors });
      }
      const {
        platformName, platformDescription, platformLogoUrl, platformFaviconUrl, 
        supportEmail, supportPhone, supportTelegram, copyrightText,
        defaultTelegramBotToken, stripeSecretKey, ipinfoToken, fingerprintjsApiKey,
        allowPublisherRegistration, allowAdvertiserRegistration, requireAdvertiserApproval,
        enableProxyDetection, enableVpnDetection, enableFingerprintTracking, maxFraudScore,
        cloudflareZoneId, cloudflareApiToken, cloudflareCnameTarget, cloudflareFallbackOrigin,
        cloudflareWorkerOrigin, cloudflareWorkerSecret
      } = parseResult.data;
      console.log("[PATCH platform-settings] platformLogoUrl:", platformLogoUrl);
      
      const updateData: any = {
        platformName,
        platformDescription,
        platformLogoUrl,
        platformFaviconUrl,
        supportEmail,
        supportPhone,
        supportTelegram,
        copyrightText,
        allowPublisherRegistration,
        allowAdvertiserRegistration,
        requireAdvertiserApproval,
        enableProxyDetection,
        enableVpnDetection,
        enableFingerprintTracking,
        maxFraudScore,
        cloudflareZoneId: cloudflareZoneId || null,
        cloudflareCnameTarget: cloudflareCnameTarget || null,
        cloudflareFallbackOrigin: cloudflareFallbackOrigin || null,
        cloudflareWorkerOrigin: cloudflareWorkerOrigin || null
      };
      
      // Handle secret fields: new value = update, empty string = clear, sentinel = no-op
      if (defaultTelegramBotToken !== undefined && defaultTelegramBotToken !== SENTINEL_CONFIGURED) {
        updateData.defaultTelegramBotToken = defaultTelegramBotToken === "" ? null : defaultTelegramBotToken;
      }
      if (stripeSecretKey !== undefined && stripeSecretKey !== SENTINEL_CONFIGURED) {
        updateData.stripeSecretKey = stripeSecretKey === "" ? null : stripeSecretKey;
      }
      if (ipinfoToken !== undefined && ipinfoToken !== SENTINEL_CONFIGURED) {
        updateData.ipinfoToken = ipinfoToken === "" ? null : ipinfoToken;
      }
      if (fingerprintjsApiKey !== undefined && fingerprintjsApiKey !== SENTINEL_CONFIGURED) {
        updateData.fingerprintjsApiKey = fingerprintjsApiKey === "" ? null : fingerprintjsApiKey;
      }
      if (cloudflareApiToken !== undefined && cloudflareApiToken !== SENTINEL_CONFIGURED) {
        updateData.cloudflareApiToken = cloudflareApiToken === "" ? null : cloudflareApiToken;
      }
      if (cloudflareWorkerSecret !== undefined && cloudflareWorkerSecret !== SENTINEL_CONFIGURED) {
        updateData.cloudflareWorkerSecret = cloudflareWorkerSecret === "" ? null : cloudflareWorkerSecret;
      }
      
      const settings = await storage.updatePlatformSettings(updateData);
      
      // Update Worker secret cache if it was changed
      if (updateData.cloudflareWorkerSecret !== undefined) {
        setWorkerSecret(updateData.cloudflareWorkerSecret);
        console.log("[WorkerAuth] Worker secret updated in cache");
      }
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Failed to update platform settings:", error);
      res.status(500).json({ message: "Failed to update platform settings" });
    }
  });

  // Get crypto wallets (admin)
  app.get("/api/admin/crypto-wallets", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      let settings = await storage.getPlatformSettings();
      if (!settings) {
        return res.json({
          btcWallet: "",
          ethWallet: "",
          usdtTrc20Wallet: "",
          usdtErc20Wallet: ""
        });
      }
      res.json({
        btcWallet: settings.cryptoBtcAddress || "",
        ethWallet: settings.cryptoEthAddress || "",
        usdtTrc20Wallet: settings.cryptoUsdtTrc20Address || "",
        usdtErc20Wallet: settings.cryptoUsdtErc20Address || ""
      });
    } catch (error) {
      console.error("Failed to fetch crypto wallets:", error);
      res.status(500).json({ message: "Failed to fetch crypto wallets" });
    }
  });

  // Update crypto wallets (admin)
  app.patch("/api/admin/crypto-wallets", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { btcWallet, ethWallet, usdtTrc20Wallet, usdtErc20Wallet } = req.body;
      const settings = await storage.updatePlatformSettings({
        cryptoBtcAddress: btcWallet || null,
        cryptoEthAddress: ethWallet || null,
        cryptoUsdtTrc20Address: usdtTrc20Wallet || null,
        cryptoUsdtErc20Address: usdtErc20Wallet || null
      });
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Failed to update crypto wallets:", error);
      res.status(500).json({ message: "Failed to update crypto wallets" });
    }
  });

  // Data Migration API (admin)
  app.post("/api/admin/migration/import", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { tracker, apiUrl, apiKey, advertiserId, options } = req.body;
      
      if (!tracker || !apiUrl || !apiKey || !advertiserId) {
        return res.status(400).json({ message: "Missing required fields: tracker, apiUrl, apiKey, advertiserId" });
      }

      const { migrationService } = await import("./services/migration-service");
      const result = await migrationService.importFromTracker(
        tracker,
        apiUrl,
        apiKey,
        advertiserId,
        options || { importOffers: true, importPublishers: true }
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Migration failed" });
    }
  });

  // Get tracker info (admin)
  app.get("/api/admin/migration/trackers", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    const { migrationService } = await import("./services/migration-service");
    const trackers = ["scaleo", "affilka", "affise", "alanbase"] as const;
    
    const info = trackers.map(t => ({
      id: t,
      ...migrationService.getTrackerInfo(t)
    }));

    res.json(info);
  });

  // ============================================
  // NOTIFICATIONS API
  // ============================================

  // Get notifications for current user (with tenant isolation for staff)
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const advertiserScopeId = req.session.role === 'advertiser_staff' 
        ? req.session.staffAdvertiserId 
        : undefined;
      const notifications = await storage.getNotifications(userId, limit, advertiserScopeId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count (with tenant isolation for staff)
  app.get("/api/notifications/unread-count", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const advertiserScopeId = req.session.role === 'advertiser_staff' 
        ? req.session.staffAdvertiserId 
        : undefined;
      const count = await storage.getUnreadNotificationCount(userId, advertiserScopeId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Mark notification as read (only own notifications)
  app.patch("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const notification = await storage.markNotificationRead(id, userId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found or not yours" });
      }
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read (only own notifications)
  app.post("/api/notifications/mark-all-read", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  // Create notification (admin/advertiser only)
  app.post("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const senderRole = req.session.role!;
      const senderId = req.session.userId!;
      
      if (!["admin", "advertiser"].includes(senderRole)) {
        return res.status(403).json({ message: "Only admin and advertisers can send notifications" });
      }

      const { recipientId, type, title, body, entityType, entityId, advertiserScopeId } = req.body;
      
      if (!recipientId || !type || !title || !body) {
        return res.status(400).json({ message: "Missing required fields: recipientId, type, title, body" });
      }

      const notification = await storage.createNotification({
        senderId,
        senderRole,
        recipientId,
        type,
        title,
        body,
        entityType,
        entityId,
        advertiserScopeId: senderRole === "advertiser" ? senderId : advertiserScopeId
      });
      
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // ============================================
  // NEWS API
  // ============================================

  // Get news feed for current user
  app.get("/api/news", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const userRole = req.session.role!;
      const advertiserId = req.query.advertiserId as string | undefined;
      
      const news = await storage.getNewsFeed(userId, userRole, advertiserId);
      res.json(news);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // Get pinned news
  app.get("/api/news/pinned", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const userRole = req.session.role!;
      const advertiserId = req.query.advertiserId as string | undefined;
      
      const pinned = await storage.getPinnedNews(userId, userRole, advertiserId);
      res.json(pinned);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pinned news" });
    }
  });

  // Get unread news count
  app.get("/api/news/unread-count", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const userRole = req.session.role!;
      const advertiserId = req.query.advertiserId as string | undefined;
      
      const count = await storage.getUnreadNewsCount(userId, userRole, advertiserId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread news count" });
    }
  });

  // Mark news as read
  app.post("/api/news/mark-read", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { newsIds } = req.body;
      
      if (!Array.isArray(newsIds)) {
        return res.status(400).json({ message: "newsIds must be an array" });
      }
      
      await storage.markNewsAsRead(userId, newsIds);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark news as read" });
    }
  });

  // Get single news post
  app.get("/api/news/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const post = await storage.getNewsPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "News post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news post" });
    }
  });

  // Create news post (admin/advertiser only)
  app.post("/api/news", requireAuth, async (req: Request, res: Response) => {
    try {
      const authorRole = req.session.role!;
      const authorId = req.session.userId!;
      
      if (!["admin", "advertiser"].includes(authorRole)) {
        return res.status(403).json({ message: "Only admin and advertisers can create news" });
      }

      const { title, body, imageUrl, category, targetAudience, isPinned, isPublished } = req.body;
      
      if (!title || !body) {
        return res.status(400).json({ message: "Missing required fields: title, body" });
      }

      const post = await storage.createNewsPost({
        authorId,
        authorRole,
        title,
        body,
        imageUrl,
        category: category || "update",
        targetAudience: targetAudience || (authorRole === "admin" ? "all" : "publishers"),
        isPinned: isPinned || false,
        isPublished: isPublished !== false,
        advertiserScopeId: authorRole === "advertiser" ? authorId : null,
        publishedAt: isPublished !== false ? new Date() : null
      });
      
      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to create news post" });
    }
  });

  // Update news post
  app.patch("/api/news/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const userRole = req.session.role!;
      
      const existing = await storage.getNewsPost(id);
      if (!existing) {
        return res.status(404).json({ message: "News post not found" });
      }
      
      // Only author or admin can edit
      if (existing.authorId !== userId && userRole !== "admin") {
        return res.status(403).json({ message: "You can only edit your own news posts" });
      }

      const { title, body, imageUrl, category, targetAudience, isPinned, isPublished } = req.body;
      
      const updated = await storage.updateNewsPost(id, {
        title,
        body,
        imageUrl,
        category,
        targetAudience,
        isPinned,
        isPublished,
        publishedAt: isPublished && !existing.isPublished ? new Date() : undefined
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update news post" });
    }
  });

  // Delete news post
  app.delete("/api/news/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const userRole = req.session.role!;
      
      const existing = await storage.getNewsPost(id);
      if (!existing) {
        return res.status(404).json({ message: "News post not found" });
      }
      
      // Only author or admin can delete
      if (existing.authorId !== userId && userRole !== "admin") {
        return res.status(403).json({ message: "You can only delete your own news posts" });
      }

      await storage.deleteNewsPost(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete news post" });
    }
  });

  // ============================================
  // WEBHOOK ENDPOINTS (Advertisers only)
  // ============================================
  
  // Get all webhooks for advertiser
  app.get("/api/webhooks", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const webhooks = await storage.getWebhookEndpointsByAdvertiser(advertiserId);
      res.json(webhooks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get webhooks" });
    }
  });

  // Create webhook endpoint
  app.post("/api/webhooks", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { name, url, events, offerIds, publisherIds, method, headers } = req.body;
      
      if (!name || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ message: "Missing required fields: name, url, events" });
      }

      const { webhookService } = await import("./services/webhook-service");
      const secret = webhookService.generateSecret();

      const webhook = await storage.createWebhookEndpoint({
        advertiserId,
        name,
        url,
        secret,
        events,
        offerIds: offerIds || null,
        publisherIds: publisherIds || null,
        method: method || "POST",
        headers: headers ? JSON.stringify(headers) : null,
        isActive: true,
      });

      res.status(201).json(webhook);
    } catch (error) {
      res.status(500).json({ message: "Failed to create webhook" });
    }
  });

  // Update webhook endpoint
  app.patch("/api/webhooks/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getWebhookEndpoint(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      const { name, url, events, offerIds, publisherIds, method, headers, isActive } = req.body;
      
      const updated = await storage.updateWebhookEndpoint(id, {
        name,
        url,
        events,
        offerIds,
        publisherIds,
        method,
        headers: headers ? JSON.stringify(headers) : undefined,
        isActive,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update webhook" });
    }
  });

  // Delete webhook endpoint
  app.delete("/api/webhooks/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getWebhookEndpoint(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      await storage.deleteWebhookEndpoint(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete webhook" });
    }
  });

  // Test webhook
  app.post("/api/webhooks/:id/test", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getWebhookEndpoint(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      const { webhookService } = await import("./services/webhook-service");
      const result = await webhookService.testWebhook(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to test webhook" });
    }
  });

  // Get webhook logs
  app.get("/api/webhooks/:id/logs", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getWebhookEndpoint(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      const logs = await storage.getWebhookLogs(id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get webhook logs" });
    }
  });

  // Regenerate webhook secret
  app.post("/api/webhooks/:id/regenerate-secret", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getWebhookEndpoint(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      const { webhookService } = await import("./services/webhook-service");
      const newSecret = webhookService.generateSecret();
      
      const updated = await storage.updateWebhookEndpoint(id, { secret: newSecret });
      res.json({ secret: newSecret });
    } catch (error) {
      res.status(500).json({ message: "Failed to regenerate secret" });
    }
  });

  // ============================================
  // CUSTOM DOMAINS (Advertisers only)
  // ============================================

  // Get all domains for advertiser
  app.get("/api/domains", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const domains = await storage.getCustomDomainsByAdvertiser(advertiserId);
      
      // Add current CNAME target to domains that don't have dnsTarget set
      const { cloudflareService } = await import("./cloudflare-service");
      const cnameTarget = await cloudflareService.getCnameTarget();
      
      const domainsWithTarget = domains.map(domain => ({
        ...domain,
        dnsTarget: domain.dnsTarget || cnameTarget || null,
      }));
      
      res.json(domainsWithTarget);
    } catch (error) {
      res.status(500).json({ message: "Failed to get domains" });
    }
  });

  // Add new domain
  app.post("/api/domains", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { domain } = req.body;
      
      if (!domain) {
        return res.status(400).json({ message: "Domain is required" });
      }

      const { domainService } = await import("./services/domain-service");
      
      const validation = domainService.validateDomainFormat(domain);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const availability = await domainService.checkDomainAvailability(domain);
      if (!availability.available) {
        return res.status(400).json({ message: availability.error });
      }

      const verificationToken = domainService.generateVerificationToken();
      
      const { cloudflareService } = await import("./cloudflare-service");
      const cnameTarget = await cloudflareService.getCnameTarget();

      const newDomain = await storage.createCustomDomain({
        advertiserId,
        domain,
        verificationToken,
        verificationMethod: "cname",
        isVerified: false,
        sslStatus: "pending",
        isPrimary: false,
        isActive: true,
        dnsTarget: cnameTarget || undefined,
      });

      try {
        if (await cloudflareService.isCloudflareConfigured()) {
          const result = await cloudflareService.provisionDomain(newDomain.id, domain);
          if (!result.success) {
            console.error(`Cloudflare provisioning failed for ${domain}: ${result.error}`);
          }
        }
      } catch (cfError) {
        console.error(`Cloudflare provisioning error for ${domain}:`, cfError);
      }

      const updatedDomain = await storage.getCustomDomain(newDomain.id);
      res.status(201).json(updatedDomain);
    } catch (error) {
      console.error("Failed to add domain:", error);
      res.status(500).json({ message: "Failed to add domain" });
    }
  });

  // Verify domain
  app.post("/api/domains/:id/verify", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getCustomDomain(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const { domainService } = await import("./services/domain-service");
      const result = await domainService.verifyDomain(id);
      
      if (result.success) {
        const updated = await storage.getCustomDomain(id);
        res.json(updated);
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to verify domain" });
    }
  });

  // Check SSL status (real TLS handshake)
  app.post("/api/domains/:id/check-ssl", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getCustomDomain(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      if (!existing.isVerified) {
        return res.status(400).json({ message: "Domain must be verified first" });
      }

      const { domainService } = await import("./services/domain-service");
      const result = await domainService.checkSsl(id);
      
      const updated = await storage.getCustomDomain(id);
      res.json({ 
        domain: updated, 
        sslCheck: {
          success: result.success,
          status: result.status,
          error: result.error,
          expiresAt: result.expiresAt,
          issuer: result.issuer,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check SSL status" });
    }
  });

  // Set primary domain
  app.post("/api/domains/:id/set-primary", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getCustomDomain(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      if (!existing.isVerified) {
        return res.status(400).json({ message: "Domain must be verified first" });
      }

      await storage.setPrimaryDomain(advertiserId, id);
      const updated = await storage.getCustomDomain(id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to set primary domain" });
    }
  });

  // Sync domain status with Cloudflare
  app.post("/api/domains/:id/sync", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getCustomDomain(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const { cloudflareService } = await import("./cloudflare-service");
      
      if (!await cloudflareService.isCloudflareConfigured()) {
        return res.status(400).json({ message: "Cloudflare not configured" });
      }

      if (!existing.cloudflareHostnameId) {
        const result = await cloudflareService.provisionDomain(id, existing.domain);
        if (!result.success) {
          return res.status(400).json({ message: result.error });
        }
      } else {
        await cloudflareService.syncDomainStatus(id);
      }

      const updated = await storage.getCustomDomain(id);
      res.json(updated);
    } catch (error) {
      console.error("Failed to sync domain:", error);
      res.status(500).json({ message: "Failed to sync domain" });
    }
  });

  // Reprovision domain (delete and recreate Cloudflare hostname)
  app.post("/api/domains/:id/reprovision", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getCustomDomain(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const { domainService } = await import("./services/domain-service");
      const result = await domainService.reprovisionDomain(id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      const updated = await storage.getCustomDomain(id);
      res.json(updated);
    } catch (error) {
      console.error("Failed to reprovision domain:", error);
      res.status(500).json({ message: "Failed to reprovision domain" });
    }
  });

  // Delete domain
  app.delete("/api/domains/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { id } = req.params;
      
      const existing = await storage.getCustomDomain(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      try {
        const { cloudflareService } = await import("./cloudflare-service");
        if (existing.cloudflareHostnameId) {
          await cloudflareService.deprovisionDomain(id);
        }
      } catch (cfError) {
        console.error(`Cloudflare deprovisioning error for ${existing.domain}:`, cfError);
      }

      await storage.deleteCustomDomain(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete domain:", error);
      res.status(500).json({ message: "Failed to delete domain" });
    }
  });

  // Get tracking links with custom domain
  app.get("/api/domains/tracking-links/:offerId/:landingId", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const { offerId, landingId } = req.params;

      const { domainService } = await import("./services/domain-service");
      const links = await domainService.generateTrackingLinks(advertiserId, offerId, landingId);
      
      res.json(links);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate tracking links" });
    }
  });

  // Submit domain request for admin review (NS-based workflow)
  app.post("/api/domains/:id/submit-request", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("settings"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      const { id } = req.params;
      
      const existing = await storage.getCustomDomain(id);
      if (!existing || existing.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const updated = await storage.submitDomainRequest(id);
      res.json(updated);
    } catch (error) {
      console.error("Failed to submit domain request:", error);
      res.status(500).json({ message: "Failed to submit domain request" });
    }
  });

  // ============================================
  // ADMIN DOMAIN MANAGEMENT
  // ============================================
  
  // Get all domain requests for admin
  app.get("/api/admin/domain-requests", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const requests = await storage.getAllDomainRequests();
      res.json(requests);
    } catch (error) {
      console.error("Failed to get domain requests:", error);
      res.status(500).json({ message: "Failed to get domain requests" });
    }
  });

  // Approve domain request
  app.post("/api/admin/domain-requests/:id/approve", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      
      const domain = await storage.getCustomDomain(id);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      
      const updated = await storage.approveDomainRequest(id, adminNotes);
      res.json(updated);
    } catch (error) {
      console.error("Failed to approve domain request:", error);
      res.status(500).json({ message: "Failed to approve domain request" });
    }
  });

  // Reject domain request
  app.post("/api/admin/domain-requests/:id/reject", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const domain = await storage.getCustomDomain(id);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      
      const updated = await storage.rejectDomainRequest(id, reason);
      res.json(updated);
    } catch (error) {
      console.error("Failed to reject domain request:", error);
      res.status(500).json({ message: "Failed to reject domain request" });
    }
  });

  // Activate domain (after manual provisioning in Replit/Cloudflare)
  app.post("/api/admin/domain-requests/:id/activate", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const domain = await storage.getCustomDomain(id);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      
      if (domain.requestStatus !== "provisioning") {
        return res.status(400).json({ message: "Domain must be in provisioning status to activate" });
      }
      
      const updated = await storage.activateDomain(id);
      res.json(updated);
    } catch (error) {
      console.error("Failed to activate domain:", error);
      res.status(500).json({ message: "Failed to activate domain" });
    }
  });

  // ============================================
  // ROADMAP MANAGEMENT (Admin)
  // ============================================
  
  // Get all roadmap items (admin)
  app.get("/api/admin/roadmap", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const items = await storage.getRoadmapItems();
      res.json(items);
    } catch (error) {
      console.error("Failed to get roadmap items:", error);
      res.status(500).json({ message: "Ошибка загрузки плана развития" });
    }
  });

  // Create roadmap item
  const createRoadmapSchema = z.object({
    title: z.string().min(1, "Название обязательно").max(200),
    description: z.string().min(1, "Описание обязательно").max(1000),
    quarter: z.string().min(1, "Квартал обязателен").regex(/^Q[1-4]\s+\d{4}$/, "Формат: Q1 2026"),
    status: z.enum(["planned", "in_progress", "completed"]).optional().default("planned"),
    priority: z.number().min(0).max(100).optional().default(0),
    isPublished: z.boolean().optional().default(false),
  });

  app.post("/api/admin/roadmap", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const parsed = createRoadmapSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Ошибка валидации" });
      }
      
      const item = await storage.createRoadmapItem(parsed.data);
      res.json(item);
    } catch (error) {
      console.error("Failed to create roadmap item:", error);
      res.status(500).json({ message: "Ошибка создания записи" });
    }
  });

  // Update roadmap item
  const updateRoadmapSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(1000).optional(),
    quarter: z.string().regex(/^Q[1-4]\s+\d{4}$/).optional(),
    status: z.enum(["planned", "in_progress", "completed"]).optional(),
    priority: z.number().min(0).max(100).optional(),
    isPublished: z.boolean().optional(),
  });

  app.put("/api/admin/roadmap/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = updateRoadmapSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Ошибка валидации" });
      }
      
      const item = await storage.updateRoadmapItem(id, parsed.data);
      
      if (!item) {
        return res.status(404).json({ message: "Запись не найдена" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Failed to update roadmap item:", error);
      res.status(500).json({ message: "Ошибка обновления записи" });
    }
  });

  // Delete roadmap item
  app.delete("/api/admin/roadmap/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteRoadmapItem(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete roadmap item:", error);
      res.status(500).json({ message: "Ошибка удаления записи" });
    }
  });

  // ============================================
  // NEWS MANAGEMENT (Admin) - Landing page settings
  // ============================================
  
  // Get all news posts (admin)
  app.get("/api/admin/news", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const posts = await storage.getAllNewsPosts();
      res.json(posts);
    } catch (error) {
      console.error("Failed to get news posts:", error);
      res.status(500).json({ message: "Ошибка загрузки новостей" });
    }
  });

  // Update news landing settings
  const updateNewsLandingSchema = z.object({
    showOnLanding: z.boolean().optional(),
    icon: z.string().max(50).nullable().optional(),
    shortDescription: z.string().max(300).nullable().optional(),
  });

  app.patch("/api/admin/news/:id/landing", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = updateNewsLandingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Ошибка валидации" });
      }
      
      const post = await storage.updateNewsPostLandingSettings(id, parsed.data);
      
      if (!post) {
        return res.status(404).json({ message: "Новость не найдена" });
      }
      
      res.json(post);
    } catch (error) {
      console.error("Failed to update news landing settings:", error);
      res.status(500).json({ message: "Ошибка обновления настроек" });
    }
  });

  // ============================================
  // ADMIN SUBSCRIPTION MANAGEMENT
  // ============================================

  // Get all subscriptions for admin
  app.get("/api/admin/subscriptions", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { status, planId, search } = req.query;
      const filters: { status?: string; planId?: string; search?: string } = {};
      
      if (status && typeof status === "string") filters.status = status;
      if (planId && typeof planId === "string") filters.planId = planId;
      if (search && typeof search === "string") filters.search = search;
      
      const subscriptions = await storage.getAllSubscriptionsForAdmin(filters);
      const plans = await storage.getSubscriptionPlans();
      
      res.json({ subscriptions, plans });
    } catch (error) {
      console.error("Failed to get subscriptions:", error);
      res.status(500).json({ message: "Ошибка загрузки подписок" });
    }
  });

  // Get subscription by id
  app.get("/api/admin/subscriptions/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscription = await storage.getSubscriptionById(id);
      
      if (!subscription) {
        return res.status(404).json({ message: "Подписка не найдена" });
      }
      
      res.json(subscription);
    } catch (error) {
      console.error("Failed to get subscription:", error);
      res.status(500).json({ message: "Ошибка загрузки подписки" });
    }
  });

  // Extend subscription
  const extendSubscriptionSchema = z.object({
    extendByDays: z.number().int().positive().optional(),
    extendByMonths: z.number().int().positive().optional(),
    newEndDate: z.string().optional(),
    note: z.string().max(500).optional(),
  });

  app.post("/api/admin/subscriptions/:id/extend", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = extendSubscriptionSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Ошибка валидации" });
      }
      
      const { extendByDays, extendByMonths, newEndDate, note } = parsed.data;
      
      // Get current subscription
      const subscription = await storage.getSubscriptionById(id);
      if (!subscription) {
        return res.status(404).json({ message: "Подписка не найдена" });
      }
      
      // Calculate new end date
      let calculatedEndDate: Date;
      if (newEndDate) {
        calculatedEndDate = new Date(newEndDate);
      } else {
        const baseDate = subscription.currentPeriodEnd || new Date();
        calculatedEndDate = new Date(baseDate);
        
        if (extendByDays) {
          calculatedEndDate.setDate(calculatedEndDate.getDate() + extendByDays);
        }
        if (extendByMonths) {
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + extendByMonths);
        }
      }
      
      const updated = await storage.extendSubscription(id, calculatedEndDate, note);
      
      if (!updated) {
        return res.status(404).json({ message: "Подписка не найдена" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Failed to extend subscription:", error);
      res.status(500).json({ message: "Ошибка продления подписки" });
    }
  });

  // Grant subscription to user (max 1200 months = 100 years)
  const grantSubscriptionSchema = z.object({
    userId: z.string(),
    planId: z.string(),
    periodMonths: z.number().int().positive().max(1200, "Максимум 1200 месяцев (100 лет)").default(1),
    note: z.string().max(500).optional(),
  });

  app.post("/api/admin/subscriptions/grant", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const parsed = grantSubscriptionSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Ошибка валидации" });
      }
      
      const { userId, planId, periodMonths } = parsed.data;
      
      // Verify user exists and is advertiser
      const user = await storage.getUser(userId);
      if (!user || user.role !== "advertiser") {
        return res.status(404).json({ message: "Пользователь не найден или не является рекламодателем" });
      }
      
      // Verify plan exists
      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Тарифный план не найден" });
      }
      
      // Calculate period end
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + periodMonths);
      
      const subscription = await storage.grantSubscription(userId, planId, periodEnd);
      
      res.json(subscription);
    } catch (error) {
      console.error("Failed to grant subscription:", error);
      res.status(500).json({ message: "Ошибка выдачи подписки" });
    }
  });

  // Change subscription plan
  const changePlanSchema = z.object({
    planId: z.string(),
    note: z.string().max(500).optional(),
  });

  app.post("/api/admin/subscriptions/:id/change-plan", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = changePlanSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Ошибка валидации" });
      }
      
      const { planId } = parsed.data;
      
      // Verify plan exists
      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Тарифный план не найден" });
      }
      
      const updated = await storage.changeSubscriptionPlan(id, planId);
      
      if (!updated) {
        return res.status(404).json({ message: "Подписка не найдена" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Failed to change subscription plan:", error);
      res.status(500).json({ message: "Ошибка смены плана" });
    }
  });

  // ============================================
  // DATA MIGRATION (Advertiser)
  // ============================================
  
  // Get migration history
  app.get("/api/advertiser/migrations", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const migrations = await storage.getMigrationsByAdvertiser(advertiserId);
      res.json(migrations);
    } catch (error) {
      console.error("Failed to get migrations:", error);
      res.status(500).json({ message: "Failed to get migrations" });
    }
  });
  
  // Start new migration
  app.post("/api/advertiser/migrations", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("settings"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      const { sourceTracker, apiUrl, apiKey, importOffers, importPublishers, importConversions, importClicks } = req.body;
      
      if (!sourceTracker || !apiUrl || !apiKey) {
        return res.status(400).json({ message: "Source tracker, API URL, and API key are required" });
      }
      
      const validTrackers = ["scaleo", "affilka", "affise", "alanbase"];
      if (!validTrackers.includes(sourceTracker)) {
        return res.status(400).json({ message: `Invalid tracker. Must be one of: ${validTrackers.join(", ")}` });
      }
      
      // Create migration record
      const migration = await storage.createMigration({
        advertiserId,
        sourceTracker,
        apiUrl,
        status: "in_progress",
        importOffers: importOffers !== false,
        importPublishers: importPublishers !== false,
        importConversions: importConversions === true,
        importClicks: importClicks === true,
        startedAt: new Date(),
      });
      
      // Import in background
      const { migrationService } = await import("./services/migration-service");
      type TrackerType = "scaleo" | "affilka" | "affise" | "alanbase";
      
      (async () => {
        try {
          const result = await migrationService.importFromTracker(
            sourceTracker as TrackerType,
            apiUrl,
            apiKey,
            advertiserId,
            {
              importOffers: importOffers !== false,
              importPublishers: importPublishers !== false,
              importConversions: importConversions === true,
              importClicks: importClicks === true,
            }
          );
          
          await storage.updateMigration(migration.id, {
            status: result.success ? "completed" : "failed",
            importedOffers: result.imported.offers,
            importedPublishers: result.imported.publishers,
            importedConversions: result.imported.conversions,
            importedClicks: result.imported.clicks,
            totalRecords: result.imported.offers + result.imported.publishers + result.imported.conversions + result.imported.clicks,
            processedRecords: result.imported.offers + result.imported.publishers + result.imported.conversions + result.imported.clicks,
            failedRecords: result.errors.length,
            errors: result.errors,
            completedAt: new Date(),
          });
        } catch (error: any) {
          await storage.updateMigration(migration.id, {
            status: "failed",
            errors: [error.message || "Unknown error"],
            completedAt: new Date(),
          });
        }
      })();
      
      res.json({ success: true, migrationId: migration.id, message: "Migration started" });
    } catch (error) {
      console.error("Failed to start migration:", error);
      res.status(500).json({ message: "Failed to start migration" });
    }
  });
  
  // Get migration status
  app.get("/api/advertiser/migrations/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      
      const migration = await storage.getMigration(req.params.id);
      if (!migration) {
        return res.status(404).json({ message: "Migration not found" });
      }
      
      if (migration.advertiserId !== advertiserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(migration);
    } catch (error) {
      console.error("Failed to get migration:", error);
      res.status(500).json({ message: "Failed to get migration" });
    }
  });

  // ============================================
  // SUBSCRIPTION PLANS (Public)
  // ============================================
  app.get("/api/subscription/plans", async (req: Request, res: Response) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Failed to get subscription plans:", error);
      res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  // ============================================
  // ADVERTISER SUBSCRIPTION MANAGEMENT
  // ============================================
  
  // Get current subscription status
  app.get("/api/subscription/current", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      let subscription = await storage.getAdvertiserSubscription(advertiserId);
      
      // Create trial if no subscription exists
      if (!subscription) {
        subscription = await storage.createTrialSubscription(advertiserId);
      }
      
      // Get plan details if subscribed
      let plan = null;
      if (subscription.planId) {
        plan = await storage.getSubscriptionPlanById(subscription.planId);
      }
      
      res.json({ subscription, plan });
    } catch (error) {
      console.error("Failed to get subscription:", error);
      res.status(500).json({ message: "Failed to get subscription" });
    }
  });
  
  // Get payment history
  app.get("/api/subscription/payments", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Not authorized as advertiser" });
      }
      const payments = await storage.getAdvertiserPayments(advertiserId);
      res.json(payments);
    } catch (error) {
      console.error("Failed to get payments:", error);
      res.status(500).json({ message: "Failed to get payments" });
    }
  });
  
  // Get crypto wallet addresses for payment (legacy format)
  app.get("/api/subscription/wallets", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const settings = await storage.getPlatformSettings();
      if (!settings) {
        return res.json({
          btc: null,
          eth: null,
          usdtTrc20: null,
          usdtErc20: null
        });
      }
      
      res.json({
        btc: settings.cryptoBtcAddress || null,
        eth: settings.cryptoEthAddress || null,
        usdtTrc20: settings.cryptoUsdtTrc20Address || null,
        usdtErc20: settings.cryptoUsdtErc20Address || null
      });
    } catch (error) {
      console.error("Failed to get crypto wallets:", error);
      res.status(500).json({ message: "Failed to get crypto wallets" });
    }
  });
  
  // Get crypto wallet addresses for payment (detailed format)
  app.get("/api/subscription/crypto-wallets", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const settings = await storage.getPlatformSettings();
      if (!settings) {
        return res.status(404).json({ message: "Platform settings not found" });
      }
      
      const wallets: { currency: string; address: string; network: string }[] = [];
      
      if (settings.cryptoBtcAddress) {
        wallets.push({ currency: "BTC", address: settings.cryptoBtcAddress, network: "Bitcoin" });
      }
      if (settings.cryptoUsdtTrc20Address) {
        wallets.push({ currency: "USDT_TRC20", address: settings.cryptoUsdtTrc20Address, network: "Tron (TRC20)" });
      }
      if (settings.cryptoEthAddress) {
        wallets.push({ currency: "ETH", address: settings.cryptoEthAddress, network: "Ethereum" });
      }
      if (settings.cryptoUsdtErc20Address) {
        wallets.push({ currency: "USDT_ERC20", address: settings.cryptoUsdtErc20Address, network: "Ethereum (ERC20)" });
      }
      
      res.json(wallets);
    } catch (error) {
      console.error("Failed to get crypto wallets:", error);
      res.status(500).json({ message: "Failed to get crypto wallets" });
    }
  });
  
  // Create payment request
  app.post("/api/subscription/pay", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = req.session.userId!;
      const { planId, billingCycle, cryptoCurrency } = req.body;
      
      if (!planId || !billingCycle || !cryptoCurrency) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      const settings = await storage.getPlatformSettings();
      if (!settings) {
        return res.status(500).json({ message: "Platform settings not configured" });
      }
      
      let cryptoAddress = "";
      switch (cryptoCurrency) {
        case "BTC": cryptoAddress = settings.cryptoBtcAddress || ""; break;
        case "USDT_TRC20": cryptoAddress = settings.cryptoUsdtTrc20Address || ""; break;
        case "ETH": cryptoAddress = settings.cryptoEthAddress || ""; break;
        case "USDT_ERC20": cryptoAddress = settings.cryptoUsdtErc20Address || ""; break;
      }
      
      if (!cryptoAddress) {
        return res.status(400).json({ message: "This cryptocurrency is not available for payment" });
      }
      
      const amount = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      
      const subscription = await storage.getAdvertiserSubscription(advertiserId);
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour payment window
      
      const payment = await storage.createSubscriptionPayment({
        advertiserId,
        subscriptionId: subscription?.id,
        planId,
        amount: amount.toString(),
        currency: "USD",
        cryptoCurrency,
        cryptoAddress,
        billingCycle,
        status: "pending",
        expiresAt,
      });
      
      res.json({ payment, cryptoAddress, amount });
    } catch (error) {
      console.error("Failed to create payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });
  
  // Submit transaction hash for verification
  app.post("/api/subscription/verify", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = req.session.userId!;
      const { paymentId, txHash } = req.body;
      
      if (!paymentId || !txHash) {
        return res.status(400).json({ message: "Missing payment ID or transaction hash" });
      }
      
      const payment = await storage.getSubscriptionPaymentById(paymentId);
      if (!payment || payment.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Check if hash already used
      const existingPayment = await storage.getSubscriptionPaymentByHash(txHash);
      if (existingPayment && existingPayment.id !== paymentId) {
        return res.status(400).json({ message: "This transaction hash is already used" });
      }
      
      await storage.updateSubscriptionPayment(paymentId, { 
        txHash, 
        status: "verifying" 
      });
      
      // Start verification
      const { cryptoPaymentService } = await import("./services/crypto-payment-service");
      const result = await cryptoPaymentService.verifyPayment(paymentId);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to verify payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });
  
  // Retry payment verification (for pending confirmations)
  app.post("/api/subscription/verify-retry/:paymentId", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = req.session.userId!;
      const { paymentId } = req.params;
      
      const payment = await storage.getSubscriptionPaymentById(paymentId);
      if (!payment || payment.advertiserId !== advertiserId) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      if (!payment.txHash) {
        return res.status(400).json({ message: "No transaction hash to verify" });
      }
      
      const { cryptoPaymentService } = await import("./services/crypto-payment-service");
      const result = await cryptoPaymentService.verifyPayment(paymentId);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to verify payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // ============================================
  // E2E TESTING - Full cycle test (click → conversion → payout)
  // Read-only simulation - does NOT modify real balances
  // Only Admin and Advertiser can run tests
  // ============================================
  
  app.post("/api/test/e2e", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.role!;
      
      // SECURITY: Only Admin and Advertiser can run e2e tests
      if (role !== "admin" && role !== "advertiser") {
        return res.status(403).json({ message: "Only administrators and advertisers can run e2e tests" });
      }
      
      const { offerId } = req.body;
      
      if (!offerId) {
        return res.status(400).json({ message: "Offer ID is required" });
      }
      
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      // Check access - advertiser can only test their own offers
      if (role === "advertiser") {
        const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
        if (offer.advertiserId !== effectiveAdvertiserId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const testResults: any = {
        timestamp: new Date().toISOString(),
        offerId,
        offerName: offer.name,
        steps: [],
        success: false,
        summary: "",
        isSimulation: true
      };
      
      // Step 1: Find approved publisher for test
      const accessList = await storage.getPublisherOffersByOffer(offerId);
      
      if (!accessList || accessList.length === 0) {
        testResults.steps.push({
          step: 1,
          name: "Find Publisher",
          status: "failed",
          error: "No approved publishers for this offer"
        });
        testResults.summary = "Test failed: No approved publishers";
        return res.json(testResults);
      }
      
      const testPublisherId = accessList[0].publisherId;
      const publisher = await storage.getUser(testPublisherId);
      testResults.steps.push({
        step: 1,
        name: "Find Publisher",
        status: "passed",
        data: { publisherId: testPublisherId, publisherName: publisher?.username }
      });
      
      // Step 2: Validate click creation (simulation only - no actual click created)
      const testClickId = `sim_e2e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const landings = await storage.getOfferLandings(offerId);
      const hasLanding = landings && landings.length > 0;
      const landingUrl = hasLanding ? landings[0].landingUrl : null;
      const clickDataValid = !!(landingUrl && testPublisherId);
      
      testResults.steps.push({
        step: 2,
        name: "Validate Click Data",
        status: clickDataValid ? "passed" : "failed",
        data: { 
          simulatedClickId: testClickId,
          landingUrl: landingUrl || "(missing)",
          publisherId: testPublisherId,
          note: "Simulation only - no click created"
        }
      });
      
      if (!clickDataValid) {
        testResults.summary = "Test failed: Invalid click data (missing landing URL)";
        return res.json(testResults);
      }
      
      // Step 3: Get current balance (read-only)
      let currentBalance: any = null;
      try {
        currentBalance = await storage.getPublisherBalance(testPublisherId, offer.advertiserId);
      } catch (e) {
        // Balance might not exist yet
      }
      
      testResults.steps.push({
        step: 3,
        name: "Check Current Balance",
        status: "passed",
        data: { 
          available: currentBalance?.available || "0",
          pending: currentBalance?.pending || "0",
          hold: currentBalance?.hold || "0",
          note: "Read-only - balance not modified"
        }
      });
      
      // Step 4: Validate conversion data (simulation only)
      // Get payout from landing if not set on offer level
      const landingPayout = hasLanding ? parseFloat(landings[0].partnerPayout || "0") : 0;
      const landingCost = hasLanding ? parseFloat(landings[0].internalCost || "0") : 0;
      const publisherPayout = parseFloat(offer.partnerPayout || "0") || landingPayout;
      const advertiserCost = parseFloat(offer.internalCost || "0") || landingCost;
      const payoutValid = publisherPayout > 0;
      
      testResults.steps.push({
        step: 4,
        name: "Validate Conversion Data",
        status: payoutValid ? "passed" : "failed",
        data: { 
          publisherPayout,
          advertiserCost,
          payoutModel: offer.payoutModel,
          note: "Simulation only - no conversion created"
        }
      });
      
      if (!payoutValid) {
        testResults.summary = "Test failed: Payout amount is 0 or invalid";
        return res.json(testResults);
      }
      
      // Step 5: Simulate balance calculation
      const currentAvailable = parseFloat(currentBalance?.available || "0");
      const simulatedNewBalance = currentAvailable + publisherPayout;
      
      testResults.steps.push({
        step: 5,
        name: "Simulate Balance Update",
        status: "passed",
        data: { 
          currentBalance: currentAvailable,
          payout: publisherPayout,
          simulatedNewBalance,
          note: "Simulation only - balance not modified"
        }
      });
      
      // Step 6: Verify payout logic
      const payoutLogicValid = publisherPayout <= advertiserCost || advertiserCost === 0;
      
      testResults.steps.push({
        step: 6,
        name: "Verify Payout Logic",
        status: "passed",
        data: { 
          publisherPayout,
          advertiserCost,
          margin: advertiserCost - publisherPayout,
          message: payoutLogicValid ? "Payout configuration valid" : "Warning: Publisher payout exceeds advertiser cost"
        }
      });
      
      testResults.success = true;
      testResults.summary = `E2E Simulation PASSED: Full cycle validated. Simulated payout: $${publisherPayout}`;
      
      res.json(testResults);
    } catch (error: any) {
      console.error("E2E test error:", error);
      res.status(500).json({ 
        success: false,
        error: error.message,
        summary: `E2E Test ERROR: ${error.message}`
      });
    }
  });
  
  // Get available offers for e2e testing (Admin and Advertiser only)
  app.get("/api/test/e2e/offers", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.role!;
      
      // SECURITY: Only Admin and Advertiser can access e2e testing
      if (role !== "admin" && role !== "advertiser") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let offers: any[] = [];
      
      if (role === "admin") {
        // Admin sees all offers for e2e testing
        const allAdvertisers = await storage.getUsersByRole("advertiser");
        for (const adv of allAdvertisers) {
          const advOffers = await storage.getOffersByAdvertiser(adv.id);
          offers.push(...advOffers);
        }
      } else if (role === "advertiser") {
        const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
        if (effectiveAdvertiserId) {
          offers = await storage.getOffersByAdvertiser(effectiveAdvertiserId);
        }
      }
      
      // Filter active offers only and remove duplicates
      const offerMap = new Map<string, any>();
      offers.forEach(o => offerMap.set(o.id, o));
      const uniqueOffers = Array.from(offerMap.values());
      const activeOffers = uniqueOffers.filter(o => o.status === "active");
      
      res.json(activeOffers.map(o => ({
        id: o.id,
        name: o.name,
        payoutAmount: o.partnerPayout || "0",
        advertiserPrice: o.internalCost || "0",
        payoutModel: o.payoutModel
      })));
    } catch (error) {
      console.error("Get e2e offers error:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // ============================================
  // EXPORT API
  // Export data to CSV, Excel, PDF
  // ============================================
  
  app.get("/api/export/:dataset", requireAuth, async (req: Request, res: Response) => {
    try {
      const { generateExport, EXPORT_DATASETS } = await import("./services/export-service");
      type ExportFormat = "csv" | "xlsx" | "pdf";
      
      const userId = req.session.userId!;
      const role = req.session.role!;
      const { dataset } = req.params;
      const format = (req.query.format as ExportFormat) || "csv";
      
      if (!["csv", "xlsx", "pdf"].includes(format)) {
        return res.status(400).json({ message: "Invalid format. Use csv, xlsx, or pdf" });
      }
      
      const datasetConfig = (EXPORT_DATASETS as Record<string, any>)[dataset];
      if (!datasetConfig) {
        return res.status(400).json({ message: "Invalid dataset" });
      }
      
      let rows: any[] = [];
      const filters: Record<string, string> = {};
      
      // Parse common filters
      const { dateFrom, dateTo, offerId, publisherId, advertiserId, status, direction, search, geo, device, dateMode } = req.query;
      if (dateFrom) filters["Дата от"] = dateFrom as string;
      if (dateTo) filters["Дата до"] = dateTo as string;
      if (geo) filters["GEO"] = geo as string;
      if (device) filters["Устройство"] = device as string;
      
      switch (dataset) {
        case "reports-clicks": {
          const queryFilters: any = {};
          
          if (role === "publisher") {
            queryFilters.publisherId = userId;
            if (advertiserId) {
              const advertiserOffers = await storage.getOffersByAdvertiser(advertiserId as string);
              if (advertiserOffers.length > 0) {
                queryFilters.offerIds = advertiserOffers.map(o => o.id);
              }
            }
          } else if (role === "advertiser") {
            const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
            if (effectiveAdvertiserId) {
              const advertiserOffers = await storage.getOffersByAdvertiser(effectiveAdvertiserId);
              if (advertiserOffers.length > 0) {
                queryFilters.offerIds = advertiserOffers.map(o => o.id);
              }
            }
          }
          
          if (offerId) queryFilters.offerId = offerId as string;
          if (publisherId && role !== "publisher") queryFilters.publisherId = publisherId as string;
          if (dateFrom) queryFilters.dateFrom = new Date(dateFrom as string);
          if (dateTo) queryFilters.dateTo = new Date(dateTo as string);
          if (geo) queryFilters.geo = geo as string;
          if (device) queryFilters.device = device as string;
          if (dateMode) queryFilters.dateMode = dateMode as string;
          if (search) queryFilters.search = search as string; // Pass search to storage for SQL-based filtering
          
          const result = await storage.getClicksReport(queryFilters, undefined, 1, 10000);
          const clickRows = result.clicks;
          
          rows = clickRows.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt).toLocaleString("ru-RU"),
          }));
          break;
        }
        
        case "reports-conversions": {
          const queryFilters: any = {};
          
          if (role === "publisher") {
            queryFilters.publisherId = userId;
            if (advertiserId) {
              const advertiserOffers = await storage.getOffersByAdvertiser(advertiserId as string);
              if (advertiserOffers.length > 0) {
                queryFilters.offerIds = advertiserOffers.map(o => o.id);
              }
            }
          } else if (role === "advertiser") {
            const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
            if (effectiveAdvertiserId) {
              const advertiserOffers = await storage.getOffersByAdvertiser(effectiveAdvertiserId);
              if (advertiserOffers.length > 0) {
                queryFilters.offerIds = advertiserOffers.map(o => o.id);
              }
            }
          }
          
          if (offerId) queryFilters.offerId = offerId as string;
          if (publisherId && role !== "publisher") queryFilters.publisherId = publisherId as string;
          if (dateFrom) queryFilters.dateFrom = new Date(dateFrom as string);
          if (dateTo) queryFilters.dateTo = new Date(dateTo as string);
          if (status) queryFilters.status = status as string;
          if (search) queryFilters.search = search as string; // Pass search to storage for SQL-based filtering
          
          const result = await storage.getConversionsReport(queryFilters, undefined, 1, 10000);
          const convRows = result.conversions;
          
          rows = convRows.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt).toLocaleString("ru-RU"),
          }));
          break;
        }
        
        case "finance-transactions": {
          if (role === "publisher") {
            return res.status(403).json({ message: "Access denied" });
          }
          
          let requests: any[] = [];
          if (role === "admin") {
            requests = await storage.getAllPayoutRequests();
          } else if (role === "advertiser") {
            const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
            if (effectiveAdvertiserId) {
              requests = await storage.getPayoutRequestsByAdvertiser(effectiveAdvertiserId);
            }
          }
          
          rows = requests.map((r: any) => ({
            id: r.id,
            createdAt: new Date(r.createdAt).toLocaleString("ru-RU"),
            publisherName: r.publisherName || r.publisherId,
            requestedAmount: r.requestedAmount,
            status: r.status,
            methodName: r.methodName || "-",
          }));
          break;
        }
        
        case "finance-payouts": {
          if (role === "publisher") {
            return res.status(403).json({ message: "Access denied" });
          }
          
          let payoutsList: any[] = [];
          if (role === "admin") {
            const allAdvertisers = await storage.getUsersByRole("advertiser");
            for (const adv of allAdvertisers) {
              const advPayouts = await storage.getPayoutsByAdvertiser(adv.id);
              payoutsList.push(...advPayouts);
            }
          } else if (role === "advertiser") {
            const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
            if (effectiveAdvertiserId) {
              payoutsList = await storage.getPayoutsByAdvertiser(effectiveAdvertiserId);
            }
          }
          
          rows = payoutsList.map((p: any) => ({
            id: p.id,
            createdAt: new Date(p.createdAt).toLocaleString("ru-RU"),
            publisherName: p.publisherName || p.publisherId,
            amount: p.amount,
            currency: p.currency,
            payoutType: p.payoutType,
            transactionId: p.transactionId || "-",
          }));
          break;
        }
        
        case "publisher-payouts": {
          if (role !== "publisher") {
            return res.status(403).json({ message: "Access denied" });
          }
          
          const payoutsList = await storage.getPayoutsByPublisher(userId);
          rows = payoutsList.map((p: any) => ({
            id: p.id,
            createdAt: new Date(p.createdAt).toLocaleString("ru-RU"),
            amount: p.amount,
            currency: p.currency,
            payoutType: p.payoutType,
            transactionId: p.transactionId || "-",
          }));
          break;
        }
        
        case "postback-logs": {
          // Build filters for storage - move all filtering to SQL layer
          const logsFilters: { advertiserId?: string; publisherId?: string; direction?: string; limit?: number } = { limit: 10000 };
          
          if (role === "advertiser") {
            const effectiveAdvertiserId = getEffectiveAdvertiserId(req);
            if (effectiveAdvertiserId) logsFilters.advertiserId = effectiveAdvertiserId;
          } else if (role === "publisher") {
            logsFilters.publisherId = userId;
          }
          // Admin: no filters, gets all logs
          
          // Apply direction filter at SQL level
          if (direction && direction !== "all") {
            logsFilters.direction = direction as string;
          }
          
          let logs = await storage.getPostbackLogs(logsFilters);
          
          // Status filter for success/failed (uses 'success' boolean field, not 'status' string)
          if (status === "success") {
            logs = logs.filter((l: any) => l.success);
          } else if (status === "failed") {
            logs = logs.filter((l: any) => !l.success);
          }
          
          rows = logs.slice(0, 10000).map((l: any) => ({
            id: l.id,
            createdAt: new Date(l.createdAt).toLocaleString("ru-RU"),
            direction: l.direction === "inbound" ? "Входящий" : "Исходящий",
            url: l.url,
            method: l.method,
            responseCode: l.responseCode || "-",
            success: l.success ? "Да" : "Нет",
          }));
          break;
        }
        
        default:
          return res.status(400).json({ message: "Unknown dataset" });
      }
      
      const exportData = {
        title: datasetConfig.title,
        columns: datasetConfig.columns,
        rows,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      };
      
      const result = await generateExport(exportData, format);
      
      const filename = `${dataset}_${new Date().toISOString().split("T")[0]}.${result.extension}`;
      
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(result.buffer);
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // ============================================
  // PLATFORM API KEYS (Admin only)
  // ============================================
  const { generateApiKey } = await import("./middleware/platform-api-key");
  
  app.get("/api/admin/platform-api-keys", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const keys = await storage.getPlatformApiKeys();
      res.json(keys.map(k => ({
        ...k,
        keyHash: undefined,
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/platform-api-keys", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, permissions, expiresInDays } = req.body;
      
      if (!name || !permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ message: "Name and permissions are required" });
      }
      
      const { key, prefix, hash } = generateApiKey();
      
      let expiresAt: Date | null = null;
      if (expiresInDays && expiresInDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      }
      
      const apiKey = await storage.createPlatformApiKey({
        name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions,
        expiresAt,
        isActive: true,
      });
      
      res.json({
        ...apiKey,
        apiKey: key,
        keyHash: undefined,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/platform-api-keys/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, permissions, isActive } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const apiKey = await storage.updatePlatformApiKey(req.params.id, updateData);
      if (!apiKey) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json({
        ...apiKey,
        keyHash: undefined,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/platform-api-keys/:id/revoke", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const apiKey = await storage.revokePlatformApiKey(req.params.id);
      if (!apiKey) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json({ success: true, message: "API key revoked" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/platform-api-keys/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      await storage.deletePlatformApiKey(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/platform-api-keys/:id/logs", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getPlatformApiKeyUsageLogs(req.params.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // PLATFORM WEBHOOKS (Admin only)
  // ============================================
  app.get("/api/admin/platform-webhooks", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const webhooks = await storage.getPlatformWebhooks();
      res.json(webhooks.map(w => ({
        ...w,
        secret: w.secret ? "***" : null,
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/platform-webhooks", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, url, events, secret, headers, method } = req.body;
      
      if (!name || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ message: "Name, URL, and events are required" });
      }
      
      const webhook = await storage.createPlatformWebhook({
        name,
        url,
        events,
        secret: secret || null,
        headers: headers ? JSON.stringify(headers) : null,
        method: method || "POST",
        isActive: true,
      });
      
      res.json({
        ...webhook,
        secret: webhook.secret ? "***" : null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/platform-webhooks/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { name, url, events, secret, headers, method, isActive } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (events !== undefined) updateData.events = events;
      if (secret !== undefined) updateData.secret = secret;
      if (headers !== undefined) updateData.headers = typeof headers === "string" ? headers : JSON.stringify(headers);
      if (method !== undefined) updateData.method = method;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const webhook = await storage.updatePlatformWebhook(req.params.id, updateData);
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      
      res.json({
        ...webhook,
        secret: webhook.secret ? "***" : null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/platform-webhooks/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      await storage.deletePlatformWebhook(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/platform-webhooks/:id/logs", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getPlatformWebhookLogs(req.params.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/platform-webhooks/:id/test", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const webhook = await storage.getPlatformWebhook(req.params.id);
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      
      const testPayload = {
        event: "test",
        timestamp: new Date().toISOString(),
        data: { message: "This is a test webhook from PrimeTrack" },
      };
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (webhook.headers) {
        try {
          const customHeaders = JSON.parse(webhook.headers);
          Object.assign(headers, customHeaders);
        } catch (e) {}
      }
      
      if (webhook.secret) {
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(JSON.stringify(testPayload))
          .digest("hex");
        headers["X-Webhook-Signature"] = signature;
      }
      
      const response = await fetch(webhook.url, {
        method: webhook.method || "POST",
        headers,
        body: JSON.stringify(testPayload),
      });
      
      const responseText = await response.text();
      
      await storage.createPlatformWebhookLog({
        webhookId: webhook.id,
        eventType: "test",
        payload: JSON.stringify(testPayload),
        status: response.ok ? "success" : "failed",
        statusCode: response.status,
        response: responseText.substring(0, 1000),
        attemptNumber: 1,
      });
      
      res.json({
        success: response.ok,
        statusCode: response.status,
        response: responseText.substring(0, 500),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // REFERRAL SYSTEM ROUTES
  // ============================================
  
  // Advertiser: Get referral stats for all publishers
  app.get("/api/advertiser/referrals", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const stats = await storage.getAdvertiserReferralStats(advertiserId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Advertiser: Bulk update referral settings for all publishers (MUST be before :publisherId)
  app.patch("/api/advertiser/referrals/bulk", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("team"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const { referralEnabled, referralRate } = req.body;
      
      if (typeof referralEnabled !== "boolean") {
        return res.status(400).json({ message: "referralEnabled обязателен и должен быть boolean" });
      }
      if (referralRate === undefined || isNaN(parseFloat(referralRate)) || parseFloat(referralRate) < 0 || parseFloat(referralRate) > 100) {
        return res.status(400).json({ message: "referralRate обязателен и должен быть числом от 0 до 100" });
      }
      
      const count = await storage.bulkUpdateReferralSettings(advertiserId, {
        referralEnabled,
        referralRate: referralRate.toString()
      });
      
      res.json({ updated: count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Advertiser: Get referral financial stats (MUST be before :publisherId)
  app.get("/api/advertiser/referrals/stats", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const stats = await storage.getAdvertiserReferralFinancialStats(advertiserId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Advertiser: Update referral settings for a publisher
  app.patch("/api/advertiser/referrals/:publisherId", requireAuth, requireRole("advertiser"), requireStaffWriteAccess("team"), async (req: Request, res: Response) => {
    try {
      const advertiserId = getEffectiveAdvertiserId(req);
      if (!advertiserId) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const { publisherId } = req.params;
      const { referralEnabled, referralRate } = req.body;
      
      if (typeof referralEnabled !== "boolean" && referralEnabled !== undefined) {
        return res.status(400).json({ message: "referralEnabled должен быть boolean" });
      }
      if (referralRate !== undefined && (isNaN(parseFloat(referralRate)) || parseFloat(referralRate) < 0 || parseFloat(referralRate) > 100)) {
        return res.status(400).json({ message: "referralRate должен быть числом от 0 до 100" });
      }
      
      const updated = await storage.updatePublisherReferralSettings(publisherId, advertiserId, {
        referralEnabled,
        referralRate: referralRate?.toString()
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Партнёр не найден" });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Publisher: Get referral link and settings for specific advertiser
  app.get("/api/publisher/referrals/:advertiserId", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const publisherId = req.session.userId;
      if (!publisherId) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const { advertiserId } = req.params;
      
      const settings = await storage.getPublisherReferralSettings(publisherId, advertiserId);
      if (!settings || !settings.referralEnabled) {
        return res.json({ enabled: false });
      }
      
      let user = await storage.getUser(publisherId);
      let referralCode = user?.referralCode;
      
      // Генерируем уникальный реферальный код для партнёра если его нет
      if (!referralCode) {
        const crypto = await import("crypto");
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          const candidateCode = `PUB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
          
          try {
            const updated = await storage.updateUser(publisherId, { referralCode: candidateCode });
            if (updated) {
              referralCode = candidateCode;
              break;
            }
          } catch (dbError: any) {
            // Уникальное ограничение нарушено — пробуем другой код
            if (dbError?.code === "23505" || dbError?.message?.includes("unique")) {
              attempts++;
              continue;
            }
            throw dbError;
          }
          attempts++;
        }
        
        if (!referralCode) {
          return res.status(500).json({ message: "Не удалось сгенерировать уникальный код" });
        }
      }
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPL_SLUG 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`
          : "https://primetrack.io";
      // Формат: /register/:referralCode?adv=advertiserId для использования полной формы регистрации
      const referralLink = `${baseUrl}/register/${referralCode}?adv=${advertiserId}`;
      
      res.json({
        enabled: true,
        hasCode: true,
        referralCode,
        referralLink,
        referralRate: settings.referralRate
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Publisher: Get referral stats for specific advertiser
  app.get("/api/publisher/referrals/:advertiserId/stats", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const publisherId = req.session.userId;
      if (!publisherId) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const { advertiserId } = req.params;
      
      const settings = await storage.getPublisherReferralSettings(publisherId, advertiserId);
      if (!settings || !settings.referralEnabled) {
        return res.json({ enabled: false });
      }
      
      const stats = await storage.getReferralStats(publisherId, advertiserId);
      const referred = await storage.getReferredPublishers(publisherId, advertiserId);
      
      res.json({
        enabled: true,
        referralRate: settings.referralRate,
        totalReferred: stats.totalReferred,
        totalEarnings: stats.totalEarnings,
        referred: referred.map(u => ({
          id: u.id,
          username: u.username,
          createdAt: u.createdAt
        }))
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Publisher: Get referral earnings history
  app.get("/api/publisher/referrals/:advertiserId/earnings", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const publisherId = req.session.userId;
      if (!publisherId) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const { advertiserId } = req.params;
      
      const earnings = await storage.getReferralEarnings(publisherId, advertiserId);
      res.json(earnings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Publisher: Get all advertisers with referral programs (for menu)
  app.get("/api/publisher/referral-programs", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const publisherId = req.session.userId;
      if (!publisherId) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const advertisers = await storage.getAdvertisersForPublisher(publisherId);
      
      const programs = await Promise.all(
        advertisers
          .filter(a => a.status === "active")
          .map(async (a) => {
            const settings = await storage.getPublisherReferralSettings(publisherId, a.advertiserId);
            if (!settings?.referralEnabled) return null;
            
            const stats = await storage.getReferralStats(publisherId, a.advertiserId);
            return {
              advertiserId: a.advertiserId,
              advertiserName: a.advertiser.companyName || a.advertiser.username,
              referralRate: settings.referralRate,
              totalReferred: stats.totalReferred,
              totalEarnings: stats.totalEarnings
            };
          })
      );
      
      res.json(programs.filter(Boolean));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
