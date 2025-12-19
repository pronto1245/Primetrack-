import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      nav: {
        features: "Features",
        pricing: "Pricing",
        docs: "Docs",
        login: "Log In",
        dashboard: "Dashboard",
        getStarted: "Get Started"
      },
      hero: {
        title: "Centralized SaaS Affiliate Orchestrator",
        subtitle: "The unified platform for Advertisers and Publishers. One tracker to rule them all. Anti-fraud, Finance, and White-label built-in.",
        cta: "Start Orchestrating",
        demo: "View Demo"
      },
      stats: {
        clicks: "Total Clicks",
        leads: "Leads",
        sales: "Sales",
        revenue: "Total Revenue",
        payout: "Publisher Payout",
        margin: "Net Margin",
        roi: "ROI"
      },
      roles: {
        title: "One Platform, All Roles",
        advertiser: "Advertiser",
        advertiserDesc: "Create offers, manage payouts, and track ROI in real-time.",
        publisher: "Publisher",
        publisherDesc: "One dashboard for multiple advertisers. Smart links and centralized postbacks.",
        admin: "Admin",
        adminDesc: "Full control over the SaaS ecosystem. Manage tenants and global settings."
      }
    }
  },
  ru: {
    translation: {
      nav: {
        features: "Функции",
        pricing: "Цены",
        docs: "Документация",
        login: "Войти",
        dashboard: "Дашборд",
        getStarted: "Начать"
      },
      hero: {
        title: "Централизованный SaaS Оркестратор",
        subtitle: "Единая платформа для Рекламодателей и Партнёров. Мини-трекер, Антифрод и Финансы в одном месте.",
        cta: "Начать работу",
        demo: "Демо версия"
      },
      stats: {
        clicks: "Клики",
        leads: "Лиды",
        sales: "Продажи",
        revenue: "Выручка",
        payout: "Выплаты партнерам",
        margin: "Маржа",
        roi: "ROI"
      },
      roles: {
        title: "Одна платформа, все роли",
        advertiser: "Рекламодатель",
        advertiserDesc: "Создавайте офферы, управляйте выплатами и следите за ROI в реальном времени.",
        publisher: "Партнёр",
        publisherDesc: "Один кабинет для всех рекламодателей. Смарт-линки и единые постбеки.",
        admin: "Администратор",
        adminDesc: "Полный контроль над SaaS экосистемой. Управление тенантами и глобальные настройки."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ru", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
