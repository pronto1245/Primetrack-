import { BaseExchangeAdapter } from './base-adapter';
import { 
  ExchangeCredentials, 
  WithdrawRequest, 
  WithdrawResult, 
  BalanceResult, 
  WithdrawStatus,
  ExchangeError 
} from './types';

interface BinanceWithdrawResponse {
  id: string;
  amount?: string;
  transactionFee?: string;
  coin?: string;
  status?: number;
  address?: string;
  txId?: string;
  applyTime?: string;
  network?: string;
}

interface BinanceAccountResponse {
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

interface BinanceWithdrawHistoryResponse {
  id: string;
  amount: string;
  transactionFee: string;
  coin: string;
  status: number;
  address: string;
  txId: string;
  applyTime: string;
  network: string;
}

interface BinanceErrorResponse {
  code: number;
  msg: string;
}

export class BinanceAdapter extends BaseExchangeAdapter {
  readonly name = 'binance' as const;
  readonly baseUrl = 'https://api.binance.com';
  
  private readonly networkMappings: Record<string, string[]> = {
    USDT: ['TRC20', 'ERC20', 'BEP20', 'SOL', 'MATIC', 'ARB', 'OP'],
    BTC: ['BTC', 'BEP20', 'BEP2'],
    ETH: ['ERC20', 'BEP20', 'ARB', 'OP'],
    BNB: ['BEP20', 'BEP2'],
    TRX: ['TRC20'],
    SOL: ['SOL'],
    XRP: ['XRP'],
    DOGE: ['DOGE', 'BEP20'],
    LTC: ['LTC', 'BEP20'],
  };
  
  async initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult> {
    try {
      const timestamp = this.generateTimestamp();
      
      const params: Record<string, string | number> = {
        coin: request.currency.toUpperCase(),
        address: request.toAddress,
        amount: request.amount,
        timestamp,
      };
      
      if (request.network) {
        params.network = this.normalizeNetwork(request.network);
      }
      
      params.withdrawOrderId = request.idempotencyKey;
      
      const queryString = this.buildQueryString(params);
      const signature = this.signHmacSha256(queryString, credentials.apiSecret);
      
      const response = await this.makeRequest<BinanceWithdrawResponse>(
        'POST',
        `${this.baseUrl}/sapi/v1/capital/withdraw/apply?${queryString}&signature=${signature}`,
        {
          'X-MBX-APIKEY': credentials.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      );
      
      return {
        success: true,
        orderId: response.id,
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
        rawResponse: JSON.stringify(error),
      };
    }
  }
  
  async getBalance(credentials: ExchangeCredentials, currency: string): Promise<BalanceResult> {
    try {
      const timestamp = this.generateTimestamp();
      const params = { timestamp };
      const queryString = this.buildQueryString(params);
      const signature = this.signHmacSha256(queryString, credentials.apiSecret);
      
      const response = await this.makeRequest<BinanceAccountResponse>(
        'GET',
        `${this.baseUrl}/api/v3/account?${queryString}&signature=${signature}`,
        {
          'X-MBX-APIKEY': credentials.apiKey,
        }
      );
      
      const balance = response.balances.find(b => b.asset.toUpperCase() === currency.toUpperCase());
      
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
      const params = { timestamp };
      const queryString = this.buildQueryString(params);
      const signature = this.signHmacSha256(queryString, credentials.apiSecret);
      
      const response = await this.makeRequest<BinanceWithdrawHistoryResponse[]>(
        'GET',
        `${this.baseUrl}/sapi/v1/capital/withdraw/history?${queryString}&signature=${signature}`,
        {
          'X-MBX-APIKEY': credentials.apiKey,
        }
      );
      
      const withdraw = response.find(w => w.id === orderId);
      
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
        status: this.mapBinanceStatus(withdraw.status),
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
      const axiosError = error as { response?: { data?: BinanceErrorResponse } };
      const data = axiosError.response?.data;
      
      if (data?.code && data?.msg) {
        const code = String(data.code);
        const msg = data.msg;
        
        return {
          code,
          message: msg,
          isRetryable: ['-1001', '-1021'].includes(code),
          isRateLimited: code === '-1015',
          isInsufficientFunds: ['-4026', '-5002'].includes(code),
          isInvalidAddress: code === '-4003',
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
    if (network === 'ERC20' || network === 'BEP20' || network === 'ARB' || network === 'OP') {
      return address.startsWith('0x') && address.length === 42;
    }
    if (currency === 'BTC' && (!network || network === 'BTC')) {
      return (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) && address.length >= 26;
    }
    if (currency === 'SOL') {
      return address.length >= 32 && address.length <= 44;
    }
    
    return true;
  }
  
  private mapBinanceStatus(status: number): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (status) {
      case 0: return 'pending';
      case 1: return 'cancelled';
      case 2: return 'pending';
      case 3: return 'pending';
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
      'ARBITRUM': 'ARB',
      'OPTIMISM': 'OP',
    };
    return mappings[normalized] || normalized;
  }
}
