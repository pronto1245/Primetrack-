# PrimeTrack - SaaS Affiliate Platform

## Overview

Централизованная SaaS платформа для партнёрского трекинга. Все клики и конверсии записываются внутренне, постбеки опциональны.

## User Preferences

Preferred communication style: Simple, everyday language (Russian).

---

## РЕАЛИЗОВАННЫЙ ФУНКЦИОНАЛ

### Аутентификация
- ✅ Регистрация/вход (email + пароль, bcrypt)
- ✅ Session-based аутентификация (connect-pg-simple)
- ✅ Обязательная 2FA (TOTP) для активных пользователей
- ✅ QR-код для настройки (Google Authenticator)
- ✅ Сброс 2FA через админа

### Роли
- ✅ Admin - полный доступ
- ✅ Advertiser - офферы, партнёры, финансы
- ✅ Publisher - доступ к офферам, ссылки, выплаты
- ✅ Advertiser Staff (Manager, Support, Finance)

---

## МЕНЮ ПО РОЛЯМ (АКТУАЛЬНО В UI)

### Admin
1. Обзор
2. Отчёты
3. Пользователи
4. Антифрод
5. Финансы
6. Новости
7. Постбеки
8. Настройки

### Advertiser
1. Обзор
2. Офферы
3. Запросы
4. Партнёры
5. Отчёты
6. Антифрод
7. Финансы
8. Новости
9. Постбеки
10. Webhooks
11. Команда
12. Настройки (Профиль, Безопасность, White-label, Домены, Уведомления, Webhooks, Миграция)

### Publisher
1. Обзор
2. Ссылки (офферы)
3. Отчёты
4. Выплаты
5. Новости
6. Постбеки
7. Настройки (Профиль, Безопасность, Платёжные методы, Уведомления)

---

## BACKEND СЕРВИСЫ

### Mini-Tracker (Click Handler)
- ✅ `/api/click/:offerId/:publisherId`
- ✅ Генерация click_id
- ✅ GEO (geoip-lite), IP, User-Agent, fingerprint
- ✅ Редирект 302 на landing_url

### Orchestrator (Конверсии)
- ✅ `/api/conversion`
- ✅ События: click, lead, sale, install, rejected, hold_released
- ✅ Расчёт payouts
- ✅ Триггер постбеков и webhooks

### Постбеки (Универсальная система)
- ✅ **Один универсальный входящий постбек:** `/api/postback?click_id={click_id}&status={status}&payout={payout}`
- ✅ Автоматическое определение offer_id и publisher_id из click_id
- ✅ Поддержка параметров: click_id, clickid, subid, subid_1, tid, sub1, cid
- ✅ Маппинг статусов: lead/reg → Lead, sale/dep/ftd → Sale, install → Install
- ✅ Исходящие постбеки партнёрам с макросами
- ✅ Retry (5 попыток с экспоненциальным backoff)
- ✅ Логирование с direction (inbound/outbound)

### Webhooks
- ✅ CRUD endpoints
- ✅ Фильтрация по событиям/офферам/партнёрам
- ✅ HMAC-SHA256 подпись
- ✅ Retry: 1м → 5м → 15м → 1ч → 2ч
- ✅ UI в панели Advertiser

### Антифрод
- ✅ Fraud score
- ✅ Proxy/VPN детекция
- ✅ Fingerprint анализ
- ✅ Click-spam (velocity checks)
- ✅ Дубликаты лидов
- ✅ Автоматическая пометка подозрительного трафика (isSuspicious)
- ✅ Уведомления рекламодателю о подозрительных кликах
- ✅ UI вкладка "Подозрительные" в AntifraudDashboard
- ✅ API endpoint `/api/antifraud/suspicious-clicks`
- ⚠️ Доступ: Admin, Advertiser (Publisher НЕ видит)

### Финансы
- ✅ Балансы (available, hold, pending)
- ✅ Транзакции
- ✅ Запросы на выплату
- ✅ Крипто-биржи: Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX

### Уведомления
- ✅ In-app (колокольчик)
- ✅ Telegram настройки

### Data Migration API
- ✅ `/api/migration/import`
- ✅ Scaleo, Affilka, Affise, Voluum, Keitaro

### SMTP (Email)
- ✅ Настройки в админке (host, port, user, password)
- ✅ Шифрование в БД

### Stripe
- ✅ Настройка Secret Key в админке
- ✅ Шифрование в БД

### Custom Domains (Backend)
- ✅ Таблица custom_domains
- ✅ DNS верификация (CNAME/TXT) через Google DNS resolvers
- ✅ TLS Checker - реальная проверка SSL через TLS handshake
- ✅ Честные SSL статусы: unverified, verified_no_ssl, ssl_activating, ssl_active, ssl_failed
- ✅ Endpoint `/api/domains/:id/check-ssl` - проверка SSL
- ✅ UI: кнопка "Проверить SSL", инструкции для Cloudflare
- ✅ SSL через Cloudflare (внешний провайдер)
- ❌ ACME/Let's Encrypt удалён (не работает на Replit - нет доступа к порту 80)

### IP Intelligence (ipinfo.io)
- ✅ Токен хранится зашифрованно в platformSettings (ipinfoToken)
- ✅ UI в AdminSettings → Antifraud секция
- ✅ ip-intel-service.ts читает токен из БД или fallback на env
- ✅ Маскирование с SENTINEL "***configured***"

### FingerprintJS
- ✅ Библиотека @fingerprintjs/fingerprintjs установлена
- ✅ UI интеграционного скрипта в AdvertiserSettings → White-label
- ✅ Click endpoint принимает visitor_id и fp_confidence параметры
- ✅ client/src/lib/fingerprint.ts утилита

### Keitaro/Binom/Voluum Интеграция
- ✅ **Устаревшие endpoints удалены** - Используйте универсальный `/api/postback`
- ✅ Поддержка sub1-sub10 параметров в clicks
- ✅ Универсальный постбек совместим со всеми трекерами (Keitaro, Binom, Voluum и др.)

---

## ТЕХНОЛОГИИ

- Frontend: React + Vite + TailwindCSS + shadcn/ui + wouter
- Backend: Express.js + TypeScript
- Database: PostgreSQL + Drizzle ORM
- Auth: Session-based (connect-pg-simple)
- 2FA: TOTP (otplib + qrcode)
- GEO: geoip-lite
- SSL: Cloudflare (внешний, TLS handshake проверка)
- IP Intel: ipinfo.io (опционально)
- Fingerprinting: FingerprintJS (опционально)
- Platform Domain: primetrack.pro

---

## НЕ РЕАЛИЗОВАНО

- ⏳ Расширенный FingerprintJS Pro API (платная версия)
