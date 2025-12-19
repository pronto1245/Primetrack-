import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      brand: "PrimeTrack",
      nav: {
        features: "Features",
        pricing: "Pricing",
        integrations: "Integrations",
        login: "Log In",
        dashboard: "Dashboard",
        getStarted: "Start Free Trial",
        exit: "Exit Demo"
      },
      hero: {
        badge: "New: Version 3.0 Release",
        title: "The Ultimate Ad Tracker for Media Buying Teams",
        subtitle: "Track, optimize, and automate your affiliate campaigns with the fastest self-hosted tracker on the market. Zero redirect lag. Real-time data.",
        cta: "Get Started Free",
        demo: "Live Demo",
        trust: "Trusted by 15,000+ affiliates worldwide"
      },
      stats: {
        clicks: "Daily Clicks Processed",
        uptime: "Server Uptime",
        speed: "Redirect Speed"
      },
      features: {
        title: "Everything you need to scale",
        subtitle: "Built by affiliates, for affiliates. We know what matters.",
        reporting: {
          title: "Real-time Reporting",
          desc: "Drill down into 30+ metrics instantly. Group data by any parameter to find profitable segments."
        },
        automation: {
          title: "Smart Rotation",
          desc: "Distribute traffic automatically based on rules, paths, and landing page performance."
        },
        protection: {
          title: "Bot Protection",
          desc: "Advanced anti-fraud system filters out bot traffic before it reaches your offers."
        },
        integration: {
          title: "100+ Integrations",
          desc: "Pre-configured templates for all major traffic sources and affiliate networks."
        }
      },
      pricing: {
        title: "Simple, Transparent Pricing",
        subtitle: "No hidden fees. No traffic limits on self-hosted plans.",
        starter: "Starter",
        pro: "Professional",
        business: "Business",
        month: "/mo",
        features: {
          clicks: "Unlimited Clicks",
          domains: "Custom Domains",
          users: "Team Members",
          support: "Priority Support"
        }
      },
      footer: {
        rights: "All rights reserved.",
        terms: "Terms of Service",
        privacy: "Privacy Policy",
        contacts: "Contacts"
      }
    }
  },
  ru: {
    translation: {
      brand: "PrimeTrack",
      nav: {
        features: "Возможности",
        pricing: "Тарифы",
        integrations: "Интеграции",
        login: "Войти",
        dashboard: "Личный кабинет",
        getStarted: "Попробовать бесплатно",
        exit: "Выйти"
      },
      hero: {
        badge: "Обновление: Версия 3.0",
        title: "Профессиональный трекер для арбитража трафика",
        subtitle: "Трекайте, оптимизируйте и масштабируйте рекламные кампании с самым быстрым self-hosted трекером. Мгновенные редиректы. Данные в реальном времени.",
        cta: "Начать бесплатно",
        demo: "Демо версия",
        trust: "Нам доверяют более 15,000 вебмастеров"
      },
      stats: {
        clicks: "Кликов в сутки",
        uptime: "Uptime серверов",
        speed: "Скорость редиректа"
      },
      features: {
        title: "Всё для масштабирования связок",
        subtitle: "Создано арбитражниками для арбитражников. Мы понимаем, что важно для профита.",
        reporting: {
          title: "Отчеты в реальном времени",
          desc: "Глубокая аналитика по 30+ метрикам. Группировка данных по любым параметрам для поиска профитных связок."
        },
        automation: {
          title: "Умная ротация",
          desc: "Автоматическое распределение трафика на основе правил, путей и конверсии лендингов."
        },
        protection: {
          title: "Защита от ботов",
          desc: "Продвинутая система антифрода фильтрует ботный трафик до того, как он попадет на оффер."
        },
        integration: {
          title: "100+ Интеграций",
          desc: "Готовые шаблоны для всех популярных источников трафика и партнерских сетей."
        }
      },
      pricing: {
        title: "Простые и честные тарифы",
        subtitle: "Никаких скрытых платежей. Безлимитный трафик на self-hosted решениях.",
        starter: "Стартовый",
        pro: "Профессионал",
        business: "Бизнес",
        month: "/мес",
        features: {
          clicks: "Безлимитные клики",
          domains: "Кастомные домены",
          users: "Пользователей",
          support: "Приоритетная поддержка"
        }
      },
      footer: {
        rights: "Все права защищены.",
        terms: "Условия использования",
        privacy: "Политика конфиденциальности",
        contacts: "Контакты"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ru", 
    fallbackLng: "ru",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
