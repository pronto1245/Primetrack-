import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      nav: {
        features: "Platform",
        solutions: "Solutions",
        developers: "Developers",
        login: "Log In",
        dashboard: "Dashboard",
        getStarted: "Get Started",
        exit: "Exit"
      },
      hero: {
        badge: "v2.0 Orchestrator Live",
        titleLine1: "Total Control.",
        titleLine2: "Zero Friction.",
        subtitle: "The first centralized orchestrator for serious affiliate networks. Mini-tracker, Anti-fraud, and Finance—unified in one beautiful OS.",
        cta: "Start Orchestrating",
        docs: "Documentation",
        core: "Orchestrator Core",
        waiting: "Waiting for incoming events..."
      },
      features: {
        titleLine1: "Built for scale.",
        titleLine2: "Designed for control.",
        traffic: {
          title: "Centralized Traffic Control",
          desc: "Route every click through a single, powerful orchestrator. Filter bot traffic, manage redirects, and optimize yield in real-time.",
          sample: "US Traffic → Offer A",
          sampleBot: "Bot → Trash"
        },
        fraud: {
          title: "Native Anti-Fraud",
          desc: "Block proxy, VPN, and bot traffic before it hits your offers."
        },
        finance: {
          title: "Real-time Finance",
          desc: "Live ROI, P&L, and margin analysis per click."
        }
      },
      dashboard: {
        title: "Dashboard",
        welcome: "Welcome back, User",
        selectRole: "Select a role to view the dashboard as different user types.",
        menu: {
          overview: "Overview",
          reports: "Reports",
          links: "Links",
          finance: "Finance",
          settings: "Settings",
          logout: "Log Out"
        },
        roles: {
          admin: "Admin",
          adminDesc: "Full System Access",
          advertiser: "Advertiser",
          advertiserDesc: "Manage Offers & Campaigns",
          publisher: "Publisher",
          publisherDesc: "Track Traffic & Earnings",
          enter: "Enter as {{role}}",
          view: "{{role}} View"
        },
        stats: {
          recentActivity: "Recent Activity",
          salesMonth: "You made 265 sales this month.",
          newLead: "New Lead Generated",
          converted: "converted from"
        }
      },
      marquee: "Powering Next-Gen Ad Networks",
      footer: {
        privacy: "Privacy",
        terms: "Terms",
        api: "API",
        status: "SYSTEM STATUS: ONLINE"
      }
    }
  },
  ru: {
    translation: {
      nav: {
        features: "Платформа",
        solutions: "Решения",
        developers: "Разработчикам",
        login: "Войти",
        dashboard: "Дашборд",
        getStarted: "Начать",
        exit: "Выйти"
      },
      hero: {
        badge: "v2.0 Оркестратор Live",
        titleLine1: "Полный Контроль.",
        titleLine2: "Абсолютная Свобода.",
        subtitle: "Первый централизованный оркестратор для серьезных партнерских сетей. Мини-трекер, Антифрод и Финансы — единая экосистема.",
        cta: "Начать Работу",
        docs: "Документация",
        core: "Ядро Оркестратора",
        waiting: "Ожидание входящих событий..."
      },
      features: {
        titleLine1: "Создан для масштаба.",
        titleLine2: "Спроектирован для контроля.",
        traffic: {
          title: "Управление Трафиком",
          desc: "Направляйте каждый клик через единый мощный оркестратор. Фильтруйте ботов, управляйте редиректами и оптимизируйте доход в реальном времени.",
          sample: "US Трафик → Оффер А",
          sampleBot: "Бот → Корзина"
        },
        fraud: {
          title: "Встроенный Антифрод",
          desc: "Блокировка Proxy, VPN и бот-трафика до того, как они попадут на оффер."
        },
        finance: {
          title: "Финансы Real-time",
          desc: "Live ROI, P&L и анализ маржи за каждый клик в реальном времени."
        }
      },
      dashboard: {
        title: "Дашборд",
        welcome: "С возвращением, Пользователь",
        selectRole: "Выберите роль для входа в систему.",
        menu: {
          overview: "Обзор",
          reports: "Отчеты",
          links: "Ссылки",
          finance: "Финансы",
          settings: "Настройки",
          logout: "Выйти"
        },
        roles: {
          admin: "Администратор",
          adminDesc: "Полный доступ к системе",
          advertiser: "Рекламодатель",
          advertiserDesc: "Управление офферами",
          publisher: "Вебмастер",
          publisherDesc: "Статистика и выплаты",
          enter: "Войти как {{role}}",
          view: "Режим: {{role}}"
        },
        stats: {
          recentActivity: "Последняя активность",
          salesMonth: "265 продаж за этот месяц.",
          newLead: "Новый лид",
          converted: "конверсия из"
        }
      },
      marquee: "Движок для рекламных сетей нового поколения",
      footer: {
        privacy: "Конфиденциальность",
        terms: "Условия",
        api: "API",
        status: "СТАТУС СИСТЕМЫ: ОНЛАЙН"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ru", // EXPLICITLY SET RUSSIAN AS DEFAULT
    fallbackLng: "ru",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
