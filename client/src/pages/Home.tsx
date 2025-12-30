import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, Terminal, Cpu, ShieldCheck, Activity, ChevronRight, Check, X } from "lucide-react";
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
  const [isYearly, setIsYearly] = useState(false);
  
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-emerald-500/30">
      <Navbar />

      {/* Hero Section - Pro/Dark/Technical */}
      <section className="relative pt-32 pb-20 overflow-hidden border-b border-border">
        {/* Tech Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>

        <div className="container px-4 mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('hero.badge')}
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                {t('hero.title')}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed font-light">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="h-14 px-8 rounded bg-emerald-600 hover:bg-emerald-500 text-foreground font-medium text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500 transition-all"
                  onClick={() => window.location.href = '/register/advertiser'}
                >
                  {t('hero.cta')}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-14 px-8 rounded border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-lg"
                  onClick={() => window.location.href = '#pricing'}
                >
                  {t('hero.demo')}
                </Button>
              </div>

              <div className="mt-12 flex items-center gap-6 text-sm text-muted-foreground font-mono">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span>{t('hero.specs.selfHosted')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  <span>{t('hero.specs.latency')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('hero.specs.antifraud')}</span>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="relative rounded bg-card border border-border shadow-2xl overflow-hidden group">
                {/* Terminal Header */}
                <div className="h-8 bg-secondary border-b border-border flex items-center px-3 gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  <div className="ml-2 text-[10px] font-mono text-muted-foreground">root@orchestrator:~</div>
                </div>
                <img 
                  src={heroImage} 
                  alt="Interface" 
                  className="w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity"
                />
                
                {/* Overlay Code Effect */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
              </div>
              
              {/* Floating Stats */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -right-4 top-10 bg-card border border-border p-4 rounded shadow-xl hidden md:block"
              >
                <div className="flex items-center gap-3 mb-1">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-mono text-muted-foreground">{t('hero.rps')}</span>
                </div>
                <div className="text-2xl font-mono font-bold text-foreground">4,285</div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Metrics Strip */}
      <section className="border-b border-border bg-muted/50">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { label: t('stats.clicks'), value: "1.2B+" },
              { label: t('stats.uptime'), value: "99.99%" },
              { label: t('stats.speed'), value: "< 5ms" },
              { label: t('stats.nodes'), value: "24" },
            ].map((stat, i) => (
              <div key={i} className="py-6 px-4 text-center hover:bg-muted transition-colors">
                <div className="text-2xl md:text-3xl font-mono font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props - Technical */}
      <section id="features" className="py-24 bg-background">
        <div className="container px-4 mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded border border-border bg-card/50 hover:border-emerald-500/30 transition-colors group">
              <div className="w-10 h-10 bg-emerald-500/10 rounded flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('features.reporting.title')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t('features.reporting.desc')}</p>
            </div>
            
            <div className="p-6 rounded border border-border bg-card/50 hover:border-emerald-500/30 transition-colors group">
              <div className="w-10 h-10 bg-blue-500/10 rounded flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('features.automation.title')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t('features.automation.desc')}</p>
            </div>

            <div className="p-6 rounded border border-border bg-card/50 hover:border-emerald-500/30 transition-colors group">
              <div className="w-10 h-10 bg-red-500/10 rounded flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('features.protection.title')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t('features.protection.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Dynamic from API */}
      <section id="pricing" className="py-24 border-t border-border bg-card/50">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              30 дней бесплатно
            </Badge>
            <h2 className="text-3xl font-bold mb-4">{t('pricing.title')}</h2>
            <p className="text-muted-foreground">{t('pricing.subtitle')}</p>
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
                    onClick={() => window.location.href = `/register/advertiser?plan=${plan.id}&billing=${isYearly ? 'yearly' : 'monthly'}`}
                  >
                    Начать бесплатно
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-border bg-background text-center text-xs text-muted-foreground font-mono">
        <p>&copy; 2025 PrimeTrack Orchestrator. All systems normal.</p>
      </footer>
    </div>
  );
}
