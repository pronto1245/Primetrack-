import { db } from "../../db";
import { cryptoPayoutQueue, cryptoPayoutLogs, exchangeApiKeys } from "@shared/schema";
import { eq, and, lte, isNull, or } from "drizzle-orm";
import { getExchangeAdapter, isExchangeSupported } from "./crypto-exchange";
import { ExchangeCredentials, WithdrawRequest, ExchangeName } from "./crypto-exchange/types";
import { decrypt } from "./encryption";

interface ProcessResult {
  success: boolean;
  error?: string;
  exchangeOrderId?: string;
  txHash?: string;
}

export class CryptoPayoutOrchestrator {
  private isProcessing = false;

  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    try {
      const pendingPayouts = await db
        .select()
        .from(cryptoPayoutQueue)
        .where(
          and(
            or(eq(cryptoPayoutQueue.status, "pending"), eq(cryptoPayoutQueue.status, "retrying")),
            or(isNull(cryptoPayoutQueue.nextRetryAt), lte(cryptoPayoutQueue.nextRetryAt, new Date()))
          )
        )
        .limit(10);

      for (const payout of pendingPayouts) {
        const result = await this.processSinglePayout(payout);
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed };
  }

  async processSinglePayout(payout: typeof cryptoPayoutQueue.$inferSelect): Promise<ProcessResult> {
    await db
      .update(cryptoPayoutQueue)
      .set({ status: "processing", attempts: payout.attempts + 1 })
      .where(eq(cryptoPayoutQueue.id, payout.id));

    try {
      const apiKeyRecord = await db
        .select()
        .from(exchangeApiKeys)
        .where(eq(exchangeApiKeys.id, payout.exchangeApiKeyId))
        .then((rows) => rows[0]);

      if (!apiKeyRecord) {
        throw new Error("Exchange API key not found");
      }

      if (!isExchangeSupported(apiKeyRecord.exchange)) {
        throw new Error(`Exchange ${apiKeyRecord.exchange} is not supported`);
      }

      const adapter = getExchangeAdapter(apiKeyRecord.exchange as ExchangeName);

      const credentials: ExchangeCredentials = {
        apiKey: decrypt(apiKeyRecord.apiKeyEncrypted),
        apiSecret: decrypt(apiKeyRecord.apiSecretEncrypted),
        passphrase: apiKeyRecord.passphraseEncrypted
          ? decrypt(apiKeyRecord.passphraseEncrypted)
          : undefined,
      };

      const withdrawRequest: WithdrawRequest = {
        toAddress: payout.toAddress,
        amount: payout.amount,
        currency: payout.currency,
        network: payout.network || undefined,
        idempotencyKey: payout.idempotencyKey,
      };

      const result = await adapter.initiateWithdrawal(credentials, withdrawRequest);

      await db
        .update(cryptoPayoutQueue)
        .set({
          status: "dispatched",
          exchangeOrderId: result.orderId,
          exchangeTxHash: result.txHash,
          exchangeResponse: JSON.stringify(result),
        })
        .where(eq(cryptoPayoutQueue.id, payout.id));

      await this.logPayout(payout.id, "dispatched", "Withdrawal initiated successfully", {
        orderId: result.orderId,
        txHash: result.txHash,
      });

      return { success: true, exchangeOrderId: result.orderId, txHash: result.txHash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const shouldRetry = this.shouldRetry(error, payout.attempts, payout.maxAttempts);

      if (shouldRetry) {
        const nextRetry = this.calculateNextRetry(payout.attempts);
        await db
          .update(cryptoPayoutQueue)
          .set({
            status: "retrying",
            lastError: errorMessage,
            nextRetryAt: nextRetry,
          })
          .where(eq(cryptoPayoutQueue.id, payout.id));

        await this.logPayout(payout.id, "retry_scheduled", errorMessage, { nextRetryAt: nextRetry.toISOString() });
      } else {
        await db
          .update(cryptoPayoutQueue)
          .set({
            status: "failed",
            lastError: errorMessage,
          })
          .where(eq(cryptoPayoutQueue.id, payout.id));

        await this.logPayout(payout.id, "failed", errorMessage);
      }

      return { success: false, error: errorMessage };
    }
  }

  async checkWithdrawalStatuses(): Promise<void> {
    const dispatchedPayouts = await db
      .select()
      .from(cryptoPayoutQueue)
      .where(eq(cryptoPayoutQueue.status, "dispatched"))
      .limit(20);

    for (const payout of dispatchedPayouts) {
      try {
        if (!payout.exchangeOrderId) continue;

        const apiKeyRecord = await db
          .select()
          .from(exchangeApiKeys)
          .where(eq(exchangeApiKeys.id, payout.exchangeApiKeyId))
          .then((rows) => rows[0]);

        if (!apiKeyRecord || !isExchangeSupported(apiKeyRecord.exchange)) continue;

        const adapter = getExchangeAdapter(apiKeyRecord.exchange as ExchangeName);

        const credentials: ExchangeCredentials = {
          apiKey: decrypt(apiKeyRecord.apiKeyEncrypted),
          apiSecret: decrypt(apiKeyRecord.apiSecretEncrypted),
          passphrase: apiKeyRecord.passphraseEncrypted
            ? decrypt(apiKeyRecord.passphraseEncrypted)
            : undefined,
        };

        const status = await adapter.getWithdrawStatus(credentials, payout.exchangeOrderId);

        if (status.status === "completed") {
          await db
            .update(cryptoPayoutQueue)
            .set({
              status: "confirmed",
              exchangeTxHash: status.txHash || payout.exchangeTxHash,
            })
            .where(eq(cryptoPayoutQueue.id, payout.id));

          await this.logPayout(payout.id, "confirmed", "Withdrawal confirmed on blockchain", {
            txHash: status.txHash,
          });
        } else if (status.status === "failed") {
          const failReason = status.errorMessage || "Withdrawal failed on exchange";
          await db
            .update(cryptoPayoutQueue)
            .set({
              status: "failed",
              lastError: failReason,
            })
            .where(eq(cryptoPayoutQueue.id, payout.id));

          await this.logPayout(payout.id, "failed", failReason);
        }
      } catch {
      }
    }
  }

  async enqueuePayout(params: {
    payoutRequestId: string;
    exchangeApiKeyId: string;
    toAddress: string;
    amount: string;
    currency: string;
    network?: string;
  }): Promise<string> {
    const idempotencyKey = `payout_${params.payoutRequestId}_${Date.now()}`;

    const [result] = await db
      .insert(cryptoPayoutQueue)
      .values({
        payoutRequestId: params.payoutRequestId,
        exchangeApiKeyId: params.exchangeApiKeyId,
        toAddress: params.toAddress,
        amount: params.amount,
        currency: params.currency,
        network: params.network,
        idempotencyKey,
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
      })
      .returning({ id: cryptoPayoutQueue.id });

    await this.logPayout(result.id, "enqueued", "Payout added to queue");

    return result.id;
  }

  private shouldRetry(error: unknown, currentAttempts: number, maxAttempts: number): boolean {
    if (currentAttempts >= maxAttempts) return false;

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

    const nonRetryablePatterns = [
      "insufficient",
      "invalid address",
      "address format",
      "not supported",
      "permission denied",
      "authentication",
      "invalid api",
    ];

    return !nonRetryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  private calculateNextRetry(attempts: number): Date {
    const baseDelay = 60 * 1000;
    const delay = baseDelay * Math.pow(2, attempts);
    const jitter = delay * 0.1 * Math.random();
    return new Date(Date.now() + delay + jitter);
  }

  private async logPayout(
    payoutQueueId: string,
    operation: string,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const payout = await db
        .select()
        .from(cryptoPayoutQueue)
        .where(eq(cryptoPayoutQueue.id, payoutQueueId))
        .then((rows) => rows[0]);

      if (!payout) return;

      const apiKey = await db
        .select()
        .from(exchangeApiKeys)
        .where(eq(exchangeApiKeys.id, payout.exchangeApiKeyId))
        .then((rows) => rows[0]);

      const isSuccess = ["dispatched", "confirmed", "enqueued"].includes(operation);

      await db.insert(cryptoPayoutLogs).values({
        payoutQueueId,
        payoutRequestId: payout.payoutRequestId,
        advertiserId: apiKey?.advertiserId || "",
        operation,
        exchange: apiKey?.exchange || "unknown",
        success: isSuccess,
        errorMessage: isSuccess ? undefined : message,
        responsePayload: details ? JSON.stringify(details) : undefined,
      });
    } catch {
    }
  }
}

export const cryptoPayoutOrchestrator = new CryptoPayoutOrchestrator();
