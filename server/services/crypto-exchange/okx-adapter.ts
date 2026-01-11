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

interface OkxResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

interface OkxWithdrawResult {
  wdId: string;
  ccy: string;
  amt: string;
  chain: string;
}

interface OkxBalance {
  ccy: string;
  availBal: string;
  frozenBal: string;
  bal: string;
}

interface OkxWithdrawRecord {
  wdId: string;
  txId: string;
  state: string;
  ccy: string;
  amt: string;
  chain: string;
  fee: string;
}

export class OkxAdapter extends BaseExchangeAdapter {
  readonly name = 'okx' as const;
  readonly baseUrl = 'https://www.okx.com';
  
  private readonly networkMappings: Record<string, string[]> = {
    USDT: ['USDT-TRC20', 'USDT-ERC20', 'USDT-Polygon', 'USDT-Arbitrum One', 'USDT-Optimism', 'USDT-BSC'],
    BTC: ['BTC-Bitcoin'],
    ETH: ['ETH-ERC20', 'ETH-Arbitrum One', 'ETH-Optimism'],
    SOL: ['SOL-Solana'],
    LTC: ['LTC-Litecoin'],
    XRP: ['XRP-Ripple'],
    DOGE: ['DOGE-Dogecoin'],
    TRX: ['TRX-TRC20'],
  };
  
  private readonly chainNormalization: Record<string, Record<string, string>> = {
    USDT: {
      'TRC20': 'USDT-TRC20',
      'ERC20': 'USDT-ERC20',
      'BEP20': 'USDT-BSC',
      'POLYGON': 'USDT-Polygon',
      'MATIC': 'USDT-Polygon',
      'ARB': 'USDT-Arbitrum One',
      'ARBITRUM': 'USDT-Arbitrum One',
      'OP': 'USDT-Optimism',
      'OPTIMISM': 'USDT-Optimism',
    },
    ETH: {
      'ERC20': 'ETH-ERC20',
      'ARB': 'ETH-Arbitrum One',
      'ARBITRUM': 'ETH-Arbitrum One',
      'OP': 'ETH-Optimism',
      'OPTIMISM': 'ETH-Optimism',
    },
    BTC: {
      'BTC': 'BTC-Bitcoin',
      'BITCOIN': 'BTC-Bitcoin',
    },
    SOL: {
      'SOL': 'SOL-Solana',
      'SOLANA': 'SOL-Solana',
    },
    LTC: {
      'LTC': 'LTC-Litecoin',
      'LITECOIN': 'LTC-Litecoin',
    },
    TRX: {
      'TRC20': 'TRX-TRC20',
      'TRX': 'TRX-TRC20',
    },
  };
  
  private signOkx(timestamp: string, method: string, path: string, body: string, secret: string): string {
    const message = timestamp + method.toUpperCase() + path + body;
    return crypto.createHmac('sha256', secret).update(message).digest('base64');
  }
  
  private getHeaders(credentials: ExchangeCredentials, method: string, path: string, body: string = ''): Record<string, string> {
    const timestamp = new Date().toISOString();
    const signature = this.signOkx(timestamp, method, path, body, credentials.apiSecret);
    
    if (!credentials.passphrase) {
      throw new Error('OKX requires passphrase');
    }
    
    return {
      'OK-ACCESS-KEY': credentials.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': credentials.passphrase,
      'Content-Type': 'application/json',
    };
  }
  
