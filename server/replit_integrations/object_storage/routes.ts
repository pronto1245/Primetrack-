import type { Express } from "express";
import { isR2Configured, getR2UploadUrl } from "../../services/r2-storage";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
const IS_REPLIT = !!process.env.REPL_ID;

export function registerObjectStorageRoutes(app: Express): void {
  // Only load Replit Object Storage if we're on Replit
  let objectStorageService: any = null;
  if (IS_REPLIT) {
    const { ObjectStorageService } = require("./objectStorage");
    objectStorageService = new ObjectStorageService();
  }

  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      // Use R2 if configured (VPS/Koyeb)
      if (isR2Configured()) {
        const { uploadUrl, publicUrl } = await getR2UploadUrl(contentType);
        return res.json({
          uploadURL: uploadUrl,
          objectPath: publicUrl,
          metadata: { name, size, contentType },
        });
      }

      // Fallback to Replit Object Storage (only works on Replit)
      if (IS_REPLIT && objectStorageService) {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
        return res.json({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        });
      }

      return res.status(500).json({ error: "No storage backend configured. Set R2 credentials." });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      // If R2 is configured, redirect to R2 public URL
      if (isR2Configured() && R2_PUBLIC_URL) {
        const objectPath = req.params.objectPath;
        const r2Url = `${R2_PUBLIC_URL}/${objectPath}`;
        return res.redirect(301, r2Url);
      }

      // Fallback to Replit Object Storage (only works on Replit)
      if (IS_REPLIT && objectStorageService) {
        const { ObjectNotFoundError } = require("./objectStorage");
        try {
          const objectFile = await objectStorageService.getObjectEntityFile(req.path);
          await objectStorageService.downloadObject(objectFile, res);
          return;
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            return res.status(404).json({ error: "Object not found" });
          }
          throw error;
        }
      }

      return res.status(404).json({ error: "Object not found - storage not configured" });
    } catch (error) {
      console.error("Error serving object:", error);
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
