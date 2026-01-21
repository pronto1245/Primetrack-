import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Filter, RefreshCw, Download, ChevronLeft, ChevronRight, 
  MousePointer, Target, DollarSign, TrendingUp, Loader2,
  Calendar, Copy
} from "lucide-react";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";
import { COUNTRIES } from "@/lib/countries";
import { ExportMenu } from "@/components/ui/export-menu";

const getCountryFlag = (code: string): string => {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

interface ReportsProps {
  role: string;
}

export function Reports({ role }: ReportsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("clicks");
  const [filters, setFilters] = useState({
    freeSearch: "",
    dateFrom: "",
    dateTo: "",
    offerId: "",
    publisherId: "",
    geo: "",
    device: "",
    groupBy: "date",
    dateMode: "click" as "click" | "conversion" // "click" = по дате клика, "conversion" = по дате конверсии
  });
  const [page, setPage] = useState(1);
  
  // Use global advertiser context for publisher filtering
  const { selectedAdvertiserId } = useAdvertiserContext();

  const queryParams = new URLSearchParams();
  if (filters.freeSearch) queryParams.set("search", filters.freeSearch);
  if (filters.dateFrom) queryParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) queryParams.set("dateTo", filters.dateTo);
  if (filters.offerId) queryParams.set("offerId", filters.offerId);
  if (filters.publisherId && role !== "publisher") queryParams.set("publisherId", filters.publisherId);
  if (filters.geo) queryParams.set("geo", filters.geo);
  if (filters.device) queryParams.set("device", filters.device);
  queryParams.set("dateMode", filters.dateMode); // "click" or "conversion"
  // Add advertiser filter for publisher role
  if (role === "publisher" && selectedAdvertiserId) {
    queryParams.set("advertiserId", selectedAdvertiserId);
  }
  queryParams.set("page", String(page));
  queryParams.set("limit", "50");

  const { data: clicksData, isLoading: clicksLoading, refetch: refetchClicks } = useQuery({
    queryKey: ["/api/reports/clicks", filters, page, selectedAdvertiserId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/clicks?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clicks");
      return res.json();
    },
    enabled: activeTab === "clicks"
  });

  const { data: conversionsData, isLoading: conversionsLoading, refetch: refetchConversions } = useQuery({
    queryKey: ["/api/reports/conversions", filters, page, selectedAdvertiserId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/conversions?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversions");
      return res.json();
    },
    enabled: activeTab === "conversions"
  });

  const groupedParams = new URLSearchParams(queryParams);
  groupedParams.set("groupBy", filters.groupBy);
  
  const { data: groupedData, isLoading: groupedLoading, refetch: refetchGrouped } = useQuery({
    queryKey: ["/api/reports/grouped", filters, selectedAdvertiserId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/grouped?${groupedParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch grouped data");
      return res.json();
    }
  });

  // Fetch publishers list for filter (advertiser/admin only)
  const { data: publishers = [] } = useQuery<{ id: string; username: string; email: string }[]>({
    queryKey: ["/api/advertiser/publishers", role],
    queryFn: async () => {
      const endpoint = role === "admin" ? "/api/admin/publishers" : "/api/advertiser/publishers";
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: role === "advertiser" || role === "admin"
  });

  const handleRefresh = async () => {
    if (activeTab === "clicks") {
      await refetchClicks();
    } else if (activeTab === "conversions") {
      await refetchConversions();
    } else {
      await refetchGrouped();
    }
  };

  const isAdvertiser = role === "advertiser";
  const isAdmin = role === "admin";
  const showFinancials = isAdvertiser || isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('dashboard.menu.reports') || 'Reports'}</h1>
        <div className="flex gap-2">
          <ExportMenu 
            dataset={activeTab === "clicks" ? "reports-clicks" : "reports-conversions"}
            getFilters={() => ({
              search: filters.freeSearch,
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
              dateMode: filters.dateMode,
              offerId: filters.offerId,
              publisherId: filters.publisherId,
              geo: filters.geo,
              device: filters.device,
              groupBy: filters.groupBy,
              advertiserId: role === "publisher" ? selectedAdvertiserId : undefined,
            })}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="border-border bg-transparent text-foreground hover:bg-muted"
            data-testid="button-refresh-reports"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t('reports.filters') || 'Filters'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t('reports.freeSearch') || 'Free Search'}</Label>
              <Input
                type="text"
                data-testid="input-free-search"
                placeholder={t('reports.freeSearchPlaceholder') || 'Search...'}
                value={filters.freeSearch}
                onChange={(e) => setFilters(f => ({ ...f, freeSearch: e.target.value }))}
                className="mt-1 bg-input border-border text-foreground font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('reports.dateFrom') || 'Date From'}</Label>
              <Input
                type="date"
                data-testid="input-date-from"
                value={filters.dateFrom}
                onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="mt-1 bg-input border-border text-foreground font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('reports.dateTo') || 'Date To'}</Label>
              <Input
                type="date"
                data-testid="input-date-to"
                value={filters.dateTo}
                onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="mt-1 bg-input border-border text-foreground font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Режим даты</Label>
              <Select value={filters.dateMode} onValueChange={(v) => setFilters(f => ({ ...f, dateMode: v as "click" | "conversion" }))}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground" data-testid="select-date-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-input border-border">
                  <SelectItem value="click">По дате клика</SelectItem>
                  <SelectItem value="conversion">По дате конверсии</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('reports.geo') || 'GEO'}</Label>
              <Select value={filters.geo || "all"} onValueChange={(v) => setFilters(f => ({ ...f, geo: v === "all" ? "" : v }))}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground" data-testid="select-geo">
                  <SelectValue placeholder={t('reports.all') || 'All'} />
                </SelectTrigger>
                <SelectContent className="bg-input border-border max-h-[300px]">
                  <SelectItem value="all">🌍 Все страны</SelectItem>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {getCountryFlag(country.code)} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('reports.device') || 'Device'}</Label>
              <Select value={filters.device || "all"} onValueChange={(v) => setFilters(f => ({ ...f, device: v === "all" ? "" : v }))}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground" data-testid="select-device">
                  <SelectValue placeholder={t('reports.all') || 'All'} />
                </SelectTrigger>
                <SelectContent className="bg-input border-border">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role !== "publisher" && (
              <div>
                <Label className="text-xs text-muted-foreground">Вебмастер</Label>
                <Select value={filters.publisherId || "all"} onValueChange={(v) => setFilters(f => ({ ...f, publisherId: v === "all" ? "" : v }))}>
                  <SelectTrigger className="mt-1 bg-input border-border text-foreground" data-testid="select-publisher">
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent className="bg-input border-border">
                    <SelectItem value="all">Все вебмастера</SelectItem>
                    {publishers.map((pub) => (
                      <SelectItem key={pub.id} value={pub.id}>{pub.username || pub.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">{t('reports.groupBy') || 'Group By'}</Label>
              <Select value={filters.groupBy} onValueChange={(v) => setFilters(f => ({ ...f, groupBy: v }))}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground" data-testid="select-group-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-input border-border">
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="geo">GEO</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  {role !== "publisher" && <SelectItem value="publisher">Publisher</SelectItem>}
                  <SelectItem value="device">Device</SelectItem>
                  <SelectItem value="os">OS</SelectItem>
                  <SelectItem value="browser">Browser</SelectItem>
                  <SelectItem value="sub1">Sub1</SelectItem>
                  <SelectItem value="sub2">Sub2</SelectItem>
                  <SelectItem value="sub3">Sub3</SelectItem>
                  <SelectItem value="sub4">Sub4</SelectItem>
                  <SelectItem value="sub5">Sub5</SelectItem>
                  <SelectItem value="sub6">Sub6</SelectItem>
                  <SelectItem value="sub7">Sub7</SelectItem>
                  <SelectItem value="sub8">Sub8</SelectItem>
                  <SelectItem value="sub9">Sub9</SelectItem>
                  <SelectItem value="sub10">Sub10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline"
              onClick={() => { setFilters({ freeSearch: "", dateFrom: "", dateTo: "", offerId: "", publisherId: "", geo: "", device: "", groupBy: "date", dateMode: "click" }); setPage(1); }}
              className="border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
              data-testid="button-clear-filters"
            >
              {t('reports.clearFilters') || 'Clear'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border border-border gap-2 p-1">
          <TabsTrigger value="clicks" className="px-4 py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white" data-testid="tab-clicks">
            <MousePointer className="w-4 h-4 mr-2 text-blue-400" />
            {t('reports.clicks') || 'Клики'}
          </TabsTrigger>
          <TabsTrigger value="conversions" className="px-4 py-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white" data-testid="tab-conversions">
            <Target className="w-4 h-4 mr-2 text-emerald-400" />
            {t('reports.conversions') || 'Конверсии'}
          </TabsTrigger>
          <TabsTrigger value="grouped" className="px-4 py-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white" data-testid="tab-grouped">
            <TrendingUp className="w-4 h-4 mr-2 text-purple-400" />
            {t('reports.grouped') || 'Сводка'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clicks" className="mt-0 space-y-4">
          <SummaryCards data={clicksData} loading={clicksLoading} role={role} t={t} useClicksSummary={true} />
          <ClicksTable 
            data={clicksData} 
            loading={clicksLoading} 
            page={page} 
            setPage={setPage}
            role={role}
            groupedData={groupedData}
            t={t}
          />
        </TabsContent>

        <TabsContent value="conversions" className="mt-0 space-y-4">
          <SummaryCards data={groupedData} loading={groupedLoading} role={role} t={t} useClicksSummary={true} />
          <ConversionsTable 
            data={conversionsData} 
            loading={conversionsLoading} 
            page={page} 
            setPage={setPage}
            role={role}
            showFinancials={showFinancials}
            t={t}
          />
        </TabsContent>

        <TabsContent value="grouped" className="mt-0">
          <GroupedTable 
            data={groupedData} 
            loading={groupedLoading}
            role={role}
            showFinancials={showFinancials}
            t={t}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCards({ data, loading, role, t, useClicksSummary = false }: any) {
  const isAdvertiser = role === "advertiser";
  const isPublisher = role === "publisher";
  
  // Use summary from clicksData if available, otherwise calculate from rows
  let totals: any;
  let margin: number;
  let roi: number;
  let cr: number;
  let ar: number;
  let epc: number;
  
  if (useClicksSummary && data?.summary) {
    // Use pre-calculated summary from /api/reports/clicks
    totals = {
      clicks: data.summary.clicks || 0,
      uniqueClicks: data.summary.uniqueClicks || 0,
      conversions: data.summary.conversions || 0,
      approvedConversions: data.summary.approvedConversions || 0,
      leads: data.summary.leads || 0,
      sales: data.summary.sales || 0,
      payout: data.summary.payout || 0,
      cost: data.summary.advertiserCost || 0,
    };
    margin = data.summary.margin || 0;
    roi = data.summary.roi || 0;
    cr = data.summary.cr || 0;
    ar = data.summary.ar || (totals.conversions > 0 ? (totals.approvedConversions / totals.conversions) * 100 : 0);
    epc = data.summary.epc || (totals.clicks > 0 ? totals.payout / totals.clicks : 0);
  } else {
    // Calculate from rows (grouped data) - groupedData uses 'data' not 'rows'
    const rows = data?.data || data?.rows || [];
    const calculated = rows.reduce((acc: any, row: any) => ({
      clicks: acc.clicks + (row.clicks || 0),
      uniqueClicks: acc.uniqueClicks + (row.uniqueClicks || 0),
      conversions: acc.conversions + (row.conversions || 0),
      approvedConversions: acc.approvedConversions + (row.approvedConversions || 0),
      leads: acc.leads + (row.leads || 0),
      sales: acc.sales + (row.sales || 0),
      payout: acc.payout + (row.payout || 0),
      cost: acc.cost + (row.cost || 0),
      epcEarnings: acc.epcEarnings + ((row.epc || 0) * (row.clicks || 0)), // Sum EPC earnings for correct EPC
    }), { clicks: 0, uniqueClicks: 0, conversions: 0, approvedConversions: 0, leads: 0, sales: 0, payout: 0, cost: 0, epcEarnings: 0 });
    totals = calculated;
    
    margin = totals.cost - totals.payout;
    roi = totals.cost > 0 ? ((margin / totals.cost) * 100) : 0;
    cr = totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100) : 0;
    ar = totals.conversions > 0 ? ((totals.approvedConversions / totals.conversions) * 100) : 0;
    epc = totals.clicks > 0 ? (totals.epcEarnings / totals.clicks) : 0; // Use EPC earnings, not payout
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardContent className="p-3 h-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <Card className="bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50 transition-colors">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase text-blue-400 mb-1">{t('stats.clicks') || 'Clicks'}</div>
          <div className="text-xl font-bold text-blue-400">{totals.clicks.toLocaleString()}</div>
          <div className="text-[10px] text-blue-400/70">{totals.uniqueClicks.toLocaleString()} unique</div>
          <div className="text-[12px] text-yellow-400" data-testid="text-epc">EPC: ${epc.toFixed(2)}</div>
        </CardContent>
      </Card>
      <Card className="bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 transition-colors">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase text-emerald-400 mb-1">{t('stats.conversions') || 'Conv'}</div>
          <div className="text-xl font-bold text-emerald-400">{totals.conversions}</div>
          <div className="text-[12px] text-yellow-400" data-testid="text-cr">CR: {cr.toFixed(2)}%</div>
        </CardContent>
      </Card>
      <Card className="bg-green-500/5 border-green-500/30 hover:border-green-500/50 transition-colors">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase text-green-400 mb-1">{t('stats.publisherPayout') || 'Payout'}</div>
          <div className="text-xl font-bold text-green-400">${totals.payout.toFixed(2)}</div>
          <div className="text-[12px] text-yellow-400" data-testid="text-ar">AR: {ar.toFixed(2)}%</div>
        </CardContent>
      </Card>
      <Card className="bg-purple-500/5 border-purple-500/30 hover:border-purple-500/50 transition-colors">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase text-purple-400 mb-1">{t('stats.leads') || 'Leads'}</div>
          <div className="text-xl font-bold text-purple-400">{totals.leads}</div>
          <div className="text-[12px] text-yellow-400" data-testid="text-instreg">
            Инстрег: {totals.uniqueClicks > 0 ? ((totals.leads / totals.uniqueClicks) * 100).toFixed(1) : 0}%
          </div>
        </CardContent>
      </Card>
      <Card className="bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50 transition-colors">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase text-orange-400 mb-1">{t('stats.sales') || 'Sales'}</div>
          <div className="text-xl font-bold text-orange-400">{totals.sales}</div>
          <div className="text-[12px] text-yellow-400" data-testid="text-reg2dep">
            Рег2деп: {totals.leads > 0 ? ((totals.sales / totals.leads) * 100).toFixed(1) : 0}%
          </div>
        </CardContent>
      </Card>
      {(isAdvertiser || role === "admin") && (
        <>
          <Card className="bg-red-500/5 border-red-500/30 hover:border-red-500/50 transition-colors">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-red-400 mb-1">{t('stats.advertiserCost') || 'Cost'}</div>
              <div className="text-xl font-bold text-red-400">${totals.cost.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className={`${margin >= 0 ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50' : 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'} transition-colors`}>
            <CardContent className="p-4">
              <div className={`text-[10px] uppercase mb-1 ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t('stats.margin') || 'Margin'}</div>
              <div className={`text-xl font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${margin.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className={`${roi >= 0 ? 'bg-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/50' : 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'} transition-colors`}>
            <CardContent className="p-4">
              <div className={`text-[10px] uppercase mb-1 ${roi >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{t('stats.roi') || 'ROI'}</div>
              <div className={`text-xl font-bold ${roi >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                {roi.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ClicksTable({ data, loading, page, setPage, role, groupedData, t }: any) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clicks = data?.clicks || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);
  
  const isAdvertiser = role === "advertiser" || role === "admin";
  const isPublisher = role === "publisher";
  
  // Use summary from clicksData if available
  const summary = data?.summary;
  const totals = summary ? {
    clicks: summary.clicks || 0,
    uniqueClicks: summary.uniqueClicks || 0,
    conversions: summary.conversions || 0,
    approvedConversions: summary.approvedConversions || 0,
    leads: summary.leads || 0,
    sales: summary.sales || 0,
    payout: summary.payout || 0,
    cost: summary.advertiserCost || 0,
  } : { clicks: 0, uniqueClicks: 0, conversions: 0, approvedConversions: 0, leads: 0, sales: 0, payout: 0, cost: 0 };
  
  const cr = summary?.cr || (totals.clicks > 0 ? (totals.conversions / totals.clicks * 100) : 0);
  const ar = summary?.ar || (totals.conversions > 0 ? (totals.approvedConversions / totals.conversions * 100) : 0);
  const epc = summary?.epc || (totals.clicks > 0 ? (totals.payout / totals.clicks) : 0);
  const margin = summary?.margin || (totals.cost - totals.payout);
  const roi = summary?.roi || (totals.payout > 0 ? ((totals.cost - totals.payout) / totals.payout * 100) : 0);

  const colSpan = isAdvertiser ? 23 : 20;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <div className="max-h-[1100px] overflow-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">{t('reports.table.date') || 'Date'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.clickId') || 'Click ID'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.offer') || 'Offer'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.publisher') || 'Publisher'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.geo') || 'GEO'}</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">OS</th>
                <th className="px-4 py-3 font-medium">Browser</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.clicks') || 'Clicks'}</th>
                <th className="px-4 py-3 font-medium text-center">{t('reports.table.unique') || 'Unique'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.leads') || 'Leads'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.sales') || 'Sales'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.conv') || 'Conv'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.payout') || 'Payout'}</th>
                <th className="px-4 py-3 font-medium text-right">CR%</th>
                <th className="px-4 py-3 font-medium text-right">AR%</th>
                <th className="px-4 py-3 font-medium text-right">EPC</th>
                {isAdvertiser && (
                  <>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.table.cost') || 'Cost'}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.table.margin') || 'Margin'}</th>
                    <th className="px-4 py-3 font-medium text-right">ROI%</th>
                  </>
                )}
                <th className="px-4 py-3 font-medium">Sub1</th>
                <th className="px-4 py-3 font-medium">Sub2</th>
                <th className="px-4 py-3 font-medium">Sub3</th>
                <th className="px-4 py-3 font-medium">Sub4</th>
                <th className="px-4 py-3 font-medium">Sub5</th>
                <th className="px-4 py-3 font-medium">Sub6</th>
                <th className="px-4 py-3 font-medium">Sub7</th>
                <th className="px-4 py-3 font-medium">Sub8</th>
                <th className="px-4 py-3 font-medium">Sub9</th>
                <th className="px-4 py-3 font-medium">Sub10</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {clicks.length === 0 ? (
                <tr>
                  <td colSpan={colSpan + 5} className="px-4 py-8 text-center text-muted-foreground">
                    {t('reports.noData') || 'No data found'}
                  </td>
                </tr>
              ) : (
                clicks.map((click: any) => (
                  <tr key={click.id} className="hover:bg-muted transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(click.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (click.clickId) {
                            navigator.clipboard.writeText(click.clickId);
                            toast.success("Click ID скопирован");
                          }
                        }}
                        className="text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 group"
                        title={click.clickId}
                      >
                        {click.clickId?.slice(0, 12)}...
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-foreground">{click.offerName || click.offerId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.publisherName || click.publisherId || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px]">
                        {click.geo || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">
                      {click.ip || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px]">
                        {click.device || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">
                      {click.os || '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">
                      {click.browser || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{click.clicks || 0}</td>
                    <td className="px-4 py-3 text-center">
                      {click.isUnique ? (
                        <span className="text-emerald-500">✓</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-400">{click.leads || 0}</td>
                    <td className="px-4 py-3 text-right text-orange-400">{click.sales || 0}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold">{click.conversions || 0}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {click.payout !== undefined ? `$${click.payout.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-cyan-400">
                      {click.cr !== undefined ? `${click.cr.toFixed(0)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-pink-400">
                      {click.ar !== undefined ? `${click.ar.toFixed(0)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-teal-400">
                      {click.epc !== undefined ? `$${click.epc.toFixed(2)}` : '-'}
                    </td>
                    {isAdvertiser && (
                      <>
                        <td className="px-4 py-3 text-right text-red-400">
                          {click.advertiserCost !== undefined ? `$${click.advertiserCost.toFixed(2)}` : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right ${(click.margin || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {click.margin !== undefined ? `$${click.margin.toFixed(2)}` : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right ${(click.roi || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {click.roi !== undefined ? `${click.roi.toFixed(1)}%` : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-muted-foreground">{click.sub1 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub2 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub3 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub4 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub5 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub6 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub7 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub8 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub9 || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{click.sub10 || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="border-t border-white/20 bg-white/[0.05] font-semibold">
                <td colSpan={9} className="px-4 py-3 text-muted-foreground uppercase text-[10px]">
                  {t('reports.total') || 'Total'}
                </td>
                <td className="px-4 py-3 text-right text-foreground">{totals.clicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{totals.uniqueClicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-purple-400">{totals.leads}</td>
                <td className="px-4 py-3 text-right text-orange-400">{totals.sales}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-bold">{totals.conversions}</td>
                <td className="px-4 py-3 text-right text-emerald-400">${totals.payout.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-cyan-400">{cr.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right text-pink-400">{ar.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right text-teal-400">${epc.toFixed(2)}</td>
                {isAdvertiser && (
                  <>
                    <td className="px-4 py-3 text-right text-red-400">${totals.cost.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${margin.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {roi.toFixed(1)}%
                    </td>
                  </>
                )}
                <td colSpan={10} className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {t('reports.showing') || 'Showing'} {((page - 1) * 50) + 1}-{Math.min(page * 50, total)} {t('reports.of') || 'of'} {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-border bg-transparent"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3 py-1">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-border bg-transparent"
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConversionsTable({ data, loading, page, setPage, role, showFinancials, t }: any) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const conversions = data?.conversions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  const isAdvertiser = role === "advertiser" || role === "admin";

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <div className="max-h-[1100px] overflow-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">{t('reports.table.date') || 'Date'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.type') || 'Type'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.status') || 'Status'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.offer') || 'Offer'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.publisher') || 'Publisher'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.payout') || 'Payout'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.cost') || 'Cost'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.margin') || 'Margin'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.roi') || 'ROI'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.clickId') || 'Click ID'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.geo') || 'GEO'}</th>
                <th className="px-4 py-3 font-medium">Sub1</th>
                <th className="px-4 py-3 font-medium">Sub2</th>
                <th className="px-4 py-3 font-medium">Sub3</th>
                <th className="px-4 py-3 font-medium">Sub4</th>
                <th className="px-4 py-3 font-medium">Sub5</th>
                <th className="px-4 py-3 font-medium">Sub6</th>
                <th className="px-4 py-3 font-medium">Sub7</th>
                <th className="px-4 py-3 font-medium">Sub8</th>
                <th className="px-4 py-3 font-medium">Sub9</th>
                <th className="px-4 py-3 font-medium">Sub10</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {conversions.length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-4 py-8 text-center text-muted-foreground">
                    {t('reports.noData') || 'No data found'}
                  </td>
                </tr>
              ) : (
                conversions.map((conv: any) => {
                  const payout = parseFloat(conv.publisherPayout) || 0;
                  const cost = parseFloat(conv.advertiserCost) || 0;
                  const margin = cost - payout;
                  const roi = cost > 0 ? ((margin / cost) * 100) : 0;
                  
                  return (
                    <tr key={conv.id} className="hover:bg-muted transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(conv.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          conv.conversionType === 'sale' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {conv.conversionType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          conv.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          conv.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          conv.status === 'hold' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-muted-foreground'
                        }`}>
                          {conv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{conv.offerName || conv.offerId}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.publisherName || conv.publisherId || '-'}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                        ${payout.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-400 font-bold">
                        ${cost.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${margin.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {roi.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            if (conv.clickId) {
                              navigator.clipboard.writeText(conv.clickId);
                              toast.success("Click ID скопирован");
                            }
                          }}
                          className="text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1 group"
                          title={conv.clickId}
                        >
                          {conv.clickId?.slice(0, 8)}...
                          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px]">
                          {conv.geo || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub1 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub2 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub3 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub4 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub5 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub6 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub7 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub8 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub9 || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{conv.sub10 || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {t('reports.showing') || 'Showing'} {((page - 1) * 50) + 1}-{Math.min(page * 50, total)} {t('reports.of') || 'of'} {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-border bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3 py-1">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-border bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GroupedTable({ data, loading, role, showFinancials, t }: any) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows = data?.data || [];
  const groupBy = data?.groupBy || "date";
  const isAdvertiser = role === "advertiser" || role === "admin";

  const totals = rows.reduce((acc: any, row: any) => ({
    clicks: acc.clicks + (row.clicks || 0),
    uniqueClicks: acc.uniqueClicks + (row.uniqueClicks || 0),
    conversions: acc.conversions + (row.conversions || 0),
    approvedConversions: acc.approvedConversions + (row.approvedConversions || 0),
    leads: acc.leads + (row.leads || 0),
    sales: acc.sales + (row.sales || 0),
    payout: acc.payout + (row.payout || 0),
    cost: acc.cost + (row.cost || 0),
    epcEarnings: acc.epcEarnings + ((row.epc || 0) * (row.clicks || 0)), // Sum EPC earnings for total EPC calculation
  }), { clicks: 0, uniqueClicks: 0, conversions: 0, approvedConversions: 0, leads: 0, sales: 0, payout: 0, cost: 0, epcEarnings: 0 });

  const totalMargin = totals.cost - totals.payout;
  const totalROI = totals.cost > 0 ? ((totalMargin / totals.cost) * 100) : 0;
  const totalCR = totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100) : 0;
  const totalAR = totals.conversions > 0 ? ((totals.approvedConversions / totals.conversions) * 100) : 0;
  const totalEPC = totals.clicks > 0 ? (totals.epcEarnings / totals.clicks) : 0;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <div className="max-h-[1100px] overflow-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">{groupBy.toUpperCase()}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.clicks') || 'Clicks'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.unique') || 'Unique'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.leads') || 'Leads'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.sales') || 'Sales'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.conv') || 'Conv'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.payout') || 'Payout'}</th>
                <th className="px-4 py-3 font-medium text-right">CR%</th>
                <th className="px-4 py-3 font-medium text-right">AR%</th>
                <th className="px-4 py-3 font-medium text-right">EPC</th>
                {isAdvertiser && (
                  <>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.table.cost') || 'Cost'}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.table.margin') || 'Margin'}</th>
                    <th className="px-4 py-3 font-medium text-right">ROI%</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={isAdvertiser ? 13 : 10} className="px-4 py-8 text-center text-muted-foreground">
                    {t('reports.noData') || 'No data found'}
                  </td>
                </tr>
              ) : (
                rows.map((row: any, i: number) => {
                  const cost = row.cost || 0;
                  const payout = row.payout || 0;
                  const margin = cost - payout;
                  const roi = cost > 0 ? ((margin / cost) * 100) : 0;
                  const cr = row.clicks > 0 ? ((row.conversions / row.clicks) * 100) : 0;
                  const ar = row.conversions > 0 ? (((row.approvedConversions || 0) / row.conversions) * 100) : 0;
                  const epc = row.epc || 0; // Use backend-calculated EPC (based on partnerPayout)
                  
                  return (
                    <tr key={i} className="hover:bg-muted transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{row.groupKey}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{(row.clicks || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{(row.uniqueClicks || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{row.leads || 0}</td>
                      <td className="px-4 py-3 text-right text-purple-400">{row.sales || 0}</td>
                      <td className="px-4 py-3 text-right text-foreground font-bold">{row.conversions || 0}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">${payout.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-yellow-400">{cr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-pink-400">{ar.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-teal-400">${epc.toFixed(2)}</td>
                      {isAdvertiser && (
                        <>
                          <td className="px-4 py-3 text-right text-blue-400 font-bold">${cost.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${margin.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {roi.toFixed(1)}%
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="sticky bottom-0 bg-card">
                <tr className="border-t-2 border-white/20 bg-white/[0.03] font-bold">
                  <td className="px-4 py-3 text-foreground">{t('reports.total') || 'TOTAL'}</td>
                  <td className="px-4 py-3 text-right text-foreground">{totals.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{totals.uniqueClicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">{totals.leads}</td>
                  <td className="px-4 py-3 text-right text-purple-400">{totals.sales}</td>
                  <td className="px-4 py-3 text-right text-foreground">{totals.conversions}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">${totals.payout.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">{totalCR.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-pink-400">{totalAR.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-teal-400">${totalEPC.toFixed(2)}</td>
                  {isAdvertiser && (
                    <>
                      <td className="px-4 py-3 text-right text-blue-400">${totals.cost.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right ${totalMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${totalMargin.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right ${totalROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalROI.toFixed(1)}%
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
