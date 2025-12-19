import { Navbar } from "@/components/layout/Navbar";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Shield, Briefcase, User, LayoutDashboard, Settings, LogOut, Link as LinkIcon, DollarSign, BarChart2 } from "lucide-react";

export default function Dashboard() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();

  // Mock roles for the prototype with translated labels
  const roles = [
    { 
      id: "admin", 
      label: t('dashboard.roles.admin'), 
      icon: Shield, 
      color: "text-orange-500", 
      bg: "bg-orange-500/10",
      desc: t('dashboard.roles.adminDesc')
    },
    { 
      id: "advertiser", 
      label: t('dashboard.roles.advertiser'), 
      icon: Briefcase, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      desc: t('dashboard.roles.advertiserDesc')
    },
    { 
      id: "publisher", 
      label: t('dashboard.roles.publisher'), 
      icon: User, 
      color: "text-purple-500", 
      bg: "bg-purple-500/10",
      desc: t('dashboard.roles.publisherDesc')
    }
  ];

  const sidebarLinks = [
    { icon: LayoutDashboard, label: t('dashboard.menu.overview'), active: true },
    { icon: BarChart2, label: t('dashboard.menu.reports'), active: false },
    { icon: LinkIcon, label: t('dashboard.menu.links'), active: false },
    { icon: DollarSign, label: t('dashboard.menu.finance'), active: false },
    { icon: Settings, label: t('dashboard.menu.settings'), active: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-card/30 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link href="/">
            <a className="flex items-center gap-2 font-display font-bold text-xl">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs">O</div>
              Orchestrator
            </a>
          </Link>
        </div>
        
        <div className="p-4 flex-1">
          <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider px-2">Menu</div>
          <nav className="space-y-1">
            {sidebarLinks.map((link, i) => (
              <button 
                key={i}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  link.active 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
           <Link href="/">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              {t('dashboard.menu.logout')}
            </Button>
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-white/10 bg-background/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
           <h1 className="font-display font-semibold text-lg">{t('dashboard.title')}</h1>
           <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50" />
           </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
           <div className="mb-8">
             <h2 className="text-2xl font-bold mb-2">{t('dashboard.welcome')}</h2>
             <p className="text-muted-foreground">{t('dashboard.selectRole')}</p>
           </div>

           <div className="grid md:grid-cols-3 gap-6 mb-12">
             {roles.map((role) => (
               <Card key={role.id} className="bg-card/50 hover:bg-card/80 transition-all cursor-pointer border-white/10 hover:border-primary/50 group">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium text-muted-foreground">
                     {t('dashboard.roles.view', { role: role.label })}
                   </CardTitle>
                   <role.icon className={`h-4 w-4 ${role.color}`} />
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold group-hover:text-primary transition-colors">{role.label}</div>
                   <p className="text-xs text-muted-foreground mt-1">{role.desc}</p>
                   <Button className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/10">
                     {t('dashboard.roles.enter', { role: role.label })}
                   </Button>
                 </CardContent>
               </Card>
             ))}
           </div>

           {/* Dashboard Preview Section - Mock Content */}
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 bg-card/30 border-white/10">
                <CardHeader>
                  <CardTitle>{t('dashboard.menu.overview')}</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-white/10 rounded-lg m-4">
                    Chart Visualization Placeholder
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3 bg-card/30 border-white/10">
                <CardHeader>
                  <CardTitle>{t('dashboard.stats.recentActivity')}</CardTitle>
                  <CardDescription>
                    {t('dashboard.stats.salesMonth')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1,2,3].map((_, i) => (
                      <div key={i} className="flex items-center">
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">{t('dashboard.stats.newLead')}</p>
                          <p className="text-sm text-muted-foreground">
                            offer_id_123 {t('dashboard.stats.converted')} US
                          </p>
                        </div>
                        <div className="ml-auto font-medium">+$1,999.00</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
           </div>
        </div>
      </main>
    </div>
  );
}
