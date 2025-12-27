import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertOfferSchema, insertOfferLandingSchema, insertClickSchema, insertConversionSchema, insertOfferAccessRequestSchema } from "@shared/schema";
import crypto from "crypto";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { ClickHandler } from "./services/click-handler";
import { Orchestrator } from "./services/orchestrator";

const clickHandler = new ClickHandler();
const orchestrator = new Orchestrator();

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
  }
}

const SessionStore = MemoryStore(session);

async function setupAuth(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "affiliate-tracker-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000,
      }),
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );
}

async function seedUsers() {
  const testUsers = [
    { username: "admin", password: "admin123", role: "admin", email: "admin@primetrack.io" },
    { username: "advertiser", password: "adv123", role: "advertiser", email: "advertiser@primetrack.io" },
    { username: "publisher", password: "pub123", role: "publisher", email: "publisher@primetrack.io" },
  ];

  for (const userData of testUsers) {
    const existing = await storage.getUserByUsername(userData.username);
    if (!existing) {
      await storage.createUser(userData);
      console.log(`Created test user: ${userData.username}`);
    }
  }

  // Seed additional test advertisers with offers
  const testAdvertisers = [
    { username: "adv_casino", password: "adv123", role: "advertiser", email: "casino@primetrack.io", status: "active" },
    { username: "adv_crypto", password: "adv123", role: "advertiser", email: "crypto@primetrack.io", status: "active" },
    { username: "adv_dating", password: "adv123", role: "advertiser", email: "dating@primetrack.io", status: "active" },
    { username: "adv_nutra", password: "adv123", role: "advertiser", email: "nutra@primetrack.io", status: "pending" },
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  await seedUsers();
  registerObjectStorageRoutes(app);

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await storage.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.role = user.role;

      res.json({ 
        id: user.id, 
        username: user.username, 
        role: user.role,
        email: user.email 
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
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
      referralCode: user.referralCode
    });
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, email, referralCode } = req.body;

      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, password and email are required" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      let advertiserId: string | null = null;
      if (referralCode) {
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

  app.get("/api/auth/validate-referral/:code", async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const advertiser = await storage.getUserByReferralCode(code);
      
      if (!advertiser || advertiser.role !== "advertiser") {
        return res.status(404).json({ valid: false, message: "Invalid referral code" });
      }

      res.json({
        valid: true,
        advertiserName: advertiser.username,
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

  // OFFERS API
  // Получить офферы текущего advertiser
  app.get("/api/offers", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const offers = await storage.getOffersByAdvertiser(req.session.userId!);
      const offersWithLandings = await Promise.all(
        offers.map(async (offer) => {
          const landings = await storage.getOfferLandings(offer.id);
          return { ...offer, landings };
        })
      );
      res.json(offersWithLandings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // Создать оффер с лендингами
  app.post("/api/offers", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const { landings, ...offerData } = req.body;
      
      const result = insertOfferSchema.safeParse({
        ...offerData,
        advertiserId: req.session.userId,
      });

      if (!result.success) {
        return res.status(400).json({ message: "Invalid offer data", errors: result.error.issues });
      }

      const offer = await storage.createOffer(result.data);
      
      // Create landings if provided
      if (landings && Array.isArray(landings)) {
        for (const landing of landings) {
          await storage.createOfferLanding({
            ...landing,
            offerId: offer.id,
          });
        }
      }

      const createdLandings = await storage.getOfferLandings(offer.id);
      res.status(201).json({ ...offer, landings: createdLandings });
    } catch (error) {
      console.error("Create offer error:", error);
      res.status(500).json({ message: "Failed to create offer" });
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
          // Без доступа - возвращаем оффер БЕЗ лендингов
          return res.json({ ...safeOffer, landings: [], hasAccess: false, accessStatus });
        }
        
        // С доступом - показываем лендинги (без internalCost)
        const landings = await storage.getOfferLandings(offer.id);
        const safeLandings = landings.map(({ internalCost, ...rest }) => rest);
        return res.json({ ...safeOffer, landings: safeLandings, hasAccess: true, accessStatus: 'approved' });
      }
      
      // Для advertiser/admin - полная информация
      const landings = await storage.getOfferLandings(offer.id);
      res.json({ ...offer, landings });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offer" });
    }
  });

  // Обновить оффер
  app.put("/api/offers/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      if (offer.advertiserId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateOffer(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  // MARKETPLACE API - все активные офферы для publishers (без internalCost и landingUrl до одобрения)
  app.get("/api/marketplace", requireAuth, async (req: Request, res: Response) => {
    try {
      const offers = await storage.getActiveOffers();
      const isPublisher = req.session.role === "publisher";
      const publisherId = req.session.userId!;
      
      const offersWithLandings = await Promise.all(
        offers.map(async (offer) => {
          const { internalCost, ...safeOffer } = offer;
          
          // Для publisher проверяем доступ к офферу
          if (isPublisher) {
            const hasAccess = await storage.hasPublisherAccessToOffer(offer.id, publisherId);
            if (!hasAccess) {
              // Без доступа - НЕ показываем landing URLs
              return { ...safeOffer, landings: [] };
            }
          }
          
          // С доступом или для advertiser/admin - показываем лендинги
          const landings = await storage.getOfferLandings(offer.id);
          const safeLandings = landings.map(({ internalCost, ...rest }) => rest);
          return { ...safeOffer, landings: safeLandings };
        })
      );
      
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
      const { clickId, payout } = req.body;
      
      if (!clickId) {
        return res.status(400).json({ message: "clickId is required" });
      }

      const click = await storage.getClickByClickId(clickId);
      if (!click) {
        return res.status(404).json({ message: "Click not found" });
      }

      const result = insertConversionSchema.safeParse({
        clickId: click.id,
        offerId: click.offerId,
        publisherId: click.publisherId,
        advertiserCost: payout || "0",
        publisherPayout: payout || "0",
        conversionType: "lead",
        status: "pending",
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

  // Статистика для advertiser
  app.get("/api/stats/advertiser", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const offers = await storage.getOffersByAdvertiser(req.session.userId!);
      
      let totalClicks = 0;
      let totalConversions = 0;
      let totalSpent = 0;

      for (const offer of offers) {
        const clicks = await storage.getClicksByOffer(offer.id);
        const convs = await storage.getConversionsByOffer(offer.id);
        totalClicks += clicks.length;
        totalConversions += convs.length;
        totalSpent += convs.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      }

      const cr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      res.json({
        totalOffers: offers.length,
        totalClicks,
        totalConversions,
        totalSpent,
        cr: cr.toFixed(2),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ============================================
  // MINI-TRACKER ENDPOINTS
  // ============================================

  // Click tracking endpoint (public, no auth required)
  // Usage: /api/click?offer_id=XXX&partner_id=YYY&sub1=...&sub2=...
  app.get("/api/click", async (req: Request, res: Response) => {
    try {
      const { offer_id, partner_id, sub1, sub2, sub3, sub4, sub5 } = req.query;

      if (!offer_id || !partner_id) {
        return res.status(400).json({ 
          error: "Missing required parameters", 
          required: ["offer_id", "partner_id"] 
        });
      }

      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                 req.socket.remoteAddress || 
                 "unknown";
      const userAgent = req.headers["user-agent"] || "";
      const referer = req.headers["referer"] || "";

      const result = await clickHandler.processClick({
        offerId: offer_id as string,
        partnerId: partner_id as string,
        sub1: sub1 as string,
        sub2: sub2 as string,
        sub3: sub3 as string,
        sub4: sub4 as string,
        sub5: sub5 as string,
        ip,
        userAgent,
        referer,
      });

      if (result.isBlocked) {
        if (result.capReached) {
          return res.status(410).json({ 
            error: "Offer cap reached", 
            reason: "cap_exceeded"
          });
        }
        return res.status(403).json({ 
          error: "Traffic blocked", 
          reason: "fraud_detected",
          fraudScore: result.fraudScore 
        });
      }

      res.redirect(302, result.redirectUrl);
    } catch (error: any) {
      console.error("Click handler error:", error);
      res.status(400).json({ 
        error: error.message || "Failed to process click" 
      });
    }
  });

  // Postback endpoint (public, called by advertiser systems)
  // Usage: /api/postback?click_id=XXX&status=lead|sale|install&sum=123.45&external_id=YYY
  app.get("/api/postback", async (req: Request, res: Response) => {
    try {
      const { click_id, status, sum, external_id } = req.query;

      if (!click_id) {
        return res.status(400).json({ 
          error: "Missing required parameter: click_id" 
        });
      }

      const validStatuses = ["lead", "sale", "install"];
      const conversionStatus = (status as string)?.toLowerCase() || "lead";
      
      if (!validStatuses.includes(conversionStatus)) {
        return res.status(400).json({ 
          error: "Invalid status", 
          validStatuses 
        });
      }

      const result = await orchestrator.processConversion({
        clickId: click_id as string,
        status: conversionStatus as "lead" | "sale" | "install",
        sum: sum ? parseFloat(sum as string) : undefined,
        externalId: external_id as string,
      });

      res.json({
        success: true,
        conversionId: result.id,
        clickId: result.clickId,
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
            const landings = await storage.getOfferLandings(offer.id);
            const safeLandings = landings.map(({ internalCost, ...rest }) => rest);
            return { 
              ...safeOffer, 
              landings: safeLandings,
              accessStatus: "approved" as const,
              hasAccess: true,
              partnershipStatus
            };
          }
          
          return { 
            ...safeOffer, 
            landings: [],
            accessStatus: existingRequest?.status || null,
            hasAccess: false,
            partnershipStatus
          };
        })
      );
      
      // Filter out null values (offers from non-active partnerships)
      res.json(offersWithAccess.filter(o => o !== null));
    } catch (error) {
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

      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to create access request" });
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
          
          return {
            id: advertiser.id,
            username: advertiser.username,
            email: advertiser.email,
            offersCount,
            status: rel.status as "active" | "pending" | "inactive" | "rejected",
            logoUrl: (advertiser as any).logoUrl || null,
            telegram: (advertiser as any).telegram || null,
            phone: (advertiser as any).phone || null,
            companyName: (advertiser as any).companyName || null,
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
      const publisherOffers = await storage.getPublisherOffersByPublisher(req.session.userId!);
      
      const offersWithDetails = await Promise.all(
        publisherOffers.map(async (po) => {
          const offer = await storage.getOffer(po.offerId);
          if (!offer) return null;
          
          const landings = await storage.getOfferLandings(offer.id);
          const { internalCost, ...safeOffer } = offer;
          const safeLandings = landings.map(({ internalCost, ...rest }) => rest);
          
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
      const publisherOffers = await storage.getPublisherOffersByPublisher(req.session.userId!);
      
      const offersWithDetails = await Promise.all(
        publisherOffers.map(async (po) => {
          const offer = await storage.getOffer(po.offerId);
          if (!offer) return null;
          
          // Filter by advertiser if specified
          if (advertiser_id && offer.advertiserId !== advertiser_id) return null;
          
          const landings = await storage.getOfferLandings(offer.id);
          
          return { 
            id: offer.id,
            name: offer.name,
            category: offer.category,
            payoutModel: offer.payoutModel,
            landings: landings.map(l => ({
              id: l.id,
              offerId: l.offerId,
              geo: l.geo,
              landingName: l.landingName,
              landingUrl: l.landingUrl,
              partnerPayout: l.partnerPayout,
              currency: l.currency,
            })),
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
      const advertiserId = req.session.userId!;
      
      // Get global settings from advertiser_settings
      const advertiserSettings = await storage.getAdvertiserSettings(advertiserId);
      
      // Get per-offer postback settings
      const offerSettings = await storage.getOfferPostbackSettingsByAdvertiser(advertiserId);
      
      // Get postback logs
      const logs = await storage.getPostbackLogs({ limit: 50 });
      
      res.json({
        globalSettings: advertiserSettings ? {
          postbackUrl: advertiserSettings.postbackUrl,
          postbackMethod: advertiserSettings.postbackMethod,
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
      const advertiserId = req.session.userId!;
      const { postbackUrl, postbackMethod } = req.body;
      
      const existing = await storage.getAdvertiserSettings(advertiserId);
      
      if (existing) {
        const updated = await storage.updateAdvertiserSettings(advertiserId, {
          postbackUrl,
          postbackMethod,
        });
        res.json(updated);
      } else {
        const created = await storage.createAdvertiserSettings({
          advertiserId,
          postbackUrl,
          postbackMethod,
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
      const advertiserId = req.session.userId!;
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
      const advertiserId = req.session.userId!;
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
      const advertiserId = req.session.userId!;
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

  // Test postback URL
  app.post("/api/advertiser/postbacks/test", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
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
      const requests = await storage.getAccessRequestsByAdvertiser(req.session.userId!);
      
      const safeRequests = requests.map(r => ({
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
        },
      }));
      
      res.json(safeRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch access requests" });
    }
  });

  // Advertiser approves or rejects access request
  app.put("/api/advertiser/access-requests/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const requestId = req.params.id;
      const { action, rejectionReason } = req.body;

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

      const offer = await storage.getOffer(request.offerId);
      if (!offer || offer.advertiserId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (action === "approve") {
        await storage.updateOfferAccessRequest(requestId, { status: "approved" });
        
        await storage.createPublisherOffer({
          offerId: request.offerId,
          publisherId: request.publisherId,
        });
        
        res.json({ message: "Access request approved" });
      } else if (action === "revoke") {
        await storage.deletePublisherOffer(request.offerId, request.publisherId);
        await storage.updateOfferAccessRequest(requestId, { status: "revoked" });
        
        res.json({ message: "Access revoked" });
      } else {
        await storage.updateOfferAccessRequest(requestId, { 
          status: "rejected",
          rejectionReason: rejectionReason || null,
        });
        
        res.json({ message: "Access request rejected" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to process access request" });
    }
  });

  // Get publishers with access to a specific offer (for advertiser)
  app.get("/api/offers/:id/publishers", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      if (offer.advertiserId !== req.session.userId) {
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
      const { dateFrom, dateTo, offerIds, publisherIds, geo, status } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (publisherIds) filters.publisherIds = (publisherIds as string).split(',');
      if (geo) filters.geo = (geo as string).split(',');
      if (status) filters.status = (status as string).split(',');

      const stats = await storage.getAdvertiserStats(req.session.userId!, filters);
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
      const { status } = req.query;
      const relations = await storage.getPublisherAdvertiserRelations(
        req.session.userId!, 
        status as string | undefined
      );
      
      // Get stats for each publisher
      const result = await Promise.all(relations.map(async (rel) => {
        const stats = await storage.getPublisherStatsForAdvertiser(rel.publisherId, req.session.userId!);
        return {
          id: rel.id,
          publisherId: rel.publisherId,
          username: rel.publisher.username,
          email: rel.publisher.email,
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
  app.put("/api/advertiser/partners/:id/status", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
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

  // Get/Generate registration link for advertiser
  app.get("/api/advertiser/registration-link", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      let referralCode = await storage.getAdvertiserReferralCode(req.session.userId!);
      
      if (!referralCode) {
        // Generate a new referral code
        referralCode = `ref_${req.session.userId!.slice(0, 8)}_${Date.now().toString(36)}`;
        await storage.setAdvertiserReferralCode(req.session.userId!, referralCode);
      }
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
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
      res.json(publishers.map(p => ({ id: p.id, username: p.username, email: p.email })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publishers" });
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
      
      const safeClicks = clicks.map(c => ({
        id: c.id,
        clickId: c.clickId,
        offerId: c.offerId,
        offerName: c.offer.name,
        publisherId: c.publisherId,
        publisherName: c.publisher.username,
        ip: c.ip,
        geo: c.geo,
        userAgent: c.userAgent,
        sub1: c.sub1,
        sub2: c.sub2,
        sub3: c.sub3,
        createdAt: c.createdAt,
      }));
      
      res.json(safeClicks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clicks" });
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
      const todayStats = await storage.getOfferCapsStats(id, today);
      const totalConversions = await storage.getOfferTotalConversions(id);
      
      res.json({
        dailyCap: offer.dailyCap,
        totalCap: offer.totalCap,
        capReachedAction: offer.capReachedAction,
        capRedirectUrl: offer.capRedirectUrl,
        dailyConversions: todayStats?.dailyConversions || 0,
        totalConversions,
        dailyCapReached: capsCheck.dailyCapReached,
        totalCapReached: capsCheck.totalCapReached
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offer caps" });
    }
  });

  // Update offer caps
  app.put("/api/offers/:id/caps", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { dailyCap, totalCap, capReachedAction, capRedirectUrl } = req.body;
      
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

  // Publisher clicks (NO antifraud data)
  app.get("/api/publisher/clicks", requireAuth, requireRole("publisher"), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, offerIds, geo } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (offerIds) filters.offerIds = (offerIds as string).split(',');
      if (geo) filters.geo = (geo as string).split(',');

      const clicks = await storage.getClicksForPublisher(req.session.userId!, filters);
      res.json(clicks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clicks" });
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
        groupBy, // date, geo, publisher, offer, device, os, browser, sub1-5
        page = "1",
        limit = "50"
      } = req.query;

      const filters: any = {};
      
      // Role-based access control
      if (role === "publisher") {
        filters.publisherId = userId;
        // Publisher gets their own advertiser from session or default
      } else if (role === "advertiser") {
        // Advertiser sees only clicks on their offers
        const advertiserOffers = await storage.getOffersByAdvertiser(userId);
        filters.offerIds = advertiserOffers.map(o => o.id);
      }
      // Admin sees everything

      if (offerId) filters.offerId = offerId as string;
      if (publisherId && role !== "publisher") filters.publisherId = publisherId as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
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

      const result = await storage.getClicksReport(filters, groupBy as string, pageNum, limitNum);
      
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
        dateFrom,
        dateTo,
        status,
        conversionType,
        groupBy,
        page = "1",
        limit = "50"
      } = req.query;

      const filters: any = {};
      
      if (role === "publisher") {
        filters.publisherId = userId;
      } else if (role === "advertiser") {
        const advertiserOffers = await storage.getOffersByAdvertiser(userId);
        filters.offerIds = advertiserOffers.map(o => o.id);
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
        dateFrom,
        dateTo,
        groupBy = "date" // date, geo, publisher, offer, device, os, browser, sub1-5
      } = req.query;

      const filters: any = {};
      
      if (role === "publisher") {
        filters.publisherId = userId;
      } else if (role === "advertiser") {
        const advertiserOffers = await storage.getOffersByAdvertiser(userId);
        filters.offerIds = advertiserOffers.map(o => o.id);
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
      const userId = req.session.userId!;
      const methods = await storage.getPaymentMethodsByAdvertiser(userId);
      res.json(methods);
    } catch (error: any) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });
  
  // Create payment method
  app.post("/api/advertiser/payment-methods", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { methodType, methodName, currency, minPayout, maxPayout, feePercent, feeFixed, instructions } = req.body;
      
      if (!methodType || !methodName || !currency) {
        return res.status(400).json({ message: "methodType, methodName, and currency are required" });
      }
      
      const method = await storage.createPaymentMethod({
        advertiserId: userId,
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
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const existing = await storage.getPaymentMethod(id);
      if (!existing || existing.advertiserId !== userId) {
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
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const existing = await storage.getPaymentMethod(id);
      if (!existing || existing.advertiserId !== userId) {
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
  app.put("/api/advertiser/payout-requests/:id", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
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
      res.json(payoutsList);
    } catch (error: any) {
      console.error("Get payouts error:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });
  
  // Advertiser: Create bonus payout
  app.post("/api/advertiser/payouts/bonus", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
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
  app.post("/api/advertiser/mass-payout", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
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
  app.post("/api/advertiser/payouts/bulk", requireAuth, requireRole("advertiser"), async (req: Request, res: Response) => {
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

  return httpServer;
}
