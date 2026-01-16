import crypto from "crypto";
import { storage } from "../storage";
import type { PlatformWebhook } from "@shared/schema";

export type PlatformWebhookEvent =
  | "conversion.created"
  | "conversion.approved"
  | "conversion.rejected"
  | "payout.requested"
  | "payout.approved"
  | "payout.completed"
  | "partner.registered"
  | "partner.activated"
  | "offer.created"
  | "offer.updated";

class PlatformWebhookService {
  private readonly maxRetries = 3;
  private readonly retryDelays = [5000, 30000, 120000]; // 5s, 30s, 2min

  async trigger(event: PlatformWebhookEvent, data: Record<string, any>): Promise<void> {
    try {
      const webhooks = await storage.getPlatformWebhooks();
      const activeWebhooks = webhooks.filter(
        (w) => w.isActive && w.events.includes(event)
      );

      if (activeWebhooks.length === 0) {
        return;
      }

      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      await Promise.allSettled(
        activeWebhooks.map((webhook) => this.sendWebhook(webhook, event, payload))
      );
    } catch (error) {
      console.error(`[PlatformWebhook] Failed to trigger ${event}:`, error);
    }
  }

  private async sendWebhook(
    webhook: PlatformWebhook,
    event: string,
    payload: Record<string, any>,
    attemptNumber: number = 1
  ): Promise<void> {
    const payloadStr = JSON.stringify(payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event,
      "X-Webhook-Timestamp": payload.timestamp,
    };

    if (webhook.headers) {
      try {
        const customHeaders = JSON.parse(webhook.headers);
        Object.assign(headers, customHeaders);
      } catch (e) {
        console.warn(`[PlatformWebhook] Invalid custom headers for webhook ${webhook.id}`);
      }
    }

    if (webhook.secret) {
      const signature = crypto
        .createHmac("sha256", webhook.secret)
        .update(payloadStr)
        .digest("hex");
      headers["X-Webhook-Signature"] = signature;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: webhook.method || "POST",
        headers,
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text().catch(() => "");

      await storage.createPlatformWebhookLog({
        webhookId: webhook.id,
        eventType: event,
        payload: payloadStr,
        status: response.ok ? "success" : "failed",
        statusCode: response.status,
        response: responseText.substring(0, 1000),
        attemptNumber,
      });

      if (response.ok) {
        await storage.updatePlatformWebhook(webhook.id, {
          lastTriggeredAt: new Date(),
          failedAttempts: 0,
          lastError: null,
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      
      await storage.createPlatformWebhookLog({
        webhookId: webhook.id,
        eventType: event,
        payload: payloadStr,
        status: "failed",
        statusCode: null,
        response: errorMessage,
        attemptNumber,
        nextRetryAt: attemptNumber < this.maxRetries
          ? new Date(Date.now() + this.retryDelays[attemptNumber - 1])
          : null,
      });

      const currentWebhook = await storage.getPlatformWebhook(webhook.id);
      await storage.updatePlatformWebhook(webhook.id, {
        failedAttempts: (currentWebhook?.failedAttempts || 0) + 1,
        lastError: errorMessage,
      });

      if (attemptNumber < this.maxRetries) {
        setTimeout(() => {
          this.sendWebhook(webhook, event, payload, attemptNumber + 1);
        }, this.retryDelays[attemptNumber - 1]);
      }
    }
  }
}

export const platformWebhookService = new PlatformWebhookService();
