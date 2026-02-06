import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { postbackSender } from "./services/postback-sender";
import { holdReleaseJob } from "./services/hold-release-job";
import { capsResetService } from "./services/caps-reset-service";
import { aggregationService } from "./services/aggregation-service";
import { db } from "../db";
import { sql } from "drizzle-orm";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  // CRITICAL: Register routes FIRST (includes session middleware)
  // before any middleware that overrides res.json/res.end
  await registerRoutes(httpServer, app);
  
  // Logging middleware AFTER session - so it doesn't intercept Set-Cookie
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });
  
  // Initialize short IDs (create sequences and backfill if needed)
  await storage.initializeShortIds();
  
  // Seed default subscription plans if not exists
  await storage.seedSubscriptionPlans();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) {
      return;
    }
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[error] ${status}: ${message}`, err.stack || '');
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start hold release job (every 5 minutes)
      holdReleaseJob.start(5 * 60 * 1000);
      
      // Start caps reset service
      capsResetService.start();
      
      // Start daily stats aggregation (run yesterday's aggregation on startup, then every hour)
      aggregationService.runDailyAggregation().then(result => {
        if (result.errors.length === 0) {
          log(`Daily stats aggregation completed: ${result.rowsUpserted} rows`, "aggregation");
        } else {
          log(`Daily stats aggregation errors: ${result.errors.join(", ")}`, "aggregation");
        }
      });
      setInterval(() => {
        aggregationService.runDailyAggregation().then(result => {
          if (result.errors.length === 0 && result.rowsUpserted > 0) {
            log(`Hourly aggregation: ${result.rowsUpserted} rows updated`, "aggregation");
          }
        });
      }, 60 * 60 * 1000); // Every hour
      
      // Crypto payout providers are now per-advertiser (encrypted keys in DB)
      log(`Crypto payout service ready (per-advertiser keys)`, "crypto");
    },
  );
})();
