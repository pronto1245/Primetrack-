import { storage } from "../storage";
import type { Conversion, Click, Offer, PostbackLog } from "@shared/schema";

interface PostbackContext {
  conversion: Conversion;
  click: Click;
  offer: Offer;
  publisherPostbackUrl?: string;
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

    const advertiserSettings = await storage.getAdvertiserSettings(offer.advertiserId);
    const publisherPostbackUrl = advertiserSettings?.postbackUrl;

    if (!publisherPostbackUrl) {
      console.log(`[PostbackSender] No postback URL configured for advertiser: ${offer.advertiserId}`);
      return;
    }

    const context: PostbackContext = {
      conversion,
      click,
      offer,
      publisherPostbackUrl,
    };

    await this.executePostback(context);
  }

  private async executePostback(context: PostbackContext, retryCount = 0): Promise<void> {
    const { conversion, click, offer, publisherPostbackUrl } = context;
    
    if (!publisherPostbackUrl) return;

    const postbackUrl = this.buildPostbackUrl(publisherPostbackUrl, conversion, click, offer);

    let responseCode: number | undefined;
    let responseBody: string | undefined;
    let success = false;

    try {
      console.log(`[PostbackSender] Sending postback: ${postbackUrl}`);
      
      const response = await fetch(postbackUrl, {
        method: "GET",
        headers: {
          "User-Agent": "PrimeTrack/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      responseCode = response.status;
      responseBody = await response.text().catch(() => "");
      success = response.ok;

      console.log(`[PostbackSender] Response: ${responseCode} - ${success ? "OK" : "FAILED"}`);
    } catch (error: any) {
      console.error(`[PostbackSender] Request failed: ${error.message}`);
      responseBody = error.message;
    }

    await storage.createPostbackLog({
      conversionId: conversion.id,
      url: postbackUrl,
      method: "GET",
      responseCode,
      responseBody,
      success,
      retryCount,
    });

    if (!success && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[PostbackSender] Scheduling retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms`);
      
      setTimeout(() => {
        this.executePostback(context, retryCount + 1);
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
      "{sum}": conversion.transactionSum || "0",
      "{external_id}": conversion.externalId || "",
      "{offer_id}": offer.id,
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
