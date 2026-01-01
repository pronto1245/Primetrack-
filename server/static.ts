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
  // BUT skip API routes and click tracking routes
  app.get("*", (req: Request, res: Response) => {
    const path_lower = req.path.toLowerCase();
    
    // Don't serve index.html for tracking/API routes - let them 404 properly
    if (path_lower.startsWith('/api/') || 
        path_lower.startsWith('/click') || 
        path_lower.startsWith('/objects/')) {
      return res.status(404).json({ error: "Not found" });
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
