import { Navbar } from "@/components/layout/Navbar";
import { useTranslation } from "react-i18next";
import { Link, useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Shield, Briefcase, User, LayoutDashboard, Settings, LogOut, 
  Link as LinkIcon, DollarSign, BarChart2, Users, Target, Wallet,
  ArrowUpRight, Activity, Filter, RefreshCw, Calendar,
  Plus, Search, UserPlus, ChevronDown, Building2,
  Phone, Send, Globe, Newspaper
} from "lucide-react";
import { AdvertiserProvider, useAdvertiserContext } from "@/contexts/AdvertiserContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdvertiserOffers } from "@/components/dashboard/AdvertiserOffers";
import { PublisherOffers } from "@/components/dashboard/PublisherOffers";
import { CreateOfferForm } from "@/components/dashboard/CreateOfferForm";
import { OfferDetail } from "@/components/dashboard/OfferDetail";
import { AdvertiserDashboard } from "@/components/dashboard/AdvertiserDashboard";
import { PublisherDashboard } from "@/components/dashboard/PublisherDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { AdvertiserPartners } from "@/components/dashboard/AdvertiserPartners";
import { AdminUsers } from "@/components/dashboard/AdminUsers";
import { Reports } from "@/components/dashboard/Reports";
import { AccessRequests } from "@/components/dashboard/AccessRequests";
import { AdvertiserFinance } from "@/components/dashboard/AdvertiserFinance";
import { AdminFinance } from "@/components/dashboard/AdminFinance";
import { PublisherPayouts } from "@/components/dashboard/PublisherPayouts";
import { PostbackSettings } from "@/components/dashboard/PostbackSettings";
import AntifraudDashboard from "@/components/dashboard/AntifraudDashboard";
import { AdvertiserSettings } from "@/components/dashboard/AdvertiserSettings";
import { PublisherSettings } from "@/components/dashboard/PublisherSettings";
import { AdminSettings } from "@/components/dashboard/AdminSettings";
import { AdvertiserTeam } from "@/components/dashboard/AdvertiserTeam";
import { WebhooksSettings } from "@/components/dashboard/WebhooksSettings";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/NotificationBell";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { t } = useTranslation();
  
  // Match multiple route patterns
  const [matchBase, paramsBase] = useRoute("/dashboard/:role");
  const [matchSub, paramsSub] = useRoute("/dashboard/:role/:section");
  const [matchSubSub, paramsSubSub] = useRoute("/dashboard/:role/:section/:action");
  
  // Extract role from any matching route
  const role = paramsSubSub?.role || paramsSub?.role || paramsBase?.role;

  if (!role) {
    // Redirect to login page instead of showing role selection
    window.location.href = "/login";
    return null;
  }

  return (
    <AdvertiserProvider role={role}>
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row overflow-hidden">
        <Sidebar role={role} t={t} />
        <MainContent role={role} t={t} />
      </div>
    </AdvertiserProvider>
  );
}

