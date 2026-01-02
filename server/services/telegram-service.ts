import { storage } from "../storage";
import { decrypt } from "./encryption";
import { HttpClient, ExternalApiError } from "../lib/http-client";

interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

class TelegramService {
  private async getBotToken(advertiserId?: string): Promise<string | null> {
    if (advertiserId) {
      const settings = await storage.getAdvertiserSettings(advertiserId);
      if (settings?.telegramBotToken) {
        try {
          return decrypt(settings.telegramBotToken);
        } catch {
          return null;
        }
      }
    }
    
    const platformSettings = await storage.getPlatformSettings();
    if (platformSettings?.defaultTelegramBotToken) {
      try {
        return decrypt(platformSettings.defaultTelegramBotToken);
      } catch {
        return null;
      }
    }
    
    return null;
  }

  async sendMessage(message: TelegramMessage, advertiserId?: string): Promise<boolean> {
    const botToken = await this.getBotToken(advertiserId);
    
    if (!botToken) {
      console.log("[Telegram] No bot token configured");
      return false;
    }

    try {
      const client = new HttpClient("Telegram", {
        baseUrl: "https://api.telegram.org",
        timeout: 10000,
        retries: 2,
      });

      await client.post(`/bot${botToken}/sendMessage`, {
        chat_id: message.chatId,
        text: message.text,
        parse_mode: message.parseMode || "HTML",
      });

      return true;
    } catch (error) {
      if (error instanceof ExternalApiError) {
        console.error(`[Telegram] API error: ${error.message}`);
      } else {
        console.error("[Telegram] Unexpected error:", error);
      }
      return false;
    }
  }

  async notifyUser(
    userId: string,
    eventType: "click" | "lead" | "sale" | "payout" | "system",
    title: string,
    details: Record<string, any>,
    advertiserId?: string
  ): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user?.telegramChatId) {
      return false;
    }

    const shouldNotify = this.shouldNotifyUser(user, eventType);
    if (!shouldNotify) {
      return false;
    }

    const message = this.formatMessage(eventType, title, details);
    return this.sendMessage({ chatId: user.telegramChatId, text: message }, advertiserId);
  }

  private shouldNotifyUser(user: any, eventType: string): boolean {
    switch (eventType) {
      case "click":
        return user.telegramNotifyClicks === true;
      case "lead":
        return user.telegramNotifyLeads !== false;
      case "sale":
        return user.telegramNotifySales !== false;
      case "payout":
        return user.telegramNotifyPayouts !== false;
      case "system":
        return user.telegramNotifySystem !== false;
      default:
        return false;
    }
  }

  private formatMessage(eventType: string, title: string, details: Record<string, any>): string {
    const icons: Record<string, string> = {
      click: "🔗",
      lead: "📥",
      sale: "💰",
      payout: "💸",
      system: "⚙️",
    };

    const icon = icons[eventType] || "📢";
    let message = `${icon} <b>${title}</b>\n\n`;

    for (const [key, value] of Object.entries(details)) {
      if (value !== undefined && value !== null) {
        message += `<b>${key}:</b> ${value}\n`;
      }
    }

    message += `\n<i>${new Date().toLocaleString("ru-RU")}</i>`;
    return message;
  }

  async generateLinkCode(userId: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await storage.updateUser(userId, {
      telegramLinkCode: code,
      telegramLinkExpires: expiresAt,
    });

    return code;
  }

  async linkAccount(code: string, chatId: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    const user = await storage.getUserByTelegramLinkCode(code);
    
    if (!user) {
      return { success: false, error: "Неверный или истёкший код" };
    }

    if (user.telegramLinkExpires && new Date(user.telegramLinkExpires) < new Date()) {
      return { success: false, error: "Код истёк. Запросите новый код в настройках." };
    }

    await storage.updateUser(user.id, {
      telegramChatId: chatId,
      telegramLinkCode: null,
      telegramLinkExpires: null,
    });

    return { success: true, userId: user.id };
  }

  async unlinkAccount(userId: string): Promise<boolean> {
    await storage.updateUser(userId, {
      telegramChatId: null,
    });
    return true;
  }

  async notifyNewLead(
    publisherId: string,
    advertiserId: string,
    offerName: string,
    payout: number,
    geo?: string
  ): Promise<void> {
    await this.notifyUser(publisherId, "lead", "Новый лид!", {
      Оффер: offerName,
      Выплата: `$${payout.toFixed(2)}`,
      ГЕО: geo || "—",
    }, advertiserId);
  }

  async notifyNewSale(
    publisherId: string,
    advertiserId: string,
    offerName: string,
    amount: number,
    payout: number,
    geo?: string
  ): Promise<void> {
    await this.notifyUser(publisherId, "sale", "Новая продажа!", {
      Оффер: offerName,
      Сумма: `$${amount.toFixed(2)}`,
      Выплата: `$${payout.toFixed(2)}`,
      ГЕО: geo || "—",
    }, advertiserId);
  }

  async notifyPayoutApproved(
    publisherId: string,
    advertiserId: string,
    amount: number,
    method: string
  ): Promise<void> {
    await this.notifyUser(publisherId, "payout", "Выплата одобрена!", {
      Сумма: `$${amount.toFixed(2)}`,
      Метод: method,
      Статус: "Ожидает перевода",
    }, advertiserId);
  }

  async notifyPayoutPaid(
    publisherId: string,
    advertiserId: string,
    amount: number,
    method: string,
    transactionId?: string
  ): Promise<void> {
    await this.notifyUser(publisherId, "payout", "Выплата отправлена!", {
      Сумма: `$${amount.toFixed(2)}`,
      Метод: method,
      "ID транзакции": transactionId || "—",
    }, advertiserId);
  }
}

export const telegramService = new TelegramService();