  async initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult> {
    try {
      if (!credentials.passphrase) {
        return {
          success: false,
          status: 'failed',
          errorCode: 'MISSING_PASSPHRASE',
          errorMessage: 'OKX requires API passphrase',
        };
      }
      
      const path = '/api/v5/asset/withdrawal';
      const chain = this.normalizeChain(request.currency, request.network);
      
      const bodyObj = {
        ccy: request.currency.toUpperCase(),
        amt: request.amount,
        dest: '4',
        toAddr: request.toAddress,
        fee: '0',
        chain: chain,
        clientId: request.idempotencyKey,
      };
      
      const body = JSON.stringify(bodyObj);
      const headers = this.getHeaders(credentials, 'POST', path, body);
      
      const response = await this.makeRequest<OkxResponse<OkxWithdrawResult>>(
        'POST',
        `${this.baseUrl}${path}`,
        headers,
        body
      );
      
      if (response.code !== '0') {
        return {
          success: false,
          status: 'failed',
          errorCode: response.code,
          errorMessage: response.msg,
          rawResponse: JSON.stringify(response),
        };
      }
      
      if (!response.data || response.data.length === 0) {
        return {
          success: false,
          status: 'failed',
          errorCode: 'NO_DATA',
          errorMessage: 'No withdrawal data returned',
          rawResponse: JSON.stringify(response),
        };
      }
      
      return {
        success: true,
        orderId: response.data[0].wdId,
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
      if (!credentials.passphrase) {
        return {
          success: false,
          currency: currency.toUpperCase(),
          available: '0',
          locked: '0',
          errorCode: 'MISSING_PASSPHRASE',
          errorMessage: 'OKX requires API passphrase',
        };
      }
      
      const path = `/api/v5/asset/balances?ccy=${currency.toUpperCase()}`;
      const headers = this.getHeaders(credentials, 'GET', path);
      
      const response = await this.makeRequest<OkxResponse<OkxBalance>>(
        'GET',
        `${this.baseUrl}${path}`,
        headers
      );
      
      if (response.code !== '0') {
        return {
          success: false,
          currency: currency.toUpperCase(),
          available: '0',
          locked: '0',
          errorCode: response.code,
          errorMessage: response.msg,
        };
      }
      
      const balance = response.data?.find(b => b.ccy.toUpperCase() === currency.toUpperCase());
      
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
        available: balance.availBal,
        locked: balance.frozenBal,
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
      if (!credentials.passphrase) {
        return {
          success: false,
          orderId,
          status: 'failed',
          errorCode: 'MISSING_PASSPHRASE',
          errorMessage: 'OKX requires API passphrase',
        };
      }
      
      const path = `/api/v5/asset/withdrawal-history?wdId=${orderId}`;
      const headers = this.getHeaders(credentials, 'GET', path);
      
      const response = await this.makeRequest<OkxResponse<OkxWithdrawRecord>>(
        'GET',
        `${this.baseUrl}${path}`,
        headers
      );
      
      if (response.code !== '0') {
        return {
          success: false,
          orderId,
          status: 'failed',
          errorCode: response.code,
          errorMessage: response.msg,
        };
      }
      
      if (!response.data || response.data.length === 0) {
        return {
          success: false,
          orderId,
          status: 'failed',
          errorCode: 'NOT_FOUND',
          errorMessage: 'Withdrawal not found',
        };
      }
      
      const record = response.data[0];
      
      return {
        success: true,
        orderId,
        status: this.mapOkxStatus(record.state),
        txHash: record.txId,
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
      const axiosError = error as { response?: { data?: OkxResponse<unknown>; status?: number } };
      const data = axiosError.response?.data;
      const status = axiosError.response?.status;
      
      if (data?.code) {
        const code = data.code;
        return {
          code,
          message: data.msg || 'Unknown error',
          isRetryable: status === 503 || code === '50001' || code === '50004',
          isRateLimited: status === 429 || code === '50011' || code === '50013',
          isInsufficientFunds: code === '58350' || code === '58203',
          isInvalidAddress: code === '58209' || code === '58211',
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
    
    const isTron = network?.includes('TRC20') || network?.includes('TRX') || currency === 'TRX';
    if (isTron) {
      return address.startsWith('T') && address.length === 34;
    }
    
    const isEvm = network?.includes('ERC20') || network?.includes('Ethereum') || 
                  network?.includes('Arbitrum') || network?.includes('Optimism') || 
                  network?.includes('Polygon') || network?.includes('BSC') ||
                  currency === 'ETH';
    if (isEvm) {
      return address.startsWith('0x') && address.length === 42;
    }
    
    if (currency === 'BTC' || network?.includes('Bitcoin')) {
      return (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) && address.length >= 26;
    }
    
    if (currency === 'LTC' || network?.includes('Litecoin')) {
      return (address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1')) && address.length >= 26;
    }
    
    if (currency === 'SOL' || network?.includes('Solana')) {
      return address.length >= 32 && address.length <= 44;
    }
    
    if (currency === 'XRP' || network?.includes('Ripple')) {
      return address.startsWith('r') && address.length >= 25 && address.length <= 35;
    }
    
    if (currency === 'DOGE' || network?.includes('Dogecoin')) {
      return address.startsWith('D') && address.length >= 26 && address.length <= 34;
    }
    
    return true;
  }
  
  private mapOkxStatus(state: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (state) {
      case '2': return 'completed';
      case '0':
      case '-3': return 'pending';
      case '1':
      case '4':
      case '5': return 'processing';
      case '-1':
      case '-2': return 'failed';
      case '3': return 'cancelled';
      default: return 'processing';
    }
  }
  
  private normalizeChain(currency: string, network?: string): string {
    const currencyUpper = currency.toUpperCase();
    
    if (!network) {
      const defaults: Record<string, string> = {
        USDT: 'USDT-TRC20',
        BTC: 'BTC-Bitcoin',
        ETH: 'ETH-ERC20',
        SOL: 'SOL-Solana',
        LTC: 'LTC-Litecoin',
        TRX: 'TRX-TRC20',
        XRP: 'XRP-Ripple',
        DOGE: 'DOGE-Dogecoin',
      };
      return defaults[currencyUpper] || `${currencyUpper}-${currencyUpper}`;
    }
    
    const networkUpper = network.toUpperCase();
    const currencyMappings = this.chainNormalization[currencyUpper];
    
    if (currencyMappings && currencyMappings[networkUpper]) {
      return currencyMappings[networkUpper];
    }
    
    return `${currencyUpper}-${network}`;
  }
}
