import { storage } from "../storage";
import type { InsertConversion } from "@shared/schema";
import { postbackSender } from "./postback-sender";
import { webhookService } from "./webhook-service";
import { telegramService } from "./telegram-service";

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
    
    // Check antifraud flags from click
    const antifraudAction = click.antifraudAction || "allow";
    const isFraudulent = antifraudAction === "block" || antifraudAction === "reject";
    const shouldHoldForFraud = antifraudAction === "hold" || antifraudAction === "flag";
    
    // Use offer hold period, or fall back to advertiser default
    let holdDays = offer.holdPeriodDays || 0;
    if (holdDays === 0) {
      const advertiserSettings = await storage.getAdvertiserSettings(offer.advertiserId);
      holdDays = advertiserSettings?.defaultHoldPeriodDays || 0;
    }
    
    // Force hold if fraud flagged
    if (shouldHoldForFraud && holdDays === 0) {
      holdDays = 7; // 7 day hold for suspicious traffic
    }
    
    const holdUntil = holdDays > 0
      ? new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000)
      : undefined;
    
    // Determine conversion status based on antifraud
    let conversionStatus: string;
    if (isFraudulent) {
      conversionStatus = "rejected";
    } else if (holdUntil || shouldHoldForFraud) {
      conversionStatus = "hold";
    } else {
      conversionStatus = "pending";
    }
    
    const conversionData: InsertConversion = {
      clickId: click.id,
      offerId: click.offerId,
      publisherId: click.publisherId,
      conversionType: event.status,
      advertiserCost: advertiserCost.toString(),
      publisherPayout: publisherPayout.toString(), // Full payout - no cuts, fraud info in click.antifraudAction
      transactionSum: event.sum?.toString(),
      currency: offer.currency,
      status: conversionStatus,
      holdUntil,
      externalId: event.externalId,
    };
    
    const conversion = await storage.createConversion(conversionData);
    
    // Notify advertiser about suspected fraud conversion
    if (isFraudulent || shouldHoldForFraud) {
      try {
        await storage.createNotification({
          senderId: offer.advertiserId,
          senderRole: "system",
          recipientId: offer.advertiserId,
          advertiserScopeId: offer.advertiserId,
          type: "antifraud",
          title: "⚠️ Подозрение на фрод",
          body: `Конверсия помечена антифрод-системой. Причина: ${antifraudAction}. Click ID: ${click.clickId}. Выплата не изменена.`,
          entityType: "conversion",
          entityId: conversion.id,
        });
      } catch (err) {
        console.error("[Orchestrator] Failed to send fraud notification:", err);
      }
    }
    
    // Increment offer caps stats
    await storage.incrementOfferCapsStats(click.offerId);
    
    postbackSender.sendPostback(conversion.id).catch((error) => {
      console.error(`[Orchestrator] Postback send failed for conversion ${conversion.id}:`, error);
    });

    // Send webhook notification to advertiser (with fraud flag if applicable)
    const webhookEventType = event.status as "lead" | "sale" | "install";
    const isSuspicious = isFraudulent || shouldHoldForFraud;
    const fraudFlag = isSuspicious ? { suspectedFraud: true, fraudReason: antifraudAction } : {};
    
    if (webhookEventType === "lead") {
      webhookService.notifyLead(offer.advertiserId, conversion.id, click.offerId, click.publisherId, {
        clickId: click.clickId,
        payout: publisherPayout,
        revenue: advertiserCost,
        country: click.geo || undefined,
        subId: click.sub1 || undefined,
        ...fraudFlag,
      }).catch(console.error);
    } else if (webhookEventType === "sale") {
      webhookService.notifySale(offer.advertiserId, conversion.id, click.offerId, click.publisherId, {
        clickId: click.clickId,
        amount: event.sum,
        payout: publisherPayout,
        revenue: advertiserCost,
        currency: offer.currency || undefined,
        orderId: event.externalId,
        ...fraudFlag,
      }).catch(console.error);
    } else if (webhookEventType === "install") {
      webhookService.triggerEvent(offer.advertiserId, "install", {
        conversionId: conversion.id,
        offerId: click.offerId,
        publisherId: click.publisherId,
        clickId: click.clickId,
        payout: publisherPayout,
        revenue: advertiserCost,
        ...fraudFlag,
      }, click.offerId, click.publisherId).catch(console.error);
    }

    // Send Telegram notifications (async, non-blocking)
    const offerName = offer.name || "Оффер";
    const geo = click.geo || undefined;
    const fraudWarning = isSuspicious ? " ⚠️" : "";
    const fraudNote = isSuspicious ? { "⚠️ Антифрод": antifraudAction } : {};
    
    if (webhookEventType === "lead") {
      // Notify publisher about new lead
      telegramService.notifyNewLead(
        click.publisherId,
        offer.advertiserId,
        offerName + fraudWarning,
        publisherPayout,
        geo
      ).catch(err => console.error("[Orchestrator] Telegram lead notification failed:", err));
      
      // Notify advertiser about new lead
      telegramService.notifyUser(
        offer.advertiserId,
        "lead",
        isSuspicious ? "Новый лид! ⚠️ Подозрение на фрод" : "Новый лид!",
        {
          Оффер: offerName,
          Партнёр: click.publisherId.slice(0, 8),
          Стоимость: `$${advertiserCost.toFixed(2)}`,
          ГЕО: geo || "—",
          ...fraudNote,
        }
      ).catch(err => console.error("[Orchestrator] Telegram advertiser lead notification failed:", err));
    } else if (webhookEventType === "sale") {
      // Notify publisher about new sale
      telegramService.notifyNewSale(
        click.publisherId,
        offer.advertiserId,
        offerName + fraudWarning,
        event.sum || 0,
        publisherPayout,
        geo
      ).catch(err => console.error("[Orchestrator] Telegram sale notification failed:", err));
      
      // Notify advertiser about new sale
      telegramService.notifyUser(
        offer.advertiserId,
        "sale",
        isSuspicious ? "Новая продажа! ⚠️ Подозрение на фрод" : "Новая продажа!",
        {
          Оффер: offerName,
          Партнёр: click.publisherId.slice(0, 8),
          Сумма: event.sum ? `$${event.sum.toFixed(2)}` : "—",
          Стоимость: `$${advertiserCost.toFixed(2)}`,
          ГЕО: geo || "—",
          ...fraudNote,
        }
      ).catch(err => console.error("[Orchestrator] Telegram advertiser sale notification failed:", err));
    }
    
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
        // CPA = Cost Per Action (Sale) - платим только за sale
        if (conversionType === "sale") {
          return { advertiserCost: baseAdvertiserCost, publisherPayout: basePublisherPayout };
        }
        return { advertiserCost: 0, publisherPayout: 0 };
        
      case "CPL":
        // CPL = Cost Per Lead - платим только за lead
        if (conversionType === "lead") {
          return { advertiserCost: baseAdvertiserCost, publisherPayout: basePublisherPayout };
        }
        return { advertiserCost: 0, publisherPayout: 0 };
        
      case "CPI":
        // CPI = Cost Per Install - платим только за install
        if (conversionType === "install") {
          return { advertiserCost: baseAdvertiserCost, publisherPayout: basePublisherPayout };
        }
        return { advertiserCost: 0, publisherPayout: 0 };
        
      case "CPS":
        // CPS = Cost Per Sale - платим только за sale
        if (conversionType === "sale") {
          return { advertiserCost: baseAdvertiserCost, publisherPayout: basePublisherPayout };
        }
        return { advertiserCost: 0, publisherPayout: 0 };
        
      default:
        return { advertiserCost: baseAdvertiserCost, publisherPayout: basePublisherPayout };
    }
  }
  
  async approveConversion(conversionId: string): Promise<void> {
    const conversion = await storage.getConversion(conversionId);
    const previousStatus = conversion?.status;
    await storage.updateConversionStatus(conversionId, "approved");
    
    // If released from hold, send webhook
    if (previousStatus === "hold" && conversion) {
      const offer = await storage.getOffer(conversion.offerId);
      if (offer) {
        webhookService.notifyStatusChange(offer.advertiserId, conversionId, conversion.offerId, conversion.publisherId, "hold_released", {
          reason: "Approved after hold period",
          previousStatus,
        }).catch(console.error);
      }
    }
  }
  
  async rejectConversion(conversionId: string, reason?: string): Promise<void> {
    const conversion = await storage.getConversion(conversionId);
    const previousStatus = conversion?.status;
    await storage.updateConversionStatus(conversionId, "rejected");
    // Decrement caps when conversion is rejected (using conversion date)
    if (conversion) {
      await storage.decrementOfferCapsStats(conversion.offerId, conversion.createdAt);
      
      // Send webhook notification
      const offer = await storage.getOffer(conversion.offerId);
      if (offer) {
        webhookService.notifyStatusChange(offer.advertiserId, conversionId, conversion.offerId, conversion.publisherId, "rejected", {
          reason: reason || "Rejected by advertiser",
          previousStatus,
        }).catch(console.error);
      }
    }
  }
  
  async holdConversion(conversionId: string, holdDays: number): Promise<void> {
    const holdUntil = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000);
    await storage.updateConversionStatus(conversionId, "hold");
  }
}

export const orchestrator = new Orchestrator();
