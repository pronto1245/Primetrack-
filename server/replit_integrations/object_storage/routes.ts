import type { Express } from "express";
import { isR2Configured, getR2UploadUrl, getR2PublicUrl } from "../../services/r2-storage";

export function registerObjectStorageRoutes(app: Express): void {
  // Lazy-load Replit Object Storage only when needed and available
  let objectStorageService: any = null;
  let objectStorageAttempted = false;

  async function getObjectStorageService() {
    if (objectStorageAttempted) return objectStorageService;
    objectStorageAttempted = true;
    
    // Only try to load if REPL_ID is set (means we're on Replit)
    if (process.env.REPL_ID) {
      try {
        const module = await import("./objectStorage");
        objectStorageService = new module.ObjectStorageService();
      } catch (e) {
        console.warn("[ObjectStorage] Failed to initialize Replit storage:", e);
      }
    }
    return objectStorageService;
  }

  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      // Priority 1: Use R2 if configured (VPS, Koyeb, production)
      if (isR2Configured()) {
        const { uploadUrl, publicUrl } = await getR2UploadUrl(contentType);
        return res.json({
          uploadURL: uploadUrl,
          objectPath: publicUrl,
          metadata: { name, size, contentType },
        });
      }

      // Priority 2: Fallback to Replit Object Storage (only on Replit)
      const service = await getObjectStorageService();
      if (service) {
        const uploadURL = await service.getObjectEntityUploadURL();
        const objectPath = service.normalizeObjectEntityPath(uploadURL);
        return res.json({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        });
      }

      return res.status(500).json({ 
        error: "No storage backend configured. Please configure R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL in environment." 
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectPath = req.params.objectPath;

      // Priority 1: Redirect to R2 public URL if configured
      const r2PublicUrl = getR2PublicUrl();
      if (isR2Configured() && r2PublicUrl) {
        // If it starts with uploads/, use it as is, otherwise prefix with uploads/
        const finalPath = objectPath.startsWith("uploads/") ? objectPath : `uploads/${objectPath}`;
        const r2Url = `${r2PublicUrl}/${finalPath}`;
        return res.redirect(301, r2Url);
      }

      // Priority 2: Try Replit Object Storage (only on Replit)
      const service = await getObjectStorageService();
      if (service) {
        try {
          const objectFile = await service.getObjectEntityFile(req.path);
          await service.downloadObject(objectFile, res);
          return;
        } catch (error: any) {
          if (error?.name === "ObjectNotFoundError") {
            return res.status(404).json({ error: "Object not found" });
          }
          throw error;
        }
      }

      // No storage configured
      console.error(`[ObjectStorage] Cannot serve ${objectPath} - no storage backend available`);
      return res.status(404).json({ error: "Object not found - storage not configured" });
    } catch (error) {
      console.error("Error serving object:", error);
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
