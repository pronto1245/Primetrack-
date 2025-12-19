import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertOfferSchema, insertOfferLandingSchema, insertClickSchema, insertConversionSchema } from "@shared/schema";
import crypto from "crypto";
import session from "express-session";
import MemoryStore from "memorystore";

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
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  await seedUsers();

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
      email: user.email 
    });
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

  // OFFERS API
  // Получить офферы текущего advertiser
  app.get("/api/offers", requireAuth, requireRole("advertiser", "admin"), async (req: Request, res: Response) => {
    try {
      const offers = await storage.getOffersByAdvertiser(req.session.userId!);
      res.json(offers);
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
      
      const landings = await storage.getOfferLandings(offer.id);
      
      // Для publisher скрываем internalCost
      if (req.session.role === "publisher") {
        const { internalCost, ...safeOffer } = offer;
        const safeLandings = landings.map(({ internalCost, ...rest }) => rest);
        return res.json({ ...safeOffer, landings: safeLandings });
      }
      
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

  // MARKETPLACE API - все активные офферы для publishers (без internalCost)
  app.get("/api/marketplace", requireAuth, async (req: Request, res: Response) => {
    try {
      const offers = await storage.getActiveOffers();
      
      // Получаем лендинги для каждого оффера и скрываем internalCost
      const offersWithLandings = await Promise.all(
        offers.map(async (offer) => {
          const landings = await storage.getOfferLandings(offer.id);
          const { internalCost, ...safeOffer } = offer;
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
        payout: payout || "0",
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
      const totalEarnings = conversions.reduce((sum, c) => sum + parseFloat(c.payout), 0);
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
        totalSpent += convs.reduce((sum, c) => sum + parseFloat(c.payout), 0);
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

  return httpServer;
}
