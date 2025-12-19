import { Navbar } from "@/components/layout/Navbar";
import { useTranslation } from "react-i18next";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Shield, Briefcase, User, LayoutDashboard, Settings, LogOut, 
  Link as LinkIcon, DollarSign, BarChart2, Users, Target, Wallet,
  ArrowUpRight, Activity, Filter, RefreshCw, Calendar, ArrowRight
} from "lucide-react";

// Mock Data for "High Density" feel
const MOCK_CAMPAIGNS = [
  { id: 1024, name: "US_Sweepstakes_Main", status: "active", clicks: "45,201", conv: "1,204", revenue: "$4,214.00", roi: "142%" },
  { id: 1025, name: "DE_Dating_Smartlink", status: "active", clicks: "12,100", conv: "854", revenue: "$2,989.00", roi: "210%" },
  { id: 1026, name: "Crypto_Push_WW", status: "paused", clicks: "5,400", conv: "12", revenue: "$450.00", roi: "-20%" },
  { id: 1027, name: "Gambling_Tier1_iOS", status: "active", clicks: "8,900", conv: "410", revenue: "$8,200.00", roi: "340%" },
  { id: 1028, name: "Nutra_Keto_FR", status: "active", clicks: "3,200", conv: "98", revenue: "$1,100.00", roi: "85%" },
];

export default function Dashboard() {
  const { t } = useTranslation();
  
  // Simple routing for prototype separation
  const [match, params] = useRoute("/dashboard/:role");
  const role = params?.role;

  if (!role) {
    return <RoleSelectionScreen t={t} />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans flex flex-col md:flex-row overflow-hidden">
      <Sidebar role={role} t={t} />
      <MainContent role={role} t={t} />
    </div>
  );
}

