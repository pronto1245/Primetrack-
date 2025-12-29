# PrimeTrack - SaaS Affiliate Platform

## Overview

PrimeTrack is a centralized SaaS affiliate tracking platform designed to be the primary source of truth for all tracking data. It integrates multi-advertiser affiliate tracking, a mini-tracker with click_id and redirect logic, robust anti-fraud measures (IP, proxy, VPN, fingerprint, click-spam, duplicate leads), and comprehensive financial management for advertiser/publisher payouts and ROI calculation. The platform supports white-labeling with custom domains, offers a centralized orchestrator for all events, and provides Telegram, email, and webhook notifications. A key feature is its Data Migration API, facilitating transitions from other platforms like Scaleo, Affilka, Affise, Voluum, and Keitaro. All events (clicks, leads, sales, conversions) are recorded internally first, with postbacks being an optional, secondary step.

## User Preferences

Preferred communication style: Simple, everyday language (Russian).

---

## РЕАЛИЗОВАННЫЙ ФУНКЦИОНАЛ (АКТУАЛЬНО)

### Аутентификация и безопасность
- ✅ Регистрация/вход по email + пароль (bcrypt)
- ✅ Session-based аутентификация (connect-pg-simple)
- ✅ Обязательная 2FA (TOTP) для активных пользователей
- ✅ QR-код для настройки 2FA (Google Authenticator и др.)
- ✅ Сброс 2FA через админа

### Роли пользователей
- ✅ **Admin** - полный доступ к платформе
- ✅ **Advertiser** - управление офферами, партнёрами, финансами
- ✅ **Publisher** - доступ к офферам, генерация ссылок, выплаты
- ✅ **Advertiser Staff** - сотрудники рекламодателя (Manager, Support, Finance)

### Панель Admin
- ✅ Обзор (статистика платформы)
- ✅ Отчёты
- ✅ Пользователи (список, модерация, сброс 2FA)
- ✅ Антифрод
- ✅ Финансы
- ✅ Новости
- ✅ Постбеки
- ✅ Команда
- ✅ Настройки (профиль, безопасность, уведомления)

### Панель Advertiser
- ✅ Обзор (дашборд с графиками)
- ✅ Офферы (создание, редактирование, список)
- ✅ Запросы на доступ к офферам
- ✅ Партнёры (список, управление)
- ✅ Отчёты (статистика по офферам)
- ✅ Антифрод (fraud_score, proxy, VPN детекция)
- ✅ Финансы (балансы, транзакции, выплаты партнёрам)
- ✅ Новости (создание, публикация)
- ✅ Постбеки (настройка внешних постбеков)
- ✅ Webhooks (уведомления на внешние URL с HMAC подписью)
- ✅ Команда (приглашение сотрудников)
- ✅ Настройки:
  - Профиль
  - Безопасность
  - White-label (логотип, цвета, кастомный домен)
  - Уведомления (in-app, Telegram)

### Панель Publisher
- ✅ Обзор (статистика по выбранному рекламодателю)
- ✅ Офферы/Ссылки (маркетплейс офферов, генерация трекинг-ссылок)
- ✅ Отчёты
- ✅ Выплаты (запрос выплаты, история)
- ✅ Новости
- ✅ Постбеки
- ✅ Настройки:
  - Профиль
  - Безопасность
  - Уведомления
  - Платёжные методы (крипто-биржи: Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX)

### Система офферов
- ✅ Создание оффера (название, описание, URL, GEO, категория)
- ✅ Модели оплаты: CPA, CPL, CPI, CPS, RevShare, Hybrid
- ✅ Advertiser price / Publisher payout / Margin
- ✅ Система запросов на доступ (pending → approved/rejected)
- ✅ Генерация трекинг-ссылок с макросами

### Mini-Tracker (Click Handler)
- ✅ `/api/click/:offerId/:publisherId` - обработка кликов
- ✅ Генерация уникального click_id
- ✅ Сбор данных: IP, User-Agent, GEO (geoip-lite), fingerprint
- ✅ Редирект 302 на landing_url с макросами
- ✅ Антифрод проверки при клике

### Orchestrator (Конверсии)
- ✅ `/api/conversion` - приём конверсий
- ✅ Типы событий: click, lead, sale, install, rejected, hold_released
- ✅ Валидация click_id
- ✅ Расчёт payouts
- ✅ Запись в статистику
- ✅ Отправка постбеков (опционально)
- ✅ Триггер webhooks

### Постбеки
- ✅ Настройка URL постбека для оффера/партнёра
- ✅ Макросы: {click_id}, {payout}, {status}, {goal} и др.
- ✅ Retry логика (5 попыток)
- ✅ Логирование отправок

### Webhooks (для рекламодателя)
- ✅ CRUD webhook endpoints
- ✅ Фильтрация по событиям (click, lead, sale, install, rejected, hold_released)
- ✅ Фильтрация по офферам/партнёрам
- ✅ Кастомные HTTP заголовки
- ✅ HMAC-SHA256 подпись (X-Signature)
- ✅ Retry логика: 1м → 5м → 15м → 1ч → 2ч
- ✅ Логирование всех отправок
- ✅ Тестовая отправка из UI

