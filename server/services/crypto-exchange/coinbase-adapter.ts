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

interface CoinbaseAdvancedResponse {
  success?: boolean;
  error_response?: {
    error: string;
    message: string;
    error_details: string;
    preview_failure_reason?: string;
  };
}

interface CoinbaseWithdrawResponse extends CoinbaseAdvancedResponse {
  withdrawal_id?: string;
  status?: string;
  network_transaction_id?: string;
}

interface CoinbaseAccount {
  uuid: string;
  name: string;
  currency: string;
  available_balance: {
    value: string;
    currency: string;
  };
  hold: {
    value: string;
    currency: string;
  };
  default: boolean;
}

interface CoinbaseAccountsResponse {
  accounts: CoinbaseAccount[];
  has_next: boolean;
  cursor: string;
}

interface CoinbasePortfolio {
  uuid: string;
  name: string;
  type: string;
}

interface CoinbasePortfoliosResponse {
  portfolios: CoinbasePortfolio[];
}

interface CoinbaseTransfer {
  transfer_id: string;
  type: string;
  status: string;
  network_transaction_id?: string;
  destination_address?: string;
  amount: {
    value: string;
    currency: string;
  };
}

interface CoinbaseTransfersResponse {
  transfers: CoinbaseTransfer[];
  has_next: boolean;
}

export class CoinbaseAdapter extends BaseExchangeAdapter {
  readonly name = 'coinbase' as const;
  readonly baseUrl = 'https://api.coinbase.com';
  
  private readonly networkMappings: Record<string, string[]> = {
    USDT: ['ethereum', 'tron', 'polygon', 'solana'],
    BTC: ['bitcoin'],
    ETH: ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'],
    LTC: ['litecoin'],
    DOGE: ['dogecoin'],
    SOL: ['solana'],
    MATIC: ['polygon'],
  };
  
  private signAdvancedTrade(timestamp: string, method: string, path: string, body: string, secret: string): string {
    const message = timestamp + method.toUpperCase() + path + body;
    const secretBuffer = Buffer.from(secret, 'base64');
    return crypto.createHmac('sha256', secretBuffer).update(message).digest('hex');
  }
  
  private getHeaders(credentials: ExchangeCredentials, method: string, path: string, body: string = ''): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.signAdvancedTrade(timestamp, method, path, body, credentials.apiSecret);
    
