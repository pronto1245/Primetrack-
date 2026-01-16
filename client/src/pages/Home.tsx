import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Terminal, Cpu, ShieldCheck, Activity, Check, X,
  Zap, Globe, Users, BarChart3, Lock, Clock, Webhook, 
  CreditCard, Bell, FileText, ArrowUpRight, Mail, MessageCircle,
  UserPlus, Settings, TrendingUp, Send, Star, Quote, Newspaper,
  ChevronRight, Sparkles, Map, Rocket, Code, Loader2,
  CheckCircle2, Circle, Play
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import screenshot1 from "@assets/Снимок_09.01.2026_в_21.12_1767983590330.png";
import screenshot2 from "@assets/Снимок_09.01.2026_в_21.12_1767983590340.png";
import screenshot3 from "@assets/Снимок_09.01.2026_в_21.11_1767983590341.png";

const heroImages = [screenshot1, screenshot2, screenshot3];

type SubscriptionPlan = {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxPartners: number | null;
  hasAntifraud: boolean;
  hasNews: boolean;
  hasPostbacks: boolean;
  hasTeam: boolean;
  hasWebhooks: boolean;
  hasCustomDomain: boolean;
  hasApiAccess: boolean;
};

export default function Home() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [isYearly, setIsYearly] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liveClicks, setLiveClicks] = useState(4285);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const demoTabs = [
    { label: "Дашборд", src: "/demo-videos/дашборд.mp4" },
    { label: "Офферы", src: "/demo-videos/офферы_.mp4" },
    { label: "Создание оффера", src: "/demo-videos/создание_оффера.mp4" },
    { label: "Статистика", src: "/demo-videos/статитстика.mp4" },
    { label: "Финансы", src: "/demo-videos/финансы.mp4" },
    { label: "Команда", src: "/demo-videos/команда.mp4" },
    { label: "Антифрод", src: "/demo-videos/антифрод.mp4" },
  ];

  const handleVideoEnd = () => {
    setActiveDemoTab((prev) => (prev + 1) % demoTabs.length);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [activeDemoTab]);

  const { data: publicNews = [], isLoading: newsLoading } = useQuery<any[]>({
    queryKey: ["/api/public/news"],
  });

  const { data: publicRoadmap = [], isLoading: roadmapLoading } = useQuery<any[]>({
    queryKey: ["/api/public/roadmap"],
  });

  const fallbackNews = [
    {
      id: "1",
      title: "Новая система антифрода 2.0",
      category: "Обновление",
      shortDescription: "Добавили машинное обучение для ещё более точного определения фродового трафика.",
      body: "Мы рады представить обновлённую систему антифрода версии 2.0! Теперь платформа использует алгоритмы машинного обучения для анализа паттернов трафика в реальном времени. Система способна выявлять: бот-трафик и автоматизированные клики, прокси и VPN соединения, подозрительные fingerprints устройств, аномальные паттерны поведения пользователей.",
      createdAt: "2026-01-15T00:00:00Z"
    },
    {
      id: "2",
      title: "Интеграция с Binance Pay",
      category: "Интеграция",
      shortDescription: "Теперь можно выплачивать партнёрам напрямую через Binance Pay без комиссий.",
      body: "Мы интегрировали Binance Pay для быстрых и безкомиссионных выплат партнёрам! Теперь вы можете: отправлять выплаты в USDT, BTC, ETH и других криптовалютах, экономить на комиссиях за переводы, получать мгновенное подтверждение транзакций.",
      createdAt: "2026-01-10T00:00:00Z"
    },
    {
      id: "3",
      title: "Telegram бот для уведомлений",
      category: "Фича",
      shortDescription: "Получайте мгновенные уведомления о конверсиях прямо в Telegram.",
      body: "Представляем нового Telegram бота для уведомлений! Подключите бота к своему аккаунту и получайте мгновенные уведомления о: новых лидах и продажах, запросах на выплату от партнёров, важных системных событиях.",
      createdAt: "2026-01-05T00:00:00Z"
    }
  ];

  const fallbackRoadmap = [
    {
      id: "1",
      title: "Интеграция AI-антифрода",
      description: "Машинное обучение для определения фродового трафика в реальном времени",
      quarter: "Q1 2026",
      status: "in_progress"
    },
    {
      id: "2",
      title: "Мобильное приложение",
      description: "Нативные приложения для iOS и Android с push-уведомлениями",
      quarter: "Q2 2026",
      status: "planned"
    },
    {
      id: "3",
      title: "Расширенная аналитика",
      description: "Дашборды с детальной статистикой и прогнозами на основе ML",
      quarter: "Q3 2026",
      status: "planned"
    }
  ];

  const normalizedNews = (publicNews || []).map((post: any) => ({
    id: post.id || `news-${Math.random()}`,
    title: post.title || 'Без заголовка',
    category: post.category || 'Новость',
    shortDescription: post.shortDescription || post.body?.substring(0, 150) || '',
    body: post.body || '',
    createdAt: post.createdAt || post.publishedAt || new Date().toISOString(),
  }));
  
  const normalizedRoadmap = (publicRoadmap || []).map((item: any) => ({
    id: item.id || `roadmap-${Math.random()}`,
    title: item.title || 'Без заголовка',
    description: item.description || '',
    quarter: item.quarter || 'TBD',
    status: item.status || 'planned',
  }));

  const displayNews = normalizedNews.length > 0 ? normalizedNews : fallbackNews;
  const displayRoadmap = normalizedRoadmap.length > 0 ? normalizedRoadmap : fallbackRoadmap;

  const categoryIcons: Record<string, any> = {
    "Обновление": ShieldCheck,
    "Интеграция": CreditCard,
    "Фича": Bell,
    "Новость": Newspaper,
  };

  const getNewsIcon = (category: string) => categoryIcons[category] || Newspaper;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveClicks((prev) => prev + Math.floor(Math.random() * 15) + 5);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Сообщение отправлено!", description: "Мы свяжемся с вами в ближайшее время." });
    setContactForm({ name: '', email: '', message: '' });
    setIsSubmitting(false);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.1 } },
    viewport: { once: true }
  };
  
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: platformSettings } = useQuery<any>({
    queryKey: ["/api/public/platform-settings"],
  });

  const platformName = platformSettings?.platformName || t("brand");
  const supportEmail = platformSettings?.supportEmail || "support@example.com";
  const supportTelegram = platformSettings?.supportTelegram || "primetrack_support_bot";
  // Normalized handle without @ for URL construction
  const supportTelegramHandle = supportTelegram.replace(/^@/, "");
  const copyrightText = platformSettings?.copyrightText || `© ${new Date().getFullYear()} ${platformName}. Все права защищены.`;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-emerald-500/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute left-1/2 -translate-x-1/2 top-0 -z-10 h-[500px] w-[800px] rounded-full bg-emerald-500 opacity-15 blur-[120px]"></div>

        <div className="container px-4 mx-auto relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              30 дней бесплатно + без карты
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Трекер для <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">арбитража</span> гемблы, беттинга и push-трафика
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
              {platformSettings?.platformDescription || `Запускайте офферы, принимайте клики, лиды и депозиты, передавайте postback в партнёрки и сторонние трекеры. Минимальная задержка редиректа, полная статистика по subID.`}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button 
                size="lg" 
                className="h-12 px-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-base shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-emerald-500 transition-all"
                onClick={() => navigate('/register/advertiser')}
                data-testid="button-hero-register"
              >
                Начать бесплатно
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-12 px-8 rounded-lg border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-base"
                onClick={() => scrollToSection('pricing')}
                data-testid="button-hero-pricing"
              >
                Смотреть тарифы
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <span className="flex items-center gap-1 text-sm text-muted-foreground"><Check className="w-4 h-4 text-emerald-500" />CPA / RevShare / Hybrid</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground"><Check className="w-4 h-4 text-emerald-500" />Postback</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground"><Check className="w-4 h-4 text-emerald-500" />SubID</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground"><Check className="w-4 h-4 text-emerald-500" />Антидубль</span>
            </div>

            <div className="w-full max-w-[1400px] mx-auto relative px-4">
              <div className="relative rounded-xl bg-[#0a0a0a] border border-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.15)] overflow-hidden">
                <div className="h-10 bg-[#111] border-b border-border/50 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  <div className="ml-3 text-xs font-mono text-muted-foreground">dashboard.primetrack.pro</div>
                </div>
                <div className="relative w-full" style={{ aspectRatio: '1920/1080' }}>
                  <AnimatePresence initial={false}>
                    <motion.img 
                      key={currentImageIndex}
                      src={heroImages[currentImageIndex]} 
                      alt={`${platformName} Dashboard`} 
                      className="absolute inset-0 w-full h-full object-contain"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="flex justify-center gap-2 mt-4">
                {heroImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentImageIndex ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-b border-border bg-muted/50">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { label: "Кликов обработано", value: "1.2B+" },
              { label: "Доступность", value: "99.99%" },
              { label: "Скорость отклика", value: "< 5ms" },
              { label: "Рекламодателей", value: "500+" },
            ].map((stat, i) => (
              <div key={i} className="py-6 px-4 text-center hover:bg-muted transition-colors">
                <div className="text-2xl md:text-3xl font-mono font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">Демо</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Как это работает</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Посмотрите основные возможности платформы в действии
            </p>
          </motion.div>

          <div className="w-full max-w-[1600px] mx-auto">
            <div className="relative rounded-2xl bg-[#0a0a0a] border border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.15)] overflow-hidden">
              <div className="h-12 bg-[#111] border-b border-border/50 flex items-center px-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 flex justify-center gap-1 md:gap-2 overflow-x-auto px-4">
                  {demoTabs.map((tab, i) => (
                    <button
                      key={tab.label}
                      onClick={() => setActiveDemoTab(i)}
                      data-testid={`demo-tab-${i}`}
                      className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                        activeDemoTab === i
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative w-full" style={{ aspectRatio: '16/9' }} data-testid="demo-video-container">
                <video
                  ref={videoRef}
                  key={activeDemoTab}
                  src={demoTabs[activeDemoTab].src}
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  autoPlay
                  muted
                  playsInline
                  onEnded={handleVideoEnd}
                />
              </div>
            </div>
            
            <div className="flex justify-center gap-2 mt-6">
              {demoTabs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveDemoTab(i)}
                  data-testid={`demo-dot-${i}`}
                  className={`w-2 h-2 rounded-full transition-colors ${i === activeDemoTab ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-24 bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-6">
            <Badge variant="secondary" className="mb-4">Кому подходит</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Кому подходит {platformName}</h2>
          </motion.div>
          <motion.div {...fadeInUp} className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              {platformName} — это рабочий инструмент для тех, кто каждый день заливает трафик и считает деньги. Мы не пытались сделать универсальный сервис «для всех». Он сделан под конкретные задачи.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0, duration: 0.5 }}
            >
              <Card className="bg-card border-border h-full hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <TrendingUp className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Арбитражникам</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    Если вы льёте трафик сами и вам важно видеть реальную картину по источникам, {platformName} позволяет контролировать каждый этап — от клика до депозита.
                  </p>
                  <p className="text-muted-foreground text-sm mb-2">Вы получаете:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />отслеживание кликов, лидов и депозитов</li>
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />детальную статистику по subID (sub1–sub10)</li>
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />быстрый запуск и масштабирование рабочих связок</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-4">Вся статистика доступна в одном месте, без лишних экранов и отчётов.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="bg-card border-border h-full hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <Users className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Командам и медиабаерам</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {platformName} удобно использовать в команде, когда с трафиком работает несколько человек.
                  </p>
                  <p className="text-muted-foreground text-sm mb-2">Платформа позволяет:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />создавать несколько аккаунтов и проектов</li>
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />разграничивать доступы между участниками</li>
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />смотреть общую статистику по источникам и кампаниям</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-4">Это упрощает контроль работы команды и даёт прозрачную картину по результатам.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="bg-card border-border h-full hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <Globe className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Партнёрским программам</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {platformName} подходит для учёта и контроля партнёрского трафика.
                  </p>
                  <p className="text-muted-foreground text-sm mb-2">Вы можете:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />отслеживать клики, лиды и конверсии</li>
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />работать со своими офферами и postback</li>
                    <li className="flex items-start gap-2 text-muted-foreground text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />контролировать качество трафика и выявлять подозрительную активность</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-4">Система помогает видеть, откуда приходит трафик и как он конвертируется.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Not Competitors - Philosophy */}
      <section className="py-24 border-t border-border bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">Почему не Scaleo / Affise?</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Мы не пытались сделать ещё один корпоративный трекер</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Scaleo и Affise — сильные продукты, но они изначально создавались под большие команды, менеджеров и отчётность.
              </p>
              <p>
                {platformName} появился из практики залива трафика. Нам нужен был простой и стабильный трекер, который не мешает работать, не перегружает интерфейс и не требует долгой настройки перед запуском кампании.
              </p>
              <p>
                Если вы льёте push, gambling или betting, вам важны скорость редиректа, чистая статистика и быстрый доступ к данным. Именно под эти задачи и делался {platformName}.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Advantages - Detailed */}
      <section className="py-24 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Преимущества</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Почему это удобно в реальной работе</h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">Без лишних модулей</h3>
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
                    <p>В большинстве трекеров много функций, которые выглядят полезно на демо, но в реальном заливе не используются.</p>
                    <p>В {platformName} мы оставили только то, что действительно нужно каждый день: офферы, кампании, subID, postback, статистику и фильтры.</p>
                    <p>Нет CRM-логики, сложных ролей и многоуровневых сценариев — только трекинг и контроль трафика.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">Быстрый старт</h3>
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
                    <p>Мы сознательно убрали сложный онбординг.</p>
                    <p>После регистрации вы сразу можете создать оффер, сгенерировать ссылку и начать лить трафик. В среднем на первый запуск уходит не больше 5 минут.</p>
                    <p>Никаких обязательных интеграций и долгих предварительных настроек.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">Простая логика</h3>
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
                    <p>Интерфейс сделан так, чтобы в нём не нужно было разбираться. Все основные действия находятся там, где их ожидаешь увидеть.</p>
                    <p>Если вы уже работали с трекерами, {platformName} будет понятен с первого входа — без обучения и чтения документации.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">Заточено под арбитраж</h3>
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
                    <p>{platformName} разрабатывался под реальные сценарии залива трафика.</p>
                    <p>Мы ориентируемся на push-источники, gambling и betting-офферы, работу с CPA и RevShare моделями.</p>
                    <p>Система корректно принимает и передаёт postback, поддерживает работу с subID и даёт полную картину по кампаниям.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Возможности</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Всё для управления партнёрками</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Полный набор инструментов для рекламодателей
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Мини-трекер под реальный залив", desc: "Лёгкий трекер без перегруза. Клики обрабатываются мгновенно, каждому присваивается уникальный click_id, GEO определяется автоматически.", color: "emerald" },
              { icon: BarChart3, title: "Понятная статистика", desc: "Статистика по офферам, партнёрам, гео и устройствам — в одном месте. Фильтры помогают быстро понять, что масштабировать, а что отключать.", color: "blue" },
              { icon: ShieldCheck, title: "Антифрод и контроль качества", desc: "Защита от некачественного трафика: прокси и VPN, подозрительные отпечатки, слишком быстрые или повторяющиеся клики.", color: "red" },
              { icon: Webhook, title: "Postback и Webhooks", desc: "Автоматическая передача конверсий во внешние системы. Поддержка повторных отправок, логирование и контроль статусов.", color: "purple" },
              { icon: Users, title: "Командная работа", desc: "Добавляйте менеджеров, аналитиков и финансовых сотрудников. Разграничение прав доступа — каждый видит только то, что ему нужно.", color: "orange" },
              { icon: Globe, title: "Кастомные домены", desc: "Подключайте свои домены для трекинг-ссылок. SSL-сертификаты выпускаются автоматически через Let's Encrypt — без ручной возни.", color: "cyan" },
              { icon: CreditCard, title: "Финансы и выплаты", desc: "Учёт балансов, холдов и выплат партнёрам. Поддержка криптовалютных интеграций и прозрачная история операций.", color: "green" },
              { icon: Bell, title: "Уведомления", desc: "Важные события всегда под рукой: in-app уведомления и Telegram-бот. Клики, конверсии и ошибки — без постоянного обновления страниц.", color: "yellow" },
              { icon: FileText, title: "Миграция без боли", desc: "Помогаем переехать с Scaleo, Affilka, Affise, Alanbase. Импорт офферов и данных занимает 10–15 минут.", color: "pink" },
            ].map((feature, i) => (
              <Card key={i} className="bg-card/50 border-border hover:border-emerald-500/30 transition-colors group">
                <CardContent className="p-6">
                  <div className={`w-10 h-10 bg-${feature.color}-500/10 rounded flex items-center justify-center text-${feature.color}-500 mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-border bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Как это работает</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Начните работу за 5 минут</h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-xs font-mono text-emerald-500 mb-2">01</div>
                  <h3 className="text-lg font-bold mb-3">Регистрация</h3>
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
                    <p>Создаёте аккаунт в {platformName} и сразу попадаете в рабочий кабинет.</p>
                    <p>Без подтверждения по звонку, без менеджеров и без обязательной привязки карты.</p>
                    <p>Регистрация занимает не больше минуты.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-xs font-mono text-emerald-500 mb-2">02</div>
                  <h3 className="text-lg font-bold mb-3">Создание оффера</h3>
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
                    <p>Добавляете оффер, указываете лендинги и модель выплат.</p>
                    <p>Настраиваете postback, параметры subID и другие нужные опции.</p>
                    <p>После сохранения система сразу генерирует трекинговую ссылку.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-xs font-mono text-emerald-500 mb-2">03</div>
                  <h3 className="text-lg font-bold mb-3">Привлечение партнёров</h3>
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
                    <p>Передаёте партнёрам или медиабаерам готовую ссылку.</p>
                    <p>Каждый клик и конверсия автоматически фиксируются в статистике.</p>
                    <p>Вы видите, откуда пришёл трафик и по каким источникам он работает лучше.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-xs font-mono text-emerald-500 mb-2">04</div>
                  <h3 className="text-lg font-bold mb-3">Отслеживание результатов</h3>
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
                    <p>В реальном времени отслеживаете клики, лиды и продажи.</p>
                    <p>Фильтруете статистику по офферам, кампаниям и subID.</p>
                    <p>Контролируете качество трафика и эффективность источников.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div 
            {...fadeInUp} 
            className="text-center mt-12 max-w-2xl mx-auto"
          >
            <p className="text-muted-foreground leading-relaxed">
              Никаких сложных сценариев и лишних настроек.<br />
              Вы создаёте оффер, льёте трафик и сразу видите результат.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Migration Section */}
      <section className="py-24 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">Миграция</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Миграция с других трекеров</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Перенесите офферы, кампании, subID и историю конверсий за 10-15 минут. Без остановки трафика.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {["Scaleo", "Affilka", "Affise", "Alanbase"].map((platform) => (
                <div key={platform} className="flex items-center justify-center gap-2 p-3 rounded border border-border bg-card/50 hover:border-emerald-500/30 transition-colors">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-sm">{platform}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline"
                onClick={() => setShowMigrationModal(true)}
                data-testid="button-migration-details"
              >
                Подробнее о миграции
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
              <Button 
                onClick={() => navigate('/register/advertiser')}
                className="bg-emerald-600 hover:bg-emerald-500"
                data-testid="button-migration-register"
              >
                Начать миграцию
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Migration Modal */}
      <Dialog open={showMigrationModal} onOpenChange={setShowMigrationModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Миграция с других трекеров</DialogTitle>
          </DialogHeader>
          <div className="text-muted-foreground leading-relaxed space-y-6 mt-4">
            <div>
              <p>
                Переезд с одного трекера на другой почти всегда выглядит болезненно: нужно заново создавать офферы, переносить кампании, следить, чтобы не сломалась статистика.
              </p>
              <p className="mt-2">
                {platformName} позволяет перенести основные данные из популярных трекеров и продолжить работу без ручного пересоздания структуры.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">С каких платформ можно переехать</h4>
              <div className="grid grid-cols-2 gap-2">
                {["Scaleo", "Affilka", "Affise", "Alanbase"].map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm mt-2">Используете другой трекер? Напишите в поддержку — подскажем формат.</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Что переносится</h4>
              <ul className="space-y-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />Офферы и их настройки</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />Кампании и источники трафика</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />Параметры subID</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />Конверсии и их статусы</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Как проходит процесс</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Выбираете трекер, с которого хотите перенести данные</li>
                <li>Экспортируете данные или подключаете API</li>
                <li>Загружаете файл или указываете доступы</li>
                <li>Проверяете сопоставление полей</li>
                <li>Запускаете импорт</li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded bg-muted/50">
                <div className="font-medium text-foreground">Способы импорта</div>
                <div>CSV, JSON, API</div>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <div className="font-medium text-foreground">Время импорта</div>
                <div>10-15 минут</div>
              </div>
            </div>

            <div className="text-sm border-t border-border pt-4">
              <p>Все данные передаются по зашифрованному соединению. Исходные файлы не сохраняются после импорта.</p>
            </div>

            <div className="flex justify-center pt-2">
              <Button 
                onClick={() => { setShowMigrationModal(false); navigate('/register/advertiser'); }}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Начать миграцию
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Testimonials */}
      <section className="py-24 border-t border-border bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Отзывы</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Что говорят клиенты, которые реально работают с {platformName}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Не маркетинговые цитаты — а опыт использования
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "MediaBuy Pro",
                role: "Рекламодатель / media buying команда",
                avatar: "mediabuy",
                text: "Переехали со Scaleo, потому что устали от перегруженного интерфейса. Здесь проще контролировать трафик и быстрее видно, где фрод. По деньгам — реально стали терять меньше на мусорном трафике.",
                rating: 5
              },
              {
                name: "TrafficLab", 
                role: "CPA-сеть",
                avatar: "trafficlab",
                text: "Постбеки настроили с первого раза, без танцев с бубном. Саппорт на связи и не отмахивается — это редкость. Пока используем не все функции, но для текущих задач хватает.",
                rating: 5
              },
              {
                name: "LeadGen Network",
                role: "Партнёрская программа",
                avatar: "leadgen", 
                text: "Искали решение под white-label, чтобы не городить свой трекер. Подключили домен, настроили офферы — партнёры работают как с нашей платформой. Для старта и масштабирования — то, что нужно.",
                rating: 5
              },
              {
                name: "Анонимный пользователь",
                role: "Арбитражная команда",
                avatar: "anon2024", 
                text: "Есть моменты, которые ещё допиливаются, но команда быстро реагирует. Нам важнее, что продукт развивается и можно напрямую влиять на фичи.",
                rating: 4
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="bg-card border-border h-full hover:border-emerald-500/30 transition-colors">
                  <CardContent className="p-6">
                    <Quote className="w-8 h-8 text-emerald-500/30 mb-4" />
                    <p className="text-muted-foreground mb-6 leading-relaxed">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${testimonial.avatar}`} 
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full bg-muted"
                      />
                      <div>
                        <div className="font-medium">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-4">
                      {Array.from({ length: testimonial.rating }).map((_, idx) => (
                        <Star key={idx} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 border-t border-border bg-card/50">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              30 дней бесплатно
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Простые и честные тарифы</h2>
            <p className="text-muted-foreground">Никаких скрытых платежей. Безлимитный трафик.</p>
          </div>

          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Ежемесячно
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-billing-cycle"
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Ежегодно
            </span>
            {isYearly && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                -15%
              </Badge>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-0 border border-border rounded overflow-hidden">
            {plans.map((plan, i) => {
              const isActive = i === 1;
              const price = isYearly 
                ? (parseFloat(plan.yearlyPrice) / 12).toFixed(0)
                : parseFloat(plan.monthlyPrice).toFixed(0);
              
              const features = [
                { label: plan.maxPartners ? `До ${plan.maxPartners} партнёров` : "Безлимит партнёров", included: true },
                { label: "Безлимит офферов", included: true },
                { label: "Постбеки", included: plan.hasPostbacks },
                { label: "Статистика", included: true },
                { label: "Финансы", included: true },
                { label: "Антифрод", included: plan.hasAntifraud },
                { label: "Новости", included: plan.hasNews },
                { label: "Команда", included: plan.hasTeam },
                { label: "Webhooks", included: plan.hasWebhooks },
                { label: "Кастомный домен", included: plan.hasCustomDomain },
                { label: "API доступ", included: plan.hasApiAccess },
              ];
              
              return (
                <div key={plan.id} className={`p-8 ${isActive ? 'bg-secondary relative z-10' : 'bg-background'} border-r border-border last:border-r-0 flex flex-col`}>
                  {isActive && <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />}
                  {isActive && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600">
                      Популярный
                    </Badge>
                  )}
                  <h3 className="text-lg font-mono font-medium text-muted-foreground mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-foreground mb-2">
                    ${price}<span className="text-sm font-normal text-muted-foreground">/мес</span>
                  </div>
                  {isYearly && (
                    <p className="text-xs text-emerald-400 mb-6">
                      ${parseFloat(plan.yearlyPrice).toFixed(0)}/год
                    </p>
                  )}
                  {!isYearly && <div className="mb-6" />}
                  <ul className="space-y-3 mb-8 flex-1">
                    {features.map((f, idx) => (
                      <li key={idx} className={`flex items-center text-sm ${f.included ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                        {f.included ? (
                          <Check className="w-4 h-4 text-emerald-500 mr-3 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 mr-3 flex-shrink-0" />
                        )}
                        {f.label}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={isActive ? "default" : "outline"} 
                    className={`w-full ${isActive ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-border hover:bg-muted'}`}
                    onClick={() => navigate(`/register/advertiser?plan=${plan.id}&billing=${isYearly ? 'yearly' : 'monthly'}`)}
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                  >
                    Начать бесплатно
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 border-t border-border bg-background">
        <div className="container px-4 mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Часто задаваемые вопросы</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              { q: "Кто может зарегистрироваться в системе?", a: "Зарегистрироваться напрямую может только рекламодатель. Партнёры (арбитражники) регистрируются исключительно по персональной ссылке приглашения, которую создаёт рекламодатель в своём кабинете. Это сделано, чтобы рекламодатель контролировал, кто работает с его офферами, и исключить мусорный трафик." },
              { q: "Как партнёру попасть в систему?", a: "Рекламодатель создаёт ссылку регистрации для партнёров и размещает её на своём сайте или отправляет партнёру напрямую. Других способов регистрации партнёров нет." },
              { q: "Есть ли отдельные кабинеты для рекламодателя и партнёра?", a: "Да. Рекламодатель создаёт офферы, управляет партнёрами, настраивает постбеки, смотрит аналитику и финансы. Партнёр видит только доступные ему офферы, генерирует ссылки, смотрит свою статистику и доход — не видит других партнёров и данных рекла." },
              { q: "Видят ли партнёры бренд платформы?", a: "Нет. Платформа работает в white-label режиме. Партнёры видят домен рекламодателя и его оформление. О существовании SaaS-платформы они даже не узнают." },
              { q: "Что включено в бесплатный период?", a: "30 дней полного доступа ко всем функциям выбранного тарифа. Банковская карта не требуется, никаких автосписаний, можно отменить в любой момент. Вы спокойно тестируете систему в боевых условиях." },
              { q: "Есть ли лимиты в бесплатном периоде?", a: "Нет. Функционал не урезается, ограничения только по тарифам после окончания trial." },
              { q: "Как работает трекинг кликов?", a: "При каждом клике система мгновенно генерирует уникальный click_id, определяет GEO, устройство, браузер и сохраняет данные для аналитики и антифрода. Обработка кликов происходит в реальном времени." },
              { q: "Как работает антифрод?", a: "Антифрод включён по умолчанию. Система анализирует IP-адреса (VPN/proxy/hosting), browser fingerprint, скорость и частоту кликов, подозрительные паттерны поведения. Фродовый трафик автоматически помечается и не учитывается в статистике и выплатах." },
              { q: "Как работают постбеки?", a: "При каждой конверсии система автоматически отправляет postback (HTTP-запрос) на указанный URL. Поддерживается повторная отправка (retry) при ошибках, лог всех отправленных запросов и тестовый режим для проверки." },
              { q: "Что если партнёр не использует постбек?", a: "Даже если партнёр не настроил постбек, система всё равно фиксирует клики, учитывает конверсии и считает статистику внутри платформы. Если постбек есть — данные передаются и наружу, и остаются у вас." },
              { q: "Есть ли API доступ?", a: "Да. API доступен на тарифах Professional и Enterprise. Через API можно получать статистику, управлять офферами, работать с партнёрами и интегрировать внешние сервисы. Документация открывается после регистрации." },
              { q: "Можно ли подключить свой домен?", a: "Да. Вы можете подключить любой свой домен для работы с партнёрами. SSL-сертификат выпускается автоматически (Let's Encrypt), настройка занимает 5–10 минут, партнёры работают только через ваш домен." },
              { q: "Поддерживаются ли выплаты в криптовалюте?", a: "Да. Поддерживаются автоматические выплаты через Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX. Доступны холды, история выплат и ручное подтверждение." },
              { q: "Можно ли добавить команду?", a: "Да. Вы можете добавить менеджеров, аналитиков и финансистов с разными уровнями доступа. Каждый видит только то, что ему разрешено." },
              { q: "Подходит ли платформа для открытых CPA-сетей?", a: "Нет. Платформа создана для рекламодателей, private / in-house партнёрских программ, агентств и команд. Если вам нужна открытая CPA-сеть с публичной регистрацией — это не наш формат." },
              { q: "Чем вы отличаетесь от Scaleo, Affise и Affilka?", a: "Проще и быстрее запуск, жёсткий контроль партнёров, встроенный антифрод без доплат, полноценный white-label, фокус на рекла, а не на «маркетплейс офферов»." },
            ].map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-24 border-t border-border bg-muted/30">
        <div className="container px-4 mx-auto max-w-4xl">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Контакты</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Остались вопросы?</h2>
            <p className="text-muted-foreground">Напишите нам, и мы ответим в течение 24 часов</p>
          </motion.div>

          <motion.div {...fadeInUp}>
            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Ваше имя</label>
                      <Input
                        placeholder="Иван Петров"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input
                        type="email"
                        placeholder="ivan@example.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Сообщение</label>
                    <Textarea
                      placeholder="Опишите ваш вопрос или запрос..."
                      rows={5}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                      data-testid="input-contact-message"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Или напишите нам: {supportEmail && <a href={`mailto:${supportEmail}`} className="text-emerald-500 hover:underline">{supportEmail}</a>}
                    </div>
                    <Button 
                      type="submit" 
                      className="bg-emerald-600 hover:bg-emerald-500 min-w-[200px]"
                      disabled={isSubmitting}
                      data-testid="button-contact-submit"
                    >
                      {isSubmitting ? (
                        <>Отправка...</>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Отправить сообщение
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* About Us */}
      <section className="py-24 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div {...fadeInUp}>
              <Badge variant="secondary" className="mb-4">О нас</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{platformName}</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Трекер для арбитражников от арбитражников. Сами льём push и гемблу — знаем что нужно на практике. 
                Никаких лишних модулей и корпоративной мишуры. Запустился, настроил постбеки, работаешь.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Регулярно обновляем, поддержка живая — отвечаем по делу, не боты.
              </p>
              <div className="flex justify-center gap-6 mt-8">
                {supportEmail && (
                  <a href={`mailto:${supportEmail}`} className="flex items-center gap-2 text-muted-foreground hover:text-emerald-500 transition-colors">
                    <Mail className="w-5 h-5" />
                    <span>{supportEmail}</span>
                  </a>
                )}
                {supportTelegramHandle && (
                  <a href={`https://t.me/${supportTelegramHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-emerald-500 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span>Telegram</span>
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-24 border-t border-border bg-background">
          <div className="container px-4 mx-auto">
            <motion.div {...fadeInUp} className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Развитие</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">План развития</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Следите за нашим прогрессом и узнавайте о новых функциях, которые мы разрабатываем
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              {roadmapLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {displayRoadmap.map((item: any, i: number) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                      <Card className="border-border hover:border-emerald-500/30 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.status === 'completed' ? 'bg-green-500/20' :
                              item.status === 'in_progress' ? 'bg-yellow-500/20' :
                              'bg-muted'
                            }`}>
                              {item.status === 'completed' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : item.status === 'in_progress' ? (
                                <Play className="w-5 h-5 text-yellow-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-lg">{item.title}</h3>
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  {item.quarter}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  item.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                  item.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-500' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {item.status === 'completed' ? 'Завершено' :
                                   item.status === 'in_progress' ? 'В работе' : 'Запланировано'}
                                </span>
                              </div>
                              <p className="text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

      {/* Blog/News */}
      <section className="py-24 border-t border-border bg-background">
          <div className="container px-4 mx-auto">
            <motion.div {...fadeInUp} className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Новости</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Последние обновления</h2>
            </motion.div>

            {newsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {displayNews.map((post: any, i: number) => {
                  const IconComponent = getNewsIcon(post.category);
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                      <Card 
                        className="bg-card border-border h-full hover:border-emerald-500/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedNews(post)}
                        data-testid={`card-news-${post.id}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center">
                              <IconComponent className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                              <div className="text-xs text-emerald-500 font-mono">{post.category || 'Новость'}</div>
                              <div className="text-xs text-muted-foreground">
                                {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ru-RU') : ''}
                              </div>
                            </div>
                          </div>
                          <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition-colors">{post.title}</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">{post.shortDescription || post.body?.substring(0, 120) + '...'}</p>
                          <div className="mt-4 flex items-center text-sm text-emerald-500 font-medium">
                            Читать далее <ChevronRight className="w-4 h-4 ml-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

      {/* News Modal */}
      <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
        <DialogContent className="max-w-2xl">
          {selectedNews && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center">
                    {(() => {
                      const IconComponent = getNewsIcon(selectedNews.category);
                      return <IconComponent className="w-5 h-5 text-emerald-500" />;
                    })()}
                  </div>
                  <div>
                    <div className="text-xs text-emerald-500 font-mono">{selectedNews.category || 'Новость'}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedNews.createdAt ? new Date(selectedNews.createdAt).toLocaleDateString('ru-RU') : ''}
                    </div>
                  </div>
                </div>
                <DialogTitle className="text-xl">{selectedNews.title}</DialogTitle>
              </DialogHeader>
              <div className="text-muted-foreground leading-relaxed mt-4">
                {selectedNews.body}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CTA Section */}
      <section className="py-24 border-t border-border bg-gradient-to-b from-emerald-500/5 to-background">
        <div className="container px-4 mx-auto text-center">
          <motion.div {...fadeInUp}>
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-emerald-500" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Запустить трекинг за 5 минут</h2>
            <p className="text-muted-foreground mb-4 max-w-xl mx-auto">
              Без карты. Без ограничений на тест. Регистрация за 1 минуту.
            </p>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Присоединяйтесь к сотням рекламодателей, которые уже используют {platformName}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500"
                onClick={() => navigate('/register/advertiser')}
                data-testid="button-cta-register"
              >
                Создать аккаунт бесплатно
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="h-14 px-8"
                onClick={() => navigate('/login')}
                data-testid="button-cta-login"
              >
                Войти в аккаунт
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="text-xl font-bold text-foreground mb-4">{platformName}</div>
              <p className="text-sm text-muted-foreground mb-4">
                Партнёрская платформа для рекламодателей и издателей
              </p>
              <div className="flex gap-4">
                {supportEmail && (
                  <a href={`mailto:${supportEmail}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="w-5 h-5" />
                  </a>
                )}
                {supportTelegramHandle && (
                  <a href={`https://t.me/${supportTelegramHandle}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
            
            <div>
              <div className="font-medium text-foreground mb-4">Навигация</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-foreground transition-colors">Преимущества</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-foreground transition-colors">Тарифы</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-foreground transition-colors">FAQ</button></li>
                <li><button onClick={() => scrollToSection('contact')} className="hover:text-foreground transition-colors">Контакты</button></li>
              </ul>
            </div>
            
            <div>
              <div className="font-medium text-foreground mb-4">Возможности</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="hover:text-foreground transition-colors cursor-default">Отслеживание кликов</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Postback интеграция</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Антифрод система</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Детальная статистика</span></li>
              </ul>
            </div>
            
            <div>
              <div className="font-medium text-foreground mb-4">Аккаунт</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate('/register/advertiser')} className="hover:text-foreground transition-colors">Регистрация</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-foreground transition-colors">Вход</button></li>
                {supportEmail && <li><a href={`mailto:${supportEmail}`} className="hover:text-foreground transition-colors">Поддержка</a></li>}
                {supportTelegramHandle && <li><a href={`https://t.me/${supportTelegramHandle}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Telegram</a></li>}
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border text-center text-xs text-muted-foreground font-mono">
            <p>{copyrightText}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
