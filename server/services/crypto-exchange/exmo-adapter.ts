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

interface ExmoResponse {
  result?: boolean;
  error?: string;
  task_id?: string;
}

interface ExmoUserInfo {
  balances?: Record<string, string>;
  reserved?: Record<string, string>;
}

interface ExmoWalletHistoryItem {
  task_id: string;
  status: string;
  txid?: string;
  amount: string;
  currency: string;
  dt: number;
  type: string;
}

interface ExmoWalletHistoryResponse {
  history?: ExmoWalletHistoryItem[];
}

export class ExmoAdapter extends BaseExchangeAdapter {
  readonly name = 'exmo' as const;
  readonly baseUrl = 'https://api.exmo.com';
  
  private readonly networkMappings: Record<string, string[]> = {
    USDT: ['TRC20', 'ERC20'],
    BTC: ['BTC'],
    ETH: ['ETH', 'ERC20'],
    LTC: ['LTC'],
    XRP: ['XRP'],
    DOGE: ['DOGE'],
    TRX: ['TRX', 'TRC20'],
  };
  
  private readonly chainMappings: Record<string, string> = {
    'TRC20': 'TRX',
    'ERC20': 'ERC20',
    'BEP20': 'BEP20',
    'BTC': 'BTC',
    'ETH': 'ERC20',
    'LTC': 'LTC',
    'XRP': 'XRP',
    'DOGE': 'DOGE',
  };
  
  private signExmo(params: string, secret: string): string {
    return crypto.createHmac('sha512', secret).update(params).digest('hex');
  }
  
  async initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult> {
    try {
      const nonce = Date.now();
      
      const params = new URLSearchParams();
      params.append('nonce', String(nonce));
      params.append('amount', request.amount);
      params.append('currency', request.currency.toUpperCase());
      params.append('address', request.toAddress);
      
      if (request.network) {
        const transport = this.chainMappings[request.network.toUpperCase()] || request.network;
        params.append('transport', transport);
      }
      
      const postData = params.toString();
      const signature = this.signExmo(postData, credentials.apiSecret);
      
      const response = await this.makeRequest<ExmoResponse>(
        'POST',
        `${this.baseUrl}/v1.1/withdraw_crypt`,
        {
          'Key': credentials.apiKey,
          'Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        postData
      );
      
      if (response.error) {
        return {
          success: false,
          status: 'failed',
          errorCode: 'EXMO_ERROR',
          errorMessage: response.error,
          rawResponse: JSON.stringify(response),
        };
      }
      
      return {
        success: true,
        orderId: response.task_id || String(nonce),
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
      const nonce = Date.now();
      
      const params = new URLSearchParams();
      params.append('nonce', String(nonce));
      const postData = params.toString();
      
      const signature = this.signExmo(postData, credentials.apiSecret);
      
      const response = await this.makeRequest<ExmoUserInfo>(
        'POST',
        `${this.baseUrl}/v1.1/user_info`,
        {
          'Key': credentials.apiKey,
          'Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        postData
      );
      
      const currencyUpper = currency.toUpperCase();
      const available = response.balances?.[currencyUpper] || '0';
      const locked = response.reserved?.[currencyUpper] || '0';
      
      return {
        success: true,
        currency: currencyUpper,
        available,
        locked,
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
      const nonce = Date.now();
      
      const params = new URLSearchParams();
      params.append('nonce', String(nonce));
      const postData = params.toString();
      
      const signature = this.signExmo(postData, credentials.apiSecret);
      
      const response = await this.makeRequest<ExmoWalletHistoryResponse>(
        'POST',
        `${this.baseUrl}/v1.1/wallet_history`,
        {
          'Key': credentials.apiKey,
          'Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        postData
      );
      
      const history = response.history || [];
      const withdraw = history.find(w => w.task_id === orderId);
      
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
        status: this.mapExmoStatus(withdraw.status),
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
      const axiosError = error as { response?: { data?: ExmoResponse; status?: number } };
      const data = axiosError.response?.data;
      const status = axiosError.response?.status;
      
      if (data?.error) {
        const errorStr = data.error;
        return {
          code: 'EXMO_ERROR',
          message: errorStr,
          isRetryable: status === 503 || errorStr.includes('50304') || errorStr.includes('temporarily'),
          isRateLimited: errorStr.includes('50304') || status === 429 || errorStr.includes('rate'),
          isInsufficientFunds: errorStr.toLowerCase().includes('insufficient') || errorStr.toLowerCase().includes('balance') || errorStr.includes('40016'),
          isInvalidAddress: errorStr.toLowerCase().includes('address') && (errorStr.toLowerCase().includes('invalid') || errorStr.toLowerCase().includes('wrong')),
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
    
    if (network === 'TRC20' || network === 'TRX' || currency === 'TRX') {
      return address.startsWith('T') && address.length === 34;
    }
    if (network === 'ERC20' || network === 'ETH' || currency === 'ETH') {
      return address.startsWith('0x') && address.length === 42;
    }
    if (currency === 'BTC') {
      return (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) && address.length >= 26;
    }
    if (currency === 'LTC') {
      return (address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1')) && address.length >= 26;
    }
    if (currency === 'XRP') {
      return address.startsWith('r') && address.length >= 25 && address.length <= 35;
    }
    if (currency === 'DOGE') {
      return address.startsWith('D') && address.length >= 26 && address.length <= 34;
    }
    
    return true;
  }
  
  private mapExmoStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'processing':
      case 'paid':
      case 'done': return 'completed';
      case 'pending':
      case 'waiting':
      case 'new': return 'pending';
      case 'in_progress':
      case 'confirming': return 'processing';
      case 'cancelled':
      case 'canceled': return 'cancelled';
      case 'failed':
      case 'error':
      case 'rejected': return 'failed';
      default: return 'processing';
    }
  }
}
