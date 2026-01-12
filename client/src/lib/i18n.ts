import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      brand: "Primetrack",
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
        roi: "ROI",
        leads: "Leads",
        sales: "Sales",
        advertiserCost: "Cost",
        publisherPayout: "Payout",
        margin: "Margin",
        cr: "CR%"
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
        loginPrompt: "Enter credentials or use quick login",
        username: "USERNAME",
        password: "PASSWORD",
        login: "LOGIN",
        quickLogin: "Quick Login",
        loginError: "Invalid credentials",
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
          roi: "ROI",
          offer: "Offer",
          leads: "Leads",
          sales: "Sales",
          cost: "Cost",
          payout: "Payout",
          margin: "Margin",
          cr: "CR%",
          publisher: "Publisher",
          conversions: "Conv."
        },
        overview: "Dashboard Overview",
        dailyStats: "Daily Statistics",
        statsByOffer: "Statistics by Offer",
        statsByPublisher: "Statistics by Publisher",
        filters: "Filters",
        freeSearch: "Free Search",
        freeSearchPlaceholder: "Search...",
        dateFrom: "Date From",
        dateTo: "Date To",
        menu: {
          overview: "Overview",
          reports: "Reports",
          links: "Offers",
          finance: "Finance",
          settings: "Settings",
          logout: "DISCONNECT",
          users: "Tenant Management",
          offers: "Offers",
          campaigns: "Campaigns",
          payouts: "Payouts",
          partners: "Partners",
          requests: "Requests",
          splitTests: "Split Tests"
        },
        offers: {
          all: "All Offers"
        },
        publishers: {
          all: "All Publishers"
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
      auth: {
        login: "Log In"
      },
      common: {
        retry: "Retry",
        copied: "Copied!",
        cancel: "Cancel",
        save: "Save",
        copy: "Copy"
      },
      tracking: {
        generator: "Link Generator",
        copyLink: "Copy Affiliate Link"
      },
      publisherDashboard: {
        totalPayout: "Total Payout",
        hold: "Hold",
        epc: "EPC",
        apply: "Apply",
        noData: "No data for selected period",
        noGeoData: "No GEO data",
        noOffersData: "No offers data",
        statusApproved: "Approved",
        statusHold: "Hold",
        statusRejected: "Rejected",
        statusPending: "Pending",
        exportConversions: "Export Conversions",
        exportClicks: "Export Clicks"
      },
      splitTests: {
        title: "Split Tests",
        description: "Create A/B tests to distribute traffic between multiple offers",
        create: "Create Split Test",
        createFirst: "Create Your First Split Test",
        edit: "Edit Split Test",
        noTests: "No Split Tests",
        noTestsDescription: "Create your first split test to distribute traffic between multiple offers with custom weights.",
        name: "Name",
        namePlaceholder: "e.g. Gambling GEO Mix",
        nameRequired: "Name is required",
        descriptionLabel: "Description",
        descriptionPlaceholder: "Optional description",
        items: "Offers and Weights",
        selectOffer: "Select offer",
        defaultLanding: "Default landing",
        addItem: "Add Offer",
        totalWeight: "Total weight",
        weightsMustEqual100: "Weights must total 100% (current: {{total}}%)",
        minItemsRequired: "At least 2 offers are required",
        selectAllOffers: "Please select an offer for each item",
        created: "Split test created successfully",
        updated: "Split test updated successfully",
        deleted: "Split test deleted successfully",
        linkCopied: "Tracking link copied to clipboard",
        trackingLink: "Tracking Link"
      },
      reports: {
        filters: "Filters",
        freeSearch: "Free Search",
        freeSearchPlaceholder: "Search...",
        dateFrom: "From (dd.mm.yyyy)",
        dateTo: "To (dd.mm.yyyy)",
        geo: "GEO",
        device: "Device",
        groupBy: "Group By",
        clearFilters: "Clear Filters",
        clicks: "Clicks",
        conversions: "Conversions",
        grouped: "Grouped",
        noData: "No data for selected filters",
        all: "All",
        showing: "Showing",
        of: "of",
        total: "total",
        table: {
          date: "Date",
          clickId: "Click ID",
          offer: "Offer",
          publisher: "Publisher",
          geo: "GEO",
          device: "Device",
          os: "OS",
          browser: "Browser",
          unique: "Unique",
          geoMatch: "GEO Match",
          sub1: "Sub1",
          type: "Type",
          status: "Status",
          payout: "Payout",
          cost: "Cost",
          margin: "Margin",
          roi: "ROI",
          leads: "Leads",
          sales: "Sales",
          conv: "Conv.",
          clicks: "Clicks"
        }
      },
      errors: {
        sessionExpired: "Session expired. Please log in again."
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
      brand: "Primetrack",
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
        roi: "ROI",
        leads: "Лиды",
        sales: "Продажи",
        advertiserCost: "Расход",
        publisherPayout: "Выплата",
        margin: "Маржа",
        cr: "CR%"
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
        loginPrompt: "Введите данные или используйте быстрый вход",
        username: "ЛОГИН",
        password: "ПАРОЛЬ",
        login: "ВОЙТИ",
        quickLogin: "Быстрый вход",
        loginError: "Неверные данные",
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
          roi: "ROI",
          offer: "Оффер",
          leads: "Лиды",
          sales: "Продажи",
          cost: "Расход",
          payout: "Выплата",
          margin: "Маржа",
          cr: "CR%",
          publisher: "Вебмастер",
          conversions: "Конв."
        },
        overview: "Обзор",
        dailyStats: "Статистика по дням",
        statsByOffer: "Статистика по офферам",
        statsByPublisher: "Статистика по вебмастерам",
        filters: "Фильтры",
        freeSearch: "Свободный поиск",
        freeSearchPlaceholder: "Поиск...",
        dateFrom: "Дата от",
        dateTo: "Дата до",
        menu: {
          overview: "Обзор",
          reports: "Отчеты",
          links: "Офферы",
          finance: "Финансы",
          settings: "Настройки",
          logout: "ОТКЛЮЧИТЬСЯ",
          users: "Управление тенантами",
          offers: "Офферы",
          campaigns: "Кампании",
          payouts: "Выплаты",
          partners: "Партнёры",
          requests: "Заявки",
          splitTests: "Сплит-тесты"
        },
        offers: {
          all: "Все офферы",
          title: "Мои офферы",
          subtitle: "Управление вашими офферами и рекламными кампаниями",
          create: "Создать оффер",
          createNew: "Новый оффер",
          createNewDesc: "Заполните детали оффера для публикации в партнерской сети",
          marketplace: "Маркетплейс Офферов",
          marketplaceDesc: "Доступные офферы от всех рекламодателей",
          searchPlaceholder: "Поиск по названию, ID или тегу...",
          filter: "Фильтры",
          name: "Название",
          category: "Категория",
          geo: "ГЕО",
          payout: "Выплата",
          cr: "CR",
          status: "Статус",
          form: {
            title: "Название оффера",
            description: "Описание и условия",
            trackingUrl: "Tracking URL (Лендинг)",
          }
        },
        publishers: {
          all: "Все вебмастера"
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
      auth: {
        login: "Войти"
      },
      common: {
        retry: "Повторить",
        copied: "Скопировано!",
        cancel: "Отмена",
        save: "Сохранить",
        copy: "Копировать"
      },
      tracking: {
        generator: "Генератор ссылок",
        copyLink: "Копировать ссылку"
      },
      publisherDashboard: {
        totalPayout: "Общая выплата",
        hold: "В холде",
        epc: "EPC",
        apply: "Применить",
        noData: "Нет данных за выбранный период",
        noGeoData: "Нет данных по ГЕО",
        noOffersData: "Нет данных по офферам",
        statusApproved: "Одобрено",
        statusHold: "В холде",
        statusRejected: "Отклонено",
        statusPending: "На рассмотрении",
        exportConversions: "Экспорт конверсий",
        exportClicks: "Экспорт кликов"
      },
      splitTests: {
        title: "Сплит-тесты",
        description: "Создайте A/B тесты для распределения трафика между офферами",
        create: "Создать сплит-тест",
        createFirst: "Создать первый сплит-тест",
        edit: "Редактировать сплит-тест",
        noTests: "Нет сплит-тестов",
        noTestsDescription: "Создайте первый сплит-тест для распределения трафика между офферами с настраиваемыми весами.",
        name: "Название",
        namePlaceholder: "например, Гемблинг ГЕО Микс",
        nameRequired: "Название обязательно",
        descriptionLabel: "Описание",
        descriptionPlaceholder: "Необязательное описание",
        items: "Офферы и веса",
        selectOffer: "Выберите оффер",
        defaultLanding: "Лендинг по умолчанию",
        addItem: "Добавить оффер",
        totalWeight: "Общий вес",
        weightsMustEqual100: "Веса должны составлять 100% (сейчас: {{total}}%)",
        minItemsRequired: "Требуется минимум 2 оффера",
        selectAllOffers: "Выберите оффер для каждого элемента",
        created: "Сплит-тест успешно создан",
        updated: "Сплит-тест успешно обновлён",
        deleted: "Сплит-тест успешно удалён",
        linkCopied: "Ссылка скопирована в буфер обмена",
        trackingLink: "Tracking ссылка"
      },
      reports: {
        filters: "Фильтры",
        freeSearch: "Свободный фильтр",
        freeSearchPlaceholder: "Введите запрос...",
        dateFrom: "От (дд.мм.гггг)",
        dateTo: "До (дд.мм.гггг)",
        geo: "ГЕО",
        device: "Устройство",
        groupBy: "Группировать по",
        clearFilters: "Очистить фильтры",
        clicks: "Клики",
        conversions: "Конверсии",
        grouped: "Группировка",
        noData: "Нет данных для выбранных фильтров",
        all: "Все",
        showing: "Показано",
        of: "из",
        total: "всего",
        table: {
          date: "Дата",
          clickId: "ID клика",
          offer: "Оффер",
          publisher: "Вебмастер",
          geo: "ГЕО",
          device: "Устройство",
          os: "ОС",
          browser: "Браузер",
          unique: "Уник",
          geoMatch: "GEO Match",
          sub1: "Sub1",
          type: "Тип",
          status: "Статус",
          payout: "Выплата",
          cost: "Расход",
          margin: "Маржа",
          roi: "ROI",
          leads: "Лиды",
          sales: "Продажи",
          conv: "Конв.",
          clicks: "Клики"
        }
      },
      errors: {
        sessionExpired: "Сессия истекла. Пожалуйста, войдите снова."
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