function ManagerCard() {
  const { data: manager } = useQuery<any>({
    queryKey: ["platform-manager"],
    queryFn: async () => {
      const res = await fetch("/api/platform-manager", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!manager) return null;

  return (
    <div className="p-3 mb-16">
      <div className="bg-gradient-to-br from-red-900/30 to-slate-900/50 rounded-lg p-3 border border-red-500/20" data-testid="manager-card">
        <div className="text-[10px] text-red-400 uppercase font-bold mb-2">Ваш менеджер</div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-primary-foreground font-bold text-sm">
            {(manager.fullName || manager.username || "M").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {manager.fullName || manager.username}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Администратор
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          {manager.telegram && (
            <a 
              href={`https://t.me/${manager.telegram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-blue-400 transition-colors"
              data-testid="manager-telegram"
            >
              <Send className="w-3 h-3" />
              <span className="truncate">{manager.telegram}</span>
            </a>
          )}
          {manager.phone && (
            <a 
              href={`tel:${manager.phone}`}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-emerald-400 transition-colors"
              data-testid="manager-phone"
            >
              <Phone className="w-3 h-3" />
              <span className="truncate">{manager.phone}</span>
            </a>
          )}
          {manager.email && (
            <a 
              href={`mailto:${manager.email}`}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-yellow-400 transition-colors"
              data-testid="manager-email"
            >
              <User className="w-3 h-3" />
              <span className="truncate">{manager.email}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ role, t }: { role: string, t: any }) {
  const { selectedAdvertiser } = useAdvertiserContext();
  
  const menus = {
    admin: [
      { icon: LayoutDashboard, label: t('dashboard.menu.overview'), path: `/dashboard/${role}`, color: "text-blue-400" },
      { icon: BarChart2, label: t('dashboard.menu.reports'), path: `/dashboard/${role}/reports`, color: "text-purple-400" },
      { icon: Users, label: t('dashboard.menu.users'), path: `/dashboard/${role}/users`, color: "text-emerald-400" },
      { icon: Shield, label: t('hero.specs.antifraud'), path: `/dashboard/${role}/antifraud`, color: "text-red-400" },
      { icon: DollarSign, label: t('dashboard.menu.finance'), path: `/dashboard/${role}/finance`, color: "text-yellow-400" },
      { icon: Newspaper, label: "Новости", path: `/dashboard/${role}/news`, color: "text-orange-400" },
      { icon: Globe, label: "Постбеки", path: `/dashboard/${role}/postbacks`, color: "text-pink-400" },
      { icon: Briefcase, label: "Команда", path: `/dashboard/${role}/team`, color: "text-indigo-400" },
      { icon: Settings, label: t('dashboard.menu.settings'), path: `/dashboard/${role}/settings`, color: "text-muted-foreground" },
    ],
    advertiser: [
      { icon: LayoutDashboard, label: t('dashboard.menu.overview'), path: `/dashboard/${role}`, color: "text-blue-400" },
      { icon: Target, label: t('dashboard.menu.offers'), path: `/dashboard/${role}/offers`, color: "text-orange-400" },
      { icon: UserPlus, label: t('dashboard.menu.requests'), path: `/dashboard/${role}/requests`, color: "text-cyan-400" },
      { icon: Users, label: t('dashboard.menu.partners'), path: `/dashboard/${role}/partners`, color: "text-emerald-400" },
      { icon: BarChart2, label: t('dashboard.menu.reports'), path: `/dashboard/${role}/reports`, color: "text-purple-400" },
      { icon: Shield, label: t('hero.specs.antifraud'), path: `/dashboard/${role}/antifraud`, color: "text-red-400" },
      { icon: Wallet, label: t('dashboard.menu.finance'), path: `/dashboard/${role}/finance`, color: "text-yellow-400" },
      { icon: Newspaper, label: "Новости", path: `/dashboard/${role}/news`, color: "text-orange-400" },
      { icon: Globe, label: "Постбеки", path: `/dashboard/${role}/postbacks`, color: "text-pink-400" },
      { icon: Globe, label: "Webhooks", path: `/dashboard/${role}/webhooks`, color: "text-teal-400" },
      { icon: Briefcase, label: "Команда", path: `/dashboard/${role}/team`, color: "text-indigo-400" },
      { icon: Settings, label: t('dashboard.menu.settings'), path: `/dashboard/${role}/settings`, color: "text-muted-foreground" },
    ],
    publisher: [
      { icon: LayoutDashboard, label: t('dashboard.menu.overview'), path: `/dashboard/${role}`, color: "text-blue-400" },
      { icon: LinkIcon, label: t('dashboard.menu.links'), path: `/dashboard/${role}/links`, color: "text-cyan-400" },
      { icon: Activity, label: t('dashboard.menu.reports'), path: `/dashboard/${role}/reports`, color: "text-purple-400" },
      { icon: DollarSign, label: t('dashboard.menu.payouts'), path: `/dashboard/${role}/payouts`, color: "text-yellow-400" },
      { icon: Newspaper, label: "Новости", path: `/dashboard/${role}/news`, color: "text-orange-400" },
      { icon: Globe, label: "Постбеки", path: `/dashboard/${role}/postbacks`, color: "text-pink-400" },
      { icon: Settings, label: t('dashboard.menu.settings'), path: `/dashboard/${role}/settings`, color: "text-muted-foreground" },
    ]
  };

  const currentMenu = menus[role as keyof typeof menus] || menus.publisher;
  const roleColor = role === 'admin' ? 'bg-red-500' : role === 'advertiser' ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <aside className="w-64 bg-card border-r border-border flex-shrink-0 hidden md:flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-border">
        <div className={`w-3 h-3 rounded-sm ${roleColor} mr-3`} />
        <span className="font-mono font-bold text-sm tracking-wider uppercase">{role} PORTAL</span>
      </div>

      <nav className="p-2 space-y-1 flex-1">
        {currentMenu.map((item, i) => (
          <Link key={i} href={item.path}>
            <button className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${i === -1 ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
              {item.label}
            </button>
          </Link>
        ))}
      </nav>

      {/* Manager Card for Advertiser */}
      {role === "advertiser" && (
        <ManagerCard />
      )}

      {/* Advertiser Card for Publisher */}
      {role === "publisher" && selectedAdvertiser && (
        <div className="p-3 mb-16">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-lg p-3 border border-border" data-testid="advertiser-card">
            <div className="flex items-center gap-3 mb-3">
              {selectedAdvertiser.logoUrl ? (
                <img 
                  src={selectedAdvertiser.logoUrl} 
                  alt={selectedAdvertiser.companyName || selectedAdvertiser.username}
                  className="w-10 h-10 rounded-lg bg-muted object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {(selectedAdvertiser.companyName || selectedAdvertiser.username).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {selectedAdvertiser.companyName || selectedAdvertiser.username}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {selectedAdvertiser.offersCount} офферов
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {selectedAdvertiser.telegram && (
                <a 
                  href={`https://t.me/${selectedAdvertiser.telegram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-blue-400 transition-colors"
                  data-testid="advertiser-telegram"
                >
                  <Send className="w-3 h-3" />
                  <span className="truncate">{selectedAdvertiser.telegram}</span>
                </a>
              )}
              {selectedAdvertiser.phone && (
                <a 
                  href={`tel:${selectedAdvertiser.phone}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-emerald-400 transition-colors"
                  data-testid="advertiser-phone"
                >
                  <Phone className="w-3 h-3" />
                  <span className="truncate">{selectedAdvertiser.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full">
            <LogOut className="w-3 h-3" />
            {t('dashboard.menu.logout')}
          </button>
        </Link>
      </div>
    </aside>
  )
}

function MainContent({ role, t }: { role: string, t: any }) {
  const [, setLocation] = useLocation();
  const [matchOffers] = useRoute("/dashboard/:role/offers");
  const [matchCreateOffer] = useRoute("/dashboard/:role/offers/new");
  const [matchLinks] = useRoute("/dashboard/:role/links");
  const [matchOfferDetail, offerDetailParams] = useRoute("/dashboard/:role/offer/:offerId");
  const [matchPartners] = useRoute("/dashboard/:role/partners");
  const [matchUsers] = useRoute("/dashboard/:role/users");
  const [matchReports] = useRoute("/dashboard/:role/reports");
  const [matchRequests] = useRoute("/dashboard/:role/requests");
  const [matchFinance] = useRoute("/dashboard/:role/finance");
  const [matchPayouts] = useRoute("/dashboard/:role/payouts");
  const [matchPostbacks] = useRoute("/dashboard/:role/postbacks");
  const [matchAntifraud] = useRoute("/dashboard/:role/antifraud");
  const [matchSettings] = useRoute("/dashboard/:role/settings");
  const [matchTeam] = useRoute("/dashboard/:role/team");
  const [matchWebhooks] = useRoute("/dashboard/:role/webhooks");
  const [matchNews] = useRoute("/dashboard/:role/news");

  // Check if user needs to setup 2FA
  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery<any>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  // Handle auth error - redirect to login
  useEffect(() => {
    if (userError) {
      setLocation("/login");
    }
  }, [userError, setLocation]);

  // Redirect to 2FA setup if not enabled (for approved users only)
  useEffect(() => {
    if (!userLoading && currentUser && !currentUser.twoFactorEnabled) {
      // For advertisers/admins: redirect to 2FA if status is active
      // For publishers: redirect to 2FA only if they have at least one approved advertiser
      const shouldRedirectTo2FA = 
        currentUser.status === "active" || 
        (currentUser.role === "publisher" && currentUser.hasApprovedAdvertiser);
      
      if (shouldRedirectTo2FA) {
        setLocation("/setup-2fa");
      }
    }
  }, [userLoading, currentUser, setLocation]);

  // Global advertiser context for publisher
  const { advertisers, selectedAdvertiserId, selectedAdvertiser, setSelectedAdvertiserId, isLoading: advertisersLoading } = useAdvertiserContext();

  // Publisher balance for header (using selected advertiser)
  const { data: publisherBalance } = useQuery<any>({
    queryKey: ["/api/publisher/balance", selectedAdvertiserId],
    enabled: role === "publisher" && !!selectedAdvertiserId,
  });

  // Publisher payout requests for approved amount
  const { data: publisherPayoutRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/publisher/payout-requests", selectedAdvertiserId],
    enabled: role === "publisher" && !!selectedAdvertiserId,
  });

  // Calculate approved amount (approved but not yet paid)
  const approvedAmount = publisherPayoutRequests
    .filter((r: any) => r.status === "approved")
    .reduce((sum: number, r: any) => sum + parseFloat(r.approvedAmount || r.requestedAmount || "0"), 0);

  const holdBalance = publisherBalance?.hold || 0;
  const availableBalance = publisherBalance?.available || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400">Активен</span>;
      case "pending":
        return <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-400">Ожидание</span>;
      case "inactive":
      case "rejected":
        return <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/20 text-red-400">Неактивен</span>;
      default:
        return null;
    }
  };

  const showOffers = matchOffers || (role === 'publisher' && matchLinks);
  const showCreateOffer = matchCreateOffer;
  const showOfferDetail = matchOfferDetail;
  const showPartners = matchPartners && role === 'advertiser';
  const showUsers = matchUsers && role === 'admin';
  const showReports = matchReports;
  const showRequests = matchRequests && role === 'advertiser';
  const showFinance = matchFinance && (role === 'advertiser' || role === 'admin');
  const showPayouts = matchPayouts && role === 'publisher';
  const showPostbacks = matchPostbacks;
  const showAntifraud = matchAntifraud && (role === 'admin' || role === 'advertiser');
  const showSettings = matchSettings;
  const showTeam = matchTeam && (role === 'advertiser' || role === 'admin');
  const showWebhooks = matchWebhooks && role === 'advertiser';
  const showNews = matchNews;

  const renderContent = () => {
    if (showSettings) {
      if (role === 'admin') {
        return <AdminSettings />;
      } else if (role === 'advertiser') {
        return <AdvertiserSettings />;
      } else if (role === 'publisher') {
        return <PublisherSettings />;
      }
    }

    if (showTeam) {
      return <AdvertiserTeam />;
    }

    if (showUsers) {
      return <AdminUsers />;
    }

    if (showRequests) {
      return <AccessRequests />;
    }

    if (showFinance) {
      if (role === 'admin') {
        return <AdminFinance />;
      }
      return <AdvertiserFinance />;
    }

    if (showPostbacks) {
      return <PostbackSettings />;
    }

    if (showWebhooks) {
      return <WebhooksSettings />;
    }

    if (showNews) {
      return <NewsFeed />;
    }

    if (showAntifraud) {
      return <AntifraudDashboard role={role} />;
    }

    if (showPayouts) {
      return <PublisherPayouts />;
    }

    if (showReports) {
      return <Reports role={role} />;
    }

    if (showOfferDetail && offerDetailParams?.offerId) {
      return <OfferDetail offerId={offerDetailParams.offerId} role={role} />;
    }

    if (showCreateOffer && role === 'advertiser') {
      return <CreateOfferForm role={role} />;
    }

    if (showPartners) {
      return <AdvertiserPartners />;
    }

    if (showOffers) {
      if (role === 'advertiser') {
        return <AdvertiserOffers role={role} />;
      } else if (role === 'publisher') {
        return <PublisherOffers role={role} />;
      }
    }

    // Default Overview Dashboard - use real data
    if (role === 'admin') {
      return <AdminDashboard />;
    }

    if (role === 'advertiser') {
      return <AdvertiserDashboard />;
    }

    if (role === 'publisher') {
      return <PublisherDashboard />;
    }

    // Fallback - should not reach here as all roles have dedicated dashboards
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
      </div>
    );
  };

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          {role === "publisher" && advertisers.length > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    data-testid="advertiser-switcher"
                  >
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground">
                        {selectedAdvertiser?.username || "Выберите рекламодателя"}
                      </span>
                      {selectedAdvertiser && (
                        <span className="text-[10px] text-muted-foreground">
                          {selectedAdvertiser.offersCount} офферов
                        </span>
                      )}
                    </div>
                    {selectedAdvertiser && getStatusBadge(selectedAdvertiser.status)}
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-card border-border">
                  {advertisers.map((adv) => (
                    <DropdownMenuItem
                      key={adv.id}
                      onClick={() => setSelectedAdvertiserId(adv.id)}
                      className={`flex items-center justify-between cursor-pointer ${
                        selectedAdvertiserId === adv.id ? "bg-white/10" : ""
                      }`}
                      data-testid={`advertiser-option-${adv.id}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{adv.username}</span>
                        <span className="text-[10px] text-muted-foreground">{adv.offersCount} офферов</span>
                      </div>
                      {getStatusBadge(adv.status)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="h-4 w-px bg-border" />
            </>
          )}
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{t('dashboard.menu.overview')}</h2>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('dashboard.liveStream')}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {role === "publisher" && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                <span className="text-xs font-mono text-emerald-400" data-testid="header-available">${availableBalance.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-500/10 border border-blue-500/20">
                <Wallet className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-mono text-blue-400" data-testid="header-approved">${approvedAmount.toFixed(2)}</span>
                <span className="text-[10px] text-blue-400/60">одобр.</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
                <Target className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-mono text-yellow-400" data-testid="header-hold">${holdBalance.toFixed(2)}</span>
                <span className="text-[10px] text-yellow-400/60">холд</span>
              </div>
              <div className="h-4 w-px bg-border" />
            </>
          )}
          <div className="text-xs font-mono text-muted-foreground">{t('dashboard.server')}: US-EAST-1</div>
          <NotificationBell />
          <ThemeToggle />
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-bold uppercase">
            {role.charAt(0)}
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </main>
  );
}

function StatBox({ label, value, trend, color }: any) {
  return (
    <div className="bg-card border border-border p-4 rounded hover:border-border/80 transition-colors">
      <div className="text-xs text-muted-foreground font-mono uppercase mb-1">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-foreground font-mono">{value}</div>
        <div className={`text-xs font-bold ${color} bg-muted px-1.5 py-0.5 rounded`}>{trend}</div>
      </div>
    </div>
  )
}
