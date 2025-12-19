import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, BarChart3, Globe, Shield, Zap, Layers, Server } from "lucide-react";
import heroImage from "@assets/generated_images/professional_saas_dashboard_interface.png";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      {/* Hero Section - Clean & Professional */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 bg-white dark:bg-slate-900 overflow-hidden relative border-b border-border">
        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium mb-8">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              {t('hero.badge')}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
              {t('hero.title')}
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
              <Button size="lg" className="h-12 px-8 rounded-lg text-base bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto shadow-lg shadow-blue-500/20">
                {t('hero.cta')}
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 rounded-lg text-base border-slate-200 text-slate-700 hover:bg-slate-50 w-full sm:w-auto">
                {t('hero.demo')}
              </Button>
            </div>
          </div>

          {/* Hero Image - Browser Window Style */}
          <div className="relative mx-auto max-w-6xl shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
            <div className="h-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-2">
               <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
               <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
               <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
               <div className="ml-4 h-6 bg-white dark:bg-slate-800 rounded-md w-96 border border-slate-200 dark:border-slate-700 flex items-center px-3 text-xs text-slate-400">
                  app.primetrack.io/dashboard
               </div>
            </div>
            <img 
              src={heroImage} 
              alt="PrimeTrack Dashboard" 
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
        <div className="container px-4 mx-auto text-center">
           <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">{t('hero.trust')}</p>
           <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 grayscale opacity-60">
             {["Keitaro", "Binom", "ClickDealer", "Everflow", "Voluum"].map((brand, i) => (
               <span key={i} className="text-xl font-bold text-slate-400">{brand}</span>
             ))}
           </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="py-12 bg-white dark:bg-slate-950 border-b border-border">
        <div className="container px-4 mx-auto">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
              <div className="text-center px-4">
                 <div className="text-4xl font-bold text-blue-600 mb-2">12M+</div>
                 <div className="text-sm font-medium text-slate-500 uppercase">{t('stats.clicks')}</div>
              </div>
              <div className="text-center px-4">
                 <div className="text-4xl font-bold text-blue-600 mb-2">99.99%</div>
                 <div className="text-sm font-medium text-slate-500 uppercase">{t('stats.uptime')}</div>
              </div>
              <div className="text-center px-4">
                 <div className="text-4xl font-bold text-blue-600 mb-2">~5ms</div>
                 <div className="text-sm font-medium text-slate-500 uppercase">{t('stats.speed')}</div>
              </div>
           </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t('features.title')}</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-6 text-blue-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{t('features.reporting.title')}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('features.reporting.desc')}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-6 text-green-600">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{t('features.automation.title')}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('features.automation.desc')}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-6 text-red-600">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{t('features.protection.title')}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('features.protection.desc')}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-6 text-purple-600">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{t('features.integration.title')}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('features.integration.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Standard SaaS */}
      <section id="pricing" className="py-24 bg-white dark:bg-slate-950 border-t border-border">
         <div className="container px-4 mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t('pricing.title')}</h2>
               <p className="text-lg text-slate-600 dark:text-slate-400">{t('pricing.subtitle')}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
               {/* Starter */}
               <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-300 transition-colors">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('pricing.starter')}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                     <span className="text-4xl font-bold text-slate-900 dark:text-white">$49</span>
                     <span className="text-slate-500">{t('pricing.month')}</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                     <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500" /> 100,000 Clicks
                     </li>
                     <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500" /> 1 Custom Domain
                     </li>
                     <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500" /> 1 User
                     </li>
                  </ul>
                  <Button variant="outline" className="w-full">{t('nav.getStarted')}</Button>
               </div>

               {/* Pro - Highlighted */}
               <div className="p-8 border-2 border-blue-600 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 relative">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">{t('pricing.pro')}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                     <span className="text-4xl font-bold text-slate-900 dark:text-white">$99</span>
                     <span className="text-slate-500">{t('pricing.month')}</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                     <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" /> 1,000,000 Clicks
                     </li>
                     <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" /> 5 Custom Domains
                     </li>
                     <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" /> 3 Users
                     </li>
                     <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" /> Anti-Fraud Basic
                     </li>
                  </ul>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">{t('nav.getStarted')}</Button>
               </div>

               {/* Business */}
               <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-300 transition-colors">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('pricing.business')}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                     <span className="text-4xl font-bold text-slate-900 dark:text-white">$249</span>
                     <span className="text-slate-500">{t('pricing.month')}</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                     <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500" /> Unlimited Clicks
                     </li>
                     <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500" /> Unlimited Domains
                     </li>
                     <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500" /> 10 Users
                     </li>
                     <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500" /> Priority Support
                     </li>
                  </ul>
                  <Button variant="outline" className="w-full">{t('nav.getStarted')}</Button>
               </div>
            </div>
         </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="py-12 bg-white dark:bg-slate-950 border-t border-border">
        <div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
             <div className="font-bold text-slate-900 dark:text-white text-lg">PrimeTrack</div>
             <span className="text-slate-300">|</span>
             <span>© 2025 {t('footer.rights')}</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-blue-600 transition-colors">{t('footer.terms')}</a>
            <a href="#" className="hover:text-blue-600 transition-colors">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-blue-600 transition-colors">{t('footer.contacts')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
