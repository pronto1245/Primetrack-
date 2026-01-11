import crypto from 'crypto';
import { BaseExchangeAdapter } from './base-adapter';
import { 
  ExchangeCredentials, 
  WithdrawRequest, 
  WithdrawResult, 
  BalanceResult, 
  WithdrawStatus,
  ExchangeError 
} from './types';

interface KrakenResponse<T> {
  error: string[];
  result: T;
}

interface KrakenWithdrawResult {
  refid: string;
}

interface KrakenBalanceResult {
  [asset: string]: string;
}

interface KrakenWithdrawInfo {
  refid: string;
  status: string;
  txid?: string;
  amount: string;
  fee: string;
  method: string;
  aclass: string;
  asset: string;
}

export class KrakenAdapter extends BaseExchangeAdapter {
  readonly name = 'kraken' as const;
  readonly baseUrl = 'https://api.kraken.com';
  
  private static nonceCounter = Date.now() * 1000;
  
  private readonly networkMappings: Record<string, string[]> = {
    USDT: ['TRC20', 'ERC20'],
    BTC: ['Bitcoin'],
    ETH: ['Ethereum'],
    XRP: ['Ripple'],
    LTC: ['Litecoin'],
    DOGE: ['Dogecoin'],
  };

  private readonly assetMappings: Record<string, string> = {
    BTC: 'XBT',
    USDT: 'USDT',
    ETH: 'XETH',
    XRP: 'XXRP',
    LTC: 'XLTC',
    DOGE: 'XXDG',
  };
  
  private readonly krakenAssetPrefixes: Record<string, string[]> = {
    BTC: ['XXBT', 'XBT'],
    ETH: ['XETH', 'ETH'],
    USDT: ['USDT'],
    XRP: ['XXRP', 'XRP'],
    LTC: ['XLTC', 'LTC'],
    DOGE: ['XXDG', 'DOGE'],
  };
  
  private getMonotonicNonce(): number {
    KrakenAdapter.nonceCounter++;
    return KrakenAdapter.nonceCounter;
  }
  
  private signKraken(path: string, postData: string, secret: string, nonce: number): string {
    const message = nonce + postData;
    const hash = crypto.createHash('sha256').update(message).digest();
    const secretBuffer = Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha512', secretBuffer);
    hmac.update(Buffer.concat([Buffer.from(path), hash]));
    return hmac.digest('base64');
  }
  
