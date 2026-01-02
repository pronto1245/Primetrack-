import crypto from "crypto";
import { storage } from "../storage";
import type { WebhookEndpoint, InsertWebhookLog } from "@shared/schema";
import { HttpClient, ExternalApiError, RawResponse } from "../lib/http-client";

export type WebhookEventType = "click" | "lead" | "sale" | "install" | "rejected" | "hold_released" | "payout_approved" | "payout_paid";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
}

class WebhookService {
  private maxRetries = 5;
  private retryDelays = [60, 300, 900, 3600, 7200]; // seconds: 1m, 5m, 15m, 1h, 2h

  async triggerEvent(
    advertiserId: string,
    eventType: WebhookEventType,
    data: Record<string, any>,
    offerId?: string,
    publisherId?: string
  ): Promise<void> {
    const endpoints = await storage.getWebhookEndpointsByAdvertiser(advertiserId);
    
    const matchingEndpoints = endpoints.filter(endpoint => {
      if (!endpoint.isActive) return false;
      if (!endpoint.events.includes(eventType)) return false;
      
      if (offerId && endpoint.offerIds && endpoint.offerIds.length > 0) {
        if (!endpoint.offerIds.includes(offerId)) return false;
      }
      
      if (publisherId && endpoint.publisherIds && endpoint.publisherIds.length > 0) {
        if (!endpoint.publisherIds.includes(publisherId)) return false;
      }
      
      return true;
    });

    for (const endpoint of matchingEndpoints) {
      this.sendWebhook(endpoint, eventType, data).catch(console.error);
    }
  }

  private async sendWebhook(
    endpoint: WebhookEndpoint,
    eventType: WebhookEventType,
    data: Record<string, any>,
    attemptNumber: number = 1
  ): Promise<boolean> {
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": eventType,
      "X-Webhook-Timestamp": payload.timestamp,
    };

    if (endpoint.secret) {
      const signature = this.generateSignature(payloadString, endpoint.secret);
      headers["X-Webhook-Signature"] = signature;
    }

    if (endpoint.headers) {
      try {
        const customHeaders = JSON.parse(endpoint.headers);
        Object.assign(headers, customHeaders);
      } catch {}
    }

    const logData: InsertWebhookLog = {
      webhookEndpointId: endpoint.id,
      advertiserId: endpoint.advertiserId,
      eventType,
      payload: payloadString,
      status: "pending",
      attemptNumber,
    };

    try {
      const client = new HttpClient(`Webhook:${endpoint.id.substring(0, 8)}`, {
        timeout: 30000,
        retries: 0,
      });

      const response = await client.requestRaw(endpoint.url, {
        method: (endpoint.method || "POST") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
        rawBody: payloadString,
        headers,
      });

      logData.statusCode = response.statusCode;
      logData.response = response.body;

      if (response.ok) {
        logData.status = "success";
        await storage.createWebhookLog(logData);
        await storage.updateWebhookEndpoint(endpoint.id, {
          lastTriggeredAt: new Date(),
          failedAttempts: 0,
          lastError: null,
        });
        return true;
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.body?.substring(0, 200)}`);
      }
    } catch (error: any) {
      if (error instanceof ExternalApiError) {
        logData.statusCode = error.statusCode;
      }
      logData.status = "failed";
      logData.response = error.message;

      if (attemptNumber < this.maxRetries) {
        const delay = this.retryDelays[attemptNumber - 1] || 3600;
        logData.nextRetryAt = new Date(Date.now() + delay * 1000);
      }

      await storage.createWebhookLog(logData);
      await storage.updateWebhookEndpoint(endpoint.id, {
        lastError: error.message,
        failedAttempts: (endpoint.failedAttempts || 0) + 1,
      });

      if (attemptNumber < this.maxRetries) {
        const delay = this.retryDelays[attemptNumber - 1] || 3600;
        setTimeout(() => {
          this.sendWebhook(endpoint, eventType, data, attemptNumber + 1);
        }, delay * 1000);
      }

      return false;
    }
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
  }

  generateSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async notifyClick(
    advertiserId: string,
    clickId: string,
    offerId: string,
    publisherId: string,
    data: {
      ip?: string;
      country?: string;
      userAgent?: string;
      landingUrl?: string;
      subId?: string;
    }
  ): Promise<void> {
    await this.triggerEvent(advertiserId, "click", {
      clickId,
      offerId,
      publisherId,
      ...data,
    }, offerId, publisherId);
  }

  async notifyLead(
    advertiserId: string,
    conversionId: string,
    offerId: string,
    publisherId: string,
    data: {
      clickId?: string;
      payout?: number;
      revenue?: number;
      country?: string;
      subId?: string;
    }
  ): Promise<void> {
    await this.triggerEvent(advertiserId, "lead", {
      conversionId,
      offerId,
      publisherId,
      ...data,
    }, offerId, publisherId);
  }

  async notifySale(
    advertiserId: string,
    conversionId: string,
    offerId: string,
    publisherId: string,
    data: {
      clickId?: string;
      amount?: number;
      payout?: number;
      revenue?: number;
      currency?: string;
      orderId?: string;
    }
  ): Promise<void> {
    await this.triggerEvent(advertiserId, "sale", {
      conversionId,
      offerId,
      publisherId,
      ...data,
    }, offerId, publisherId);
  }

  async notifyStatusChange(
    advertiserId: string,
    conversionId: string,
    offerId: string,
    publisherId: string,
    status: "rejected" | "hold_released",
    data: {
      reason?: string;
      previousStatus?: string;
    }
  ): Promise<void> {
    await this.triggerEvent(advertiserId, status, {
      conversionId,
      offerId,
      publisherId,
      status,
      ...data,
    }, offerId, publisherId);
  }

  async notifyPayout(
    advertiserId: string,
    publisherId: string,
    payoutId: string,
    status: "payout_approved" | "payout_paid",
    data: {
      amount?: number;
      currency?: string;
      method?: string;
      transactionId?: string;
    }
  ): Promise<void> {
    await this.triggerEvent(advertiserId, status, {
      payoutId,
      publisherId,
      ...data,
    }, undefined, publisherId);
  }

  async testWebhook(endpointId: string): Promise<{ success: boolean; statusCode?: number; response?: string; error?: string }> {
    const endpoint = await storage.getWebhookEndpoint(endpointId);
    if (!endpoint) {
      return { success: false, error: "Webhook endpoint not found" };
    }

    const testPayload: WebhookPayload = {
      event: "lead",
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: "This is a test webhook",
        conversionId: "test-123",
        offerId: "test-offer",
        publisherId: "test-publisher",
      },
    };

    const payloadString = JSON.stringify(testPayload);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": "test",
      "X-Webhook-Timestamp": testPayload.timestamp,
    };

    if (endpoint.secret) {
      headers["X-Webhook-Signature"] = this.generateSignature(payloadString, endpoint.secret);
    }

    try {
      const client = new HttpClient(`Webhook:test`, {
        timeout: 10000,
        retries: 0,
      });

      const response = await client.requestRaw(endpoint.url, {
        method: (endpoint.method || "POST") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
        rawBody: payloadString,
        headers,
      });

      return {
        success: response.ok,
        statusCode: response.statusCode,
        response: response.body?.substring(0, 500),
      };
    } catch (error: any) {
      if (error instanceof ExternalApiError) {
        return {
          success: false,
          statusCode: error.statusCode,
          error: error.message,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const webhookService = new WebhookService();
