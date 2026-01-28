import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tilt3DCard } from "@/components/ui/tilt-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  ArrowRight, Terminal, Cpu, ShieldCheck, Activity, Check, X,
  Zap, Globe, Users, BarChart3, Lock, Clock, Webhook, 
  CreditCard, Bell, FileText, ArrowUpRight, Mail, MessageCircle,
  UserPlus, Settings, TrendingUp, Send, Star, Quote, Newspaper,
  ChevronRight, Sparkles, Map, Rocket, Code, Loader2,
  CheckCircle2, Circle, Play, MousePointerClick, Timer, Building2
} from "lucide-react";
import { useInView } from "framer-motion";

// CountUp animation component (outside Home to preserve state)
const CountUpValue = ({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  React.useEffect(() => {
    if (isInView && !done) {
      setDone(true);
      let start = 0;
      const end = value;
      const duration = 2000;
      const startTime = Date.now();
      
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * end);
        
        setCount(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isInView, done, value]);
  
  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(0) + "K";
    return num.toString();
  };
  
  return <span ref={ref}>{prefix}{formatNumber(count)}{suffix}</span>;
};

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
  
  // Parallax scroll effects
  const { scrollY } = useScroll();
  const parallaxSlow = useTransform(scrollY, [0, 500], [0, 100]);
  const parallaxMedium = useTransform(scrollY, [0, 500], [0, 60]);
  const parallaxFast = useTransform(scrollY, [0, 500], [0, 40]);

  const demoTabs = [
    { label: "Дашборд", src: "/demo-videos/дашборд.mp4", icon: BarChart3, color: "emerald", iconColor: "text-emerald-400" },
    { label: "Офферы", src: "/demo-videos/офферы_.mp4", icon: FileText, color: "blue", iconColor: "text-blue-400" },
    { label: "Создание оффера", src: "/demo-videos/создание_оффера.mp4", icon: Settings, color: "purple", iconColor: "text-purple-400" },
    { label: "Статистика", src: "/demo-videos/статитстика.mp4", icon: TrendingUp, color: "cyan", iconColor: "text-cyan-400" },
    { label: "Финансы", src: "/demo-videos/финансы.mp4", icon: CreditCard, color: "amber", iconColor: "text-amber-400" },
    { label: "Команда", src: "/demo-videos/команда.mp4", icon: Users, color: "pink", iconColor: "text-pink-400" },
    { label: "Антифрод", src: "/demo-videos/антифрод.mp4", icon: ShieldCheck, color: "red", iconColor: "text-red-400" },
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
      <section className="relative pt-20 pb-12 overflow-hidden noise-overlay">
        {/* Multi-layer gradient background with parallax */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <motion.div 
          className="absolute left-1/2 -translate-x-1/2 top-0 -z-10 h-[600px] w-[900px] rounded-full bg-emerald-500 opacity-20 blur-[150px]"
          style={{ y: parallaxSlow }}
        />
        <motion.div 
          className="absolute left-1/4 top-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500 opacity-10 blur-[120px]"
          style={{ y: parallaxMedium }}
        />
        <motion.div 
          className="absolute right-1/4 top-1/3 -z-10 h-[300px] w-[300px] rounded-full bg-purple-500 opacity-10 blur-[100px]"
          style={{ y: parallaxFast }}
        />
        
        {/* Floating decorative elements - enhanced */}
        <motion.div 
          className="absolute left-[10%] top-[20%] w-3 h-3 rounded-full bg-emerald-400/30 animate-float"
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute right-[15%] top-[30%] w-2 h-2 rounded-full bg-blue-400/30 animate-float-fast"
          animate={{ y: [0, -15, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div 
          className="absolute left-[20%] bottom-[40%] w-4 h-4 rounded-full bg-purple-400/20 animate-float-slow"
          animate={{ y: [0, -25, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {/* Additional floating elements */}
        <motion.div 
          className="absolute right-[8%] top-[60%] w-2 h-2 rounded-full bg-cyan-400/25 animate-float"
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div 
          className="absolute left-[5%] top-[70%] w-3 h-3 rounded-full bg-pink-400/20 animate-float-slow"
          animate={{ y: [0, -22, 0], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
        <motion.div 
          className="absolute right-[25%] top-[15%] w-1.5 h-1.5 rounded-full bg-amber-400/30 animate-float-fast"
          animate={{ y: [0, -12, 0], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        />

        <div className="container px-4 mx-auto relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              30 дней бесплатно + без карты
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-5 leading-[1.1] font-display"
            >
              Трекер для{" "}
              <span className="gradient-text">
                арбитража
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-6 max-w-xl leading-relaxed"
            >
              {platformSettings?.platformDescription || `Гембла, беттинг, push-трафик. Клики → лиды → депозиты. Postback в любой трекер.`}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 mb-5"
            >
              <Button 
                size="lg" 
                className="group h-14 px-10 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-base shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] border border-emerald-400/50 transition-all duration-300 hover:scale-[1.02]"
                onClick={() => navigate('/register/advertiser')}
                data-testid="button-hero-register"
              >
                Начать бесплатно
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-10 rounded-xl border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-muted-foreground hover:text-foreground font-semibold text-base transition-all duration-300 hover:scale-[1.02]"
                onClick={() => scrollToSection('pricing')}
                data-testid="button-hero-pricing"
              >
                Смотреть тарифы
              </Button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-4 mb-10"
            >
              {["CPA / RevShare / Hybrid", "Postback", "SubID", "Антидубль"].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground/80">
                  <Check className="w-4 h-4 text-emerald-500" />{item}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="w-full max-w-[1200px] mx-auto px-4 relative z-10"
        >
          {/* iMac-style Computer Frame */}
          <div className="relative group">
            {/* Back glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-blue-500/10 to-purple-500/20 rounded-[32px] blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
            
            {/* Monitor Body */}
            <div className="relative rounded-[24px] bg-gradient-to-b from-[#3a3a3c] via-[#2c2c2e] to-[#1c1c1e] p-[3px] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.9),0_0_100px_rgba(16,185,129,0.15)]">
              <div className="rounded-[22px] bg-gradient-to-b from-[#1a1a1c] to-[#0a0a0a] overflow-hidden">
                {/* Screen Bezel */}
                <div className="p-3 md:p-4">
                  {/* Camera Notch */}
                  <div className="flex justify-center mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#1a1a1c] ring-1 ring-[#2a2a2c]" />
                  </div>
                  {/* Screen Content */}
                  <div className="relative rounded-lg bg-[#0a0a0a] border border-[#2a2a2c] overflow-hidden shadow-inner">
                    {/* Browser Chrome */}
                    <div className="h-10 md:h-12 bg-[#111] border-b border-[#2a2a2c] flex items-center px-3 md:px-4">
                      <div className="flex gap-1.5 md:gap-2">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#ff5f57]" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#febc2e]" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#28c840]" />
                      </div>
                      <div className="flex-1 flex justify-center gap-1 md:gap-2 overflow-x-auto px-2 md:px-4">
                        {demoTabs.map((tab, i) => {
                          const Icon = tab.icon;
                          const colorStyles: Record<string, string> = {
                            emerald: "bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.4)]",
                            blue: "bg-blue-500/20 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.4)]",
                            purple: "bg-purple-500/20 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.4)]",
                            cyan: "bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]",
                            amber: "bg-amber-500/20 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]",
                            pink: "bg-pink-500/20 border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.4)]",
                            red: "bg-red-500/20 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.4)]",
                          };
                          return (
                            <button
                              key={tab.label}
                              onClick={() => setActiveDemoTab(i)}
                              data-testid={`demo-tab-${i}`}
                              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-sm font-medium rounded-lg transition-all whitespace-nowrap border ${
                                activeDemoTab === i
                                  ? `text-white ${colorStyles[tab.color]}`
                                  : "text-muted-foreground hover:text-foreground hover:bg-[#1a1a2e]/50 border-transparent hover:border-[#2a2a4a]/50"
                              }`}
                            >
                              <Icon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${tab.iconColor}`} />
                              <span className="hidden md:inline">{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Video Content */}
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
                      {/* Screen gloss/reflection overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Monitor Stand */}
            <div className="flex flex-col items-center -mt-1">
              {/* Stand Neck */}
              <div className="w-24 md:w-32 h-12 md:h-16 bg-gradient-to-b from-[#2c2c2e] via-[#3a3a3c] to-[#2c2c2e] rounded-b-lg shadow-inner" 
                   style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0% 100%)' }} />
              {/* Stand Base */}
              <div className="w-40 md:w-56 h-2 md:h-3 bg-gradient-to-b from-[#3a3a3c] to-[#2c2c2e] rounded-full shadow-lg" />
              {/* Base Shadow - enhanced */}
              <div className="w-56 md:w-72 h-2 bg-black/30 rounded-full blur-md -mt-1" />
            </div>
          </div>
              
          <div className="flex justify-center gap-2 mt-6">
            {demoTabs.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveDemoTab(i)}
                data-testid={`demo-dot-${i}`}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeDemoTab ? 'bg-emerald-500 scale-125' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Stats Strip */}
      <section className="border-y border-border/50 bg-gradient-to-r from-background via-muted/30 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
        <div className="container mx-auto relative">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { 
                label: "Кликов обработано", 
                numValue: 1200000000,
                suffix: "+",
                icon: MousePointerClick,
                color: "from-emerald-400 to-cyan-400"
              },
              { 
                label: "Доступность", 
                displayValue: "99.99%",
                icon: Activity,
                color: "from-green-400 to-emerald-400",
                isLive: true
              },
              { 
                label: "Скорость отклика", 
                displayValue: "< 5ms",
                icon: Timer,
                color: "from-cyan-400 to-blue-400"
              },
              { 
                label: "Рекламодателей", 
                numValue: 500,
                suffix: "+",
                icon: Building2,
                color: "from-violet-400 to-purple-400"
              },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative py-8 px-4 text-center transition-all duration-300 hover:bg-muted/50"
              >
                {i < 3 && <div className="absolute right-0 top-1/2 -translate-y-1/2 h-12 w-px bg-gradient-to-b from-transparent via-border to-transparent hidden md:block" />}
                
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-5 w-5 text-white/90" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {stat.isLive && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                      </span>
                    )}
                    <div className={`text-3xl md:text-4xl font-bold font-mono bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.numValue ? (
                        <CountUpValue value={stat.numValue} suffix={stat.suffix} />
                      ) : (
                        stat.displayValue
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-4">
            <Badge variant="secondary" className="mb-3">Кому подходит</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Кому подходит {platformName}</h2>
          </motion.div>
          <motion.div {...fadeInUp} className="text-center mb-10 max-w-2xl mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              {platformName} — это рабочий инструмент для тех, кто каждый день заливает трафик и считает деньги. Мы не пытались сделать универсальный сервис «для всех». Он сделан под конкретные задачи.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0, duration: 0.5 }}
            >
              <Tilt3DCard className="h-full group" tiltAmount={8}>
                <Card className="bg-card border-border h-full hover:border-emerald-500/40 hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)] transition-all duration-300 gradient-border rounded-2xl">
                  <CardContent className="p-8 relative z-10">
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-6 shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 6 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <TrendingUp className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-3 font-display">Арбитражникам</h3>
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
              </Tilt3DCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Tilt3DCard className="h-full group" tiltAmount={8}>
                <Card className="bg-card border-border h-full hover:border-blue-500/40 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.2)] transition-all duration-300 gradient-border rounded-2xl">
                  <CardContent className="p-8 relative z-10">
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center mb-6 shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 6 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Users className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-3 font-display">Командам и медиабаерам</h3>
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
              </Tilt3DCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Tilt3DCard className="h-full group" tiltAmount={8}>
                <Card className="bg-card border-border h-full hover:border-purple-500/40 hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.2)] transition-all duration-300 gradient-border rounded-2xl">
                  <CardContent className="p-8 relative z-10">
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center mb-6 shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 6 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Globe className="w-8 h-8 text-purple-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-3 font-display">Партнёрским программам</h3>
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
              </Tilt3DCard>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Advantages - Detailed */}
      <section className="py-16 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <Badge variant="secondary" className="mb-3">Преимущества</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display">Почему это удобно в реальной работе</h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0, duration: 0.4 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
              <Card className="h-full bg-card border-border hover:border-amber-500/40 hover:shadow-[0_15px_50px_-12px_rgba(245,158,11,0.2)] transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-md">
                    <Zap className="w-6 h-6 text-amber-400" />
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
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
              <Card className="h-full bg-card border-border hover:border-cyan-500/40 hover:shadow-[0_15px_50px_-12px_rgba(6,182,212,0.2)] transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center shadow-md">
                    <Clock className="w-6 h-6 text-cyan-400" />
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
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
              <Card className="h-full bg-card border-border hover:border-pink-500/40 hover:shadow-[0_15px_50px_-12px_rgba(236,72,153,0.2)] transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 flex items-center justify-center shadow-md">
                    <Terminal className="w-6 h-6 text-pink-400" />
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
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
              <Card className="h-full bg-card border-border hover:border-emerald-500/40 hover:shadow-[0_15px_50px_-12px_rgba(16,185,129,0.2)] transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center shadow-md">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
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
      <section id="features" className="py-16 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-3">Возможности</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Всё для управления партнёрками</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Полный набор инструментов для рекламодателей
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: "Мини-трекер под реальный залив", desc: "Лёгкий трекер без перегруза. Клики обрабатываются мгновенно, каждому присваивается уникальный click_id, GEO определяется автоматически.", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", hoverBorder: "hover:border-emerald-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(16,185,129,0.2)]" },
              { icon: BarChart3, title: "Понятная статистика", desc: "Статистика по офферам, партнёрам, гео и устройствам — в одном месте. Фильтры помогают быстро понять, что масштабировать, а что отключать.", iconBg: "bg-blue-500/10", iconColor: "text-blue-500", hoverBorder: "hover:border-blue-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(59,130,246,0.2)]" },
              { icon: ShieldCheck, title: "Антифрод и контроль качества", desc: "Защита от некачественного трафика: прокси и VPN, подозрительные отпечатки, слишком быстрые или повторяющиеся клики.", iconBg: "bg-red-500/10", iconColor: "text-red-500", hoverBorder: "hover:border-red-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(239,68,68,0.2)]" },
              { icon: Webhook, title: "Postback и Webhooks", desc: "Автоматическая передача конверсий во внешние системы. Поддержка повторных отправок, логирование и контроль статусов.", iconBg: "bg-purple-500/10", iconColor: "text-purple-500", hoverBorder: "hover:border-purple-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(168,85,247,0.2)]" },
              { icon: Users, title: "Командная работа", desc: "Добавляйте менеджеров, аналитиков и финансовых сотрудников. Разграничение прав доступа — каждый видит только то, что ему нужно.", iconBg: "bg-orange-500/10", iconColor: "text-orange-500", hoverBorder: "hover:border-orange-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(249,115,22,0.2)]" },
              { icon: Globe, title: "Кастомные домены", desc: "Подключайте свои домены для трекинг-ссылок. SSL-сертификаты выпускаются автоматически через Let's Encrypt — без ручной возни.", iconBg: "bg-cyan-500/10", iconColor: "text-cyan-500", hoverBorder: "hover:border-cyan-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(6,182,212,0.2)]" },
              { icon: CreditCard, title: "Финансы и выплаты", desc: "Учёт балансов, холдов и выплат партнёрам. Поддержка криптовалютных интеграций и прозрачная история операций.", iconBg: "bg-green-500/10", iconColor: "text-green-500", hoverBorder: "hover:border-green-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(34,197,94,0.2)]" },
              { icon: Bell, title: "Уведомления", desc: "Важные события всегда под рукой: in-app уведомления и Telegram-бот. Клики, конверсии и ошибки — без постоянного обновления страниц.", iconBg: "bg-yellow-500/10", iconColor: "text-yellow-500", hoverBorder: "hover:border-yellow-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(234,179,8,0.2)]" },
              { icon: FileText, title: "Миграция без боли", desc: "Помогаем переехать с Scaleo, Affilka, Affise, Alanbase. Импорт офферов и данных занимает 10–15 минут.", iconBg: "bg-pink-500/10", iconColor: "text-pink-500", hoverBorder: "hover:border-pink-500/40", hoverShadow: "hover:shadow-[0_15px_50px_-12px_rgba(236,72,153,0.2)]" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Tilt3DCard className="h-full group" tiltAmount={6}>
                  <Card className={`h-full bg-card/50 border-border ${feature.hoverBorder} ${feature.hoverShadow} transition-all duration-300 gradient-border rounded-2xl`}>
                    <CardContent className="p-6 relative z-10">
                      <motion.div 
                        className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center ${feature.iconColor} mb-4 shadow-md`}
                        whileHover={{ scale: 1.15, rotate: 6 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <feature.icon className="w-6 h-6" />
                      </motion.div>
                      <h3 className="text-lg font-bold mb-2 font-display">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </Tilt3DCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 border-t border-border bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <Badge variant="secondary" className="mb-3">Как это работает</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Начните работу за 5 минут</h2>
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
                  <div className="w-10 h-10 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-xs font-mono text-blue-400 mb-2">01</div>
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
                  <div className="w-10 h-10 mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-xs font-mono text-purple-400 mb-2">02</div>
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
                  <div className="w-10 h-10 mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-xs font-mono text-amber-400 mb-2">03</div>
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
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-xs font-mono text-emerald-400 mb-2">04</div>
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
      <section className="py-16 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">Миграция</Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Миграция с других трекеров</h2>
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
      <section className="py-16 border-t border-border bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Отзывы</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Что говорят клиенты, которые реально работают с {platformName}</h2>
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
      <section id="pricing" className="py-16 border-t border-border bg-card/50">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              30 дней бесплатно
            </Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Простые и честные тарифы</h2>
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

          <div className="grid md:grid-cols-3 gap-0 border border-border rounded-xl mt-4">
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
                <div key={plan.id} className={`p-8 ${isActive ? 'bg-secondary relative z-10' : 'bg-background'} border-r border-border last:border-r-0 flex flex-col first:rounded-l-xl last:rounded-r-xl overflow-visible`}>
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
      <section id="faq" className="py-16 border-t border-border bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Часто задаваемые вопросы</h2>
          </div>

          {(() => {
            const faqItems = [
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
            ];
            const half = Math.ceil(faqItems.length / 2);
            const leftColumn = faqItems.slice(0, half);
            const rightColumn = faqItems.slice(half);
            return (
              <div className="grid md:grid-cols-2 gap-6">
                <Accordion type="single" collapsible className="space-y-3">
                  {leftColumn.map((item, i) => (
                    <AccordionItem key={i} value={`item-left-${i}`} className="border border-border rounded-lg px-5 bg-card/50">
                      <AccordionTrigger className="text-left font-medium hover:no-underline text-sm py-4">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <Accordion type="single" collapsible className="space-y-3">
                  {rightColumn.map((item, i) => (
                    <AccordionItem key={i} value={`item-right-${i}`} className="border border-border rounded-lg px-5 bg-card/50">
                      <AccordionTrigger className="text-left font-medium hover:no-underline text-sm py-4">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-16 border-t border-border bg-muted/30">
        <div className="container px-4 mx-auto max-w-4xl">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Контакты</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Остались вопросы?</h2>
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
      <section className="py-16 border-t border-border bg-background">
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
      <section className="py-16 border-t border-border bg-background">
          <div className="container px-4 mx-auto">
            <motion.div {...fadeInUp} className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Развитие</Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">План развития</h2>
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
      <section className="py-16 border-t border-border bg-background">
          <div className="container px-4 mx-auto">
            <motion.div {...fadeInUp} className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Новости</Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Последние обновления</h2>
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
      <section className="py-16 border-t border-border bg-gradient-to-b from-emerald-500/5 to-background">
        <div className="container px-4 mx-auto text-center">
          <motion.div {...fadeInUp}>
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-emerald-500" />
            <h2 className="text-3xl md:text-5xl font-extrabold font-display mb-3">Запустить трекинг за 5 минут</h2>
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
