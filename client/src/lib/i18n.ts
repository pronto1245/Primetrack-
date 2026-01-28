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
        copy: "Copy",
        close: "Close"
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
        trackingLink: "Tracking Link",
        configureLink: "Configure",
        configureLinkTitle: "Configure Tracking Link",
        subParamsDescription: "Fill in the fields you need — they will be added to the link",
        generatedLink: "Generated link with your sub-parameters",
        copyLink: "Copy Link"
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
      },
      landing: {
        badges: {
          whoFor: "Who It's For",
          advantages: "Advantages",
          features: "Features",
          howItWorks: "How It Works",
          migration: "Migration",
          testimonials: "Testimonials",
          pricing: "Pricing",
          faq: "FAQ",
          contact: "Contact",
          aboutUs: "About Us",
          roadmap: "Roadmap",
          news: "News",
          freeTrial: "30 days free",
          freeTrialFull: "30 days free + no card"
        },
        hero: {
          title1: "Tracker for",
          title2: "affiliate marketing",
          subtitle: "Gambling, betting, push traffic. Clicks → leads → deposits. Postback to any tracker.",
          cta: "Start free",
          demo: "Live Demo"
        },
        pricing: {
          title: "Simple and honest pricing",
          subtitle: "No hidden fees. Unlimited traffic.",
          monthly: "Monthly",
          yearly: "Yearly",
          savings: "Save 20%"
        },
        whoFor: {
          title: "Who is {{platform}} for",
          subtitle: "Platform for advertisers who want to control, analyze and scale their affiliate programs."
        },
        advantages: {
          title: "Why it's convenient in real work",
          items: {
            control: { title: "Full Control", desc: "All data in your hands. No third parties, no shared databases. Your traffic — your rules." },
            speed: { title: "Instant Setup", desc: "Registration in 1 minute. First offer in 5 minutes. No approvals or waiting — start working right away." },
            analytics: { title: "Deep Analytics", desc: "Every click, every conversion, every sub. Slice data by any parameter — find what works." },
            antifraud: { title: "Built-in Anti-Fraud", desc: "Automatic detection of bots, proxies, click-spam. Protect your budget and advertiser's reputation." }
          }
        },
        features: {
          title: "Everything for managing affiliate programs",
          subtitle: "Full toolkit for advertisers"
        },
        howItWorks: {
          title: "Get started in 5 minutes",
          steps: {
            register: { title: "Register", desc: "Create an account, verify email. No card required." },
            createOffer: { title: "Create Offer", desc: "Add tracking link, configure payouts and GEO." },
            invitePartners: { title: "Invite Partners", desc: "Generate registration links for affiliates." },
            trackResults: { title: "Track Results", desc: "Watch real-time clicks and conversions." }
          }
        },
        migration: {
          title: "Migration from other trackers",
          subtitle: "Transfer offers, campaigns, subIDs and conversion history in 10-15 minutes. Without stopping traffic.",
          features: { dataTypes: "Data Types", importMethods: "Import Methods", support: "Support" }
        },
        testimonials: {
          title: "What clients who actually work with {{platform}} say",
          subtitle: "Not marketing quotes — real usage experience"
        },
        faq: {
          title: "Frequently Asked Questions",
          q1: "Who can register in the system?",
          a1: "Only advertisers can register directly. Partners (affiliates) register exclusively via a personal invitation link that the advertiser creates in their dashboard. This is done so the advertiser controls who works with their offers and eliminates junk traffic.",
          q2: "How can a partner get into the system?",
          a2: "The advertiser creates a registration link for partners and posts it on their website or sends it to the partner directly. There are no other ways to register partners.",
          q3: "Are there separate dashboards for advertiser and partner?",
          a3: "Yes. The advertiser creates offers, manages partners, configures postbacks, views analytics and finances. The partner only sees offers available to them, generates links, views their statistics and earnings — they don't see other partners and advertiser data.",
          q4: "Do partners see the platform brand?",
          a4: "No. The platform works in white-label mode. Partners see the advertiser's domain and branding. They won't even know about the SaaS platform's existence.",
          q5: "What's included in the free period?",
          a5: "30 days of full access to all features of the selected plan. No credit card required, no auto-charges, you can cancel anytime. Test the system in real conditions.",
          q6: "Are there limits in the free period?",
          a6: "No. Functionality is not limited, restrictions apply only to plans after the trial ends.",
          q7: "How does click tracking work?",
          a7: "With each click, the system instantly generates a unique click_id, determines GEO, device, browser and saves data for analytics and anti-fraud. Click processing happens in real-time.",
          q8: "How does anti-fraud work?",
          a8: "Anti-fraud is enabled by default. The system analyzes IP addresses (VPN/proxy/hosting), browser fingerprint, click speed and frequency, suspicious behavior patterns. Fraudulent traffic is automatically flagged and not counted in statistics and payouts.",
          q9: "How do postbacks work?",
          a9: "With each conversion, the system automatically sends a postback (HTTP request) to the specified URL. Retry on errors is supported, log of all sent requests and test mode for verification.",
          q10: "What if the partner doesn't use postback?",
          a10: "Even if the partner hasn't set up a postback, the system still records clicks, counts conversions and calculates statistics within the platform. If there's a postback — data is transmitted externally and stays with you.",
          q11: "Is there API access?",
          a11: "Yes. API is available on Professional and Enterprise plans. Through the API you can get statistics, manage offers, work with partners and integrate external services. Documentation opens after registration.",
          q12: "Can I connect my own domain?",
          a12: "Yes. You can connect any of your domains to work with partners. SSL certificate is issued automatically (Let's Encrypt), setup takes 5-10 minutes, partners work only through your domain.",
          q13: "Are cryptocurrency payouts supported?",
          a13: "Yes. Automatic payouts through Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX are supported. Holds, payout history and manual confirmation are available.",
          q14: "Can I add a team?",
          a14: "Yes. You can add managers, analysts and financiers with different access levels. Everyone sees only what they're allowed to.",
          q15: "Is the platform suitable for open CPA networks?",
          a15: "No. The platform is designed for advertisers, private/in-house affiliate programs, agencies and teams. If you need an open CPA network with public registration — this is not our format.",
          q16: "How are you different from Scaleo, Affise and Affilka?",
          a16: "Simpler and faster launch, strict partner control, built-in anti-fraud at no extra cost, full white-label, focus on advertisers, not an 'offer marketplace'."
        },
        contact: {
          title: "Have questions?",
          subtitle: "Write to us and we'll respond within 24 hours",
          form: {
            name: "Your name",
            email: "Email",
            message: "Message",
            submit: "Send message",
            success: "Message sent!",
            successDesc: "We'll contact you shortly."
          }
        },
        aboutUs: {
          title: "About Us",
          description: "Tracker for affiliates by affiliates. We run push and gambling ourselves — we know what's needed in practice. No extra modules and corporate fluff. Register, set up postbacks, work."
        },
        roadmap: {
          title: "Development Plan",
          subtitle: "Follow our progress and learn about new features we're developing"
        },
        news: {
          title: "Latest Updates"
        },
        cta: {
          title: "Launch tracking in 5 minutes",
          subtitle1: "No card. No test limits. Registration in 1 minute.",
          subtitle2: "Join hundreds of advertisers already using {{platform}}",
          register: "Create free account",
          login: "Log in"
        },
        footerNav: {
          navigation: "Navigation",
          features: "Advantages",
          pricing: "Pricing",
          faq: "FAQ",
          contact: "Contacts",
          capabilities: "Capabilities",
          clickTracking: "Click Tracking",
          postbackIntegration: "Postback Integration",
          antifraudSystem: "Anti-Fraud System",
          detailedStats: "Detailed Statistics",
          account: "Account",
          register: "Register",
          login: "Login",
          support: "Support"
        }
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
        copy: "Копировать",
        close: "Закрыть"
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
        trackingLink: "Tracking ссылка",
        configureLink: "Настроить",
        configureLinkTitle: "Настройка ссылки",
        subParamsDescription: "Заполните нужные поля — они будут добавлены к ссылке",
        generatedLink: "Готовая ссылка с вашими sub-параметрами",
        copyLink: "Копировать ссылку"
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
      },
      landing: {
        badges: {
          whoFor: "Кому подходит",
          advantages: "Преимущества",
          features: "Возможности",
          howItWorks: "Как это работает",
          migration: "Миграция",
          testimonials: "Отзывы",
          pricing: "Тарифы",
          faq: "FAQ",
          contact: "Контакты",
          aboutUs: "О нас",
          roadmap: "Развитие",
          news: "Новости",
          freeTrial: "30 дней бесплатно",
          freeTrialFull: "30 дней бесплатно + без карты"
        },
        hero: {
          title1: "Трекер для",
          title2: "арбитража",
          subtitle: "Гембла, беттинг, push-трафик. Клики → лиды → депозиты. Postback в любой трекер.",
          cta: "Начать бесплатно",
          demo: "Демо версия"
        },
        pricing: {
          title: "Простые и честные тарифы",
          subtitle: "Никаких скрытых платежей. Безлимитный трафик.",
          monthly: "Ежемесячно",
          yearly: "Ежегодно",
          savings: "Экономия 20%"
        },
        whoFor: {
          title: "Кому подходит {{platform}}",
          subtitle: "Платформа для рекламодателей, которые хотят контролировать, анализировать и масштабировать партнёрские программы."
        },
        advantages: {
          title: "Почему это удобно в реальной работе",
          items: {
            control: { title: "Полный контроль", desc: "Все данные в ваших руках. Никаких третьих лиц, общих баз данных. Ваш трафик — ваши правила." },
            speed: { title: "Мгновенный старт", desc: "Регистрация за 1 минуту. Первый оффер за 5 минут. Без согласований и ожиданий — просто работаете." },
            analytics: { title: "Глубокая аналитика", desc: "Каждый клик, каждая конверсия, каждый sub. Нарезайте данные по любым параметрам — находите, что работает." },
            antifraud: { title: "Встроенный антифрод", desc: "Автоматическое определение ботов, прокси, click-spam. Защита бюджета и репутации рекла." }
          }
        },
        features: {
          title: "Всё для управления партнёрками",
          subtitle: "Полный набор инструментов для рекламодателей"
        },
        howItWorks: {
          title: "Начните работу за 5 минут",
          steps: {
            register: { title: "Регистрация", desc: "Создайте аккаунт, подтвердите email. Карта не нужна." },
            createOffer: { title: "Создайте оффер", desc: "Добавьте ссылку трекинга, настройте выплаты и ГЕО." },
            invitePartners: { title: "Пригласите партнёров", desc: "Сгенерируйте ссылки регистрации для вебов." },
            trackResults: { title: "Следите за результатами", desc: "Смотрите клики и конверсии в реальном времени." }
          }
        },
        migration: {
          title: "Миграция с других трекеров",
          subtitle: "Перенесите офферы, кампании, subID и историю конверсий за 10-15 минут. Без остановки трафика.",
          features: { dataTypes: "Типы данных", importMethods: "Способы импорта", support: "Поддержка" }
        },
        testimonials: {
          title: "Что говорят клиенты, которые реально работают с {{platform}}",
          subtitle: "Не маркетинговые цитаты — а опыт использования"
        },
        faq: {
          title: "Часто задаваемые вопросы",
          q1: "Кто может зарегистрироваться в системе?",
          a1: "Зарегистрироваться напрямую может только рекламодатель. Партнёры (арбитражники) регистрируются исключительно по персональной ссылке приглашения, которую создаёт рекламодатель в своём кабинете. Это сделано, чтобы рекламодатель контролировал, кто работает с его офферами, и исключить мусорный трафик.",
          q2: "Как партнёру попасть в систему?",
          a2: "Рекламодатель создаёт ссылку регистрации для партнёров и размещает её на своём сайте или отправляет партнёру напрямую. Других способов регистрации партнёров нет.",
          q3: "Есть ли отдельные кабинеты для рекламодателя и партнёра?",
          a3: "Да. Рекламодатель создаёт офферы, управляет партнёрами, настраивает постбеки, смотрит аналитику и финансы. Партнёр видит только доступные ему офферы, генерирует ссылки, смотрит свою статистику и доход — не видит других партнёров и данных рекла.",
          q4: "Видят ли партнёры бренд платформы?",
          a4: "Нет. Платформа работает в white-label режиме. Партнёры видят домен рекламодателя и его оформление. О существовании SaaS-платформы они даже не узнают.",
          q5: "Что включено в бесплатный период?",
          a5: "30 дней полного доступа ко всем функциям выбранного тарифа. Банковская карта не требуется, никаких автосписаний, можно отменить в любой момент. Вы спокойно тестируете систему в боевых условиях.",
          q6: "Есть ли лимиты в бесплатном периоде?",
          a6: "Нет. Функционал не урезается, ограничения только по тарифам после окончания trial.",
          q7: "Как работает трекинг кликов?",
          a7: "При каждом клике система мгновенно генерирует уникальный click_id, определяет GEO, устройство, браузер и сохраняет данные для аналитики и антифрода. Обработка кликов происходит в реальном времени.",
          q8: "Как работает антифрод?",
          a8: "Антифрод включён по умолчанию. Система анализирует IP-адреса (VPN/proxy/hosting), browser fingerprint, скорость и частоту кликов, подозрительные паттерны поведения. Фродовый трафик автоматически помечается и не учитывается в статистике и выплатах.",
          q9: "Как работают постбеки?",
          a9: "При каждой конверсии система автоматически отправляет postback (HTTP-запрос) на указанный URL. Поддерживается повторная отправка (retry) при ошибках, лог всех отправленных запросов и тестовый режим для проверки.",
          q10: "Что если партнёр не использует постбек?",
          a10: "Даже если партнёр не настроил постбек, система всё равно фиксирует клики, учитывает конверсии и считает статистику внутри платформы. Если постбек есть — данные передаются и наружу, и остаются у вас.",
          q11: "Есть ли API доступ?",
          a11: "Да. API доступен на тарифах Professional и Enterprise. Через API можно получать статистику, управлять офферами, работать с партнёрами и интегрировать внешние сервисы. Документация открывается после регистрации.",
          q12: "Можно ли подключить свой домен?",
          a12: "Да. Вы можете подключить любой свой домен для работы с партнёрами. SSL-сертификат выпускается автоматически (Let's Encrypt), настройка занимает 5–10 минут, партнёры работают только через ваш домен.",
          q13: "Поддерживаются ли выплаты в криптовалюте?",
          a13: "Да. Поддерживаются автоматические выплаты через Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX. Доступны холды, история выплат и ручное подтверждение.",
          q14: "Можно ли добавить команду?",
          a14: "Да. Вы можете добавить менеджеров, аналитиков и финансистов с разными уровнями доступа. Каждый видит только то, что ему разрешено.",
          q15: "Подходит ли платформа для открытых CPA-сетей?",
          a15: "Нет. Платформа создана для рекламодателей, private / in-house партнёрских программ, агентств и команд. Если вам нужна открытая CPA-сеть с публичной регистрацией — это не наш формат.",
          q16: "Чем вы отличаетесь от Scaleo, Affise и Affilka?",
          a16: "Проще и быстрее запуск, жёсткий контроль партнёров, встроенный антифрод без доплат, полноценный white-label, фокус на рекла, а не на «маркетплейс офферов»."
        },
        contact: {
          title: "Остались вопросы?",
          subtitle: "Напишите нам, и мы ответим в течение 24 часов",
          form: {
            name: "Ваше имя",
            email: "Email",
            message: "Сообщение",
            submit: "Отправить сообщение",
            success: "Сообщение отправлено!",
            successDesc: "Мы свяжемся с вами в ближайшее время."
          }
        },
        aboutUs: {
          title: "О нас",
          description: "Трекер для арбитражников от арбитражников. Сами льём push и гемблу — знаем что нужно на практике. Никаких лишних модулей и корпоративной мишуры. Запустился, настроил постбеки, работаешь."
        },
        roadmap: {
          title: "План развития",
          subtitle: "Следите за нашим прогрессом и узнавайте о новых функциях, которые мы разрабатываем"
        },
        news: {
          title: "Последние обновления"
        },
        cta: {
          title: "Запустить трекинг за 5 минут",
          subtitle1: "Без карты. Без ограничений на тест. Регистрация за 1 минуту.",
          subtitle2: "Присоединяйтесь к сотням рекламодателей, которые уже используют {{platform}}",
          register: "Создать аккаунт бесплатно",
          login: "Войти в аккаунт"
        },
        footerNav: {
          navigation: "Навигация",
          features: "Преимущества",
          pricing: "Тарифы",
          faq: "FAQ",
          contact: "Контакты",
          capabilities: "Возможности",
          clickTracking: "Отслеживание кликов",
          postbackIntegration: "Postback интеграция",
          antifraudSystem: "Антифрод система",
          detailedStats: "Детальная статистика",
          account: "Аккаунт",
          register: "Регистрация",
          login: "Вход",
          support: "Поддержка"
        }
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
