import { storage } from "../storage";
import { decrypt } from "./encryption";
import { HttpClient } from "../lib/http-client";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

interface InlineKeyboard {
  inline_keyboard: Array<Array<{
    text: string;
    callback_data: string;
  }>>;
}

class TelegramSupportService {
  private adminChatId: string | null = null;
  private pendingReplies: Map<string, string> = new Map();

  private async getBotToken(): Promise<string | null> {
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

  private async getAdminChatId(): Promise<string | null> {
    if (this.adminChatId) return this.adminChatId;
    
    const admin = await storage.getFirstAdmin();
    if (admin?.telegramChatId) {
      this.adminChatId = admin.telegramChatId;
      return this.adminChatId;
    }
    return null;
  }

  private getHttpClient(botToken: string) {
    return new HttpClient("TelegramSupport", {
      baseUrl: "https://api.telegram.org",
      timeout: 10000,
      retries: 2,
    });
  }

  async sendMessage(
    botToken: string,
    chatId: string,
    text: string,
    replyMarkup?: InlineKeyboard
  ): Promise<number | null> {
    try {
      const client = this.getHttpClient(botToken);
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }
      const response = await client.post<{ ok: boolean; result: { message_id: number } }>(
        `/bot${botToken}/sendMessage`,
        payload
      );
      return response.result?.message_id || null;
    } catch (error) {
      console.error("[TelegramSupport] sendMessage error:", error);
      return null;
    }
  }

