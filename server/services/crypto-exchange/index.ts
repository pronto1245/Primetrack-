export * from './types';
export * from './base-adapter';
export * from './binance-adapter';
export * from './bybit-adapter';

import { CryptoExchangeAdapter, ExchangeName } from './types';
import { BinanceAdapter } from './binance-adapter';
import { BybitAdapter } from './bybit-adapter';

const implementedAdapters: Partial<Record<ExchangeName, CryptoExchangeAdapter>> = {
  binance: new BinanceAdapter(),
  bybit: new BybitAdapter(),
};

const pendingExchanges: ExchangeName[] = ['kraken', 'coinbase', 'exmo', 'mexc', 'okx'];

export function getExchangeAdapter(exchange: ExchangeName): CryptoExchangeAdapter {
  const adapter = implementedAdapters[exchange];
  if (!adapter) {
    if (pendingExchanges.includes(exchange)) {
      throw new Error(`Exchange ${exchange} is not yet implemented. Currently supported: binance, bybit`);
    }
    throw new Error(`Unknown exchange: ${exchange}`);
  }
  return adapter;
}

export function getSupportedExchanges(): ExchangeName[] {
  return Object.keys(implementedAdapters) as ExchangeName[];
}

export function getAllExchanges(): ExchangeName[] {
  return [...Object.keys(implementedAdapters), ...pendingExchanges] as ExchangeName[];
}

export function isExchangeSupported(exchange: string): boolean {
  return exchange in implementedAdapters;
}

export function isExchangeKnown(exchange: string): exchange is ExchangeName {
  return exchange in implementedAdapters || pendingExchanges.includes(exchange as ExchangeName);
}
