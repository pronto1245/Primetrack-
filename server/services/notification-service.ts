import { storage } from "../storage";

export class NotificationService {
  async notifyConversion(
    publisherId: string,
    advertiserId: string,
    offerName: string,
    type: "lead" | "sale" | "conversion",
    payout: number
  ) {
    const typeLabels = {
      lead: "Лид",
      sale: "Продажа",
      conversion: "Конверсия"
    };

    await storage.createNotification({
      senderId: advertiserId,
      senderRole: "advertiser",
      recipientId: publisherId,
      advertiserScopeId: advertiserId,
      type,
      title: `${typeLabels[type]} подтверждён!`,
      body: `Оффер: ${offerName}\nВыплата: $${payout.toFixed(2)}`,
      entityType: "conversion"
    });
  }

  async notifyPayoutRequest(
    advertiserId: string,
    publisherName: string,
    amount: number,
    payoutRequestId: string
  ) {
    await storage.createNotification({
      senderRole: "system",
      recipientId: advertiserId,
      type: "payout",
      title: "Новый запрос на выплату",
      body: `Партнёр ${publisherName} запросил выплату $${amount.toFixed(2)}`,
      entityType: "payout_request",
      entityId: payoutRequestId
    });
  }

  async notifyPayoutProcessed(
    publisherId: string,
    advertiserId: string,
    amount: number,
    status: "approved" | "rejected"
  ) {
    const statusText = status === "approved" ? "одобрена" : "отклонена";
    
    await storage.createNotification({
      senderId: advertiserId,
      senderRole: "advertiser",
      recipientId: publisherId,
      advertiserScopeId: advertiserId,
      type: "payout",
      title: `Выплата ${statusText}`,
      body: status === "approved" 
        ? `Ваша заявка на $${amount.toFixed(2)} одобрена и будет обработана в ближайшее время.`
        : `Ваша заявка на $${amount.toFixed(2)} была отклонена.`,
      entityType: "payout"
    });
  }

  async notifyAccessRequest(
    advertiserId: string,
    publisherName: string,
    offerName: string,
    requestId: string
  ) {
    await storage.createNotification({
      senderRole: "system",
      recipientId: advertiserId,
      type: "access_request",
      title: "Запрос доступа к офферу",
      body: `Партнёр ${publisherName} запросил доступ к офферу "${offerName}"`,
      entityType: "access_request",
      entityId: requestId
    });
  }

  async notifyAccessApproved(
    publisherId: string,
    advertiserId: string,
    offerName: string
  ) {
    await storage.createNotification({
      senderId: advertiserId,
      senderRole: "advertiser",
      recipientId: publisherId,
      advertiserScopeId: advertiserId,
      type: "offer",
      title: "Доступ к офферу одобрен!",
      body: `Вы получили доступ к офферу "${offerName}". Теперь вы можете генерировать трекинг-ссылки.`,
      entityType: "offer"
    });
  }

  async notifyAccessRejected(
    publisherId: string,
    advertiserId: string,
    offerName: string,
    reason?: string
  ) {
    await storage.createNotification({
      senderId: advertiserId,
      senderRole: "advertiser",
      recipientId: publisherId,
      advertiserScopeId: advertiserId,
      type: "offer",
      title: "Запрос на доступ отклонён",
      body: reason 
        ? `Ваш запрос на доступ к офферу "${offerName}" отклонён. Причина: ${reason}`
        : `Ваш запрос на доступ к офферу "${offerName}" был отклонён.`,
      entityType: "offer"
    });
  }

  async notifyNewPublisher(
    advertiserId: string,
    publisherName: string,
    publisherEmail: string
  ) {
    await storage.createNotification({
      senderRole: "system",
      recipientId: advertiserId,
      type: "system",
      title: "Новый партнёр",
      body: `К вашей сети присоединился новый партнёр: ${publisherName} (${publisherEmail})`,
      entityType: "publisher"
    });
  }

  async notifySystemMessage(
    recipientId: string,
    title: string,
    body: string
  ) {
    await storage.createNotification({
      senderRole: "system",
      recipientId,
      type: "system",
      title,
      body
    });
  }
}

export const notificationService = new NotificationService();
