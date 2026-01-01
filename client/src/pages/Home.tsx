import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  ArrowRight, Terminal, Cpu, ShieldCheck, Activity, Check, X,
  Zap, Globe, Users, BarChart3, Lock, Clock, Webhook, 
  CreditCard, Bell, FileText, ArrowUpRight, Mail, MessageCircle
} from "lucide-react";
import heroImage from "@assets/generated_images/dark_high-tech_dashboard_ui.png";

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
                Партнёрская платформа нового поколения
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Управляйте партнёрским трафиком как профи
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed font-light">
                {platformSettings?.platformDescription || `${platformName} — централизованная SaaS платформа для партнёрского трекинга. Все клики, конверсии и выплаты в одном месте.`}
              </p>

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
                <img 
                  src={heroImage} 
                  alt={`${platformName} Dashboard`} 
                  className="w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
              </div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -right-4 top-10 bg-card border border-border p-4 rounded shadow-xl hidden md:block"
              >
                <div className="flex items-center gap-3 mb-1">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-mono text-muted-foreground">Кликов в сек</span>
                </div>
                <div className="text-2xl font-mono font-bold text-foreground">4,285</div>
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
              { label: "Uptime", value: "99.99%" },
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

      {/* Features Grid */}
      <section id="features" className="py-24 bg-background">
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
              { icon: FileText, title: "Миграция данных", desc: "Импорт из Scaleo, Affilka, Affise, Voluum, Keitaro", color: "pink" },
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
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Как это работает</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Начните за 5 минут</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Регистрация", desc: "Создайте аккаунт рекламодателя бесплатно" },
              { step: "02", title: "Создайте оффер", desc: "Добавьте оффер с лендингами и настройте выплаты" },
              { step: "03", title: "Пригласите партнёров", desc: "Отправьте реферальную ссылку издателям" },
              { step: "04", title: "Получайте конверсии", desc: "Отслеживайте клики, лиды и продажи в реальном времени" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-2xl font-mono font-bold text-emerald-500">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Migration Section */}
      <section className="py-24 border-t border-border bg-background">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <Badge variant="secondary" className="mb-4">Миграция</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Переезжайте с других платформ</h2>
              <p className="text-muted-foreground mb-8">
                Мы поддерживаем импорт данных из популярных трекеров. 
                Перенесите офферы, конверсии и настройки за несколько кликов.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {["Scaleo", "Affilka", "Affise", "Voluum", "Keitaro", "Binom"].map((platform) => (
                  <div key={platform} className="flex items-center gap-3 p-3 rounded border border-border bg-card/50">
                    <Check className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium">{platform}</span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => navigate('/register/advertiser')}
                className="bg-emerald-600 hover:bg-emerald-500"
                data-testid="button-migration-register"
              >
                Начать миграцию
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="lg:w-1/2">
              <div className="bg-card border border-border rounded-lg p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <div className="font-medium">Автоматический импорт</div>
                      <div className="text-sm text-muted-foreground">CSV, JSON или API интеграция</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-blue-500/10 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">Безопасность данных</div>
                      <div className="text-sm text-muted-foreground">Шифрование при передаче</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-purple-500/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <div className="font-medium">Быстрый старт</div>
                      <div className="text-sm text-muted-foreground">Импорт за 10-15 минут</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

      {/* CTA Section */}
      <section className="py-24 border-t border-border bg-gradient-to-b from-emerald-500/5 to-background">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Готовы начать?</h2>
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