function RoleSelectionScreen({ t }: { t: any }) {
  const roles = [
    { id: "admin", label: t('dashboard.roles.admin'), icon: Shield, color: "text-red-500", border: "hover:border-red-500/50" },
    { id: "advertiser", label: t('dashboard.roles.advertiser'), icon: Briefcase, color: "text-blue-500", border: "hover:border-blue-500/50" },
    { id: "publisher", label: t('dashboard.roles.publisher'), icon: User, color: "text-emerald-500", border: "hover:border-emerald-500/50" }
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-mono font-bold text-white mb-2">{t('dashboard.welcome')}</h1>
          <p className="text-slate-500 font-mono text-sm">{t('dashboard.selectRole')}</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((r) => (
            <Link key={r.id} href={`/dashboard/${r.id}`}>
              <div className={`bg-[#0A0A0A] border border-white/10 p-8 rounded cursor-pointer transition-all hover:-translate-y-1 ${r.border} group`}>
                <div className={`w-12 h-12 rounded bg-white/5 flex items-center justify-center mb-6 ${r.color} group-hover:bg-white/10`}>
                  <r.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{r.label}</h3>
                <div className="flex items-center text-xs text-slate-500 font-mono group-hover:text-white transition-colors">
                  {t('dashboard.roles.enter')} <ArrowRight className="w-3 h-3 ml-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <Link href="/">
            <Button variant="link" className="text-slate-500 hover:text-white font-mono text-xs">
              ← {t('nav.exit')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ role, t }: { role: string, t: any }) {
  const menus = {
    admin: [
      { icon: LayoutDashboard, label: t('dashboard.menu.overview') },
      { icon: Users, label: t('dashboard.menu.users') },
      { icon: Shield, label: t('hero.specs.antifraud') },
      { icon: DollarSign, label: t('dashboard.menu.finance') },
      { icon: Settings, label: t('dashboard.menu.settings') },
    ],
    advertiser: [
      { icon: LayoutDashboard, label: t('dashboard.menu.overview') },
      { icon: Target, label: t('dashboard.menu.campaigns') },
      { icon: BarChart2, label: t('dashboard.menu.reports') },
      { icon: Wallet, label: t('dashboard.menu.finance') },
    ],
    publisher: [
      { icon: LayoutDashboard, label: t('dashboard.menu.overview') },
      { icon: LinkIcon, label: t('dashboard.menu.links') },
      { icon: Activity, label: t('dashboard.menu.reports') },
      { icon: DollarSign, label: t('dashboard.menu.payouts') },
    ]
  };

  const currentMenu = menus[role as keyof typeof menus] || menus.publisher;
  const roleColor = role === 'admin' ? 'bg-red-500' : role === 'advertiser' ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <aside className="w-64 bg-[#0A0A0A] border-r border-white/10 flex-shrink-0 hidden md:flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-white/10">
        <div className={`w-3 h-3 rounded-sm ${roleColor} mr-3`} />
        <span className="font-mono font-bold text-sm tracking-wider uppercase">{role} PORTAL</span>
      </div>

      <nav className="p-2 space-y-1 flex-1">
        {currentMenu.map((item, i) => (
          <button key={i} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${i === 0 ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-white transition-colors w-full">
            <LogOut className="w-3 h-3" />
            {t('dashboard.menu.logout')}
          </button>
        </Link>
      </div>
    </aside>
  )
}

function MainContent({ role, t }: { role: string, t: any }) {
  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 bg-[#0A0A0A] border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('dashboard.menu.overview')}</h2>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('dashboard.liveStream')}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-slate-500">{t('dashboard.server')}: US-EAST-1</div>
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-bold uppercase">
            {role.charAt(0)}
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatBox label={t('stats.revenue')} value="$12,450.00" trend="+12%" color="text-emerald-500" />
          <StatBox label={t('stats.clicks')} value="145,200" trend="+5%" color="text-blue-500" />
          <StatBox label={t('stats.conversions')} value="3,204" trend="+8%" color="text-purple-500" />
          <StatBox label={t('stats.roi')} value="165%" trend="-2%" color="text-yellow-500" />
        </div>

        {/* Charts & Graphs Area */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 bg-[#0A0A0A] border border-white/10 rounded p-4 h-[300px] relative overflow-hidden">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase text-slate-400">{t('dashboard.trafficVol')}</h3>
                <div className="flex gap-2">
                   <Button size="sm" variant="outline" className="h-6 text-[10px] border-white/10 bg-transparent">1H</Button>
                   <Button size="sm" variant="outline" className="h-6 text-[10px] border-white/10 bg-white/5">24H</Button>
                </div>
             </div>
             {/* Mock Chart Visualization */}
             <div className="absolute inset-x-0 bottom-0 h-48 flex items-end justify-between px-4 gap-1 opacity-50">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-full bg-emerald-500/20 hover:bg-emerald-500/50 transition-colors rounded-t-sm" style={{ height: `${Math.random() * 100}%` }} />
                ))}
             </div>
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-slate-600 font-mono text-xs">[LIVE CHART VISUALIZATION LAYER]</div>
             </div>
          </div>

          <div className="col-span-1 bg-[#0A0A0A] border border-white/10 rounded p-4 h-[300px]">
             <h3 className="text-xs font-bold uppercase text-slate-400 mb-4">{t('dashboard.topGeos')}</h3>
             <div className="space-y-3">
               {[
                 { code: "US", name: "United States", val: "45%" },
                 { code: "DE", name: "Germany", val: "22%" },
                 { code: "GB", name: "Great Britain", val: "15%" },
                 { code: "FR", name: "France", val: "8%" },
               ].map((geo, i) => (
                 <div key={i} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2">
                     <span className="font-mono text-slate-500">{geo.code}</span>
                     <span className="text-slate-300">{geo.name}</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500" style={{ width: geo.val }} />
                     </div>
                     <span className="font-mono text-xs w-8 text-right">{geo.val}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Dense Data Table */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded overflow-hidden">
           <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                {t('dashboard.activeCampaigns')}
              </h3>
              <div className="flex gap-2">
                 <Button size="icon" variant="ghost" className="h-6 w-6"><Filter className="w-3 h-3" /></Button>
                 <Button size="icon" variant="ghost" className="h-6 w-6"><RefreshCw className="w-3 h-3" /></Button>
              </div>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left text-xs font-mono">
               <thead>
                 <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                   <th className="px-4 py-3 font-medium">{t('dashboard.table.id')}</th>
                   <th className="px-4 py-3 font-medium">{t('dashboard.table.name')}</th>
                   <th className="px-4 py-3 font-medium">{t('dashboard.table.status')}</th>
                   <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.clicks')}</th>
                   <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.conv')}</th>
                   <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.revenue')}</th>
                   <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.roi')}</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {MOCK_CAMPAIGNS.map((row) => (
                   <tr key={row.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                     <td className="px-4 py-3 text-slate-500">#{row.id}</td>
                     <td className="px-4 py-3 font-medium text-white group-hover:text-emerald-400 transition-colors">{row.name}</td>
                     <td className="px-4 py-3">
                       <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${row.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                         {row.status}
                       </span>
                     </td>
                     <td className="px-4 py-3 text-right text-slate-300">{row.clicks}</td>
                     <td className="px-4 py-3 text-right text-slate-300">{row.conv}</td>
                     <td className="px-4 py-3 text-right text-white font-bold">{row.revenue}</td>
                     <td className={`px-4 py-3 text-right font-bold ${row.roi.includes('-') ? 'text-red-500' : 'text-emerald-500'}`}>{row.roi}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </main>
  );
}

function StatBox({ label, value, trend, color }: any) {
  return (
    <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded hover:border-white/20 transition-colors">
      <div className="text-xs text-slate-500 font-mono uppercase mb-1">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-white font-mono">{value}</div>
        <div className={`text-xs font-bold ${color} bg-white/5 px-1.5 py-0.5 rounded`}>{trend}</div>
      </div>
    </div>
  )
}
