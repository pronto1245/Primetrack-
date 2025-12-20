import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Filter, RefreshCw, Download, ChevronLeft, ChevronRight, 
  MousePointer, Target, DollarSign, TrendingUp, Loader2,
  Calendar
} from "lucide-react";

interface ReportsProps {
  role: string;
}

export function Reports({ role }: ReportsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("clicks");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    offerId: "",
    publisherId: "",
    geo: "",
    device: "",
    groupBy: "date"
  });
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams();
  if (filters.dateFrom) queryParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) queryParams.set("dateTo", filters.dateTo);
  if (filters.offerId) queryParams.set("offerId", filters.offerId);
  if (filters.publisherId && role !== "publisher") queryParams.set("publisherId", filters.publisherId);
  if (filters.geo) queryParams.set("geo", filters.geo);
  if (filters.device) queryParams.set("device", filters.device);
  queryParams.set("page", String(page));
  queryParams.set("limit", "50");

  const { data: clicksData, isLoading: clicksLoading, refetch: refetchClicks } = useQuery({
    queryKey: ["/api/reports/clicks", filters, page],
    queryFn: async () => {
      const res = await fetch(`/api/reports/clicks?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch clicks");
      return res.json();
    },
    enabled: activeTab === "clicks"
  });

  const { data: conversionsData, isLoading: conversionsLoading, refetch: refetchConversions } = useQuery({
    queryKey: ["/api/reports/conversions", filters, page],
    queryFn: async () => {
      const res = await fetch(`/api/reports/conversions?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch conversions");
      return res.json();
    },
    enabled: activeTab === "conversions"
  });

  const groupedParams = new URLSearchParams(queryParams);
  groupedParams.set("groupBy", filters.groupBy);
  
  const { data: groupedData, isLoading: groupedLoading, refetch: refetchGrouped } = useQuery({
    queryKey: ["/api/reports/grouped", filters],
    queryFn: async () => {
      const res = await fetch(`/api/reports/grouped?${groupedParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch grouped data");
      return res.json();
    }
  });

  const handleRefresh = () => {
    if (activeTab === "clicks") refetchClicks();
    else if (activeTab === "conversions") refetchConversions();
    else refetchGrouped();
  };

  const isAdvertiser = role === "advertiser";
  const isAdmin = role === "admin";
  const showFinancials = isAdvertiser || isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t('dashboard.menu.reports') || 'Reports'}</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="border-white/10 bg-transparent text-white hover:bg-white/5"
            data-testid="button-refresh-reports"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh') || 'Refresh'}
          </Button>
        </div>
      </div>

      <Card className="bg-[#0A0A0A] border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-sm font-mono text-slate-400 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t('reports.filters') || 'Filters'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <Label className="text-xs text-slate-400">{t('reports.dateFrom') || 'Date From'}</Label>
              <Input
                type="date"
                data-testid="input-date-from"
                value={filters.dateFrom}
                onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="mt-1 bg-[#111] border-white/10 text-white font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">{t('reports.dateTo') || 'Date To'}</Label>
              <Input
                type="date"
                data-testid="input-date-to"
                value={filters.dateTo}
                onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="mt-1 bg-[#111] border-white/10 text-white font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">{t('reports.geo') || 'GEO'}</Label>
              <Input
                data-testid="input-geo"
                placeholder="US, DE, RU..."
                value={filters.geo}
                onChange={(e) => setFilters(f => ({ ...f, geo: e.target.value.toUpperCase() }))}
                className="mt-1 bg-[#111] border-white/10 text-white font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">{t('reports.device') || 'Device'}</Label>
              <Select value={filters.device || "all"} onValueChange={(v) => setFilters(f => ({ ...f, device: v === "all" ? "" : v }))}>
                <SelectTrigger className="mt-1 bg-[#111] border-white/10 text-white" data-testid="select-device">
                  <SelectValue placeholder={t('reports.all') || 'All'} />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">{t('reports.groupBy') || 'Group By'}</Label>
              <Select value={filters.groupBy} onValueChange={(v) => setFilters(f => ({ ...f, groupBy: v }))}>
                <SelectTrigger className="mt-1 bg-[#111] border-white/10 text-white" data-testid="select-group-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
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
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline"
                onClick={() => { setFilters({ dateFrom: "", dateTo: "", offerId: "", publisherId: "", geo: "", device: "", groupBy: "date" }); setPage(1); }}
                className="w-full border-white/10 bg-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                data-testid="button-clear-filters"
              >
                {t('reports.clearFilters') || 'Clear'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SummaryCards data={groupedData} loading={groupedLoading} role={role} t={t} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#0A0A0A] border border-white/10">
          <TabsTrigger value="clicks" className="data-[state=active]:bg-white/10" data-testid="tab-clicks">
            <MousePointer className="w-4 h-4 mr-2" />
            {t('reports.clicks') || 'Clicks'}
          </TabsTrigger>
          <TabsTrigger value="conversions" className="data-[state=active]:bg-white/10" data-testid="tab-conversions">
            <Target className="w-4 h-4 mr-2" />
            {t('reports.conversions') || 'Conversions'}
          </TabsTrigger>
          <TabsTrigger value="grouped" className="data-[state=active]:bg-white/10" data-testid="tab-grouped">
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('reports.grouped') || 'Grouped'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clicks" className="mt-0">
          <ClicksTable 
            data={clicksData} 
            loading={clicksLoading} 
            page={page} 
            setPage={setPage}
            role={role}
            t={t}
          />
        </TabsContent>

        <TabsContent value="conversions" className="mt-0">
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

function SummaryCards({ data, loading, role, t }: any) {
  const rows = data?.rows || [];
  const isAdvertiser = role === "advertiser";
  const isPublisher = role === "publisher";
  
  const totals = rows.reduce((acc: any, row: any) => ({
    clicks: acc.clicks + (row.clicks || 0),
    uniqueClicks: acc.uniqueClicks + (row.uniqueClicks || 0),
    conversions: acc.conversions + (row.conversions || 0),
    leads: acc.leads + (row.leads || 0),
    sales: acc.sales + (row.sales || 0),
    payout: acc.payout + (row.payout || 0),
    cost: acc.cost + (row.cost || 0),
  }), { clicks: 0, uniqueClicks: 0, conversions: 0, leads: 0, sales: 0, payout: 0, cost: 0 });

  const margin = totals.cost - totals.payout;
  const roi = totals.cost > 0 ? ((margin / totals.cost) * 100) : 0;
  const cr = totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100) : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-[#0A0A0A] border-white/10 animate-pulse">
            <CardContent className="p-4 h-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <Card className="bg-[#0A0A0A] border-white/10">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase text-slate-500 mb-1">{t('stats.clicks') || 'Clicks'}</div>
          <div className="text-xl font-bold text-white">{totals.clicks.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500">{totals.uniqueClicks.toLocaleString()} unique</div>
        </CardContent>
      </Card>
      <Card className="bg-[#0A0A0A] border-white/10">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase text-slate-500 mb-1">{t('stats.conversions') || 'Conv'}</div>
          <div className="text-xl font-bold text-emerald-400">{totals.conversions}</div>
          <div className="text-[10px] text-yellow-400">CR: {cr.toFixed(2)}%</div>
        </CardContent>
      </Card>
      <Card className="bg-[#0A0A0A] border-white/10">
        <CardContent className="p-4">
          <div className="text-[10px] uppercase text-slate-500 mb-1">{t('stats.publisherPayout') || 'Payout'}</div>
          <div className="text-xl font-bold text-emerald-400">${totals.payout.toFixed(2)}</div>
        </CardContent>
      </Card>
      {isAdvertiser && (
        <>
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-slate-500 mb-1">{t('stats.advertiserCost') || 'Cost'}</div>
              <div className="text-xl font-bold text-blue-400">${totals.cost.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-slate-500 mb-1">{t('stats.margin') || 'Margin'}</div>
              <div className={`text-xl font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${margin.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-slate-500 mb-1">{t('stats.roi') || 'ROI'}</div>
              <div className={`text-xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {roi.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </>
      )}
      {isPublisher && (
        <>
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-slate-500 mb-1">{t('stats.leads') || 'Leads'}</div>
              <div className="text-xl font-bold text-purple-400">{totals.leads}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-slate-500 mb-1">{t('stats.sales') || 'Sales'}</div>
              <div className="text-xl font-bold text-orange-400">{totals.sales}</div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ClicksTable({ data, loading, page, setPage, role, t }: any) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const clicks = data?.clicks || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <Card className="bg-[#0A0A0A] border-white/10">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">{t('reports.table.date') || 'Date'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.clickId') || 'Click ID'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.offer') || 'Offer'}</th>
                {role !== "publisher" && <th className="px-4 py-3 font-medium">{t('reports.table.publisher') || 'Publisher'}</th>}
                <th className="px-4 py-3 font-medium">{t('reports.table.geo') || 'GEO'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.device') || 'Device'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.os') || 'OS'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.browser') || 'Browser'}</th>
                <th className="px-4 py-3 font-medium text-center">{t('reports.table.unique') || 'Unique'}</th>
                <th className="px-4 py-3 font-medium text-center">{t('reports.table.geoMatch') || 'GEO Match'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.sub1') || 'Sub1'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {clicks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                    {t('reports.noData') || 'No data found'}
                  </td>
                </tr>
              ) : (
                clicks.map((click: any) => (
                  <tr key={click.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(click.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-emerald-400">{click.clickId?.slice(0, 12)}...</td>
                    <td className="px-4 py-3 text-white">{click.offerName || click.offerId}</td>
                    {role !== "publisher" && (
                      <td className="px-4 py-3 text-slate-300">{click.publisherName || click.publisherId}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px]">
                        {click.geo || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{click.device || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-400">{click.os || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-400">{click.browser || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">
                      {click.isUnique ? (
                        <span className="text-emerald-500">✓</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {click.isGeoMatch ? (
                        <span className="text-emerald-500">✓</span>
                      ) : (
                        <span className="text-red-500">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{click.sub1 || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <div className="text-xs text-slate-500">
              {t('reports.showing') || 'Showing'} {((page - 1) * 50) + 1}-{Math.min(page * 50, total)} {t('reports.of') || 'of'} {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-white/10 bg-transparent"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-400 px-3 py-1">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-white/10 bg-transparent"
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
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const conversions = data?.conversions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  const isAdvertiser = role === "advertiser" || role === "admin";

  return (
    <Card className="bg-[#0A0A0A] border-white/10">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">{t('reports.table.date') || 'Date'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.type') || 'Type'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.status') || 'Status'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.offer') || 'Offer'}</th>
                {role !== "publisher" && <th className="px-4 py-3 font-medium">{t('reports.table.publisher') || 'Publisher'}</th>}
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.payout') || 'Payout'}</th>
                {isAdvertiser && (
                  <>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.table.cost') || 'Cost'}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.table.margin') || 'Margin'}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.table.roi') || 'ROI'}</th>
                  </>
                )}
                <th className="px-4 py-3 font-medium">{t('reports.table.clickId') || 'Click ID'}</th>
                <th className="px-4 py-3 font-medium">{t('reports.table.geo') || 'GEO'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {conversions.length === 0 ? (
                <tr>
                  <td colSpan={isAdvertiser ? 11 : 8} className="px-4 py-8 text-center text-slate-500">
                    {t('reports.noData') || 'No data found'}
                  </td>
                </tr>
              ) : (
                conversions.map((conv: any) => {
                  const payout = parseFloat(conv.publisherPayout) || 0;
                  const hasCost = conv.advertiserCost !== undefined && conv.advertiserCost !== null;
                  const cost = hasCost ? parseFloat(conv.advertiserCost) : 0;
                  const margin = hasCost ? (cost - payout) : 0;
                  const roi = hasCost && cost > 0 ? ((margin / cost) * 100) : 0;
                  
                  return (
                    <tr key={conv.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-slate-400">
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
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {conv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{conv.offerName || conv.offerId}</td>
                      {role !== "publisher" && (
                        <td className="px-4 py-3 text-slate-300">{conv.publisherName || conv.publisherId}</td>
                      )}
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                        ${payout.toFixed(2)}
                      </td>
                      {isAdvertiser && hasCost && (
                        <>
                          <td className="px-4 py-3 text-right text-blue-400 font-bold">
                            ${cost.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${margin.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {roi.toFixed(1)}%
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-slate-500">{conv.clickId?.slice(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px]">
                          {conv.geo || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <div className="text-xs text-slate-500">
              {t('reports.showing') || 'Showing'} {((page - 1) * 50) + 1}-{Math.min(page * 50, total)} {t('reports.of') || 'of'} {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-white/10 bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-400 px-3 py-1">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-white/10 bg-transparent"
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
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
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
    leads: acc.leads + (row.leads || 0),
    sales: acc.sales + (row.sales || 0),
    payout: acc.payout + (row.payout || 0),
    cost: acc.cost + (row.cost || 0),
  }), { clicks: 0, uniqueClicks: 0, conversions: 0, leads: 0, sales: 0, payout: 0, cost: 0 });

  const totalMargin = totals.cost - totals.payout;
  const totalROI = totals.cost > 0 ? ((totalMargin / totals.cost) * 100) : 0;
  const totalCR = totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100) : 0;

  return (
    <Card className="bg-[#0A0A0A] border-white/10">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">{groupBy.toUpperCase()}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.clicks') || 'Clicks'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.unique') || 'Unique'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.leads') || 'Leads'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.sales') || 'Sales'}</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.conv') || 'Conv'}</th>
                <th className="px-4 py-3 font-medium text-right">CR%</th>
                <th className="px-4 py-3 font-medium text-right">{t('reports.table.payout') || 'Payout'}</th>
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
                  <td colSpan={isAdvertiser ? 11 : 8} className="px-4 py-8 text-center text-slate-500">
                    {t('reports.noData') || 'No data found'}
                  </td>
                </tr>
              ) : (
                rows.map((row: any, i: number) => {
                  const hasCost = row.cost !== undefined && row.cost !== null;
                  const margin = hasCost ? (row.cost - (row.payout || 0)) : 0;
                  const roi = hasCost && row.cost > 0 ? ((margin / row.cost) * 100) : 0;
                  const cr = row.clicks > 0 ? ((row.conversions / row.clicks) * 100) : 0;
                  
                  return (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{row.groupKey}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{row.clicks?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{row.uniqueClicks?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{row.leads || 0}</td>
                      <td className="px-4 py-3 text-right text-purple-400">{row.sales || 0}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{row.conversions || 0}</td>
                      <td className="px-4 py-3 text-right text-yellow-400">{cr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">${(row.payout || 0).toFixed(2)}</td>
                      {isAdvertiser && hasCost && (
                        <>
                          <td className="px-4 py-3 text-right text-blue-400 font-bold">${row.cost.toFixed(2)}</td>
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
              <tfoot>
                <tr className="border-t-2 border-white/20 bg-white/[0.03] font-bold">
                  <td className="px-4 py-3 text-white">{t('reports.total') || 'TOTAL'}</td>
                  <td className="px-4 py-3 text-right text-white">{totals.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{totals.uniqueClicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">{totals.leads}</td>
                  <td className="px-4 py-3 text-right text-purple-400">{totals.sales}</td>
                  <td className="px-4 py-3 text-right text-white">{totals.conversions}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">{totalCR.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-emerald-400">${totals.payout.toFixed(2)}</td>
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
