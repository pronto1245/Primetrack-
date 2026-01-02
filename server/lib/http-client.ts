export class ExternalApiError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly statusCode?: number,
    public readonly retriable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "ExternalApiError";
  }
}

export interface HttpClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions extends HttpClientOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  skipRetryOnStatus?: number[];
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 10000;

const RETRIABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = delay * 0.1 * Math.random();
  return Math.min(delay + jitter, maxDelay);
}

export class HttpClient {
  private serviceName: string;
  private baseUrl?: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;
  private retryConfig: RetryConfig;

  constructor(
    serviceName: string,
    options: {
      baseUrl?: string;
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    } = {}
  ) {
    this.serviceName = serviceName;
    this.baseUrl = options.baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    this.defaultTimeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retryConfig = {
      maxRetries: options.retries ?? DEFAULT_RETRIES,
      baseDelay: options.retryDelay ?? DEFAULT_RETRY_DELAY,
      maxDelay: MAX_RETRY_DELAY,
    };
  }

  private log(
    level: "info" | "warn" | "error",
    correlationId: string,
    message: string,
    meta?: Record<string, any>
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${this.serviceName}] [${correlationId}]`;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";

    switch (level) {
      case "info":
        console.log(`${timestamp} ${prefix} ${message}${metaStr}`);
        break;
      case "warn":
        console.warn(`${timestamp} ${prefix} ${message}${metaStr}`);
        break;
      case "error":
        console.error(`${timestamp} ${prefix} ${message}${metaStr}`);
        break;
    }
  }

  private isRetriable(statusCode: number, skipRetryOnStatus?: number[]): boolean {
    if (skipRetryOnStatus?.includes(statusCode)) {
      return false;
    }
    return RETRIABLE_STATUS_CODES.includes(statusCode);
  }

  async request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const correlationId = generateCorrelationId();
    const fullUrl = this.baseUrl ? `${this.baseUrl}${url}` : url;
    const method = options.method || "GET";
    const timeout = options.timeout ?? this.defaultTimeout;
    const maxRetries = options.retries ?? this.retryConfig.maxRetries;

    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    let lastError: Error | null = null;
    let lastStatusCode: number | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const startTime = Date.now();

      try {
        this.log("info", correlationId, `Request started`, {
          method,
          url: fullUrl,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
        });

        const response = await fetch(fullUrl, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        lastStatusCode = response.status;

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          
          this.log("warn", correlationId, `Request failed`, {
            status: response.status,
            latency,
            errorBody: errorBody.substring(0, 200),
          });

          if (this.isRetriable(response.status, options.skipRetryOnStatus) && attempt < maxRetries) {
            const delay = calculateBackoff(attempt, this.retryConfig.baseDelay, this.retryConfig.maxDelay);
            this.log("info", correlationId, `Retrying after ${delay}ms`);
            await sleep(delay);
            continue;
          }

          throw new ExternalApiError(
            `${this.serviceName} API error: ${response.status} ${response.statusText}`,
            this.serviceName,
            response.status,
            this.isRetriable(response.status, options.skipRetryOnStatus)
          );
        }

        const contentType = response.headers.get("content-type");
        let data: T;

        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else {
          data = (await response.text()) as unknown as T;
        }

        this.log("info", correlationId, `Request completed`, {
          status: response.status,
          latency,
        });

        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        lastError = error;

        if (error.name === "AbortError") {
          this.log("error", correlationId, `Request timeout`, { timeout, latency });

          if (attempt < maxRetries) {
            const delay = calculateBackoff(attempt, this.retryConfig.baseDelay, this.retryConfig.maxDelay);
            this.log("info", correlationId, `Retrying after ${delay}ms`);
            await sleep(delay);
            continue;
          }

          throw new ExternalApiError(
            `${this.serviceName} request timeout after ${timeout}ms`,
            this.serviceName,
            undefined,
            true,
            error
          );
        }

        if (error instanceof ExternalApiError) {
          throw error;
        }

        this.log("error", correlationId, `Network error`, {
          error: error.message,
          latency,
        });

        if (attempt < maxRetries) {
          const delay = calculateBackoff(attempt, this.retryConfig.baseDelay, this.retryConfig.maxDelay);
          this.log("info", correlationId, `Retrying after ${delay}ms`);
          await sleep(delay);
          continue;
        }

        throw new ExternalApiError(
          `${this.serviceName} network error: ${error.message}`,
          this.serviceName,
          lastStatusCode,
          true,
          error
        );
      }
    }

    throw new ExternalApiError(
      `${this.serviceName} failed after ${maxRetries + 1} attempts`,
      this.serviceName,
      lastStatusCode,
      false,
      lastError || undefined
    );
  }

  async get<T = any>(url: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  async post<T = any>(url: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(url, { ...options, method: "POST", body });
  }

  async put<T = any>(url: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(url, { ...options, method: "PUT", body });
  }

  async delete<T = any>(url: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }

  async patch<T = any>(url: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(url, { ...options, method: "PATCH", body });
  }
}

export const telegramClient = new HttpClient("Telegram", {
  baseUrl: "https://api.telegram.org",
  timeout: 10000,
  retries: 2,
});

export const ipinfoClient = new HttpClient("IPinfo", {
  baseUrl: "https://ipinfo.io",
  timeout: 5000,
  retries: 2,
});

export const blockchainClients = {
  btc: new HttpClient("Blockchain.info", {
    baseUrl: "https://blockchain.info",
    timeout: 10000,
    retries: 2,
  }),
  tron: new HttpClient("TronScan", {
    baseUrl: "https://apilist.tronscan.org",
    timeout: 10000,
    retries: 2,
  }),
  eth: new HttpClient("Etherscan", {
    baseUrl: "https://api.etherscan.io",
    timeout: 10000,
    retries: 2,
  }),
};

export const cloudflareClient = new HttpClient("Cloudflare", {
  baseUrl: "https://api.cloudflare.com/client/v4",
  timeout: 15000,
  retries: 2,
});

export const exchangeClients = {
  binance: new HttpClient("Binance", {
    baseUrl: "https://api.binance.com",
    timeout: 15000,
    retries: 2,
  }),
  bybit: new HttpClient("Bybit", {
    baseUrl: "https://api.bybit.com",
    timeout: 15000,
    retries: 2,
  }),
  kraken: new HttpClient("Kraken", {
    baseUrl: "https://api.kraken.com",
    timeout: 15000,
    retries: 2,
  }),
  coinbase: new HttpClient("Coinbase", {
    baseUrl: "https://api.coinbase.com",
    timeout: 15000,
    retries: 2,
  }),
  exmo: new HttpClient("EXMO", {
    baseUrl: "https://api.exmo.com",
    timeout: 15000,
    retries: 2,
  }),
  mexc: new HttpClient("MEXC", {
    baseUrl: "https://api.mexc.com",
    timeout: 15000,
    retries: 2,
  }),
  okx: new HttpClient("OKX", {
    baseUrl: "https://www.okx.com",
    timeout: 15000,
    retries: 2,
  }),
};

export function createWebhookClient(name: string): HttpClient {
  return new HttpClient(`Webhook:${name}`, {
    timeout: 30000,
    retries: 3,
    retryDelay: 2000,
  });
}

export function createPostbackClient(name: string): HttpClient {
  return new HttpClient(`Postback:${name}`, {
    timeout: 30000,
    retries: 3,
    retryDelay: 2000,
  });
}

export function createMigrationClient(tracker: string, baseUrl: string): HttpClient {
  return new HttpClient(`Migration:${tracker}`, {
    baseUrl,
    timeout: 60000,
    retries: 2,
  });
}
