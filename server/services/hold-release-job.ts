import { storage } from "../storage";
import { postbackSender } from "./postback-sender";

class HoldReleaseJob {
  private interval: NodeJS.Timeout | null = null;
  
  start(intervalMs: number = 60000) {
    if (this.interval) {
      return;
    }
    
    console.log(`[HoldReleaseJob] Starting with interval ${intervalMs}ms`);
    
    this.interval = setInterval(() => {
      this.run().catch(error => {
        console.error("[HoldReleaseJob] Error processing held conversions:", error);
      });
    }, intervalMs);
    
    this.run().catch(error => {
      console.error("[HoldReleaseJob] Initial run error:", error);
    });
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("[HoldReleaseJob] Stopped");
    }
  }
  
  async run(): Promise<number> {
    const releasedIds = await storage.processHoldConversions();
    
    if (releasedIds.length > 0) {
      console.log(`[HoldReleaseJob] Released ${releasedIds.length} conversions from hold`);
      
      for (const conversionId of releasedIds) {
        postbackSender.sendPostback(conversionId).catch(err => {
          console.error(`[HoldReleaseJob] Postback failed for ${conversionId}:`, err);
        });
      }
    }
    
    return releasedIds.length;
  }
}

export const holdReleaseJob = new HoldReleaseJob();
