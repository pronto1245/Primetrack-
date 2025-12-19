import { Navbar } from "@/components/layout/Navbar";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  Shield, Briefcase, User, LayoutDashboard, Settings, LogOut, 
  Link as LinkIcon, DollarSign, BarChart2, Users, Target, Wallet,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { useState } from "react";

// Types for Dashboard Roles
type Role = 'admin' | 'advertiser' | 'publisher' | null;

export default function Dashboard() {
  const { t } = useTranslation();
  const [activeRole, setActiveRole] = useState<Role>(null);

  // Role Configurations
  const roleConfig = {
    admin: {
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "hover:border-orange-500/50",
      menu: [
        { icon: LayoutDashboard, label: t('dashboard.menu.overview') },
        { icon: Users, label: t('dashboard.menu.users') },
        { icon: DollarSign, label: t('dashboard.menu.finance') },
        { icon: Shield, label: "Anti-Fraud" },
        { icon: Settings, label: t('dashboard.menu.settings') },
      ]
    },
    advertiser: {
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "hover:border-blue-500/50",
      menu: [
        { icon: LayoutDashboard, label: t('dashboard.menu.overview') },
        { icon: Target, label: t('dashboard.menu.offers') },
        { icon: BarChart2, label: t('dashboard.menu.reports') },
        { icon: Settings, label: t('dashboard.menu.settings') },
      ]
    },
    publisher: {
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "hover:border-purple-500/50",
      menu: [
        { icon: LayoutDashboard, label: t('dashboard.menu.overview') },
        { icon: LinkIcon, label: t('dashboard.menu.links') },
        { icon: BarChart2, label: t('dashboard.menu.reports') },
        { icon: Wallet, label: t('dashboard.menu.payouts') },
      ]
    }
  };

  const rolesList = [
    { id: "admin", label: t('dashboard.roles.admin'), icon: Shield, desc: t('dashboard.roles.adminDesc'), ...roleConfig.admin },
    { id: "advertiser", label: t('dashboard.roles.advertiser'), icon: Briefcase, desc: t('dashboard.roles.advertiserDesc'), ...roleConfig.advertiser },
    { id: "publisher", label: t('dashboard.roles.publisher'), icon: User, desc: t('dashboard.roles.publisherDesc'), ...roleConfig.publisher }
  ];

  if (!activeRole) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
        <header className="h-16 border-b border-border bg-white dark:bg-slate-900 flex items-center justify-between px-6">
           <Link href="/">
            <a className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">P</div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">{t('brand')}</span>
            </a>
           </Link>
           <Link href="/">
             <Button variant="ghost">{t('nav.exit')}</Button>
           </Link>
        </header>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center mb-12 max-w-lg">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t('dashboard.welcome')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">{t('dashboard.selectRole')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
             {rolesList.map((role) => (
               <Card 
                 key={role.id} 
                 className={`cursor-pointer transition-all duration-300 hover:shadow-xl border-border ${role.border} bg-white dark:bg-slate-900`}
                 onClick={() => setActiveRole(role.id as Role)}
               >
                 <CardHeader>
                   <div className={`w-12 h-12 rounded-lg ${role.bg} ${role.color} flex items-center justify-center mb-4`}>
                     <role.icon className="h-6 w-6" />
                   </div>
                   <CardTitle className="text-xl">{role.label}</CardTitle>
                   <CardDescription className="text-base mt-2">{role.desc}</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 group">
                     {t('dashboard.roles.enter')} <ArrowUpRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                   </div>
                 </CardContent>
               </Card>
             ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Dashboard View
  const activeConfig = roleConfig[activeRole];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-white dark:bg-slate-900 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
           <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
             <div className={`w-2 h-8 rounded-full ${activeConfig.bg.replace('10', '100')} ${activeConfig.color.replace('text-', 'bg-')}`} />
             {rolesList.find(r => r.id === activeRole)?.label}
           </div>
        </div>
        
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            {activeConfig.menu.map((link, i) => (
              <button 
                key={i}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  i === 0
                    ? `bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white` 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <link.icon className={`h-4 w-4 ${i === 0 ? activeConfig.color : ''}`} />
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => setActiveRole(null)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('dashboard.menu.logout')}
            </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-white dark:bg-slate-900 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
           <h1 className="font-bold text-lg text-slate-900 dark:text-white">{t('dashboard.menu.overview')}</h1>
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-border">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">System Online</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border border-border flex items-center justify-center text-xs font-bold text-slate-500">
               {activeRole.charAt(0).toUpperCase()}
             </div>
           </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
           {/* Stats Cards - Dynamic based on role */}
           <div className="grid md:grid-cols-4 gap-6 mb-8">
             {activeRole === 'admin' && (
               <>
                 <StatCard title={t('dashboard.stats.revenue')} value="$1,240,500" change="+12.5%" positive />
                 <StatCard title={t('dashboard.stats.profit')} value="$342,100" change="+8.2%" positive />
                 <StatCard title={t('dashboard.stats.activeAffiliates')} value="1,204" change="+24" positive />
                 <StatCard title="Blocked Bots" value="842k" change="-2.1%" positive={false} />
               </>
             )}
             {activeRole === 'advertiser' && (
               <>
                 <StatCard title="Total Spend" value="$12,500" change="+5.2%" positive={false} />
                 <StatCard title={t('dashboard.stats.clicksToday')} value="45,200" change="+18%" positive />
                 <StatCard title="Conversions" value="842" change="+3.4%" positive />
                 <StatCard title="ROI" value="145%" change="+1.2%" positive />
               </>
             )}
             {activeRole === 'publisher' && (
               <>
                 <StatCard title="Your Earnings" value="$4,250" change="+15%" positive />
                 <StatCard title="Pending Payout" value="$1,200" change="Processing" neutral />
                 <StatCard title={t('dashboard.stats.clicksToday')} value="12,500" change="+5%" positive />
                 <StatCard title="EPC" value="$0.34" change="+0.02" positive />
               </>
             )}
           </div>

           {/* Main Chart Area */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-2 border-border shadow-sm">
                <CardHeader>
                  <CardTitle>{t('dashboard.menu.reports')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                    <Activity className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm">Traffic Volume Chart</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity Feed */}
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>{t('dashboard.stats.recentActivity')}</CardTitle>
                  <CardDescription>{t('dashboard.stats.salesMonth')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div key={i} className="flex items-start gap-4">
                         <div className={`w-2 h-2 mt-2 rounded-full ${i % 2 === 0 ? 'bg-green-500' : 'bg-blue-500'}`} />
                         <div className="space-y-1">
                           <p className="text-sm font-medium leading-none text-slate-900 dark:text-white">
                             {activeRole === 'admin' ? 'New Tenant Registered' : activeRole === 'advertiser' ? 'Campaign "US_Dating" Approved' : 'Payout Processed'}
                           </p>
                           <p className="text-xs text-slate-500">
                             {i * 12} minutes ago
                           </p>
                         </div>
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

function StatCard({ title, value, change, positive, neutral }: { title: string, value: string, change: string, positive?: boolean, neutral?: boolean }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-6">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{title}</div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            neutral 
              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              : positive 
                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {change}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
