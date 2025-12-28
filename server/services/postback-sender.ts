import { storage } from "../storage";
import type { Conversion, Click, Offer, PostbackLog } from "@shared/schema";

interface PostbackTarget {
  url: string;
  method: string;
  recipientType: "advertiser" | "publisher";
  recipientId: string;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 30000, 60000, 300000];

export class PostbackSender {
  async sendPostback(conversionId: string): Promise<void> {
    const conversion = await storage.getConversion(conversionId);
    if (!conversion) {
      console.error(`[PostbackSender] Conversion not found: ${conversionId}`);
      return;
    }

    const click = await storage.getClick(conversion.clickId);
    if (!click) {
      console.error(`[PostbackSender] Click not found for conversion: ${conversionId}`);
      return;
    }

    const offer = await storage.getOffer(conversion.offerId);
    if (!offer) {
      console.error(`[PostbackSender] Offer not found for conversion: ${conversionId}`);
      return;
    }

    const targets: PostbackTarget[] = [];

    // 1. Get ADVERTISER postback settings
    // Priority: offer_postback_settings > advertiser_settings
    const offerPostbackSettings = await storage.getOfferPostbackSetting(offer.id);
    
    if (offerPostbackSettings?.isActive && offerPostbackSettings.postbackUrl) {
      // Check if this event type should trigger postback
      const shouldSend = 
        (conversion.conversionType === "lead" && offerPostbackSettings.sendOnLead) ||
        (conversion.conversionType === "sale" && offerPostbackSettings.sendOnSale) ||
        (conversion.status === "rejected" && offerPostbackSettings.sendOnRejected);
      
      if (shouldSend) {
        targets.push({
          url: offerPostbackSettings.postbackUrl,
          method: offerPostbackSettings.httpMethod || "GET",
          recipientType: "advertiser",
          recipientId: offer.advertiserId,
        });
      }
    } else {
      // Fallback to advertiser global settings
      const advertiserSettings = await storage.getAdvertiserSettings(offer.advertiserId);
      if (advertiserSettings?.postbackUrl) {
        targets.push({
          url: advertiserSettings.postbackUrl,
          method: advertiserSettings.postbackMethod || "GET",
          recipientType: "advertiser",
          recipientId: offer.advertiserId,
        });
      }
    }

    // 2. Get PUBLISHER postback settings
    const publisherPostbackSettings = await storage.getUserPostbackSettings(conversion.publisherId);
    
    if (publisherPostbackSettings) {
      // Send to appropriate URL based on conversion type
      if (conversion.conversionType === "lead" && publisherPostbackSettings.leadPostbackUrl) {
        targets.push({
          url: publisherPostbackSettings.leadPostbackUrl,
          method: publisherPostbackSettings.leadPostbackMethod || "GET",
          recipientType: "publisher",
          recipientId: conversion.publisherId,
        });
      } else if (conversion.conversionType === "sale" && publisherPostbackSettings.salePostbackUrl) {
        targets.push({
          url: publisherPostbackSettings.salePostbackUrl,
          method: publisherPostbackSettings.salePostbackMethod || "GET",
          recipientType: "publisher",
          recipientId: conversion.publisherId,
        });
      }
    }

    if (targets.length === 0) {
      console.log(`[PostbackSender] No postback URLs configured for conversion: ${conversionId}`);
      return;
    }

    // Send postbacks to all targets
    console.log(`[PostbackSender] Sending ${targets.length} postback(s) for conversion: ${conversionId}`);
    
    for (const target of targets) {
      await this.executePostback(conversion, click, offer, target);
    }
  }

  private async executePostback(
    conversion: Conversion,
    click: Click,
    offer: Offer,
    target: PostbackTarget,
    retryCount = 0
  ): Promise<void> {
    const postbackUrl = this.buildPostbackUrl(target.url, conversion, click, offer);

    let responseCode: number | undefined;
    let responseBody: string | undefined;
    let success = false;

    try {
      console.log(`[PostbackSender] Sending ${target.recipientType} postback: ${postbackUrl}`);
      
      const fetchOptions: RequestInit = {
        method: target.method,
        headers: {
          "User-Agent": "PrimeTrack/1.0",
        },
        signal: AbortSignal.timeout(10000),
      };

      const response = await fetch(postbackUrl, fetchOptions);

      responseCode = response.status;
      responseBody = await response.text().catch(() => "");
      success = response.ok;

      console.log(`[PostbackSender] ${target.recipientType} response: ${responseCode} - ${success ? "OK" : "FAILED"}`);
    } catch (error: any) {
      console.error(`[PostbackSender] ${target.recipientType} request failed: ${error.message}`);
      responseBody = error.message;
    }

    await storage.createPostbackLog({
      conversionId: conversion.id,
      url: postbackUrl,
      method: target.method,
      responseCode,
      responseBody,
      success,
      retryCount,
      recipientType: target.recipientType,
      recipientId: target.recipientId,
    });

    if (!success && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[PostbackSender] Scheduling ${target.recipientType} retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms`);
      
      setTimeout(() => {
        this.executePostback(conversion, click, offer, target, retryCount + 1);
      }, delay);
    }
  }

  private buildPostbackUrl(
    template: string,
    conversion: Conversion,
    click: Click,
    offer: Offer
  ): string {
    const placeholders: Record<string, string> = {
      "{click_id}": click.clickId,
      "{conversion_id}": conversion.id,
      "{status}": conversion.conversionType,
      "{payout}": conversion.publisherPayout,
      "{advertiser_cost}": conversion.advertiserCost,
      "{sum}": conversion.transactionSum || "0",
      "{external_id}": conversion.externalId || "",
      "{offer_id}": offer.id,
      "{offer_name}": offer.name || "",
      "{publisher_id}": conversion.publisherId,
      "{sub1}": click.sub1 || "",
      "{sub2}": click.sub2 || "",
      "{sub3}": click.sub3 || "",
      "{sub4}": click.sub4 || "",
      "{sub5}": click.sub5 || "",
      "{geo}": click.geo || "",
      "{ip}": click.ip || "",
      "{currency}": conversion.currency,
    };

    let url = template;
    for (const [placeholder, value] of Object.entries(placeholders)) {
      url = url.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), encodeURIComponent(value));
    }

    return url;
  }

  async getPostbackLogs(conversionId: string): Promise<PostbackLog[]> {
    return storage.getPostbackLogsByConversion(conversionId);
  }

  async retryPostback(conversionId: string): Promise<void> {
    await this.sendPostback(conversionId);
  }
}

export const postbackSender = new PostbackSender();
