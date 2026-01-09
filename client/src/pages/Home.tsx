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
  ChevronRight, Sparkles
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
  const { toast } = useToast();

  const newsItems = [
    {
      date: "15 января 2026",
      category: "Обновление",
      title: "Новая система антифрода 2.0",
      desc: "Добавили машинное обучение для ещё более точного определения фродового трафика.",
      fullText: "Мы рады представить обновлённую систему антифрода версии 2.0! Теперь платформа использует алгоритмы машинного обучения для анализа паттернов трафика в реальном времени. Система способна выявлять: бот-трафик и автоматизированные клики, прокси и VPN соединения, подозрительные fingerprints устройств, аномальные паттерны поведения пользователей. По нашим данным, новая система снижает уровень фрода на 35% по сравнению с предыдущей версией.",
      icon: ShieldCheck
    },
    {
      date: "10 января 2026",
      category: "Интеграция",
      title: "Интеграция с Binance Pay",
      desc: "Теперь можно выплачивать партнёрам напрямую через Binance Pay без комиссий.",
      fullText: "Мы интегрировали Binance Pay для быстрых и безкомиссионных выплат партнёрам! Теперь вы можете: отправлять выплаты в USDT, BTC, ETH и других криптовалютах, экономить на комиссиях за переводы, получать мгновенное подтверждение транзакций, настроить автоматические выплаты по расписанию. Binance Pay присоединяется к нашим интеграциям с Bybit, Kraken, Coinbase, EXMO, MEXC и OKX.",
      icon: CreditCard
    },
    {
      date: "5 января 2026",
      category: "Фича",
      title: "Telegram бот для уведомлений",
      desc: "Получайте мгновенные уведомления о конверсиях прямо в Telegram.",
      fullText: "Представляем нового Telegram бота для уведомлений! Подключите бота к своему аккаунту и получайте мгновенные уведомления о: новых лидах и продажах, запросах на выплату от партнёров, важных системных событиях, подозрительной активности. Настройте фильтры уведомлений под свои нужды — выбирайте какие события отслеживать, а какие игнорировать. Бот поддерживает как персональные, так и групповые чаты.",
      icon: Bell
    }
  ];

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
  const supportTelegram = platformSettings?.supportTelegram || "";
  const copyrightText = platformSettings?.copyrightText || `© ${new Date().getFullYear()} ${platformName}. Все права защищены.`;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-emerald-500/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>

        <div className="container px-4 mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Push / Gambling / Betting
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Трекер для арбитража гемблы, беттинга и push-трафика
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed font-light">
                {platformSettings?.platformDescription || `Запускайте офферы, принимайте клики, лиды и депозиты, передавайте postback в партнёрки и сторонние трекеры. Минимальная задержка редиректа, полная статистика по subID.`}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">CPA / RevShare / Hybrid</Badge>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Postback</Badge>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">SubID</Badge>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Антидубль</Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="h-14 px-8 rounded bg-emerald-600 hover:bg-emerald-500 text-foreground font-medium text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500 transition-all"
                  onClick={() => navigate('/register/advertiser')}
                  data-testid="button-hero-register"
                >
                  Начать бесплатно
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-14 px-8 rounded border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-lg"
                  onClick={() => scrollToSection('pricing')}
                  data-testid="button-hero-pricing"
                >
                  Смотреть тарифы
                </Button>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-mono">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>30 дней бесплатно</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>Без карты</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Антифрод включён</span>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="relative rounded bg-card border border-border shadow-2xl overflow-hidden group">
                <div className="h-8 bg-secondary border-b border-border flex items-center px-3 gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  <div className="ml-2 text-[10px] font-mono text-muted-foreground">{platformName} Dashboard</div>
                </div>
                <div className="relative w-full aspect-[16/9] overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={currentImageIndex}
                      src={heroImages[currentImageIndex]} 
                      alt={`${platformName} Dashboard`} 
                      className="absolute inset-0 w-full h-full object-cover object-top opacity-90 group-hover:opacity-100"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    />
                  </AnimatePresence>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
              </div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -right-4 top-10 bg-card border border-border p-4 rounded shadow-xl hidden md:block"
              >
                <div className="flex items-center gap-3 mb-1">
                  <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono text-muted-foreground">Кликов сейчас</span>
                </div>
                <div className="text-2xl font-mono font-bold text-foreground">{liveClicks.toLocaleString()}</div>
              </motion.div>
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

      {/* Who It's For */}
      <section className="py-24 bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">Кому подходит</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Кому подходит {platformName}</h2>
            <p className="text-muted-foreground mb-12 leading-relaxed">
              {platformName} подойдёт всем участникам performance-рынка, но изначально он создавался под тех, кто работает с трафиком каждый день и считает результат.
            </p>

            <div className="space-y-10">
              <div>
                <h3 className="text-lg font-bold mb-3">Арбитражникам</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Если вы льёте трафик сами и вам важно видеть реальную картину по источникам, {platformName} позволяет контролировать каждый этап — от клика до депозита.
                </p>
                <p className="text-muted-foreground mb-2">Вы получаете:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />отслеживание кликов, лидов и депозитов</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />детальную статистику по subID (sub1–sub10)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />быстрый запуск и масштабирование рабочих связок</li>
                </ul>
                <p className="text-muted-foreground mt-3">Вся статистика доступна в одном месте, без лишних экранов и отчётов.</p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3">Командам и медиабаерам</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {platformName} удобно использовать в команде, когда с трафиком работает несколько человек.
                </p>
                <p className="text-muted-foreground mb-2">Платформа позволяет:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />создавать несколько аккаунтов и проектов</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />разграничивать доступы между участниками</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />смотреть общую статистику по источникам и кампаниям</li>
                </ul>
                <p className="text-muted-foreground mt-3">Это упрощает контроль работы команды и даёт прозрачную картину по результатам.</p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3">Партнёрским программам</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {platformName} подходит для учёта и контроля партнёрского трафика.
                </p>
                <p className="text-muted-foreground mb-2">Вы можете:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />отслеживать клики, лиды и конверсии</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />работать со своими офферами и postback</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />контролировать качество трафика и выявлять подозрительную активность</li>
                </ul>
                <p className="text-muted-foreground mt-3">Система помогает видеть, откуда приходит трафик и как он конвертируется.</p>
              </div>
            </div>
          </motion.div>
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

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0, duration: 0.4 }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-8">
                  <div className="w-12 h-12 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Без лишних модулей</h3>
                  <div className="text-muted-foreground space-y-3 leading-relaxed">
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
                <CardContent className="p-8">
                  <div className="w-12 h-12 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Быстрый старт</h3>
                  <div className="text-muted-foreground space-y-3 leading-relaxed">
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
                <CardContent className="p-8">
                  <div className="w-12 h-12 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Terminal className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Простая логика</h3>
                  <div className="text-muted-foreground space-y-3 leading-relaxed">
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
                <CardContent className="p-8">
                  <div className="w-12 h-12 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Заточено под арбитраж</h3>
                  <div className="text-muted-foreground space-y-3 leading-relaxed">
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
              Полный набор инструментов для рекламодателей и издателей
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Мини-трекер", desc: "Мгновенная обработка кликов с генерацией уникального click_id и GEO-детекцией", color: "emerald" },
              { icon: BarChart3, title: "Детальная аналитика", desc: "Отчёты по офферам, партнёрам, гео, устройствам с фильтрами по датам", color: "blue" },
              { icon: ShieldCheck, title: "Антифрод система", desc: "Защита от фрода: прокси-детекция, fingerprinting, velocity checks", color: "red" },
              { icon: Webhook, title: "Постбеки и Webhooks", desc: "Автоматическая отправка данных о конверсиях с retry и логированием", color: "purple" },
              { icon: Users, title: "Команда", desc: "Добавляйте менеджеров, аналитиков и финансистов с разными правами", color: "orange" },
              { icon: Globe, title: "Кастомные домены", desc: "Подключайте свои домены с автоматическим SSL от Let's Encrypt", color: "cyan" },
              { icon: CreditCard, title: "Финансы", desc: "Балансы, холды, запросы на выплату и крипто-интеграции", color: "green" },
              { icon: Bell, title: "Уведомления", desc: "In-app уведомления и Telegram бот для важных событий", color: "yellow" },
              { icon: FileText, title: "Миграция данных", desc: "Импорт из Scaleo, Affilka, Affise, Alanbase", color: "pink" },
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

          <div className="max-w-3xl mx-auto space-y-8">
            <motion.div {...fadeInUp} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-mono font-bold">01.</span>
                <h3 className="font-bold">Регистрация</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed pl-8">
                Создаёте аккаунт в {platformName} и сразу попадаете в рабочий кабинет. Без подтверждения по звонку, без менеджеров и без обязательной привязки карты. Регистрация занимает не больше минуты.
              </p>
            </motion.div>

            <motion.div {...fadeInUp} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-mono font-bold">02.</span>
                <h3 className="font-bold">Создание оффера</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed pl-8">
                Добавляете оффер, указываете лендинги и модель выплат. Настраиваете postback, параметры subID и другие нужные опции. После сохранения система сразу генерирует трекинговую ссылку.
              </p>
            </motion.div>

            <motion.div {...fadeInUp} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-mono font-bold">03.</span>
                <h3 className="font-bold">Привлечение партнёров</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed pl-8">
                Передаёте партнёрам или медиабаерам готовую ссылку. Каждый клик и конверсия автоматически фиксируются в статистике. Вы видите, откуда пришёл трафик и по каким источникам он работает лучше.
              </p>
            </motion.div>

            <motion.div {...fadeInUp} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-mono font-bold">04.</span>
                <h3 className="font-bold">Отслеживание результатов</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed pl-8">
                В реальном времени отслеживаете клики, лиды и продажи. Фильтруете статистику по офферам, кампаниям и subID. Контролируете качество трафика и эффективность источников.
              </p>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Что говорят наши клиенты</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "MediaBuy Pro",
                role: "Рекламное агентство",
                avatar: "mediabuy",
                text: "Перешли со Scaleo на эту платформу и не пожалели. Антифрод реально работает, экономим до 20% бюджета на фроде.",
                rating: 5
              },
              {
                name: "TrafficLab", 
                role: "CPA сеть",
                avatar: "trafficlab",
                text: "Удобная панель, быстрые постбеки, отличная поддержка. Команда реально слушает фидбек и быстро внедряет фичи.",
                rating: 5
              },
              {
                name: "LeadGen Network",
                role: "Партнёрская программа",
                avatar: "leadgen", 
                text: "White-label функционал на высоте. Подключили свой домен за 10 минут. Партнёры даже не знают, что это не наша разработка.",
                rating: 5
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Частые вопросы</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              { q: "Что включено в бесплатный период?", a: "30 дней полного доступа ко всем функциям выбранного тарифа. Не требуется карта. Вы можете отменить в любой момент." },
              { q: "Как работает антифрод?", a: "Система анализирует IP-адреса (прокси/VPN детекция), fingerprint браузера, скорость кликов и паттерны поведения. Подозрительный трафик помечается автоматически." },
              { q: "Можно ли перейти на другой тариф?", a: "Да, вы можете повысить или понизить тариф в любой момент. Изменения применяются сразу, оплата пересчитывается пропорционально." },
              { q: "Как работают постбеки?", a: "При каждой конверсии система автоматически отправляет HTTP-запрос на указанный URL с данными о конверсии. Поддерживается retry при ошибках." },
              { q: "Есть ли API доступ?", a: "Да, API доступен на тарифах Professional и Enterprise. Документация предоставляется после регистрации." },
              { q: "Поддерживаете ли вы криптовалюту?", a: "Да, мы интегрированы с Binance, Bybit, Kraken, Coinbase, EXMO, MEXC и OKX для автоматических выплат партнёрам." },
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

      {/* Honest Clarification */}
      <section className="py-16 border-t border-border bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto text-center">
            <div className="text-muted-foreground leading-relaxed space-y-4">
              <p>
                Если вам нужен корпоративный комбайн с отчётами для менеджеров, сложной иерархией пользователей и десятками дополнительных модулей — Scaleo и Affise будут хорошим выбором.
              </p>
              <p>
                Если вам нужен трекер для практического залива, где важно быстро запуститься и контролировать результат — {platformName} подойдёт лучше.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Summary Quote */}
      <section className="py-16 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
              {platformName} — это инструмент для тех, кто льёт трафик и считает результат,
              <br className="hidden md:block" />
              <span className="text-muted-foreground"> а не для тех, кто согласует и оформляет отчёты.</span>
            </blockquote>
          </motion.div>
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
                Независимый трекер, сделанный командой разработчиков и арбитражников. 
                Мы используем его в реальных кампаниях с push и гемблой.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Проект развивается, функционал обновляется регулярно. Поддержка отвечает по делу, без саппорт-ботов.
              </p>
              <div className="flex justify-center gap-6 mt-8">
                {supportEmail && (
                  <a href={`mailto:${supportEmail}`} className="flex items-center gap-2 text-muted-foreground hover:text-emerald-500 transition-colors">
                    <Mail className="w-5 h-5" />
                    <span>{supportEmail}</span>
                  </a>
                )}
                {supportTelegram && (
                  <a href={`https://t.me/${supportTelegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-emerald-500 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span>Telegram</span>
                  </a>
                )}
              </div>
            </motion.div>
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

          <div className="grid md:grid-cols-3 gap-6">
            {newsItems.map((post, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card 
                  className="bg-card border-border h-full hover:border-emerald-500/30 transition-colors group cursor-pointer"
                  onClick={() => setSelectedNews(post)}
                  data-testid={`card-news-${i}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center">
                        <post.icon className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-xs text-emerald-500 font-mono">{post.category}</div>
                        <div className="text-xs text-muted-foreground">{post.date}</div>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition-colors">{post.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{post.desc}</p>
                    <div className="mt-4 flex items-center text-sm text-emerald-500 font-medium">
                      Читать далее <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
                    <selectedNews.icon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-xs text-emerald-500 font-mono">{selectedNews.category}</div>
                    <div className="text-xs text-muted-foreground">{selectedNews.date}</div>
                  </div>
                </div>
                <DialogTitle className="text-xl">{selectedNews.title}</DialogTitle>
              </DialogHeader>
              <div className="text-muted-foreground leading-relaxed mt-4">
                {selectedNews.fullText}
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
                {supportTelegram && (
                  <a href={`https://t.me/${supportTelegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
            
            <div>
              <div className="font-medium text-foreground mb-4">Продукт</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-foreground transition-colors">Возможности</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-foreground transition-colors">Тарифы</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-foreground transition-colors">Войти</button></li>
              </ul>
            </div>
            
            <div>
              <div className="font-medium text-foreground mb-4">Для кого</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate('/register/advertiser')} className="hover:text-foreground transition-colors">Рекламодателям</button></li>
                <li><span className="text-muted-foreground/50">Издателям</span></li>
              </ul>
            </div>
            
            <div>
              <div className="font-medium text-foreground mb-4">Поддержка</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {supportEmail && <li><a href={`mailto:${supportEmail}`} className="hover:text-foreground transition-colors">{supportEmail}</a></li>}
                {supportTelegram && <li><a href={`https://t.me/${supportTelegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Telegram</a></li>}
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
