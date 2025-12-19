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
        badge: "SYSTEM OPERATIONAL v3.2.1",
        title: "The Ultimate Ad Tracker for Media Buying Teams",
        subtitle: "Track, optimize, and automate your affiliate campaigns with the fastest self-hosted tracker on the market. Zero redirect lag. Real-time data.",
        cta: "Get Started Free",
        demo: "Live Demo",
        specs: {
          selfHosted: "Self-Hosted",
          latency: "5ms Latency",
          antifraud: "Anti-Fraud"
        },
        rps: "RPS (Req/Sec)"
      },
      stats: {
        clicks: "Clicks",
        uptime: "Uptime",
        speed: "Speed",
        nodes: "Active Nodes",
        revenue: "Revenue (Today)",
        conversions: "Conversions",
        roi: "ROI"
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
      dashboard: {
        title: "Dashboard",
        welcome: "SYSTEM ACCESS",
        selectRole: "Select your secure portal gateway",
        server: "SERVER",
        liveStream: "LIVE DATA STREAM",
        trafficVol: "Traffic Volume (24h)",
        topGeos: "Top Geos",
        activeCampaigns: "Active Campaigns",
        table: {
          id: "ID",
          name: "Campaign Name",
          status: "Status",
          clicks: "Clicks",
          conv: "Conv.",
          revenue: "Revenue",
          roi: "ROI"
        },
        menu: {
          overview: "Overview",
          reports: "Reports",
          links: "Links",
          finance: "Finance",
          settings: "Settings",
          logout: "DISCONNECT",
          users: "Tenant Management",
          offers: "Offers",
          campaigns: "Campaigns",
          payouts: "Payouts"
        },
        roles: {
          admin: "Administrator",
          adminDesc: "Full system control, tenant management, and global finance.",
          advertiser: "Advertiser",
          advertiserDesc: "Create offers, manage budgets, and track performance.",
          publisher: "Publisher",
          publisherDesc: "Get links, view stats, and check payouts.",
          view: "View as {{role}}",
          enter: "ENTER PORTAL"
        },
        stats: {
          recentActivity: "Recent Activity",
          salesMonth: "Sales this month",
          newLead: "New Lead",
          converted: "converted from",
          revenue: "Total Revenue",
          profit: "Net Profit",
          activeOffers: "Active Offers",
          activeAffiliates: "Active Affiliates",
          clicksToday: "Clicks Today"
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
        login: "ВХОД",
        dashboard: "Личный кабинет",
        getStarted: "НАЧАТЬ БЕСПЛАТНО",
        exit: "ВЫХОД"
      },
      hero: {
        badge: "СИСТЕМА АКТИВНА v3.2.1",
        title: "Профессиональный трекер для арбитража трафика",
        subtitle: "Трекайте, оптимизируйте и масштабируйте рекламные кампании с самым быстрым self-hosted трекером. Мгновенные редиректы. Данные в реальном времени.",
        cta: "НАЧАТЬ РАБОТУ",
        demo: "ДЕМО ВЕРСИЯ",
        specs: {
          selfHosted: "Self-Hosted",
          latency: "Задержка 5мс",
          antifraud: "Антифрод"
        },
        rps: "RPS (Запр/сек)"
      },
      stats: {
        clicks: "Клики",
        uptime: "Uptime",
        speed: "Скорость",
        nodes: "Активные узлы",
        revenue: "Доход (Сегодня)",
        conversions: "Конверсии",
        roi: "ROI"
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
      dashboard: {
        title: "Личный кабинет",
        welcome: "ДОСТУП К СИСТЕМЕ",
        selectRole: "Выберите шлюз для входа",
        server: "СЕРВЕР",
        liveStream: "ПОТОК ДАННЫХ LIVE",
        trafficVol: "Объем трафика (24ч)",
        topGeos: "Топ ГЕО",
        activeCampaigns: "Активные кампании",
        table: {
          id: "ID",
          name: "Кампания",
          status: "Статус",
          clicks: "Клики",
          conv: "Конв.",
          revenue: "Доход",
          roi: "ROI"
        },
        menu: {
          overview: "Обзор",
          reports: "Отчеты",
          links: "Ссылки",
          finance: "Финансы",
          settings: "Настройки",
          logout: "ОТКЛЮЧИТЬСЯ",
          users: "Управление тенантами",
          offers: "Офферы",
          campaigns: "Кампании",
          payouts: "Выплаты"
        },
        roles: {
          admin: "Администратор",
          adminDesc: "Полный контроль системы, управление тенантами и финансами.",
          advertiser: "Рекламодатель",
          advertiserDesc: "Создание офферов, управление бюджетами и отслеживание ROI.",
          publisher: "Вебмастер",
          publisherDesc: "Получение ссылок, статистика переходов и выплаты.",
          view: "Режим: {{role}}",
          enter: "ВОЙТИ В ПОРТАЛ"
        },
        stats: {
          recentActivity: "Последняя активность",
          salesMonth: "Продаж в этом месяце",
          newLead: "Новый лид",
          converted: "конверсия",
          revenue: "Общий доход",
          profit: "Чистая прибыль",
          activeOffers: "Активные офферы",
          activeAffiliates: "Активные вебмастера",
          clicksToday: "Кликов сегодня"
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
