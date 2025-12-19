import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Globe2, Shield, Zap, BarChart3 } from "lucide-react";

export default function Home() {
  const { t } = useTranslation();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 grid-pattern pointer-events-none opacity-[0.15]" />
        
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-20 pointer-events-none" />

        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-muted-foreground mb-8 backdrop-blur-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('hero.badge')}
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight leading-[1] mb-8"
            >
              <span className="text-gradient block">{t('hero.titleLine1')}</span>
              <span className="text-muted-foreground">{t('hero.titleLine2')}</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl leading-relaxed"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <Button size="lg" className="h-14 px-8 rounded-full text-base bg-primary text-primary-foreground hover:bg-white/90 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] w-full sm:w-auto">
                {t('hero.cta')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-base border-white/10 bg-white/5 hover:bg-white/10 w-full sm:w-auto backdrop-blur-sm">
                {t('hero.docs')}
              </Button>
            </motion.div>
          </div>

          {/* Hero Visual - Abstract Dashboard Interface */}
          <motion.div 
            style={{ y: y1, rotateX: 20 }} 
            className="mt-20 relative mx-auto max-w-6xl perspective-1000"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <div className="relative rounded-xl border border-white/10 bg-[#0A0A0A] shadow-2xl overflow-hidden aspect-[16/9] group">
              <div className="absolute top-0 left-0 right-0 h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500/20" />
                 <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                 <div className="w-3 h-3 rounded-full bg-green-500/20" />
              </div>
              <div className="p-8 md:p-12 h-full flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-50">
                <div className="text-center">
                  <div className="inline-block p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                    <Zap className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-display font-medium text-white mb-2">{t('hero.core')}</h3>
                  <p className="text-muted-foreground">{t('hero.waiting')}</p>
                </div>
              </div>
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-32 relative bg-background border-t border-white/5">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="mb-20">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              {t('features.titleLine1')} <br/>
              <span className="text-muted-foreground">{t('features.titleLine2')}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
            {/* Feature 1 - Large Left */}
            <div className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="mb-8">
                   <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                     <Globe2 className="w-5 h-5" />
                   </div>
                   <h3 className="text-2xl font-display font-medium mb-2">{t('features.traffic.title')}</h3>
                   <p className="text-muted-foreground max-w-md">{t('features.traffic.desc')}</p>
                </div>
                <div className="w-full h-48 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 grid-pattern opacity-30" />
                   <div className="flex gap-4">
                      <div className="px-4 py-2 bg-background/50 backdrop-blur rounded-lg border border-white/10 text-xs font-mono">{t('features.traffic.sample')}</div>
                      <div className="px-4 py-2 bg-background/50 backdrop-blur rounded-lg border border-white/10 text-xs font-mono">{t('features.traffic.sampleBot')}</div>
                   </div>
                </div>
              </div>
            </div>

            {/* Feature 2 - Top Right */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-medium mb-2">{t('features.fraud.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('features.fraud.desc')}</p>
            </div>

            {/* Feature 3 - Bottom Right */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors flex flex-col justify-between">
               <div>
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 text-orange-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-medium mb-2">{t('features.finance.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('features.finance.desc')}</p>
               </div>
               <div className="mt-4 flex items-end gap-1 h-12">
                 {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                   <div key={i} className="flex-1 bg-white/10 hover:bg-orange-500/50 transition-colors rounded-sm" style={{ height: `${h}%` }} />
                 ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Marquee */}
      <section className="py-20 border-y border-white/5 bg-white/[0.01]">
        <div className="container px-4 mx-auto text-center mb-10">
           <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">{t('marquee')}</p>
        </div>
        <div className="flex overflow-hidden">
          <div className="flex gap-16 animate-infinite-scroll whitespace-nowrap px-8">
            {["Keitaro", "Binom", "ClickDealer", "Everflow", "AppsFlyer", "Voluum", "RedTrack"].map((brand, i) => (
              <span key={i} className="text-2xl font-display font-bold text-white/20 hover:text-white/40 transition-colors cursor-default">{brand}</span>
            ))}
             {["Keitaro", "Binom", "ClickDealer", "Everflow", "AppsFlyer", "Voluum", "RedTrack"].map((brand, i) => (
              <span key={`dup-${i}`} className="text-2xl font-display font-bold text-white/20 hover:text-white/40 transition-colors cursor-default">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background">
        <div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black font-bold text-xs">O</div>
            <span className="font-display font-bold text-lg tracking-tight">Orchestrator</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-white transition-colors">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('footer.terms')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('footer.api')}</a>
          </div>
          <div className="text-xs font-mono text-white/20">
            {t('footer.status')}
          </div>
        </div>
      </footer>
    </div>
  );
}
