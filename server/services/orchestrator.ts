import { storage } from "../storage";
import type { InsertConversion } from "@shared/schema";
import { postbackSender } from "./postback-sender";
import { webhookService } from "./webhook-service";
import { telegramService } from "./telegram-service";
import { platformWebhookService } from "./platform-webhook-service";

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
    
    const publisher = await storage.getUser(click.publisherId);
    const publisherShortId = publisher?.shortId != null ? publisher.shortId.toString().padStart(3, '0') : '-';
    
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
    // If offer explicitly set to 0 (no hold), don't use advertiser default
    let holdDays: number;
    if (offer.holdPeriodDays !== null && offer.holdPeriodDays !== undefined) {
      // Offer has explicit hold setting (including 0 = no hold)
      holdDays = offer.holdPeriodDays;
    } else {
      // Offer has no hold setting, use advertiser default
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
      conversionStatus = "approved";
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
    
    // Update publisher balance and handle referral bonus for hold conversions
    if (conversionStatus === "hold" && publisherPayout > 0) {
      const balance = await storage.getPublisherBalance(click.publisherId, offer.advertiserId);
      if (balance) {
        const newHold = parseFloat(balance.holdBalance || "0") + publisherPayout;
        await storage.updatePublisherBalance(click.publisherId, offer.advertiserId, {
          holdBalance: newHold.toFixed(2)
        });
        console.log(`[Orchestrator] Added $${publisherPayout.toFixed(2)} to hold for publisher ${click.publisherId} (new conversion)`);
      }
      // Process referral bonus for hold conversions at creation time
      await this.handleReferralBonus(conversion);
    }
    
    // Trigger platform webhooks (for n8n integration)
    platformWebhookService.trigger("conversion.created", {
      conversionId: conversion.id,
      clickId: click.clickId,
      offerId: click.offerId,
      publisherId: click.publisherId,
      conversionType: event.status,
      status: conversionStatus,
      publisherPayout,
      advertiserCost,
      geo: click.geo,
      externalId: event.externalId,
    }).catch(err => console.error("[Orchestrator] Platform webhook failed:", err));
    
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
    
    // Increment offer caps stats (non-critical, don't break conversion flow)
    try {
      await storage.incrementOfferCapsStats(click.offerId);
    } catch (capsError) {
      console.error(`[Orchestrator] Failed to increment caps stats for offer ${click.offerId}:`, capsError);
    }
    
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
        subId: click.subid || undefined,
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
          Партнёр: publisherShortId,
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
          Партнёр: publisherShortId,
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
  
  async rejectConversion(conversionId: string, reason?: string): Promise<void> {
    const conversion = await storage.getConversion(conversionId);
    if (!conversion) {
      throw new Error("Conversion not found");
    }
    
    // Idempotency check: if already rejected, do nothing
    if (conversion.status === "rejected") {
      console.log(`[Orchestrator] Conversion ${conversionId} already rejected, skipping`);
      return;
    }
    
    const offer = await storage.getOffer(conversion.offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }
    
    const previousStatus = conversion.status;
    const publisherPayout = parseFloat(conversion.publisherPayout || "0");
    
    // Update conversion status with reason
    await storage.updateConversionStatus(conversionId, "rejected", reason);
    
    // Decrement caps when conversion is rejected (only if not pending)
    if (previousStatus !== "pending") {
      await storage.decrementOfferCapsStats(conversion.offerId, conversion.createdAt);
    }
    
    // Subtract payout from publisher balance based on previous status
    // Only deduct if conversion was approved (actually credited) or on hold (pending release)
    if (publisherPayout > 0 && (previousStatus === "approved" || previousStatus === "hold")) {
      const balance = await storage.getPublisherBalance(conversion.publisherId, offer.advertiserId);
      if (balance) {
        if (previousStatus === "approved") {
          const newAvailable = Math.max(0, parseFloat(balance.availableBalance || "0") - publisherPayout);
          await storage.updatePublisherBalance(conversion.publisherId, offer.advertiserId, {
            availableBalance: newAvailable.toFixed(2)
          });
          console.log(`[Orchestrator] Deducted $${publisherPayout.toFixed(2)} from publisher ${conversion.publisherId} available balance`);
        } else if (previousStatus === "hold") {
          const newHold = Math.max(0, parseFloat(balance.holdBalance || "0") - publisherPayout);
          await storage.updatePublisherBalance(conversion.publisherId, offer.advertiserId, {
            holdBalance: newHold.toFixed(2)
          });
          console.log(`[Orchestrator] Deducted $${publisherPayout.toFixed(2)} from publisher ${conversion.publisherId} hold balance`);
        }
      }
    }
    
    // Send webhook notification to advertiser
    webhookService.notifyStatusChange(offer.advertiserId, conversionId, conversion.offerId, conversion.publisherId, "rejected", {
      reason: reason || "Rejected by advertiser",
      previousStatus,
    }).catch(console.error);
    
    // Send postback to publisher
    postbackSender.sendPostback(conversionId).catch(err => {
      console.error(`[Orchestrator] Publisher postback failed for rejected conversion ${conversionId}:`, err);
    });
  }
  
  async holdConversion(conversionId: string, holdDays?: number): Promise<void> {
    const conversion = await storage.getConversion(conversionId);
    if (!conversion) {
      throw new Error("Conversion not found");
    }
    
    // Idempotency check
    if (conversion.status === "hold") {
      console.log(`[Orchestrator] Conversion ${conversionId} already on hold, skipping`);
      return;
    }
    
    const offer = await storage.getOffer(conversion.offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }
    
    const previousStatus = conversion.status;
    const publisherPayout = parseFloat(conversion.publisherPayout || "0");
    
    // Calculate hold until date
    const days = holdDays ?? offer.holdPeriodDays ?? 7;
    const holdUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    
    await storage.updateConversionStatus(conversionId, "hold");
    await storage.updateConversionHoldUntil(conversionId, holdUntil);
    
    // Update balance based on previous status
    if (publisherPayout > 0) {
      const balance = await storage.getPublisherBalance(conversion.publisherId, offer.advertiserId);
      if (balance) {
        if (previousStatus === "approved") {
          // Move from available to hold
          const newAvailable = Math.max(0, parseFloat(balance.availableBalance || "0") - publisherPayout);
          const newHold = parseFloat(balance.holdBalance || "0") + publisherPayout;
          await storage.updatePublisherBalance(conversion.publisherId, offer.advertiserId, {
            availableBalance: newAvailable.toFixed(2),
            holdBalance: newHold.toFixed(2)
          });
          console.log(`[Orchestrator] Moved $${publisherPayout.toFixed(2)} from available to hold for publisher ${conversion.publisherId}`);
        } else if (previousStatus === "pending") {
          // Add to hold (new conversion going on hold)
          const newHold = parseFloat(balance.holdBalance || "0") + publisherPayout;
          await storage.updatePublisherBalance(conversion.publisherId, offer.advertiserId, {
            holdBalance: newHold.toFixed(2)
          });
          console.log(`[Orchestrator] Added $${publisherPayout.toFixed(2)} to hold for publisher ${conversion.publisherId}`);
          
          // Process referral bonus when moving to hold from pending
          await this.handleReferralBonus(conversion);
        }
      }
    }
    
    // Send webhook notification
    webhookService.notifyStatusChange(offer.advertiserId, conversionId, conversion.offerId, conversion.publisherId, "hold", {
      holdUntil: holdUntil.toISOString(),
      previousStatus,
    }).catch(console.error);
    
    // Send postback to publisher
    postbackSender.sendPostback(conversionId).catch(err => {
      console.error(`[Orchestrator] Publisher postback failed for hold conversion ${conversionId}:`, err);
    });
    
    console.log(`[Orchestrator] Conversion ${conversionId} put on hold until ${holdUntil.toISOString()}`);
  }
  
  async approveConversion(conversionId: string): Promise<void> {
    const conversion = await storage.getConversion(conversionId);
    if (!conversion) {
      throw new Error("Conversion not found");
    }
    
    // Idempotency check
    if (conversion.status === "approved") {
      console.log(`[Orchestrator] Conversion ${conversionId} already approved, skipping`);
      return;
    }
    
    const offer = await storage.getOffer(conversion.offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }
    
    const previousStatus = conversion.status;
    const publisherPayout = parseFloat(conversion.publisherPayout || "0");
    
    await storage.updateConversionStatus(conversionId, "approved");
    
    // Update balance based on previous status
    if (publisherPayout > 0) {
      const balance = await storage.getPublisherBalance(conversion.publisherId, offer.advertiserId);
      if (balance) {
        if (previousStatus === "hold") {
          // Move from hold to available
          const newHold = Math.max(0, parseFloat(balance.holdBalance || "0") - publisherPayout);
          const newAvailable = parseFloat(balance.availableBalance || "0") + publisherPayout;
          await storage.updatePublisherBalance(conversion.publisherId, offer.advertiserId, {
            holdBalance: newHold.toFixed(2),
            availableBalance: newAvailable.toFixed(2)
          });
          console.log(`[Orchestrator] Moved $${publisherPayout.toFixed(2)} from hold to available for publisher ${conversion.publisherId}`);
        } else if (previousStatus === "pending" || previousStatus === "rejected") {
          // Add to available (new approval or restoring from rejected)
          const newAvailable = parseFloat(balance.availableBalance || "0") + publisherPayout;
          await storage.updatePublisherBalance(conversion.publisherId, offer.advertiserId, {
            availableBalance: newAvailable.toFixed(2)
          });
          console.log(`[Orchestrator] Added $${publisherPayout.toFixed(2)} to available for publisher ${conversion.publisherId} (was ${previousStatus})`);
        }
      }
    }
    
    // Handle referral bonus only for pending→approved (first time approval)
    // When approving from hold, referral was already processed when conversion was created
    if (previousStatus === "pending") {
      await this.handleReferralBonus(conversion);
    }
    
    // Send webhook notification
    webhookService.notifyStatusChange(offer.advertiserId, conversionId, conversion.offerId, conversion.publisherId, "approved", {
      previousStatus,
    }).catch(console.error);
    
    // Send postback to publisher
    postbackSender.sendPostback(conversionId).catch(err => {
      console.error(`[Orchestrator] Publisher postback failed for approved conversion ${conversionId}:`, err);
    });
    
    console.log(`[Orchestrator] Conversion ${conversionId} approved (was ${previousStatus})`);
  }
}

export const orchestrator = new Orchestrator();
