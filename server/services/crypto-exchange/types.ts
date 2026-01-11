export type ExchangeName = 'binance' | 'bybit' | 'kraken' | 'coinbase' | 'exmo' | 'mexc' | 'okx';

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

export interface WithdrawRequest {
  toAddress: string;
  amount: string;
  currency: string;
  network?: string;
  idempotencyKey: string;
}

export interface WithdrawResult {
  success: boolean;
  orderId?: string;
  txHash?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: string;
}

export interface BalanceResult {
  success: boolean;
  currency: string;
  available: string;
  locked: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface WithdrawStatus {
  success: boolean;
  orderId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  txHash?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ExchangeError {
  code: string;
  message: string;
  isRetryable: boolean;
  isRateLimited: boolean;
  isInsufficientFunds: boolean;
  isInvalidAddress: boolean;
}

export interface CryptoExchangeAdapter {
  readonly name: ExchangeName;
  
  initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult>;
  
  getBalance(credentials: ExchangeCredentials, currency: string): Promise<BalanceResult>;
  
  getWithdrawStatus(credentials: ExchangeCredentials, orderId: string): Promise<WithdrawStatus>;
  
  parseError(error: unknown): ExchangeError;
  
  getSupportedNetworks(currency: string): string[];
  
  validateAddress(address: string, currency: string, network?: string): boolean;
}
