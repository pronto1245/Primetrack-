import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  // BUT skip API routes and click tracking routes - let them pass through
  app.get("*", (req: Request, res: Response, next: Function) => {
    const path_lower = req.path.toLowerCase();
    
    // Skip SPA handling for tracking/API/objects routes - pass to next handler
    if (path_lower.startsWith('/api/') || 
        path_lower.startsWith('/click') || 
        path_lower.startsWith('/objects/') ||
        path_lower.startsWith('/postback')) {
      return next();
    }
    
    // Custom domain tracking paths: /{offerId}/{landingId} (e.g., /0001/0002)
    // These are numeric short IDs used for tracking on custom domains
    const segments = req.path.split('/').filter(Boolean);
    if (segments.length === 2 && /^\d+$/.test(segments[0]) && /^\d+$/.test(segments[1])) {
      return next();
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