    return {
      'CB-ACCESS-KEY': credentials.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    };
  }
  
  private async getDefaultPortfolioUuid(credentials: ExchangeCredentials): Promise<string> {
    const path = '/api/v3/brokerage/portfolios';
    const headers = this.getHeaders(credentials, 'GET', path);
    
    const response = await this.makeRequest<CoinbasePortfoliosResponse>(
      'GET',
      `${this.baseUrl}${path}`,
      headers
    );
    
    const defaultPortfolio = response.portfolios?.find(p => p.type === 'DEFAULT') || response.portfolios?.[0];
    if (!defaultPortfolio) {
      throw new Error('No portfolio found');
    }
    return defaultPortfolio.uuid;
  }
  
  async initiateWithdrawal(credentials: ExchangeCredentials, request: WithdrawRequest): Promise<WithdrawResult> {
    try {
      const portfolioUuid = await this.getDefaultPortfolioUuid(credentials);
      
      const path = '/api/v3/brokerage/withdrawals/crypto';
      
      const cryptoAddress: Record<string, string> = {
        address: request.toAddress,
      };
      
      if (request.network) {
        cryptoAddress.network = this.normalizeNetwork(request.network);
      }
      
      const bodyObj = {
        portfolio_uuid: portfolioUuid,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        destination: {
          type: 'crypto_address',
          crypto_address: cryptoAddress,
        },
        idem: request.idempotencyKey,
      };
      
      const body = JSON.stringify(bodyObj);
      const headers = this.getHeaders(credentials, 'POST', path, body);
      
      const response = await this.makeRequest<CoinbaseWithdrawResponse>(
        'POST',
        `${this.baseUrl}${path}`,
        headers,
        body
      );
      
      if (response.error_response) {
        return {
          success: false,
          status: 'failed',
          errorCode: response.error_response.error,
          errorMessage: response.error_response.message || response.error_response.error_details,
          rawResponse: JSON.stringify(response),
        };
      }
      
      return {
        success: true,
        orderId: response.withdrawal_id || '',
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
      const accounts = await this.getAccounts(credentials);
      const account = accounts.find(a => a.currency.toUpperCase() === currency.toUpperCase());
      
      if (!account) {
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
        available: account.available_balance.value,
        locked: account.hold.value,
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
      const path = `/api/v3/brokerage/transfers?transfer_type=withdraw`;
      const headers = this.getHeaders(credentials, 'GET', path);
      
      const response = await this.makeRequest<CoinbaseTransfersResponse>(
        'GET',
        `${this.baseUrl}${path}`,
        headers
      );
      
      const transfer = response.transfers?.find(t => t.transfer_id === orderId);
      
      if (!transfer) {
        return {
          success: false,
          orderId,
          status: 'failed',
          errorCode: 'NOT_FOUND',
          errorMessage: 'Transfer not found',
        };
      }
      
      return {
        success: true,
        orderId,
        status: this.mapCoinbaseStatus(transfer.status),
        txHash: transfer.network_transaction_id,
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
  
  private async getAccounts(credentials: ExchangeCredentials): Promise<CoinbaseAccount[]> {
    const path = '/api/v3/brokerage/accounts';
    const headers = this.getHeaders(credentials, 'GET', path);
    
    const response = await this.makeRequest<CoinbaseAccountsResponse>(
      'GET',
      `${this.baseUrl}${path}`,
      headers
    );
    
    return response.accounts || [];
  }
  
  parseError(error: unknown): ExchangeError {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: CoinbaseAdvancedResponse; status?: number } };
      const data = axiosError.response?.data;
      const status = axiosError.response?.status;
      
      if (data?.error_response) {
        const err = data.error_response;
        return {
          code: err.error,
          message: err.message || err.error_details,
          isRetryable: status === 503 || status === 500 || status === 502,
          isRateLimited: status === 429,
          isInsufficientFunds: err.error === 'INSUFFICIENT_FUNDS' || err.preview_failure_reason === 'PREVIEW_INSUFFICIENT_FUND',
          isInvalidAddress: err.error === 'INVALID_ADDRESS' || err.error_details?.includes('address'),
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
    
    if (network === 'tron' || network === 'TRC20') {
      return address.startsWith('T') && address.length === 34;
    }
    if (network === 'ethereum' || network === 'ERC20' || network === 'arbitrum' || network === 'optimism' || network === 'base' || network === 'polygon') {
      return address.startsWith('0x') && address.length === 42;
    }
    if (currency === 'BTC' || network === 'bitcoin') {
      return (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) && address.length >= 26;
    }
    if (currency === 'LTC' || network === 'litecoin') {
      return (address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1')) && address.length >= 26;
    }
    if (currency === 'SOL' || network === 'solana') {
      return address.length >= 32 && address.length <= 44;
    }
    if (currency === 'DOGE' || network === 'dogecoin') {
      return address.startsWith('D') && address.length >= 26 && address.length <= 34;
    }
    
    return true;
  }
  
  private mapCoinbaseStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS': return 'completed';
      case 'PENDING':
      case 'CREATED': return 'pending';
      case 'IN_PROGRESS':
      case 'PROCESSING':
      case 'WAITING_FOR_SIGNATURE':
      case 'WAITING_FOR_CLEARING': return 'processing';
      case 'CANCELED':
      case 'CANCELLED': return 'cancelled';
      case 'FAILED':
      case 'EXPIRED': return 'failed';
      default: return 'processing';
    }
  }
  
  private normalizeNetwork(network: string): string {
    const mappings: Record<string, string> = {
      'TRC20': 'tron',
      'ERC20': 'ethereum',
      'BEP20': 'bsc',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'SOL': 'solana',
      'MATIC': 'polygon',
    };
    return mappings[network.toUpperCase()] || network.toLowerCase();
  }
}
