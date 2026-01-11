import { BaseExchangeAdapter } from './base-adapter';
import { 
  ExchangeCredentials, 
  WithdrawRequest, 
  WithdrawResult, 
  BalanceResult, 
  WithdrawStatus,
  ExchangeError 
} from './types';

interface MexcResponse {
  code?: number;
  msg?: string;
}

interface MexcWithdrawResponse extends MexcResponse {
  id?: string;
}

interface MexcBalance {
  asset: string;
  free: string;
  locked: string;
}

interface MexcAccountInfo extends MexcResponse {
  balances: MexcBalance[];
}

interface MexcWithdrawRecord {
  id: string;
  txId: string;
  status: number;
  amount: string;
  coin: string;
}

interface MexcWithdrawHistoryResponse extends MexcResponse {
  data?: MexcWithdrawRecord[];
}

export class MexcAdapter extends BaseExchangeAdapter {
  readonly name = 'mexc' as const;
  readonly baseUrl = 'https://api.mexc.com';
  
  private readonly networkMappings: Record<string, string[]> = {
    USDT: ['TRC20', 'ERC20', 'BEP20', 'SOL', 'ARB', 'OP', 'MATIC'],
    BTC: ['BTC'],
    ETH: ['ERC20', 'ARB', 'OP'],
    SOL: ['SOL'],
    DOGE: ['DOGE'],
    LTC: ['LTC'],
    XRP: ['XRP'],
  };
  
  async initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult> {
    try {
      const timestamp = this.generateTimestamp();
      const recvWindow = 5000;
      
      const params: Record<string, string | number> = {
        coin: request.currency.toUpperCase(),
        address: request.toAddress,
        amount: request.amount,
        timestamp,
        recvWindow,
      };
      
      if (request.network) {
        params.network = this.normalizeNetwork(request.network);
      }
      
      params.withdrawOrderId = request.idempotencyKey;
      
      const sortedParams = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&');
      
      const signature = this.signHmacSha256(sortedParams, credentials.apiSecret);
      const fullQueryString = `${sortedParams}&signature=${signature}`;
      
      const response = await this.makeRequest<MexcWithdrawResponse>(
        'POST',
        `${this.baseUrl}/api/v3/capital/withdraw/apply?${fullQueryString}`,
        {
          'X-MEXC-APIKEY': credentials.apiKey,
          'Content-Type': 'application/json',
        }
      );
      
      if (response.code && response.code !== 0) {
        return {
          success: false,
          status: 'failed',
          errorCode: String(response.code),
          errorMessage: response.msg || 'Unknown error',
          rawResponse: JSON.stringify(response),
        };
      }
      
      return {
        success: true,
        orderId: response.id || '',
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
      const timestamp = this.generateTimestamp();
      const recvWindow = 5000;
      
      const params: Record<string, string | number> = { timestamp, recvWindow };
      const sortedParams = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&');
      
      const signature = this.signHmacSha256(sortedParams, credentials.apiSecret);
      const fullQueryString = `${sortedParams}&signature=${signature}`;
      
      const response = await this.makeRequest<MexcAccountInfo>(
        'GET',
        `${this.baseUrl}/api/v3/account?${fullQueryString}`,
        {
          'X-MEXC-APIKEY': credentials.apiKey,
        }
      );
      
      if (response.code && response.code !== 0) {
        return {
          success: false,
          currency: currency.toUpperCase(),
          available: '0',
          locked: '0',
          errorCode: String(response.code),
          errorMessage: response.msg || 'Unknown error',
        };
      }
      
      const balance = response.balances?.find(b => b.asset.toUpperCase() === currency.toUpperCase());
      
      if (!balance) {
        return {
          success: true,
          currency: currency.toUpperCase(),
          available: '0',
          locked: '0',
        };
      }
      
      return {
        success: true,
        currency: currency.toUpperCase(),
        available: balance.free,
        locked: balance.locked,
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
      const timestamp = this.generateTimestamp();
      const recvWindow = 5000;
      
      const params: Record<string, string | number> = { timestamp, recvWindow };
      const sortedParams = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&');
      
      const signature = this.signHmacSha256(sortedParams, credentials.apiSecret);
      const fullQueryString = `${sortedParams}&signature=${signature}`;
      
      const response = await this.makeRequest<MexcWithdrawRecord[] | MexcWithdrawHistoryResponse>(
        'GET',
        `${this.baseUrl}/api/v3/capital/withdraw/history?${fullQueryString}`,
        {
          'X-MEXC-APIKEY': credentials.apiKey,
        }
      );
      
      const records = Array.isArray(response) ? response : (response as MexcWithdrawHistoryResponse).data || [];
      const withdraw = records.find(w => w.id === orderId);
      
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
        status: this.mapMexcStatus(withdraw.status),
        txHash: withdraw.txId,
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
      const axiosError = error as { response?: { data?: MexcResponse; status?: number } };
      const data = axiosError.response?.data;
      const status = axiosError.response?.status;
      
      if (data?.code) {
        const code = String(data.code);
        return {
          code,
          message: data.msg || 'Unknown error',
          isRetryable: status === 503 || code === '-1001' || code === '-1021',
          isRateLimited: status === 429 || code === '-1015',
          isInsufficientFunds: code === '-4026' || code === '-5002' || code === '30003',
          isInvalidAddress: code === '-4003' || code === '30009',
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
    if (network === 'ERC20' || network === 'BEP20' || network === 'ARB' || network === 'OP' || network === 'MATIC') {
      return address.startsWith('0x') && address.length === 42;
    }
    if (currency === 'BTC') {
      return (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) && address.length >= 26;
    }
    if (currency === 'LTC') {
      return (address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1')) && address.length >= 26;
    }
    if (currency === 'SOL') {
      return address.length >= 32 && address.length <= 44;
    }
    if (currency === 'XRP') {
      return address.startsWith('r') && address.length >= 25 && address.length <= 35;
    }
    
    return true;
  }
  
  private mapMexcStatus(status: number): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (status) {
      case 0: return 'pending';
      case 1: return 'cancelled';
      case 2: return 'pending';
      case 3: return 'processing';
      case 4: return 'processing';
      case 5: return 'failed';
      case 6: return 'completed';
      default: return 'pending';
    }
  }
  
  private normalizeNetwork(network: string): string {
    const normalized = network.toUpperCase().replace('-', '');
    const mappings: Record<string, string> = {
      'TRON': 'TRX',
      'ETHEREUM': 'ETH',
      'BSC': 'BEP20',
      'BINANCE': 'BEP20',
      'POLYGON': 'MATIC',
      'ARBITRUM': 'ARBITRUM',
      'OPTIMISM': 'OPTIMISM',
      'SOLANA': 'SOL',
    };
    return mappings[normalized] || normalized;
  }
}
