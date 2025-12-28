import crypto from "crypto";
import { storage } from "../storage";

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
  passphrase?: string;
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
    return crypto.createHmac("sha256", this.config.secretKey).update(queryString).digest("hex");
  }

  private async makeRequest(endpoint: string, method: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };
    const queryString = new URLSearchParams(queryParams as any).toString();
    const signature = this.sign(queryString);
    
    const url = `${this.config.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
    
    const response = await fetch(url, {
      method,
      headers: { "X-MBX-APIKEY": this.config.apiKey, "Content-Type": "application/json" },
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
        coin: request.currency, address: request.walletAddress, amount: request.amount,
        network: request.network || this.getDefaultNetwork(request.currency),
      });
      return { success: true, transactionId: result.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const result = await this.makeRequest("/sapi/v1/capital/config/getall", "GET");
      const coin = result.find((c: any) => c.coin === currency);
      return coin ? parseFloat(coin.free) : 0;
    } catch { return 0; }
  }

  async validateAddress(address: string): Promise<boolean> { return address.length > 10; }

  private getDefaultNetwork(currency: string): string {
    const networks: Record<string, string> = { USDT: "TRX", BTC: "BTC", ETH: "ETH", BNB: "BSC" };
    return networks[currency] || currency;
  }
}

class BybitProvider extends CryptoExchangeProvider {
  private sign(params: Record<string, any>): string {
    const timestamp = Date.now();
    const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join("&");
    return crypto.createHmac("sha256", this.config.secretKey).update(`${timestamp}${this.config.apiKey}${sortedParams}`).digest("hex");
  }

  private async makeRequest(endpoint: string, method: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const signature = this.sign(params);
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: { "X-BAPI-API-KEY": this.config.apiKey, "X-BAPI-SIGN": signature, "X-BAPI-TIMESTAMP": timestamp, "Content-Type": "application/json" },
      body: method !== "GET" ? JSON.stringify(params) : undefined,
    });
    const data = await response.json();
    if (data.retCode !== 0) throw new Error(data.retMsg || "Bybit API error");
    return data.result;
  }

  async sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    try {
      const result = await this.makeRequest("/v5/asset/withdraw/create", "POST", {
        coin: request.currency, chain: request.network || this.getDefaultChain(request.currency),
        address: request.walletAddress, amount: request.amount, timestamp: Date.now(),
      });
      return { success: true, transactionId: result.id };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const result = await this.makeRequest("/v5/asset/transfer/query-account-coins-balance", "GET", { coin: currency, accountType: "FUND" });
      const coin = result.balance?.find((c: any) => c.coin === currency);
      return coin ? parseFloat(coin.transferBalance) : 0;
    } catch { return 0; }
  }

  async validateAddress(address: string): Promise<boolean> { return address.length > 10; }
  private getDefaultChain(currency: string): string {
    const chains: Record<string, string> = { USDT: "TRX", BTC: "BTC", ETH: "ETH" };
    return chains[currency] || currency;
  }
}

class KrakenProvider extends CryptoExchangeProvider {
  private sign(path: string, nonce: number, postData: string): string {
    const message = nonce + postData;
    const hash = crypto.createHash('sha256').update(message).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(this.config.secretKey, 'base64'));
    hmac.update(Buffer.concat([Buffer.from(path), hash]));
    return hmac.digest('base64');
  }

  async sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    try {
      const nonce = Date.now() * 1000;
      const postData = `nonce=${nonce}&asset=${request.currency}&key=${request.walletAddress}&amount=${request.amount}`;
      const signature = this.sign('/0/private/Withdraw', nonce, postData);
      const response = await fetch(`${this.config.baseUrl}/0/private/Withdraw`, {
        method: 'POST',
        headers: { 'API-Key': this.config.apiKey, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData,
      });
      const data = await response.json();
      if (data.error?.length) throw new Error(data.error[0]);
      return { success: true, transactionId: data.result?.refid };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const nonce = Date.now() * 1000;
      const postData = `nonce=${nonce}`;
      const signature = this.sign('/0/private/Balance', nonce, postData);
      const response = await fetch(`${this.config.baseUrl}/0/private/Balance`, {
        method: 'POST', headers: { 'API-Key': this.config.apiKey, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData,
      });
      const data = await response.json();
      const krakenCurrency = currency === 'BTC' ? 'XXBT' : currency === 'ETH' ? 'XETH' : currency;
      return data.result?.[krakenCurrency] ? parseFloat(data.result[krakenCurrency]) : 0;
    } catch { return 0; }
  }
  async validateAddress(address: string): Promise<boolean> { return address.length > 10; }
}

class CoinbaseProvider extends CryptoExchangeProvider {
  private sign(timestamp: string, method: string, path: string, body: string): string {
    const message = timestamp + method + path + body;
    return crypto.createHmac('sha256', this.config.secretKey).update(message).digest('hex');
  }

  async sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({ type: 'send', to: request.walletAddress, amount: request.amount, currency: request.currency });
      const path = '/v2/accounts/primary/transactions';
      const signature = this.sign(timestamp, 'POST', path, body);
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'CB-ACCESS-KEY': this.config.apiKey, 'CB-ACCESS-SIGN': signature, 'CB-ACCESS-TIMESTAMP': timestamp, 'Content-Type': 'application/json' },
        body,
      });
      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0]?.message || 'Coinbase error');
      return { success: true, transactionId: data.data?.id };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const path = '/v2/accounts';
      const signature = this.sign(timestamp, 'GET', path, '');
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        headers: { 'CB-ACCESS-KEY': this.config.apiKey, 'CB-ACCESS-SIGN': signature, 'CB-ACCESS-TIMESTAMP': timestamp },
      });
      const data = await response.json();
      const account = data.data?.find((a: any) => a.currency === currency);
      return account ? parseFloat(account.balance.amount) : 0;
    } catch { return 0; }
  }
  async validateAddress(address: string): Promise<boolean> { return address.length > 10; }
}

class ExmoProvider extends CryptoExchangeProvider {
  private sign(params: string): string {
    return crypto.createHmac('sha512', this.config.secretKey).update(params).digest('hex');
  }

  async sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    try {
      const nonce = Date.now();
      const params = `nonce=${nonce}&currency=${request.currency}&address=${request.walletAddress}&amount=${request.amount}`;
      const signature = this.sign(params);
      const response = await fetch(`${this.config.baseUrl}/v1.1/withdraw_crypt`, {
        method: 'POST',
        headers: { 'Key': this.config.apiKey, 'Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return { success: true, transactionId: data.task_id?.toString() };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const nonce = Date.now();
      const params = `nonce=${nonce}`;
      const signature = this.sign(params);
      const response = await fetch(`${this.config.baseUrl}/v1.1/user_info`, {
        method: 'POST', headers: { 'Key': this.config.apiKey, 'Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const data = await response.json();
      return data.balances?.[currency] ? parseFloat(data.balances[currency]) : 0;
    } catch { return 0; }
  }
  async validateAddress(address: string): Promise<boolean> { return address.length > 10; }
}

class MexcProvider extends CryptoExchangeProvider {
  private sign(queryString: string): string {
    return crypto.createHmac('sha256', this.config.secretKey).update(queryString).digest('hex');
  }

  async sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    try {
      const timestamp = Date.now();
      const params = { coin: request.currency, address: request.walletAddress, amount: request.amount, network: request.network || 'TRC20', timestamp };
      const queryString = new URLSearchParams(params as any).toString();
      const signature = this.sign(queryString);
      const response = await fetch(`${this.config.baseUrl}/api/v3/capital/withdraw/apply?${queryString}&signature=${signature}`, {
        method: 'POST', headers: { 'X-MEXC-APIKEY': this.config.apiKey },
      });
      const data = await response.json();
      if (!data.id) throw new Error(data.msg || 'MEXC error');
      return { success: true, transactionId: data.id };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.sign(queryString);
      const response = await fetch(`${this.config.baseUrl}/api/v3/account?${queryString}&signature=${signature}`, {
        headers: { 'X-MEXC-APIKEY': this.config.apiKey },
      });
      const data = await response.json();
      const balance = data.balances?.find((b: any) => b.asset === currency);
      return balance ? parseFloat(balance.free) : 0;
    } catch { return 0; }
  }
  async validateAddress(address: string): Promise<boolean> { return address.length > 10; }
}

class OkxProvider extends CryptoExchangeProvider {
  private sign(timestamp: string, method: string, path: string, body: string): string {
    const message = timestamp + method + path + body;
    return crypto.createHmac('sha256', this.config.secretKey).update(message).digest('base64');
  }

  async sendPayout(request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    try {
      const timestamp = new Date().toISOString();
      const body = JSON.stringify({ ccy: request.currency, amt: request.amount, dest: '4', toAddr: request.walletAddress, chain: request.network || `${request.currency}-TRC20` });
      const path = '/api/v5/asset/withdrawal';
      const signature = this.sign(timestamp, 'POST', path, body);
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'OK-ACCESS-KEY': this.config.apiKey, 'OK-ACCESS-SIGN': signature, 'OK-ACCESS-TIMESTAMP': timestamp, 'OK-ACCESS-PASSPHRASE': this.config.passphrase || '', 'Content-Type': 'application/json' },
        body,
      });
      const data = await response.json();
      if (data.code !== '0') throw new Error(data.msg || 'OKX error');
      return { success: true, transactionId: data.data?.[0]?.wdId };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async getBalance(currency: string): Promise<number> {
    try {
      const timestamp = new Date().toISOString();
      const path = '/api/v5/asset/balances';
      const signature = this.sign(timestamp, 'GET', path, '');
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        headers: { 'OK-ACCESS-KEY': this.config.apiKey, 'OK-ACCESS-SIGN': signature, 'OK-ACCESS-TIMESTAMP': timestamp, 'OK-ACCESS-PASSPHRASE': this.config.passphrase || '' },
      });
      const data = await response.json();
      const balance = data.data?.find((b: any) => b.ccy === currency);
      return balance ? parseFloat(balance.availBal) : 0;
    } catch { return 0; }
  }
  async validateAddress(address: string): Promise<boolean> { return address.length > 10; }
}

const EXCHANGE_CONFIGS: Record<string, { baseUrl: string; label: string; color: string }> = {
  binance: { baseUrl: "https://api.binance.com", label: "Binance", color: "yellow" },
  bybit: { baseUrl: "https://api.bybit.com", label: "Bybit", color: "purple" },
  kraken: { baseUrl: "https://api.kraken.com", label: "Kraken", color: "blue" },
  coinbase: { baseUrl: "https://api.coinbase.com", label: "Coinbase", color: "blue" },
  exmo: { baseUrl: "https://api.exmo.com", label: "EXMO", color: "green" },
  mexc: { baseUrl: "https://api.mexc.com", label: "MEXC", color: "cyan" },
  okx: { baseUrl: "https://www.okx.com", label: "OKX", color: "gray" },
};

class CryptoPayoutService {
  async getProviderForAdvertiser(advertiserId: string, providerName: string): Promise<CryptoExchangeProvider | null> {
    const keys = await storage.getDecryptedCryptoKeys(advertiserId);
    if (!keys) return null;
    const config = EXCHANGE_CONFIGS[providerName];
    if (!config) return null;

    switch (providerName) {
      case "binance":
        if (!keys.binanceApiKey || !keys.binanceSecretKey) return null;
        return new BinancePayProvider({ apiKey: keys.binanceApiKey, secretKey: keys.binanceSecretKey, baseUrl: config.baseUrl });
      case "bybit":
        if (!keys.bybitApiKey || !keys.bybitSecretKey) return null;
        return new BybitProvider({ apiKey: keys.bybitApiKey, secretKey: keys.bybitSecretKey, baseUrl: config.baseUrl });
      case "kraken":
        if (!keys.krakenApiKey || !keys.krakenSecretKey) return null;
        return new KrakenProvider({ apiKey: keys.krakenApiKey, secretKey: keys.krakenSecretKey, baseUrl: config.baseUrl });
      case "coinbase":
        if (!keys.coinbaseApiKey || !keys.coinbaseSecretKey) return null;
        return new CoinbaseProvider({ apiKey: keys.coinbaseApiKey, secretKey: keys.coinbaseSecretKey, baseUrl: config.baseUrl });
      case "exmo":
        if (!keys.exmoApiKey || !keys.exmoSecretKey) return null;
        return new ExmoProvider({ apiKey: keys.exmoApiKey, secretKey: keys.exmoSecretKey, baseUrl: config.baseUrl });
      case "mexc":
        if (!keys.mexcApiKey || !keys.mexcSecretKey) return null;
        return new MexcProvider({ apiKey: keys.mexcApiKey, secretKey: keys.mexcSecretKey, baseUrl: config.baseUrl });
      case "okx":
        if (!keys.okxApiKey || !keys.okxSecretKey || !keys.okxPassphrase) return null;
        return new OkxProvider({ apiKey: keys.okxApiKey, secretKey: keys.okxSecretKey, passphrase: keys.okxPassphrase, baseUrl: config.baseUrl });
      default:
        return null;
    }
  }

  async getAvailableProvidersForAdvertiser(advertiserId: string): Promise<string[]> {
    const status = await storage.getCryptoKeysStatus(advertiserId);
    const providers: string[] = [];
    if (status.hasBinance) providers.push("binance");
    if (status.hasBybit) providers.push("bybit");
    if (status.hasKraken) providers.push("kraken");
    if (status.hasCoinbase) providers.push("coinbase");
    if (status.hasExmo) providers.push("exmo");
    if (status.hasMexc) providers.push("mexc");
    if (status.hasOkx) providers.push("okx");
    return providers;
  }

  getAvailableProviders(): string[] {
    return Object.keys(EXCHANGE_CONFIGS);
  }

  getExchangeConfig(name: string) {
    return EXCHANGE_CONFIGS[name];
  }

  async sendPayoutForAdvertiser(advertiserId: string, providerName: string, request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    const provider = await this.getProviderForAdvertiser(advertiserId, providerName);
    if (!provider) return { success: false, error: `Provider ${providerName} not configured for this advertiser` };
    return provider.sendPayout(request);
  }

  async sendPayout(providerName: string, request: CryptoPayoutRequest): Promise<CryptoPayoutResult> {
    return { success: false, error: "Use sendPayoutForAdvertiser with advertiserId instead" };
  }

  async getBalancesForAdvertiser(advertiserId: string): Promise<Record<string, Record<string, number>>> {
    const balances: Record<string, Record<string, number>> = {};
    const currencies = ["USDT", "BTC", "ETH"];
    const providers = await this.getAvailableProvidersForAdvertiser(advertiserId);
    
    for (const name of providers) {
      const provider = await this.getProviderForAdvertiser(advertiserId, name);
      if (!provider) continue;
      balances[name] = {};
      for (const currency of currencies) {
        balances[name][currency] = await provider.getBalance(currency);
      }
    }
    return balances;
  }

  async getBalances(): Promise<Record<string, Record<string, number>>> { return {}; }
}

export const cryptoPayoutService = new CryptoPayoutService();
