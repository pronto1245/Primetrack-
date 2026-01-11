import crypto from 'crypto';
import { HttpClient } from '../../lib/http-client';
import { 
  ExchangeName, 
  ExchangeCredentials, 
  WithdrawRequest, 
  WithdrawResult, 
  BalanceResult, 
  WithdrawStatus,
  ExchangeError,
  CryptoExchangeAdapter 
} from './types';

const cryptoHttpClient = new HttpClient("CryptoExchange", {
  timeout: 30000,
  retries: 2,
});

export abstract class BaseExchangeAdapter implements CryptoExchangeAdapter {
  abstract readonly name: ExchangeName;
  abstract readonly baseUrl: string;
  
  abstract initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult>;
  abstract getBalance(credentials: ExchangeCredentials, currency: string): Promise<BalanceResult>;
  abstract getWithdrawStatus(credentials: ExchangeCredentials, orderId: string): Promise<WithdrawStatus>;
  abstract getSupportedNetworks(currency: string): string[];
  abstract validateAddress(address: string, currency: string, network?: string): boolean;
  
  parseError(error: unknown): ExchangeError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        isRetryable: message.includes('timeout') || message.includes('network'),
        isRateLimited: message.includes('rate') || message.includes('limit'),
        isInsufficientFunds: message.includes('insufficient') || message.includes('balance'),
        isInvalidAddress: message.includes('address') && message.includes('invalid'),
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      isRetryable: false,
      isRateLimited: false,
      isInsufficientFunds: false,
      isInvalidAddress: false,
    };
  }
  
  protected signHmacSha256(message: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }
  
  protected signHmacSha512(message: string, secret: string): string {
    return crypto.createHmac('sha512', secret).update(message).digest('hex');
  }
  
  protected generateTimestamp(): number {
    return Date.now();
  }
  
  protected generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  protected buildQueryString(params: Record<string, string | number | undefined>): string {
    const filtered = Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .sort()
      .join('&');
    return filtered;
  }
  
  protected async makeRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    headers: Record<string, string>,
    body?: string | Record<string, unknown>
  ): Promise<T> {
    const response = await cryptoHttpClient.request<T>(url, {
      method,
      headers,
      body,
      timeout: 30000,
    });
    return response;
  }
}
