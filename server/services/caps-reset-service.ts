import { storage } from "../storage";

export class CapsResetService {
  private dailyResetInterval: NodeJS.Timeout | null = null;
  private lastDailyReset: string = "";
  private lastMonthlyReset: string = "";

  start() {
    this.checkAndReset();
    this.dailyResetInterval = setInterval(() => {
      this.checkAndReset();
    }, 60 * 1000);
    console.log("[CapsResetService] Started, checking every minute");
  }

  stop() {
    if (this.dailyResetInterval) {
      clearInterval(this.dailyResetInterval);
      this.dailyResetInterval = null;
    }
  }

  private async checkAndReset() {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const yearMonth = today.substring(0, 7);
    
    if (this.lastDailyReset !== today) {
      await this.resetDailyStats(today);
      this.lastDailyReset = today;
    }
    
    if (this.lastMonthlyReset !== yearMonth) {
      await this.resetMonthlyStats(yearMonth);
      this.lastMonthlyReset = yearMonth;
    }
  }

  private async resetDailyStats(today: string) {
    try {
      console.log(`[CapsResetService] Checking daily reset for ${today}`);
    } catch (error) {
      console.error("[CapsResetService] Daily reset error:", error);
    }
  }

  private async resetMonthlyStats(yearMonth: string) {
    try {
      console.log(`[CapsResetService] New month detected: ${yearMonth}`);
    } catch (error) {
      console.error("[CapsResetService] Monthly reset error:", error);
    }
  }

  async getCapsStatus(offerId: string) {
    return storage.checkOfferCaps(offerId);
  }
}

export const capsResetService = new CapsResetService();
