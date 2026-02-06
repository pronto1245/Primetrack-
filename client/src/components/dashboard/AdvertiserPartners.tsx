import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Users, Search, Link as LinkIcon, Copy, Check, UserPlus, 
  Ban, Play, Pause, Clock, Loader2, Filter, Send, Mail, Phone, Eye, UsersRound
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useStaff } from "@/contexts/StaffContext";

interface Partner {
  id: string;
  publisherId: string;
  shortId?: number | null;
  username: string;
  email: string;
  telegram?: string | null;
  phone?: string | null;
  companyName?: string | null;
  status: string;
  createdAt: string;
  clicks: number;
  conversions: number;
  payout: number;
}

interface TeamPartner {
  relationId: string;
  publisherId: string;
  shortId: number | null;
  username: string;
  email: string;
  telegram: string | null;
  companyName: string | null;
  status: string;
  createdAt: string;
  activityDays: number | null;
  trafficSource: string | null;
  topGeo: string;
  totalClicks: number;
  networkRevenue: number;
  amPercent: number;
  amCommission: number;
  bonus: number;
  notes: string | null;
  managerStaffId: string | null;
  managerName: string | null;
}

export function AdvertiserPartners() {
  const queryClient = useQueryClient();
  const { isStaff } = useStaff();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("partners");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const { data: partners = [], isLoading } = useQuery<Partner[]>({
    queryKey: ["advertiser-partners", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/advertiser/partners"
        : `/api/advertiser/partners?status=${statusFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch partners");
      return res.json();
    },
  });

  const { data: teamPartners = [], isLoading: teamLoading } = useQuery<TeamPartner[]>({
    queryKey: ["advertiser-partners-team", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.set("startDate", dateRange.startDate);
      if (dateRange.endDate) params.set("endDate", dateRange.endDate);
      const qs = params.toString();
      const res = await fetch(`/api/advertiser/partners/team-view${qs ? `?${qs}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch team view");
      return res.json();
    },
    enabled: activeTab === "team",
  });

  const { data: linkData } = useQuery({
    queryKey: ["advertiser-registration-link"],
    queryFn: async () => {
      const res = await fetch("/api/advertiser/registration-link", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get link");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/advertiser/partners/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-partners"] });
    },
  });

  const updateTeamFieldsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { trafficSource?: string; amPercent?: string; bonus?: string } }) => {
      const res = await apiRequest("PUT", `/api/advertiser/partners/${id}/team-fields`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-partners-team"] });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/advertiser/partners/${id}/notes`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-partners-team"] });
    },
  });

  const copyLink = () => {
    if (linkData?.registrationLink) {
      navigator.clipboard.writeText(linkData.registrationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredPartners = partners.filter(p => {
    const q = search.toLowerCase();
    return p.username.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.shortId != null && String(p.shortId).padStart(3, '0').includes(q));
  });

  const filteredTeamPartners = teamPartners.filter(p => {
    const q = search.toLowerCase();
    return p.username.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.shortId != null && String(p.shortId).padStart(3, '0').includes(q));
  });

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pending: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" />, label: "Новый" },
      active: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <Play className="w-3 h-3" />, label: "Активен" },
      paused: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Pause className="w-3 h-3" />, label: "Пауза" },
      blocked: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <Ban className="w-3 h-3" />, label: "Блок" },
    };
    const { color, icon, label } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={`${color} flex items-center gap-1`}>
        {icon}
        {label}
      </Badge>
    );
  };

  const pendingCount = partners.filter(p => p.status === "pending").length;
  const canEdit = !isStaff;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-6 h-6" />
            Партнёры
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} ожидают
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Управление партнёрами и их доступом</p>
        </div>

        <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-get-link" className="bg-emerald-600 hover:bg-emerald-700">
              <LinkIcon className="w-4 h-4 mr-2" />
              Получить ссылку
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Ссылка для регистрации партнёров</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Поделитесь этой ссылкой с партнёрами. После регистрации они появятся в списке со статусом "pending".
              </p>
              <div className="flex gap-2">
                <Input 
                  data-testid="input-registration-link"
                  value={linkData?.registrationLink || ""} 
                  readOnly 
                  className="bg-input border-border text-foreground font-mono text-sm"
                />
                <Button 
                  data-testid="button-copy-link"
                  variant="outline" 
                  onClick={copyLink}
                  className="border-border"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Реферальный код: <code className="text-emerald-400">{linkData?.referralCode}</code>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="partners" data-testid="tab-partners" className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Users className="w-4 h-4" />
            Партнёры
          </TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team" className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <UsersRound className="w-4 h-4" />
            Отчёт по вебам
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search-partners"
                    placeholder="Поиск по имени или email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter" className="w-40 bg-input border-border">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="pending">Ожидают</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="paused">На паузе</SelectItem>
                    <SelectItem value="blocked">Заблокированы</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPartners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Партнёры не найдены</p>
                  <p className="text-sm mt-1">Поделитесь ссылкой для регистрации</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Партнёр</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Контакты</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Статус</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Клики</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Конверсии</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Выплаты</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPartners.map((partner) => (
                        <tr key={partner.id} data-testid={`row-partner-${partner.id}`} className="hover:bg-muted">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-foreground font-medium flex items-center gap-1.5">
                                {partner.companyName || partner.username}
                                {partner.shortId != null && (
                                  <Badge className="text-[10px] px-1.5 py-0 font-mono bg-blue-500/15 text-blue-400 border-blue-500/30" data-testid={`badge-partner-id-${partner.id}`}>
                                    ID:{String(partner.shortId).padStart(3, '0')}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground text-xs">@{partner.username}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <TooltipProvider>
                              <div className="flex items-center gap-1">
                                {partner.telegram && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={`https://t.me/${partner.telegram.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                                        data-testid={`contact-telegram-${partner.id}`}
                                      >
                                        <Send className="w-3 h-3" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>{partner.telegram}</TooltipContent>
                                  </Tooltip>
                                )}
                                {partner.email && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={`mailto:${partner.email}`}
                                        className="p-1.5 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400"
                                        data-testid={`contact-email-${partner.id}`}
                                      >
                                        <Mail className="w-3 h-3" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>{partner.email}</TooltipContent>
                                  </Tooltip>
                                )}
                                {partner.phone && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={`tel:${partner.phone}`}
                                        className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                        data-testid={`contact-phone-${partner.id}`}
                                      >
                                        <Phone className="w-3 h-3" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>{partner.phone}</TooltipContent>
                                  </Tooltip>
                                )}
                                {!partner.telegram && !partner.email && !partner.phone && (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </TooltipProvider>
                          </td>
                          <td className="px-4 py-3">{statusBadge(partner.status)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground font-mono">{partner.clicks.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground font-mono">{partner.conversions.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-mono">{formatCurrency(partner.payout)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/dashboard/advertiser/partner/${partner.publisherId}`}>
                                <Button
                                  data-testid={`button-profile-${partner.id}`}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Профиль
                                </Button>
                              </Link>
                              {partner.status === "pending" && (
                                <Button
                                  data-testid={`button-approve-${partner.id}`}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                                  onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "active" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Одобрить
                                </Button>
                              )}
                              {partner.status === "active" && (
                                <>
                                  <Button
                                    data-testid={`button-pause-${partner.id}`}
                                    size="sm"
                                    variant="outline"
                                    className="border-border h-7 text-xs"
                                    onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "paused" })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <Pause className="w-3 h-3 mr-1" />
                                    Пауза
                                  </Button>
                                  <Button
                                    data-testid={`button-block-${partner.id}`}
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs"
                                    onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "blocked" })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <Ban className="w-3 h-3 mr-1" />
                                    Блок
                                  </Button>
                                </>
                              )}
                              {partner.status === "paused" && (
                                <Button
                                  data-testid={`button-activate-${partner.id}`}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                                  onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "active" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Активировать
                                </Button>
                              )}
                              {partner.status === "blocked" && (
                                <Button
                                  data-testid={`button-unblock-${partner.id}`}
                                  size="sm"
                                  variant="outline"
                                  className="border-border h-7 text-xs"
                                  onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "active" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Разблокировать
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search-team"
                    placeholder="Поиск по имени, email или ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    data-testid="input-start-date"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-[140px] bg-input border-border text-foreground text-xs"
                  />
                  <span className="text-muted-foreground text-xs">—</span>
                  <Input
                    data-testid="input-end-date"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-[140px] bg-input border-border text-foreground text-xs"
                  />
                  {(dateRange.startDate || dateRange.endDate) && (
                    <Button
                      data-testid="button-clear-dates"
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={() => setDateRange({ startDate: "", endDate: "" })}
                    >
                      Сбросить
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {teamLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTeamPartners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UsersRound className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет данных для командного вида</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 sticky left-0 bg-muted z-10 min-w-[60px]">ID</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 sticky left-[60px] bg-muted z-10 min-w-[130px]">Имя / Ник</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[160px]">Email / Telegram</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[90px]">Статус</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[100px]">Подключение</th>
                        <th className="text-right text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[80px]">Акт. (дн)</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[100px]">AM</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[120px]">Источник</th>
                        <th className="text-center text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[50px]">GEO</th>
                        <th className="text-right text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[80px]">Трафик</th>
                        <th className="text-right text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[100px]">Маржа ($)</th>
                        <th className="text-right text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[70px]">% AM</th>
                        <th className="text-right text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[100px]">Комиссия AM</th>
                        <th className="text-right text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[80px]">Бонус ($)</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase px-3 py-2 min-w-[150px]">Заметки</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredTeamPartners.map((p) => (
                        <TeamRow
                          key={p.relationId}
                          partner={p}
                          canEdit={canEdit}
                          onUpdateFields={(data) => updateTeamFieldsMutation.mutate({ id: p.relationId, data })}
                          onUpdateNotes={(notes) => updateNotesMutation.mutate({ id: p.relationId, notes })}
                          statusBadge={statusBadge}
                        />
                      ))}
                    </tbody>
                    {filteredTeamPartners.length > 0 && (
                      <tfoot className="bg-muted/50 border-t-2 border-border">
                        <tr>
                          <td className="px-3 py-2 sticky left-0 bg-muted/50 z-10 text-xs font-bold text-foreground" colSpan={2}>ИТОГО</td>
                          <td className="px-3 py-2" colSpan={4}></td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-right font-mono text-xs font-bold text-muted-foreground">
                            {filteredTeamPartners.reduce((s, p) => s + p.totalClicks, 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs font-bold text-emerald-400">
                            {formatCurrency(filteredTeamPartners.reduce((s, p) => s + p.networkRevenue, 0))}
                          </td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-right font-mono text-xs font-bold text-purple-400">
                            {formatCurrency(filteredTeamPartners.reduce((s, p) => s + p.amCommission, 0))}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs font-bold text-muted-foreground">
                            {formatCurrency(filteredTeamPartners.reduce((s, p) => s + p.bonus, 0))}
                          </td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamRow({ partner: p, canEdit, onUpdateFields, onUpdateNotes, statusBadge }: {
  partner: TeamPartner;
  canEdit: boolean;
  onUpdateFields: (data: { trafficSource?: string; amPercent?: string; bonus?: string }) => void;
  onUpdateNotes: (notes: string) => void;
  statusBadge: (status: string) => React.ReactNode;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (!editingField) return;
    if (editingField === "notes") {
      onUpdateNotes(editValue);
    } else {
      onUpdateFields({ [editingField]: editValue });
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditingField(null);
  };

  const editableCell = (field: string, value: string, isNotesField = false) => {
    const canEditThisField = isNotesField ? true : canEdit;
    if (editingField === field) {
      return (
        <Input
          data-testid={`input-edit-${field}-${p.relationId}`}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="h-7 text-xs bg-input border-border px-2"
        />
      );
    }
    return (
      <span
        data-testid={`cell-${field}-${p.relationId}`}
        className={`${canEditThisField ? 'cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded border border-transparent hover:border-border' : ''} text-xs`}
        onClick={() => canEditThisField && startEdit(field, value)}
      >
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    );
  };

  const date = new Date(p.createdAt);
  const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

  return (
    <tr data-testid={`team-row-${p.relationId}`} className="hover:bg-muted/50">
      <td className="px-3 py-2 sticky left-0 bg-card z-10">
        <span className="font-mono text-xs text-blue-400">
          {p.shortId != null ? String(p.shortId).padStart(3, '0') : '—'}
        </span>
      </td>
      <td className="px-3 py-2 sticky left-[60px] bg-card z-10">
        <div className="text-foreground text-xs font-medium truncate max-w-[120px]">
          {p.companyName || p.username}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="text-xs space-y-0.5">
          <div className="text-muted-foreground truncate">{p.email}</div>
          {p.telegram && <div className="text-blue-400 truncate">{p.telegram}</div>}
        </div>
      </td>
      <td className="px-3 py-2">{statusBadge(p.status)}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{formattedDate}</td>
      <td className="px-3 py-2 text-right">
        {p.activityDays !== null ? (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${
            p.activityDays <= 3 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
            p.activityDays <= 14 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
            'bg-red-500/15 text-red-400 border-red-500/30'
          }`}>
            {p.activityDays}д
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-muted-foreground">{p.managerName || '—'}</span>
      </td>
      <td className="px-3 py-2">{editableCell("trafficSource", p.trafficSource || "")}</td>
      <td className="px-3 py-2 text-center">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
          {p.topGeo}
        </Badge>
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{p.totalClicks.toLocaleString()}</td>
      <td className="px-3 py-2 text-right font-mono text-xs text-emerald-400">{formatCurrency(p.networkRevenue)}</td>
      <td className="px-3 py-2 text-right">{editableCell("amPercent", String(p.amPercent))}</td>
      <td className="px-3 py-2 text-right font-mono text-xs text-purple-400">{formatCurrency(p.amCommission)}</td>
      <td className="px-3 py-2 text-right">{editableCell("bonus", String(p.bonus))}</td>
      <td className="px-3 py-2">{editableCell("notes", p.notes || "", true)}</td>
    </tr>
  );
}
