export * from './types';
export * from './base-adapter';
export * from './binance-adapter';
export * from './bybit-adapter';
export * from './kraken-adapter';
export * from './coinbase-adapter';
export * from './exmo-adapter';
export * from './mexc-adapter';
export * from './okx-adapter';

import { CryptoExchangeAdapter, ExchangeName } from './types';
import { BinanceAdapter } from './binance-adapter';
import { BybitAdapter } from './bybit-adapter';
import { KrakenAdapter } from './kraken-adapter';
import { CoinbaseAdapter } from './coinbase-adapter';
import { ExmoAdapter } from './exmo-adapter';
import { MexcAdapter } from './mexc-adapter';
import { OkxAdapter } from './okx-adapter';

const adapters: Record<ExchangeName, CryptoExchangeAdapter> = {
  binance: new BinanceAdapter(),
  bybit: new BybitAdapter(),
  kraken: new KrakenAdapter(),
  coinbase: new CoinbaseAdapter(),
  exmo: new ExmoAdapter(),
  mexc: new MexcAdapter(),
  okx: new OkxAdapter(),
};

export function getExchangeAdapter(exchange: ExchangeName): CryptoExchangeAdapter {
  const adapter = adapters[exchange];
  if (!adapter) {
    throw new Error(`Unknown exchange: ${exchange}`);
  }
  return adapter;
}

export function getSupportedExchanges(): ExchangeName[] {
  return Object.keys(adapters) as ExchangeName[];
}

export function getAllExchanges(): ExchangeName[] {
  return Object.keys(adapters) as ExchangeName[];
}

export function isExchangeSupported(exchange: string): boolean {
  return exchange in adapters;
}

export function isExchangeKnown(exchange: string): exchange is ExchangeName {
  return exchange in adapters;
}
