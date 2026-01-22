import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MousePointer2, Users, DollarSign, TrendingUp, Download, 
  RefreshCw, Loader2, Filter, X, Clock, CheckCircle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";
import { formatCurrency } from "@/lib/utils";

interface PublisherStatsData {
  totalClicks: number;
  totalUniqueClicks: number;
  totalLeads: number;
  totalSales: number;
  totalConversions: number;
  totalPayout: number;
  holdPayout: number;
  approvedPayout: number;
  cr: number;
  epc: number;
  byOffer: Array<{
    offerId: string;
    offerName: string;
    clicks: number;
    leads: number;
    sales: number;
    payout: number;
    cr: number;
  }>;
  byDate: Array<{
    date: string;
    clicks: number;
    conversions: number;
    payout: number;
  }>;
  byGeo: Array<{
    geo: string;
    clicks: number;
    conversions: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    payout: number;
  }>;
}

interface Offer {
  id: string;
  name: string;
}

export function PublisherDashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<PublisherStatsData | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Use global advertiser context
  const { selectedAdvertiserId } = useAdvertiserContext();

  const handleAdvertiserChange = () => {
    setSelectedOffer("all");
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (selectedOffer && selectedOffer !== "all") params.append("offerIds", selectedOffer);
      if (selectedAdvertiserId) params.append("advertiserId", selectedAdvertiserId);

      const [statsRes, offersRes] = await Promise.all([
        fetch(`/api/publisher/stats?${params}`, { credentials: "include" }),
        fetch(`/api/publisher/offers-list${selectedAdvertiserId ? `?advertiserId=${selectedAdvertiserId}` : ""}`, { credentials: "include" })
      ]);

      if (statsRes.status === 401 || offersRes.status === 401) {
        setLocation("/login");
        return;
      }

      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      if (!offersRes.ok) throw new Error("Failed to fetch offers");

      const statsData = await statsRes.json();
      const offersData = await offersRes.json();

      setStats(statsData);
      setOffers(offersData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAdvertiserId]);

  const applyFilters = () => {
    fetchData();
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedOffer("all");
    setTimeout(() => fetchData(), 0);
  };

  const [exportError, setExportError] = useState("");

  const exportCSV = async (type: "stats" | "conversions" | "clicks") => {
    setExportError("");
    try {
      const params = new URLSearchParams();
      params.append("type", type);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (selectedOffer && selectedOffer !== "all") params.append("offerIds", selectedOffer);
      if (selectedAdvertiserId) params.append("advertiserId", selectedAdvertiserId);

      const res = await fetch(`/api/publisher/export/csv?${params}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to export CSV");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `publisher_${type}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || "Export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline" data-testid="button-retry">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-foreground">{t('dashboard.overview')}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-testid="button-toggle-filters"
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-border bg-transparent hover:bg-muted"
          >
            <Filter className="w-4 h-4 mr-2" />
            {t('dashboard.filters')}
          </Button>
          <Button
            data-testid="button-refresh"
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-border bg-transparent hover:bg-muted"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('dashboard.dateFrom')}</label>
                <Input
                  data-testid="input-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-input border-border text-foreground h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('dashboard.dateTo')}</label>
                <Input
                  data-testid="input-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-input border-border text-foreground h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('dashboard.table.offer')}</label>
                <Select value={selectedOffer} onValueChange={setSelectedOffer}>
                  <SelectTrigger data-testid="select-offer" className="bg-input border-border text-foreground h-9">
                    <SelectValue placeholder={t('dashboard.offers.all')} />
                  </SelectTrigger>
                  <SelectContent className="bg-input border-border">
                    <SelectItem value="all">{t('dashboard.offers.all')}</SelectItem>
                    {offers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  data-testid="button-apply-filters"
                  onClick={applyFilters}
                  className="bg-emerald-600 hover:bg-emerald-700 h-9"
                >
                  {t('publisherDashboard.apply')}
                </Button>
                <Button
                  data-testid="button-reset-filters"
                  variant="outline"
                  onClick={resetFilters}
                  className="border-border h-9"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <MousePointer2 className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] uppercase font-medium text-blue-400">{t('stats.clicks')}</span>
            </div>
            <div className="text-lg font-bold font-mono text-blue-400">{stats.totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/30 hover:border-purple-500/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] uppercase font-medium text-purple-400">{t('stats.leads')}</span>
            </div>
            <div className="text-lg font-bold font-mono text-purple-400">{stats.totalLeads.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] uppercase font-medium text-orange-400">{t('stats.sales')}</span>
            </div>
            <div className="text-lg font-bold font-mono text-orange-400">{stats.totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] uppercase font-medium text-emerald-400">{t('publisherDashboard.totalPayout')}</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400">{formatCurrency(stats.totalPayout)}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] uppercase font-medium text-yellow-400">{t('publisherDashboard.hold')}</span>
            </div>
            <div className="text-lg font-bold font-mono text-yellow-400">{formatCurrency(stats.holdPayout)}</div>
          </CardContent>
        </Card>
        <Card className="bg-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] uppercase font-medium text-cyan-400">{t('stats.cr')}</span>
            </div>
            <div className="text-lg font-bold font-mono text-cyan-400">{stats.cr.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card className="bg-pink-500/5 border-pink-500/30 hover:border-pink-500/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-pink-400" />
              <span className="text-[10px] uppercase font-medium text-pink-400">{t('publisherDashboard.epc')}</span>
            </div>
            <div className="text-lg font-bold font-mono text-pink-400">{formatCurrency(stats.epc)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase text-muted-foreground">
                {t('dashboard.dailyStats')}
              </h3>
            </div>
            <div className="h-[250px]">
              {stats.byDate.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.byDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name={t('stats.clicks')} />
                    <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={false} name={t('stats.conversions')} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {t('publisherDashboard.noData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4">
              {t('dashboard.topGeos')}
            </h3>
            <div className="space-y-3">
              {stats.byGeo.slice(0, 6).map((geo, i) => {
                const maxClicks = Math.max(...stats.byGeo.map(g => g.clicks)) || 1;
                const width = (geo.clicks / maxClicks) * 100;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground w-8">{geo.geo}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-1 ml-4">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${width}%` }} />
                      </div>
                      <span className="font-mono text-xs w-12 text-right text-muted-foreground">
                        {geo.clicks.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
              {stats.byGeo.length === 0 && (
                <div className="text-muted-foreground text-sm">{t('publisherDashboard.noGeoData')}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {stats.byStatus.map((status, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">
                    {status.status === 'approved' && t('publisherDashboard.statusApproved')}
                    {status.status === 'hold' && t('publisherDashboard.statusHold')}
                    {status.status === 'rejected' && t('publisherDashboard.statusRejected')}
                    {status.status === 'pending' && t('publisherDashboard.statusPending')}
                    {!['approved', 'hold', 'rejected', 'pending'].includes(status.status) && status.status}
                  </div>
                  <div className="text-2xl font-bold font-mono text-foreground">{status.count}</div>
                  <div className="text-sm font-mono text-emerald-500">{formatCurrency(status.payout)}</div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  status.status === 'approved' ? 'bg-emerald-500/20' :
                  status.status === 'hold' ? 'bg-yellow-500/20' :
                  status.status === 'rejected' ? 'bg-red-500/20' : 'bg-blue-500/20'
                }`}>
                  {status.status === 'approved' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  {status.status === 'hold' && <Clock className="w-5 h-5 text-yellow-500" />}
                  {status.status === 'rejected' && <X className="w-5 h-5 text-red-500" />}
                  {status.status === 'pending' && <Clock className="w-5 h-5 text-blue-500" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              {t('dashboard.statsByOffer')}
            </h3>
            <Button
              data-testid="button-export-stats"
              variant="ghost"
              size="sm"
              onClick={() => exportCSV("stats")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">{t('dashboard.table.offer')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.clicks')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.leads')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.sales')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.payout')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('dashboard.table.cr')}</th>
                </tr>
              </thead>
            </table>
            <div className="max-h-[294px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <tbody className="divide-y divide-white/5">
                  {stats.byOffer.map((row) => (
                    <tr key={row.offerId} className="hover:bg-muted transition-colors" data-testid={`row-offer-${row.offerId}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{row.offerName}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.leads.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.sales.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(row.payout)}</td>
                      <td className="px-4 py-3 text-right text-cyan-400">{row.cr.toFixed(2)}%</td>
                    </tr>
                  ))}
                  {stats.byOffer.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {t('publisherDashboard.noOffersData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            data-testid="button-export-conversions"
            variant="outline"
            size="sm"
            onClick={() => exportCSV("conversions")}
            className="border-border bg-transparent hover:bg-muted"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('publisherDashboard.exportConversions')}
          </Button>
          <Button
            data-testid="button-export-clicks"
            variant="outline"
            size="sm"
            onClick={() => exportCSV("clicks")}
            className="border-border bg-transparent hover:bg-muted"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('publisherDashboard.exportClicks')}
          </Button>
        </div>
        {exportError && (
          <div className="text-red-500 text-xs font-mono">{exportError}</div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-3 h-3 ${color}`} />
          <span className="text-[10px] uppercase text-muted-foreground font-medium">{label}</span>
        </div>
        <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
