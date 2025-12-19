import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
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

  return httpServer;
}
