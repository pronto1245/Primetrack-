import crypto from "crypto";

interface CryptoPayoutRequest {
  walletAddress: string;
  amount: string;
  currency: string;
  network?: string;
}

interface CryptoPayoutResult {
  success: boolean;
  transactionId?: string;
  transactionHash?: string;
  error?: string;
}

interface ExchangeConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

abstract class CryptoExchangeProvider {
  protected config: ExchangeConfig;

  constructor(config: ExchangeConfig) {
    this.config = config;
  }

  abstract sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult>;
  abstract getBalance(currency: string): Promise<number>;
  abstract validateAddress(address: string, network: string): Promise<boolean>;
}

class BinancePayProvider extends CryptoExchangeProvider {
  private sign(queryString: string): string {
    return crypto
      .createHmac("sha256", this.config.secretKey)
      .update(queryString)
      .digest("hex");
  }

  private async makeRequest(endpoint: string, method: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };
    const queryString = new URLSearchParams(queryParams as any).toString();
    const signature = this.sign(queryString);
    
    const url = `${this.config.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        "X-MBX-APIKEY": this.config.apiKey,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ msg: response.statusText }));
      throw new Error(error.msg || "Binance API error");
    }
    
    return response.json();
  }

  async sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    try {
      const result = await this.makeRequest("/sapi/v1/capital/withdraw/apply", "POST", {
        coin: request.currency,
        address: request.walletAddress,
        amount: request.amount,
        network: request.network || this.getDefaultNetwork(request.currency),
      });
      
      return {
        success: true,
        transactionId: result.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const result = await this.makeRequest("/sapi/v1/capital/config/getall", "GET");
      const coin = result.find((c: any) => c.coin === currency);
      return coin ? parseFloat(coin.free) : 0;
    } catch (error) {
      console.error("[Binance] Get balance error:", error);
      return 0;
    }
  }

  async validateAddress(address: string, network: string): Promise<boolean> {
    return address.length > 10;
  }

  private getDefaultNetwork(currency: string): string {
    const networks: Record<string, string> = {
      USDT: "TRX",
      BTC: "BTC",
      ETH: "ETH",
      BNB: "BSC",
    };
    return networks[currency] || currency;
  }
}

class BybitProvider extends CryptoExchangeProvider {
  private sign(params: Record<string, any>): string {
    const timestamp = Date.now();
    const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join("&");
    const signPayload = `${timestamp}${this.config.apiKey}${sortedParams}`;
    
    return crypto
      .createHmac("sha256", this.config.secretKey)
      .update(signPayload)
      .digest("hex");
  }

  private async makeRequest(endpoint: string, method: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const signature = this.sign(params);
    
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        "X-BAPI-API-KEY": this.config.apiKey,
        "X-BAPI-SIGN": signature,
        "X-BAPI-TIMESTAMP": timestamp,
        "Content-Type": "application/json",
      },
      body: method !== "GET" ? JSON.stringify(params) : undefined,
    });
    
    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(data.retMsg || "Bybit API error");
    }
    
    return data.result;
  }

  async sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    try {
      const result = await this.makeRequest("/v5/asset/withdraw/create", "POST", {
        coin: request.currency,
        chain: request.network || this.getDefaultChain(request.currency),
        address: request.walletAddress,
        amount: request.amount,
        timestamp: Date.now(),
      });
      
      return {
        success: true,
        transactionId: result.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const result = await this.makeRequest("/v5/asset/transfer/query-account-coins-balance", "GET", {
        coin: currency,
        accountType: "FUND",
      });
      
      const coin = result.balance?.find((c: any) => c.coin === currency);
      return coin ? parseFloat(coin.transferBalance) : 0;
    } catch (error) {
      console.error("[Bybit] Get balance error:", error);
      return 0;
    }
  }

  async validateAddress(address: string, network: string): Promise<boolean> {
    return address.length > 10;
  }

  private getDefaultChain(currency: string): string {
    const chains: Record<string, string> = {
      USDT: "TRX",
      BTC: "BTC",
      ETH: "ETH",
    };
    return chains[currency] || currency;
  }
}

class CryptoPayoutService {
  private providers: Map<string, CryptoExchangeProvider> = new Map();

  registerProvider(name: string, provider: CryptoExchangeProvider): void {
    this.providers.set(name, provider);
    console.log(`[CryptoPayoutService] Registered provider: ${name}`);
  }

  async initializeProviders(): Promise<void> {
    const binanceApiKey = process.env.BINANCE_API_KEY;
    const binanceSecretKey = process.env.BINANCE_SECRET_KEY;
    
    if (binanceApiKey && binanceSecretKey) {
      this.registerProvider("binance", new BinancePayProvider({
        apiKey: binanceApiKey,
        secretKey: binanceSecretKey,
        baseUrl: "https://api.binance.com",
      }));
    }
    
    const bybitApiKey = process.env.BYBIT_API_KEY;
    const bybitSecretKey = process.env.BYBIT_SECRET_KEY;
    
    if (bybitApiKey && bybitSecretKey) {
      this.registerProvider("bybit", new BybitProvider({
        apiKey: bybitApiKey,
        secretKey: bybitSecretKey,
        baseUrl: "https://api.bybit.com",
      }));
    }
  }

  getProvider(name: string): CryptoExchangeProvider | undefined {
    return this.providers.get(name);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async sendPayout(
    providerName: string,
    request: CryptoPayoutRequest
  ): Promise<CryptoPayoutResult> {
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      return {
        success: false,
        error: `Provider ${providerName} not found or not configured`,
      };
    }
    
    return provider.sendPayout(request);
  }

  async getBalances(): Promise<Record<string, Record<string, number>>> {
    const balances: Record<string, Record<string, number>> = {};
    const currencies = ["USDT", "BTC", "ETH"];
    const providerNames = this.getAvailableProviders();
    
    for (const name of providerNames) {
      const provider = this.providers.get(name);
      if (!provider) continue;
      
      balances[name] = {};
      for (const currency of currencies) {
        balances[name][currency] = await provider.getBalance(currency);
      }
    }
    
    return balances;
  }
}

export const cryptoPayoutService = new CryptoPayoutService();