### White-Label (в настройках рекламодателя)
- ✅ Кастомный домен (поле для ввода)
- ✅ Логотип (URL)
- ✅ Название компании
- ✅ Основной цвет бренда
- ✅ Инструкции по настройке DNS (CNAME)

### Антифрод
- ✅ Fraud score расчёт
- ✅ Proxy/VPN детекция (geoip-lite)
- ✅ Fingerprint анализ
- ✅ Click-spam детекция (velocity checks)
- ✅ Дубликаты лидов
- ✅ Доступ только для Admin и Advertiser (Publisher НЕ видит)

### Финансы
- ✅ Балансы партнёров (available, hold, pending)
- ✅ Транзакции (пополнение, списание)
- ✅ Запросы на выплату от партнёров
- ✅ Одобрение/отклонение выплат рекламодателем
- ✅ Крипто-биржи для выплат (Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX)

### Уведомления
- ✅ In-app уведомления (колокольчик в шапке)
- ✅ Настройка Telegram (chat_id, bot linking)
- ✅ Типы: новый запрос, одобрение/отклонение, новая конверсия

### Новости
- ✅ Создание новостей (Admin, Advertiser)
- ✅ Категории: update, announcement, promo, alert
- ✅ Целевая аудитория
- ✅ Закрепление (pin)
- ✅ Изображения

### Команда (Advertiser)
- ✅ Приглашение сотрудников по email
- ✅ Роли: Manager, Support, Finance
- ✅ Список членов команды

### Multi-Advertiser для Publisher
- ✅ Глобальный аккаунт партнёра
- ✅ Регистрация через ссылку рекламодателя
- ✅ Context switcher (выбор рекламодателя)
- ✅ Данные показываются для выбранного рекламодателя

---

## System Architecture

### Key Principles

1. **Centralization**: All traffic flows through the mini-tracker and orchestrator.
2. **Primary Data Source**: The system is the definitive source of truth; statistics are always internal, and postbacks are optional.
3. **One Partner, Many Advertisers**: Supports a switchable context for partners to work with multiple advertisers.
4. **Monetization Models**: Supports CPA, CPL, CPI, CPS, RevShare, and Hybrid models.
5. **White-Labeling**: Custom domains and branding for advertisers (в настройках → White-label).
6. **Comprehensive Anti-Fraud**: IP, proxy, VPN, fingerprint, and click-spam detection.

### Roles

- **Admin** - полный доступ
- **Advertiser** - управление офферами и партнёрами
- **Publisher** - доступ к офферам, ссылки, выплаты
- **Advertiser Staff** - сотрудники (Manager, Support, Finance)

### Core Flows

* **Click Flow (Mini-Tracker)**: Traffic is routed to `/api/click/:offerId/:publisherId`, generating a unique `click_id`. It captures user data (IP, User-Agent, GEO, Fingerprint), performs anti-fraud checks, and orchestrates a 302 redirect to the landing page with relevant macros.
* **Conversion Flow (Orchestrator)**: Events (click/lead/sale/install) are processed by the orchestrator, which validates status, checks monetization models, calculates payouts, writes internal statistics, and then optionally sends external postbacks and webhooks.

### Technology Stack

* **Frontend**: React + Vite + TailwindCSS + shadcn/ui + wouter
* **Backend**: Express.js + TypeScript
* **Database**: PostgreSQL + Drizzle ORM
* **Authentication**: Session-based (connect-pg-simple)
* **2FA**: TOTP (otplib + qrcode)
* **GEO**: geoip-lite

---

### Data Migration API
- ✅ Импорт из Scaleo (офферы, партнёры, конверсии, клики)
- ✅ Импорт из Affilka
- ✅ Импорт из Affise
- ✅ Импорт из Voluum
- ✅ Импорт из Keitaro
- ✅ API endpoint: POST /api/migration/import
- ✅ Маппинг данных под структуру PrimeTrack

### Email уведомления (SMTP)
- ✅ Настройка SMTP в админке (host, port, user, password)
- ✅ From email / From name
- ✅ Шифрование пароля в БД

### Stripe биллинг
- ✅ Настройка Stripe Secret Key в админке
- ✅ Шифрование ключа в БД

### Custom Domains (DNS + SSL)
- ✅ Таблица custom_domains в БД
- ✅ DNS верификация через API (CNAME / TXT методы)
- ✅ Автоматическая проверка DNS записей (resolveCname, resolveTxt)
- ✅ SSL provisioning (статус: pending → provisioning → active)
- ✅ Генерация verification token
- ✅ API endpoints для CRUD доменов

---

## НЕ РЕАЛИЗОВАНО (ПЛАНЫ)

- ⏳ Let's Encrypt интеграция (реальные сертификаты)
- ⏳ IP2Location / ipinfo.io интеграция
- ⏳ FingerprintJS интеграция

---

## Структура меню

### Admin Menu
1. Обзор
2. Отчёты
3. Пользователи
4. Антифрод
5. Финансы
6. Новости
7. Постбеки
8. Команда
9. Настройки

### Advertiser Menu
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
12. Настройки (Профиль, Безопасность, White-label, Уведомления)

### Publisher Menu
1. Обзор
2. Ссылки (офферы)
3. Отчёты
4. Выплаты
5. Новости
6. Постбеки
7. Настройки (Профиль, Безопасность, Платёжные методы, Уведомления)
