const geoToLangMap: Record<string, string> = {
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es',
  DO: 'es', HN: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', PY: 'es', UY: 'es', BO: 'es', PR: 'es',
  
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
  
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  
  UA: 'uk',
  
  FR: 'fr', BE: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', MG: 'fr', TN: 'fr', MA: 'fr', DZ: 'fr',
  
  IT: 'it', SM: 'it', VA: 'it',
  
  PL: 'pl',
  
  TR: 'tr', CY: 'tr',
  
  JP: 'ja',
  
  KR: 'ko',
  
  CN: 'zh', TW: 'zh', HK: 'zh', SG: 'zh',
  
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar', LB: 'ar', LY: 'ar', OM: 'ar', QA: 'ar', YE: 'ar', BH: 'ar',
  
  IN: 'hi',
  
  TH: 'th',
  
  VN: 'vi',
  
  ID: 'id', MY: 'id',
  
  NL: 'nl',
  
  SE: 'sv', NO: 'sv', DK: 'sv', FI: 'sv',
  
  US: 'en', GB: 'en', AU: 'en', NZ: 'en', CA: 'en', IE: 'en', ZA: 'en', PH: 'en', NG: 'en', KE: 'en',
};

// Track unknown GEOs for expansion
const unknownGeos = new Set<string>();

export function geoToLanguage(geo: string | null | undefined): string {
  if (!geo) return 'en';
  const upperGeo = geo.toUpperCase();
  const lang = geoToLangMap[upperGeo];
  if (!lang && upperGeo !== 'XX' && !unknownGeos.has(upperGeo)) {
    unknownGeos.add(upperGeo);
    console.log(`[GEO-LANG] Unknown GEO detected: ${upperGeo} -> fallback to EN`);
  }
  return lang || 'en';
}

// Click metrics logging
export function logClickMetric(status: 'valid' | 'blocked' | 'rejected' | 'error', geo: string, reason?: string) {
  console.log(`[CLICK-METRIC] status=${status} geo=${geo}${reason ? ` reason=${reason}` : ''}`);
}

// Alert logging for critical errors
export function logAlert(type: 'db_error' | 'redirect_error' | 'critical', message: string, context?: Record<string, any>) {
  const ctx = context ? ` context=${JSON.stringify(context)}` : '';
  console.error(`[ALERT] type=${type} message="${message}"${ctx}`);
}

export function resolveLanguage(
  offerLanguage: string | null | undefined,
  geo: string | null | undefined
): string {
  if (offerLanguage) return offerLanguage.toLowerCase();
  return geoToLanguage(geo);
}
