/**
 * PrimeTrack Cloudflare Worker Proxy
 * 
 * Этот Worker проксирует ВСЕ запросы (включая /click/*) к Replit origin через HTTPS.
 * Это необходимо для корректной работы SSL на кастомном домене primetrack.pro
 * 
 * НАСТРОЙКА:
 * 1. Создайте Worker в Cloudflare Dashboard
 * 2. Добавьте переменные окружения:
 *    - ORIGIN_URL: https://your-repl.replit.app (ваш Replit URL)
 *    - WORKER_SECRET: случайная строка (та же что в platform_settings.workerSecret)
 * 3. Привяжите Worker к маршруту primetrack.pro/*
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originalHost = url.hostname;
    
    // Origin URL из переменных окружения
    const originUrl = env.ORIGIN_URL || 'https://primetrack.replit.app';
    const workerSecret = env.WORKER_SECRET || '';
    
    // Создаём новый URL с origin
    const targetUrl = new URL(url.pathname + url.search, originUrl);
    
    // Клонируем заголовки
    const headers = new Headers(request.headers);
    
    // Устанавливаем заголовки для идентификации оригинального хоста
    headers.set('X-Forwarded-Host', originalHost);
    headers.set('X-Original-Host', originalHost);
    headers.set('X-Forwarded-Proto', 'https');
    
    // Заголовок авторизации Worker для доверия X-Forwarded-Host
    if (workerSecret) {
      headers.set('X-CF-Worker-Auth', workerSecret);
    }
    
    // Устанавливаем правильный Host для origin
    headers.set('Host', new URL(originUrl).hostname);
    
    // Создаём новый запрос
    const newRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'manual', // Не следуем редиректам автоматически
    });
    
    try {
      const response = await fetch(newRequest);
      
      // Для редиректов (302) от click handler - меняем Location header если нужно
      if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
        const location = response.headers.get('Location');
        if (location) {
          // Возвращаем редирект как есть - click handler уже формирует правильный URL
          const newHeaders = new Headers(response.headers);
          return new Response(null, {
            status: response.status,
            headers: newHeaders,
          });
        }
      }
      
      // Клонируем ответ с модифицированными заголовками
      const responseHeaders = new Headers(response.headers);
      
      // Удаляем заголовки которые могут вызвать проблемы
      responseHeaders.delete('X-Frame-Options');
      
      // Добавляем CORS заголовки если нужно
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      // В случае ошибки возвращаем 502
      return new Response(JSON.stringify({
        error: 'Bad Gateway',
        message: 'Failed to connect to origin server',
        details: error.message,
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  },
};
