import { BaseExchangeAdapter } from './base-adapter';
import { 
  ExchangeCredentials, 
  WithdrawRequest, 
  WithdrawResult, 
  BalanceResult, 
  WithdrawStatus,
  ExchangeError 
} from './types';

interface BybitResponse<T> {
  retCode: number;
  retMsg: string;
  result: T;
}

interface BybitWithdrawResult {
  id: string;
}

interface BybitBalanceResult {
  list: Array<{
    accountType: string;
    coin: Array<{
      coin: string;
      walletBalance: string;
      locked: string;
      availableToWithdraw: string;
    }>;
  }>;
}

interface BybitWithdrawRecord {
  withdrawId: string;
  txID: string;
  status: string;
}

export class BybitAdapter extends BaseExchangeAdapter {
  readonly name = 'bybit' as const;
  readonly baseUrl = 'https://api.bybit.com';
  
  private readonly networkMappings: Record<string, string[]> = {
    USDT: ['TRC20', 'ERC20', 'SOL', 'ARB', 'OP', 'BSC'],
    BTC: ['BTC'],
    ETH: ['ERC20', 'ARB', 'OP'],
    SOL: ['SOL'],
  };
  
  private generateHeaders(credentials: ExchangeCredentials, timestamp: number, params: string): Record<string, string> {
    const recvWindow = '5000';
    const signStr = `${timestamp}${credentials.apiKey}${recvWindow}${params}`;
    const signature = this.signHmacSha256(signStr, credentials.apiSecret);
    
    return {
      'X-BAPI-API-KEY': credentials.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': String(timestamp),
      'X-BAPI-RECV-WINDOW': recvWindow,
      'Content-Type': 'application/json',
    };
  }
  
  async initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult> {
    try {
      const timestamp = this.generateTimestamp();
      
      const body = {
        coin: request.currency.toUpperCase(),
        chain: this.normalizeNetwork(request.network || 'TRC20'),
        address: request.toAddress,
        amount: request.amount,
        timestamp,
        forceChain: 1,
        accountType: 'FUND',
      };
      
      const bodyStr = JSON.stringify(body);
      const headers = this.generateHeaders(credentials, timestamp, bodyStr);
      
      const response = await this.makeRequest<BybitResponse<BybitWithdrawResult>>(
        'POST',
        `${this.baseUrl}/v5/asset/withdraw/create`,
        headers,
        body
      );
      
      if (response.retCode !== 0) {
        return {
          success: false,
          status: 'failed',
          errorCode: String(response.retCode),
          errorMessage: response.retMsg,
          rawResponse: JSON.stringify(response),
        };
      }
      
      return {
        success: true,
        orderId: response.result.id,
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
      const queryString = `accountType=FUND&coin=${currency.toUpperCase()}`;
      const headers = this.generateHeaders(credentials, timestamp, queryString);
      
      const response = await this.makeRequest<BybitResponse<BybitBalanceResult>>(
        'GET',
        `${this.baseUrl}/v5/asset/transfer/query-asset-info?${queryString}`,
        headers
      );
      
      if (response.retCode !== 0) {
        return {
          success: false,
          currency: currency.toUpperCase(),
          available: '0',
          locked: '0',
          errorCode: String(response.retCode),
          errorMessage: response.retMsg,
        };
      }
      
      const account = response.result.list[0];
      const coin = account?.coin.find(c => c.coin.toUpperCase() === currency.toUpperCase());
      
      return {
        success: true,
        currency: currency.toUpperCase(),
        available: coin?.availableToWithdraw || '0',
        locked: coin?.locked || '0',
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
      const queryString = `withdrawID=${orderId}`;
      const headers = this.generateHeaders(credentials, timestamp, queryString);
      
      const response = await this.makeRequest<BybitResponse<{ rows: BybitWithdrawRecord[] }>>(
        'GET',
        `${this.baseUrl}/v5/asset/withdraw/query-record?${queryString}`,
        headers
      );
      
      if (response.retCode !== 0 || !response.result.rows.length) {
        return {
          success: false,
          orderId,
          status: 'failed',
          errorCode: 'NOT_FOUND',
          errorMessage: 'Withdrawal not found',
        };
      }
      
      const record = response.result.rows[0];
      
      return {
        success: true,
        orderId,
        status: this.mapBybitStatus(record.status),
        txHash: record.txID,
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
      const axiosError = error as { response?: { data?: BybitResponse<unknown> } };
      const data = axiosError.response?.data;
      
      if (data?.retCode !== undefined) {
        const code = String(data.retCode);
        return {
          code,
          message: data.retMsg || 'Unknown error',
          isRetryable: ['10002', '10018'].includes(code),
          isRateLimited: code === '10006',
          isInsufficientFunds: ['131212', '131001'].includes(code),
          isInvalidAddress: code === '131215',
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
    if (network === 'ERC20' || network === 'BSC' || network === 'ARB' || network === 'OP') {
      return address.startsWith('0x') && address.length === 42;
    }
    
    return true;
  }
  
  private mapBybitStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (status) {
      case 'SecurityCheck':
      case 'Pending': return 'pending';
      case 'success': return 'completed';
      case 'CancelByUser':
      case 'Reject': return 'cancelled';
      case 'Fail': return 'failed';
      default: return 'processing';
    }
  }
  
  private normalizeNetwork(network: string): string {
    const mappings: Record<string, string> = {
      'TRC20': 'TRX',
      'ERC20': 'ETH',
      'BEP20': 'BSC',
    };
    return mappings[network.toUpperCase()] || network;
  }
}