  async initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult> {
    try {
      const nonce = this.getMonotonicNonce();
      const path = '/0/private/Withdraw';
      
      const asset = this.assetMappings[request.currency.toUpperCase()] || request.currency.toUpperCase();
      const key = credentials.passphrase || `${request.currency.toUpperCase()}_${request.network || 'default'}`;
      
      const params = new URLSearchParams();
      params.append('nonce', String(nonce));
      params.append('asset', asset);
      params.append('key', key);
      params.append('amount', request.amount);
      
      const postData = params.toString();
      const signature = this.signKraken(path, postData, credentials.apiSecret, nonce);
      
      const response = await this.makeRequest<KrakenResponse<KrakenWithdrawResult>>(
        'POST',
        `${this.baseUrl}${path}`,
        {
          'API-Key': credentials.apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        postData
      );
      
      if (response.error && response.error.length > 0) {
        return {
          success: false,
          status: 'failed',
          errorCode: 'KRAKEN_ERROR',
          errorMessage: response.error.join(', '),
          rawResponse: JSON.stringify(response),
        };
      }
      
      return {
        success: true,
        orderId: response.result.refid,
        status: 'pending',
        rawResponse: JSON.stringify(response),
      };
    } catch (error) {
      const parsed = this.parseError(error);
      return {
        success: false,
        status: 'failed',
        errorCode: parsed.code,
        errorMessage: parsed.message,
      };
    }
  }
  
  async getBalance(credentials: ExchangeCredentials, currency: string): Promise<BalanceResult> {
    try {
      const nonce = this.getMonotonicNonce();
      const path = '/0/private/Balance';
      
      const params = new URLSearchParams();
      params.append('nonce', String(nonce));
      const postData = params.toString();
      
      const signature = this.signKraken(path, postData, credentials.apiSecret, nonce);
      
      const response = await this.makeRequest<KrakenResponse<KrakenBalanceResult>>(
        'POST',
        `${this.baseUrl}${path}`,
        {
          'API-Key': credentials.apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        postData
      );
      
      if (response.error && response.error.length > 0) {
        return {
          success: false,
          currency: currency.toUpperCase(),
          available: '0',
          locked: '0',
          errorCode: 'KRAKEN_ERROR',
          errorMessage: response.error.join(', '),
        };
      }
      
      const prefixes = this.krakenAssetPrefixes[currency.toUpperCase()] || [currency.toUpperCase()];
      let balance = '0';
      
      for (const prefix of prefixes) {
        if (response.result[prefix]) {
          balance = response.result[prefix];
          break;
        }
      }
      
      return {
        success: true,
        currency: currency.toUpperCase(),
        available: balance,
        locked: '0',
      };
    } catch (error) {
      const parsed = this.parseError(error);
      return {
        success: false,
        currency: currency.toUpperCase(),
        available: '0',
        locked: '0',
        errorCode: parsed.code,
        errorMessage: parsed.message,
      };
    }
  }
  
  async getWithdrawStatus(credentials: ExchangeCredentials, orderId: string): Promise<WithdrawStatus> {
    try {
      const nonce = this.getMonotonicNonce();
      const path = '/0/private/WithdrawStatus';
      
      const params = new URLSearchParams();
      params.append('nonce', String(nonce));
      const postData = params.toString();
      
      const signature = this.signKraken(path, postData, credentials.apiSecret, nonce);
      
      const response = await this.makeRequest<KrakenResponse<KrakenWithdrawInfo[]>>(
        'POST',
        `${this.baseUrl}${path}`,
        {
          'API-Key': credentials.apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        postData
      );
      
      if (response.error && response.error.length > 0) {
        return {
          success: false,
          orderId,
          status: 'failed',
          errorCode: 'KRAKEN_ERROR',
          errorMessage: response.error.join(', '),
        };
      }
      
      const withdrawals = Array.isArray(response.result) ? response.result : [];
      const withdraw = withdrawals.find(w => w.refid === orderId);
      
      if (!withdraw) {
        return {
          success: false,
          orderId,
          status: 'failed',
          errorCode: 'NOT_FOUND',
          errorMessage: 'Withdrawal not found',
        };
      }
      
      return {
        success: true,
        orderId,
        status: this.mapKrakenStatus(withdraw.status),
        txHash: withdraw.txid,
      };
    } catch (error) {
      const parsed = this.parseError(error);
      return {
        success: false,
        orderId,
        status: 'failed',
        errorCode: parsed.code,
        errorMessage: parsed.message,
      };
    }
  }
  
  parseError(error: unknown): ExchangeError {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: KrakenResponse<unknown>; status?: number } };
      const data = axiosError.response?.data;
      const status = axiosError.response?.status;
      
      if (data?.error && data.error.length > 0) {
        const errorStr = data.error[0];
        return {
          code: 'KRAKEN_ERROR',
          message: errorStr,
          isRetryable: errorStr.includes('Rate limit') || errorStr.includes('Temporary') || status === 520,
          isRateLimited: errorStr.includes('Rate limit') || errorStr.includes('EAPI:Rate limit'),
          isInsufficientFunds: errorStr.includes('Insufficient funds') || errorStr.includes('EFunds'),
          isInvalidAddress: errorStr.includes('Invalid') && errorStr.includes('address'),
        };
      }
    }
    return super.parseError(error);
  }
  
  getSupportedNetworks(currency: string): string[] {
    return this.networkMappings[currency.toUpperCase()] || [];
  }
  
  validateAddress(address: string, currency: string, network?: string): boolean {
    if (!address || address.length < 10) return false;
    
    if (network === 'TRC20') {
      return address.startsWith('T') && address.length === 34;
    }
    if (network === 'ERC20' || network === 'Ethereum') {
      return address.startsWith('0x') && address.length === 42;
    }
    if (currency === 'BTC' || currency === 'XBT') {
      return (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) && address.length >= 26;
    }
    if (currency === 'LTC') {
      return (address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1')) && address.length >= 26;
    }
    if (currency === 'XRP') {
      return address.startsWith('r') && address.length >= 25 && address.length <= 35;
    }
    
    return true;
  }
  
  private mapKrakenStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    const statusLower = status.toLowerCase();
    if (statusLower === 'success' || statusLower === 'complete') return 'completed';
    if (statusLower === 'pending' || statusLower === 'initial') return 'pending';
    if (statusLower === 'settled' || statusLower === 'onhold' || statusLower === 'sending') return 'processing';
    if (statusLower === 'canceled' || statusLower === 'cancelled') return 'cancelled';
    if (statusLower === 'failure' || statusLower === 'failed') return 'failed';
    return 'processing';
  }
}