  async answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string): Promise<void> {
    try {
      const client = this.getHttpClient(botToken);
      await client.post(`/bot${botToken}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text: text || "",
      });
    } catch (error) {
      console.error("[TelegramSupport] answerCallbackQuery error:", error);
    }
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const botToken = await this.getBotToken();
    if (!botToken) {
      console.log("[TelegramSupport] No bot token configured");
      return;
    }

    if (update.callback_query) {
      await this.handleCallbackQuery(botToken, update.callback_query);
      return;
    }

    if (update.message?.text) {
      await this.handleMessage(botToken, update.message);
    }
  }

  private async handleMessage(
    botToken: string,
    message: NonNullable<TelegramUpdate["message"]>
  ): Promise<void> {
    const chatId = message.chat.id.toString();
    const text = message.text || "";
    const username = message.from.username || "";
    const firstName = message.from.first_name;
    const lastName = message.from.last_name || "";

    if (text.startsWith("/start")) {
      const existingUser = await storage.getUserByTelegramChatId(chatId);
      if (existingUser) {
        await this.sendMessage(botToken, chatId, 
          `👋 Привет, ${firstName}!\n\nВаш аккаунт уже привязан. Уведомления будут приходить сюда автоматически.\n\nЕсли у вас есть вопрос - просто напишите его!`
        );
      } else {
        await this.sendMessage(botToken, chatId,
          `👋 Привет, ${firstName}!\n\nЭто бот поддержки PrimeTrack.\n\nНапишите ваш вопрос, и мы ответим в ближайшее время!`
        );
      }
      return;
    }

    if (text.startsWith("/link ")) {
      const code = text.replace("/link ", "").trim().toUpperCase();
      if (code) {
        const { telegramService } = await import("./telegram-service");
        const result = await telegramService.linkAccount(code, chatId);
        if (result.success) {
          await this.sendMessage(botToken, chatId,
            "✅ Аккаунт успешно привязан!\n\nТеперь вы будете получать уведомления о лидах, продажах и выплатах."
          );
        } else {
          await this.sendMessage(botToken, chatId,
            `❌ ${result.error || "Не удалось привязать аккаунт"}`
          );
        }
      }
      return;
    }

    const adminChatId = await this.getAdminChatId();
    if (adminChatId && chatId === adminChatId) {
      const pendingConversationId = this.pendingReplies.get(chatId);
      if (pendingConversationId) {
        await this.sendReplyToUser(botToken, pendingConversationId, text);
        this.pendingReplies.delete(chatId);
        await this.sendMessage(botToken, chatId, "✅ Ответ отправлен!");
        return;
      }
      await this.sendMessage(botToken, chatId, 
        "ℹ️ Вы - администратор. Чтобы ответить на сообщение, используйте кнопку «Ответить» под сообщением пользователя."
      );
      return;
    }

    let conversation = await storage.getSupportConversationByTelegramChatId(chatId);
    
    if (!conversation) {
      conversation = await storage.createSupportConversation({
        telegramChatId: chatId,
        telegramUsername: username || null,
        telegramFirstName: firstName,
        telegramLastName: lastName || null,
        origin: "landing",
        status: "open",
        lastMessage: text.substring(0, 200),
        lastMessageAt: new Date(),
      });
    } else {
      await storage.updateSupportConversation(conversation.id, {
        lastMessage: text.substring(0, 200),
        lastMessageAt: new Date(),
        status: "open",
      });
    }

    await storage.createSupportMessage({
      conversationId: conversation.id,
      senderType: "user",
      content: text,
      telegramMessageId: message.message_id,
    });

    await this.sendMessage(botToken, chatId,
      "✅ Сообщение получено! Мы ответим в ближайшее время."
    );

    if (adminChatId) {
      const displayName = username ? `@${username}` : firstName;
      await this.sendMessage(botToken, adminChatId,
        `📩 <b>Новое сообщение</b>\n\n👤 <b>От:</b> ${displayName}${lastName ? ` ${lastName}` : ""}\n\n${this.escapeHtml(text)}`,
        {
          inline_keyboard: [
            [
              { text: "💬 Ответить", callback_data: `reply:${conversation.id}` },
              { text: "❌ Закрыть", callback_data: `close:${conversation.id}` }
            ]
          ]
        }
      );
    }
  }

  private async handleCallbackQuery(
    botToken: string,
    callback: NonNullable<TelegramUpdate["callback_query"]>
  ): Promise<void> {
    const callbackData = callback.data;
    const chatId = callback.message?.chat.id.toString();
    
    if (!chatId) {
      await this.answerCallbackQuery(botToken, callback.id, "Ошибка");
      return;
    }

    const adminChatId = await this.getAdminChatId();
    if (chatId !== adminChatId) {
      await this.answerCallbackQuery(botToken, callback.id, "Недостаточно прав");
      return;
    }

    const [action, conversationId] = callbackData.split(":");

    if (action === "reply") {
      this.pendingReplies.set(chatId, conversationId);
      await this.answerCallbackQuery(botToken, callback.id);
      await this.sendMessage(botToken, chatId,
        "✍️ Напишите ваш ответ следующим сообщением:"
      );
    } else if (action === "close") {
      await storage.updateSupportConversation(conversationId, { status: "closed" });
      await this.answerCallbackQuery(botToken, callback.id, "Тикет закрыт");
      await this.sendMessage(botToken, chatId, "✅ Тикет закрыт");
    } else if (action === "cancel") {
      this.pendingReplies.delete(chatId);
      await this.answerCallbackQuery(botToken, callback.id, "Отменено");
    }
  }

  private async sendReplyToUser(botToken: string, conversationId: string, text: string): Promise<void> {
    const conversation = await storage.getSupportConversation(conversationId);
    if (!conversation) return;

    await storage.createSupportMessage({
      conversationId,
      senderType: "admin",
      content: text,
    });

    await storage.updateSupportConversation(conversationId, {
      lastMessage: `[Ответ] ${text.substring(0, 150)}`,
      lastMessageAt: new Date(),
    });

    await this.sendMessage(botToken, conversation.telegramChatId,
      `📨 <b>Ответ от поддержки:</b>\n\n${this.escapeHtml(text)}`
    );
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async setWebhook(webhookUrl: string): Promise<boolean> {
    const botToken = await this.getBotToken();
    if (!botToken) {
      console.log("[TelegramSupport] No bot token for webhook setup");
      return false;
    }

    try {
      const client = this.getHttpClient(botToken);
      await client.post(`/bot${botToken}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      });
      console.log(`[TelegramSupport] Webhook set to: ${webhookUrl}`);
      return true;
    } catch (error) {
      console.error("[TelegramSupport] setWebhook error:", error);
      return false;
    }
  }
}

export const telegramSupportService = new TelegramSupportService();
