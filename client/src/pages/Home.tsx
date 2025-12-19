import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Activity, Users, Layers, TrendingUp, BarChart3, Globe2, Wallet } from "lucide-react";
import heroImage from "@assets/generated_images/modern_saas_dashboard_abstract_visualization.png";

export default function Home() {
  const { t } = useTranslation();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-0">
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] opacity-50 dark:opacity-20 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] opacity-50 dark:opacity-20" />
        </div>

        <div className="container px-6 mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div 
              className="lg:w-1/2 text-center lg:text-left"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6 border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                Live Beta v1.0
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-heading font-bold leading-[1.1] mb-6 tracking-tight">
                {t('hero.title')}
              </h1>
              
              <p className="text-lg lg:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8 font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300">
                  {t('hero.cta')} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8 backdrop-blur-sm bg-background/50">
                  {t('hero.demo')}
                </Button>
              </div>
            </motion.div>

            <motion.div 
              className="lg:w-1/2 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none" />
                <img 
                  src={heroImage} 
                  alt="Dashboard Visualization" 
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                
                {/* Floating UI Elements */}
                <motion.div 
                  className="absolute -left-6 top-1/4 bg-card/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl hidden md:block"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">ROI (Today)</div>
                      <div className="font-bold text-lg text-green-500">+142.5%</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute -right-6 bottom-1/4 bg-card/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl hidden md:block"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Anti-Fraud</div>
                      <div className="font-bold text-sm">Protected</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5 bg-white/5 backdrop-blur-sm">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: t('stats.clicks'), value: "24.5M", icon: Activity, color: "text-blue-500" },
              { label: t('stats.leads'), value: "842K", icon: Users, color: "text-purple-500" },
              { label: t('stats.revenue'), value: "$4.2M", icon: Wallet, color: "text-green-500" },
              { label: t('stats.roi'), value: "185%", icon: BarChart3, color: "text-orange-500" },
            ].map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center text-center group">
                <div className={`mb-4 p-3 rounded-2xl bg-card border border-white/10 shadow-lg ${stat.color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="text-3xl font-heading font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles / Features Section */}
      <section id="roles" className="py-24 relative">
        <div className="container px-6 mx-auto">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">{t('roles.title')}</h2>
            <p className="text-muted-foreground text-lg">
              Whether you are buying traffic, selling it, or managing the whole operation, 
              we have a dedicated workspace for you.
            </p>
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {[
              { 
                role: t('roles.advertiser'), 
                desc: t('roles.advertiserDesc'), 
                icon: Layers, 
                color: "bg-blue-500",
                features: ["Real-time ROI", "Offer Management", "Custom Payouts"]
              },
              { 
                role: t('roles.publisher'), 
                desc: t('roles.publisherDesc'), 
                icon: Globe2, 
                color: "bg-purple-500",
                features: ["Smart Links", "Unified Dashboard", "Instant Postbacks"]
              },
              { 
                role: t('roles.admin'), 
                desc: t('roles.adminDesc'), 
                icon: ShieldCheck, 
                color: "bg-orange-500",
                features: ["Tenant Control", "Global Anti-Fraud", "Finance Hub"]
              }
            ].map((card, idx) => (
              <motion.div key={idx} variants={item}>
                <Card className="h-full border-white/10 bg-card/40 backdrop-blur-md hover:bg-card/60 transition-colors duration-300 group overflow-hidden relative">
                  <div className={`absolute top-0 left-0 w-1 h-full ${card.color}`} />
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl ${card.color}/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <card.icon className={`h-6 w-6 ${card.color.replace('bg-', 'text-')}`} />
                    </div>
                    <CardTitle className="text-xl font-bold">{card.role}</CardTitle>
                    <CardDescription className="text-base pt-2">{card.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {card.features.map((feat, i) => (
                        <li key={i} className="flex items-center text-sm text-muted-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full ${card.color.replace('bg-', 'bg-')} mr-3`} />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-card/30">
        <div className="container px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">O</div>
            <span className="font-heading font-bold text-lg">Orchestrator</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2025 SaaS Affiliate Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
