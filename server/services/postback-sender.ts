import { storage } from "../storage";
import type { Conversion, Click, Offer, PostbackLog, PublisherPostbackEndpoint } from "@shared/schema";
import { HttpClient, ExternalApiError, RawResponse } from "../lib/http-client";

interface PostbackTarget {
  url: string;
  method: string;
  recipientType: "advertiser" | "publisher";
  recipientId: string;
  offerId?: string;
}

interface PublisherPostbackTarget extends PostbackTarget {
  endpoint: PublisherPostbackEndpoint;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [60000, 300000, 900000, 3600000, 7200000]; // 1m, 5m, 15m, 1h, 2h

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

    const advertiserTargets: PostbackTarget[] = [];
    const publisherTargets: PublisherPostbackTarget[] = [];

    // 1. Get ADVERTISER postback settings (outgoing to advertiser's system - legacy)
    const offerPostbackSettings = await storage.getOfferPostbackSetting(offer.id);
    
    if (offerPostbackSettings?.isActive && offerPostbackSettings.postbackUrl) {
      const shouldSend = 
        (conversion.conversionType === "lead" && offerPostbackSettings.sendOnLead) ||
        (conversion.conversionType === "sale" && offerPostbackSettings.sendOnSale) ||
        (conversion.status === "rejected" && offerPostbackSettings.sendOnRejected);
      
      if (shouldSend) {
        advertiserTargets.push({
          url: offerPostbackSettings.postbackUrl,
          method: offerPostbackSettings.httpMethod || "GET",
          recipientType: "advertiser",
          recipientId: offer.advertiserId,
          offerId: offer.id,
        });
      }
    } else {
      const advertiserSettings = await storage.getAdvertiserSettings(offer.advertiserId);
      if (advertiserSettings) {
        // Use type-specific URL if available, otherwise fall back to global URL
        if (conversion.conversionType === "lead" && advertiserSettings.leadPostbackUrl) {
          advertiserTargets.push({
            url: advertiserSettings.leadPostbackUrl,
            method: advertiserSettings.leadPostbackMethod || "GET",
            recipientType: "advertiser",
            recipientId: offer.advertiserId,
            offerId: offer.id,
          });
        } else if (conversion.conversionType === "sale" && advertiserSettings.salePostbackUrl) {
          advertiserTargets.push({
            url: advertiserSettings.salePostbackUrl,
            method: advertiserSettings.salePostbackMethod || "GET",
            recipientType: "advertiser",
            recipientId: offer.advertiserId,
            offerId: offer.id,
          });
        } else if (advertiserSettings.postbackUrl) {
          // Fallback to global postback URL
          advertiserTargets.push({
            url: advertiserSettings.postbackUrl,
            method: advertiserSettings.postbackMethod || "GET",
            recipientType: "advertiser",
            recipientId: offer.advertiserId,
            offerId: offer.id,
          });
        }
      }
    }

    // 2. Get PUBLISHER postback endpoints (new flexible system)
    const publisherEndpoints = await storage.getPublisherPostbackEndpoints(conversion.publisherId);
    
    for (const endpoint of publisherEndpoints) {
      if (!endpoint.isActive) continue;
      
      // Check if endpoint applies to this offer (null = all offers)
      if (endpoint.offerId && endpoint.offerId !== offer.id) continue;
      
      // Check status filter
      if (endpoint.statusFilter) {
        try {
          const filter = JSON.parse(endpoint.statusFilter);
          if (Array.isArray(filter) && !filter.includes(conversion.conversionType)) {
            continue;
          }
        } catch (e) {
          // No filter or invalid filter - send all
        }
      }
      
      publisherTargets.push({
        url: endpoint.baseUrl,
        method: endpoint.httpMethod || "GET",
        recipientType: "publisher",
        recipientId: conversion.publisherId,
        offerId: offer.id,
        endpoint,
      });
    }

