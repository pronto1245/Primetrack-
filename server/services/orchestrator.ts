import { storage } from "../storage";
import type { InsertConversion } from "@shared/schema";
import { postbackSender } from "./postback-sender";

interface ConversionEvent {
  clickId: string;
  status: "lead" | "sale" | "install";
  sum?: number;
  externalId?: string;
}

interface ConversionResult {
  id: string;
  clickId: string;
  offerId: string;
  publisherId: string;
  advertiserCost: number;
  publisherPayout: number;
  status: string;
  conversionType: string;
}

export class Orchestrator {
  async processConversion(event: ConversionEvent): Promise<ConversionResult> {
    const click = await storage.getClickByClickId(event.clickId);
    if (!click) {
      throw new Error("Click not found");
    }
    
    const offer = await storage.getOffer(click.offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }
    
    const landings = await storage.getOfferLandings(click.offerId);
    const landing = click.landingId 
      ? landings.find(l => l.id === click.landingId)
      : landings[0];
    
    const { advertiserCost, publisherPayout } = this.calculatePayout(
      offer,
      landing,
      event.status,
      event.sum
    );
    
    // Use offer hold period, or fall back to advertiser default
    let holdDays = offer.holdPeriodDays || 0;
    if (holdDays === 0) {
      const advertiserSettings = await storage.getAdvertiserSettings(offer.advertiserId);
      holdDays = advertiserSettings?.defaultHoldPeriodDays || 0;
    }
    
    const holdUntil = holdDays > 0
      ? new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000)
      : undefined;
    
    const conversionData: InsertConversion = {
      clickId: click.id,
      offerId: click.offerId,
      publisherId: click.publisherId,
      conversionType: event.status,
      advertiserCost: advertiserCost.toString(),
      publisherPayout: publisherPayout.toString(),
      transactionSum: event.sum?.toString(),
      currency: offer.currency,
      status: holdUntil ? "hold" : "pending",
      holdUntil,
      externalId: event.externalId,
    };
    
    const conversion = await storage.createConversion(conversionData);
    
    // Increment offer caps stats
    await storage.incrementOfferCapsStats(click.offerId);
    
    postbackSender.sendPostback(conversion.id).catch((error) => {
      console.error(`[Orchestrator] Postback send failed for conversion ${conversion.id}:`, error);
    });
    
    return {
      id: conversion.id,
      clickId: event.clickId,
      offerId: click.offerId,
      publisherId: click.publisherId,
      advertiserCost,
      publisherPayout,
      status: conversion.status,
      conversionType: event.status,
    };
  }
  
  private calculatePayout(
    offer: any,
    landing: any | undefined,
    conversionType: string,
    transactionSum?: number
  ): { advertiserCost: number; publisherPayout: number } {
    const baseAdvertiserCost = landing?.internalCost 
      ? parseFloat(landing.internalCost) 
      : (offer.internalCost ? parseFloat(offer.internalCost) : 0);
    
    const basePublisherPayout = landing?.partnerPayout
      ? parseFloat(landing.partnerPayout)
      : (offer.partnerPayout ? parseFloat(offer.partnerPayout) : 0);
    
    switch (offer.payoutModel) {
      case "RevShare":
        if (transactionSum && offer.revSharePercent) {
          const revSharePercent = parseFloat(offer.revSharePercent);
          const publisherPayout = (transactionSum * revSharePercent) / 100;
          const advertiserCost = transactionSum;
          return { advertiserCost, publisherPayout };
        }
        return { advertiserCost: baseAdvertiserCost, publisherPayout: basePublisherPayout };
        
      case "Hybrid":
        let advertiserCost = baseAdvertiserCost;
        let publisherPayout = basePublisherPayout;
        
        if (transactionSum && offer.revSharePercent) {
          const revSharePercent = parseFloat(offer.revSharePercent);
          publisherPayout += (transactionSum * revSharePercent) / 100;
          advertiserCost += transactionSum;
        }
        return { advertiserCost, publisherPayout };
        
      case "CPA":
      case "CPL":
      case "CPI":
      case "CPS":
      default:
        return { advertiserCost: baseAdvertiserCost, publisherPayout: basePublisherPayout };
    }
  }
  
  async approveConversion(conversionId: string): Promise<void> {
    await storage.updateConversionStatus(conversionId, "approved");
  }
  
  async rejectConversion(conversionId: string): Promise<void> {
    const conversion = await storage.getConversion(conversionId);
    await storage.updateConversionStatus(conversionId, "rejected");
    // Decrement caps when conversion is rejected (using conversion date)
    if (conversion) {
      await storage.decrementOfferCapsStats(conversion.offerId, conversion.createdAt);
    }
  }
  
  async holdConversion(conversionId: string, holdDays: number): Promise<void> {
    const holdUntil = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000);
    await storage.updateConversionStatus(conversionId, "hold");
  }
}

export const orchestrator = new Orchestrator();