    // 3. Legacy publisher postback settings (fallback)
    if (publisherTargets.length === 0) {
      const publisherPostbackSettings = await storage.getUserPostbackSettings(conversion.publisherId);
      
      if (publisherPostbackSettings) {
        let legacyUrl: string | null = null;
        let legacyMethod = "GET";
        
        if (conversion.conversionType === "lead" && publisherPostbackSettings.leadPostbackUrl) {
          legacyUrl = publisherPostbackSettings.leadPostbackUrl;
          legacyMethod = publisherPostbackSettings.leadPostbackMethod || "GET";
        } else if (conversion.conversionType === "sale" && publisherPostbackSettings.salePostbackUrl) {
          legacyUrl = publisherPostbackSettings.salePostbackUrl;
          legacyMethod = publisherPostbackSettings.salePostbackMethod || "GET";
        }
        
        if (legacyUrl) {
          publisherTargets.push({
            url: legacyUrl,
            method: legacyMethod,
            recipientType: "publisher",
            recipientId: conversion.publisherId,
            offerId: offer.id,
            endpoint: null as any,
          });
        }
      }
    }

    const totalTargets = advertiserTargets.length + publisherTargets.length;
    if (totalTargets === 0) {
      console.log(`[PostbackSender] No postback URLs configured for conversion: ${conversionId}`);
      return;
    }

    console.log(`[PostbackSender] Sending ${totalTargets} postback(s) for conversion: ${conversionId}`);
    
    // Send to advertiser targets (legacy format)
    for (const target of advertiserTargets) {
      await this.executePostback(conversion, click, offer, target);
    }
    
    // Send to publisher targets
    for (const target of publisherTargets) {
      if (target.endpoint) {
        // New flexible format with endpoint
        await this.executePublisherPostback(conversion, click, offer, target);
      } else {
        // Legacy format - use executePostback
        await this.executePostback(conversion, click, offer, {
          url: target.url,
          method: target.method,
          recipientType: "publisher",
          recipientId: target.recipientId,
          offerId: target.offerId,
        });
      }
    }
  }

  private async executePostback(
    conversion: Conversion,
    click: Click,
    offer: Offer,
    target: PostbackTarget,
    retryCount = 0
  ): Promise<void> {
    let postbackUrl = this.buildPostbackUrl(target.url, conversion, click, offer);
    
    // Append fraud params automatically if not already present
    const antifraudAction = (click as any).antifraudAction || "allow";
    const isSuspicious = antifraudAction !== "allow";
    try {
      const urlObj = new URL(postbackUrl);
      if (!urlObj.searchParams.has("suspected_fraud")) {
        urlObj.searchParams.set("suspected_fraud", isSuspicious ? "1" : "0");
        if (isSuspicious) {
          urlObj.searchParams.set("fraud_reason", antifraudAction);
        }
        postbackUrl = urlObj.toString();
      }
    } catch {
      // URL might not be valid, keep as-is
    }

    let responseCode: number | undefined;
    let responseBody: string | undefined;
    let success = false;

    try {
      console.log(`[PostbackSender] Sending ${target.recipientType} postback: ${postbackUrl}`);
      
      const client = new HttpClient(`Postback:${target.recipientType}`, {
        timeout: 10000,
        retries: 0,
        headers: { "User-Agent": "AffiliateTracker/1.0" },
      });

      const response = await client.requestRaw(postbackUrl, { method: "GET" });

      responseCode = response.statusCode;
      responseBody = response.body;
      success = response.ok;

      console.log(`[PostbackSender] ${target.recipientType} response: ${responseCode} - ${success ? "OK" : "FAILED"}`);
    } catch (error: any) {
      if (error instanceof ExternalApiError) {
        responseCode = error.statusCode;
        console.error(`[PostbackSender] ${target.recipientType} API error: ${error.message}`);
      } else {
        console.error(`[PostbackSender] ${target.recipientType} request failed: ${error.message}`);
      }
      responseBody = error.message;
    }

    await storage.createPostbackLog({
      direction: "outbound",
      conversionId: conversion.id,
      offerId: target.offerId,
      publisherId: target.recipientType === "publisher" ? target.recipientId : undefined,
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

  private async executePublisherPostback(
    conversion: Conversion,
    click: Click,
    offer: Offer,
    target: PublisherPostbackTarget,
    retryCount = 0
  ): Promise<void> {
    const { endpoint } = target;
    
    // Build URL with configurable parameter names
    const postbackUrl = this.buildPublisherPostbackUrl(endpoint, conversion, click, offer);

    let responseCode: number | undefined;
    let responseBody: string | undefined;
    let success = false;

    try {
      console.log(`[PostbackSender] Sending publisher postback (${endpoint.trackerType}): ${postbackUrl}`);
      
      const client = new HttpClient(`Postback:publisher:${endpoint.trackerType || 'custom'}`, {
        timeout: 10000,
        retries: 0,
        headers: { "User-Agent": "AffiliateTracker/1.0" },
      });

      const response = await client.requestRaw(postbackUrl, { method: "GET" });

      responseCode = response.statusCode;
      responseBody = response.body;
      success = response.ok;

      console.log(`[PostbackSender] Publisher response: ${responseCode} - ${success ? "OK" : "FAILED"}`);
    } catch (error: any) {
      if (error instanceof ExternalApiError) {
        responseCode = error.statusCode;
        console.error(`[PostbackSender] Publisher API error: ${error.message}`);
      } else {
        console.error(`[PostbackSender] Publisher request failed: ${error.message}`);
      }
      responseBody = error.message;
    }

    await storage.createPostbackLog({
      direction: "outbound",
      conversionId: conversion.id,
      offerId: offer.id,
      publisherId: conversion.publisherId,
      url: postbackUrl,
      method: target.method,
      responseCode,
      responseBody,
      success,
      retryCount,
      recipientType: "publisher",
      recipientId: target.recipientId,
    });

    if (!success && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[PostbackSender] Scheduling publisher retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms`);
      
      setTimeout(() => {
        this.executePublisherPostback(conversion, click, offer, target, retryCount + 1);
      }, delay);
    }
  }

  private buildPublisherPostbackUrl(
    endpoint: PublisherPostbackEndpoint,
    conversion: Conversion,
    click: Click,
    offer: Offer
  ): string {
    const baseUrl = endpoint.baseUrl;
    const url = new URL(baseUrl.includes("://") ? baseUrl : `https://${baseUrl}`);
    
    // Add configurable parameters
    const clickIdParam = endpoint.clickIdParam || "subid";
    const statusParam = endpoint.statusParam || "status";
    const payoutParam = endpoint.payoutParam || "payout";
    
    // Map internal status to tracker-specific status
    let mappedStatus = conversion.conversionType;
    if (endpoint.statusMappings) {
      try {
        const mappings = JSON.parse(endpoint.statusMappings);
        if (mappings[conversion.conversionType]) {
          mappedStatus = mappings[conversion.conversionType];
        }
      } catch (e) {
        // Use default status
      }
    }
    
    // Add parameters
    // ВАЖНО: для Keitaro и других трекеров нужен click_id партнёра (sub1), а не внутренний
    url.searchParams.set(clickIdParam, click.sub1 || click.clickId);
    url.searchParams.set(statusParam, mappedStatus);
    url.searchParams.set(payoutParam, conversion.publisherPayout);
    
    // Add common parameters
    url.searchParams.set("sum", conversion.transactionSum || "0");
    url.searchParams.set("offer_id", offer.id);
    url.searchParams.set("conversion_id", conversion.id);
    
    // Add sub parameters if present
    if (click.sub1) url.searchParams.set("sub1", click.sub1);
    if (click.sub2) url.searchParams.set("sub2", click.sub2);
    if (click.sub3) url.searchParams.set("sub3", click.sub3);
    if (click.sub4) url.searchParams.set("sub4", click.sub4);
    if (click.sub5) url.searchParams.set("sub5", click.sub5);
    if (click.geo) url.searchParams.set("geo", click.geo);
    
    // Add antifraud flags
    const antifraudAction = (click as any).antifraudAction || "allow";
    const isSuspicious = antifraudAction !== "allow";
    url.searchParams.set("suspected_fraud", isSuspicious ? "1" : "0");
    if (isSuspicious) {
      url.searchParams.set("fraud_reason", antifraudAction);
    }
    
    return url.toString();
  }

  private buildPostbackUrl(
    template: string,
    conversion: Conversion,
    click: Click,
    offer: Offer
  ): string {
    // Check if click has antifraud flags
    const antifraudAction = (click as any).antifraudAction || "allow";
    const isSuspicious = antifraudAction !== "allow";
    
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
      "{suspected_fraud}": isSuspicious ? "1" : "0",
      "{fraud_reason}": isSuspicious ? antifraudAction : "",
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
