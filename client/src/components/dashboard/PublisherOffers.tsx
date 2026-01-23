import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, Eye, Loader2, Tag, CheckCircle, Clock, Globe, Megaphone, Send, XCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";
import { getCountryFlag } from "./CountrySelector";
import { getCurrencySymbol, getOfferCurrency } from "@/lib/utils";

interface OfferLanding {
  id: string;
  offerId: string;
  geo: string;
  landingName: string | null;
  landingUrl: string;
  partnerPayout: string;
  currency: string;
}

interface MarketplaceOffer {
  id: string;
  advertiserId: string;
  name: string;
  description: string;
  logoUrl: string | null;
  partnerPayout: string;
  payoutModel: string;
  currency: string;
  geo: string[];
  category: string;
  trafficSources: string[];
  appTypes: string[];
  status: string;
  isTop: boolean;
  isExclusive: boolean;
  isPrivate: boolean;
  createdAt: string;
  landings: OfferLanding[];
  hasAccess?: boolean;
  accessStatus?: string | null;
  approvedGeos?: string[] | null;
}

export function PublisherOffers({ role }: { role: string }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGeo, setSelectedGeo] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [showMyOffers, setShowMyOffers] = useState<boolean>(false);
  const [filterNew, setFilterNew] = useState(false);
  const [filterTop, setFilterTop] = useState(false);
  const [filterExclusive, setFilterExclusive] = useState(false);
  const [filterPrivate, setFilterPrivate] = useState(false);
  
  // Use global advertiser context for filtering
  const { selectedAdvertiserId } = useAdvertiserContext();

  const { data: offers, isLoading, error } = useQuery<MarketplaceOffer[]>({
    queryKey: ["/api/marketplace/offers", selectedAdvertiserId],
    queryFn: async () => {
      const res = await fetch("/api/marketplace/offers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch marketplace");
      return res.json();
    },
  });

  const { data: stats } = useQuery<{ offerId: string; clicks: number; conversions: number; cr: number; ar: number; epc: number }[]>({
    queryKey: ["/api/publisher/offers/stats"],
    queryFn: async () => {
      const res = await fetch("/api/publisher/offers/stats", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const statsMap = useMemo(() => {
    const map = new Map<string, { clicks: number; conversions: number; cr: number; ar: number; epc: number }>();
    if (stats) {
      stats.forEach(s => map.set(s.offerId, { clicks: s.clicks, conversions: s.conversions, cr: s.cr, ar: s.ar || 0, epc: s.epc || 0 }));
    }
    return map;
  }, [stats]);

  const categories = useMemo(() => {
    if (!offers) return [];
    return Array.from(new Set(offers.map(o => o.category).filter(Boolean)));
  }, [offers]);

  const allGeos = useMemo(() => {
    if (!offers) return [];
    const geos = new Set<string>();
    offers.forEach(o => o.geo.forEach(g => geos.add(g)));
    return Array.from(geos).sort();
  }, [offers]);

  const allSources = useMemo(() => {
    if (!offers) return [];
    const sources = new Set<string>();
    offers.forEach(o => o.trafficSources?.forEach(s => sources.add(s)));
    return Array.from(sources).sort();
  }, [offers]);

  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return offers.filter((offer) => {
      const matchesAdvertiser = !selectedAdvertiserId || offer.advertiserId === selectedAdvertiserId;
      const matchesSearch = searchQuery === "" || 
        offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.geo.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || offer.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesGeo = selectedGeo === "all" || offer.geo.includes(selectedGeo);
      const matchesSource = selectedSource === "all" || offer.trafficSources?.includes(selectedSource);
      const matchesMyOffers = !showMyOffers || offer.hasAccess === true;
      const isNew = offer.createdAt && new Date(offer.createdAt) > fourteenDaysAgo;
      const matchesNew = !filterNew || isNew;
      const matchesTop = !filterTop || offer.isTop;
      const matchesExclusive = !filterExclusive || offer.isExclusive;
      const matchesPrivate = !filterPrivate || offer.isPrivate;
      return matchesAdvertiser && matchesSearch && matchesCategory && matchesGeo && matchesSource && matchesMyOffers && matchesNew && matchesTop && matchesExclusive && matchesPrivate;
    });
  }, [offers, searchQuery, selectedCategory, selectedGeo, selectedSource, showMyOffers, selectedAdvertiserId, filterNew, filterTop, filterExclusive, filterPrivate]);

  const getMaxPayout = (offer: MarketplaceOffer) => {
    if (offer.landings && offer.landings.length > 0) {
      const max = Math.max(...offer.landings.map(l => parseFloat(l.partnerPayout)));
      return max.toFixed(2);
    }
    return offer.partnerPayout;
  };

  const queryClient = useQueryClient();
  
  const requestAccessMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await fetch(`/api/offers/${offerId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to request access");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/offers"], exact: false });
    }
  });

  const getAccessBadge = (offer: MarketplaceOffer) => {
    if (offer.hasAccess) {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-500">
          <CheckCircle className="w-3 h-3" />
          Доступ
        </span>
      );
    }
    if (offer.accessStatus === "pending") {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-500">
          <Clock className="w-3 h-3" />
          Ожидает
        </span>
      );
    }
    if (offer.accessStatus === "rejected") {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/20 text-red-500">
          <XCircle className="w-3 h-3" />
          Отклонён
        </span>
      );
    }
    if (offer.accessStatus === "revoked") {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-orange-500/20 text-orange-500">
          <AlertCircle className="w-3 h-3" />
          Отозван
        </span>
      );
    }
    return (
      <button
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 hover:text-blue-400 transition-colors disabled:opacity-50"
        onClick={(e) => {
          e.stopPropagation();
          requestAccessMutation.mutate(offer.id);
        }}
        disabled={requestAccessMutation.isPending}
        data-testid={`button-request-access-${offer.id}`}
      >
        <Send className="w-3 h-3" />
        Запросить
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Failed to load offers</p>
      </div>
    );
  }

  const myOffersCount = offers?.filter(o => o.hasAccess).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground mb-2" data-testid="text-offers-title">
            {t('dashboard.offers.title')}
          </h2>
          <p className="text-muted-foreground text-sm font-mono">{t('dashboard.offers.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className={`font-mono ${!showMyOffers ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' : 'text-muted-foreground border-border'}`}
          onClick={() => setShowMyOffers(false)}
          data-testid="button-all-offers"
        >
          Все офферы
        </Button>
        <Button
          variant="outline"
          className={`font-mono ${showMyOffers ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' : 'text-muted-foreground border-border'}`}
          onClick={() => setShowMyOffers(true)}
          data-testid="button-my-offers"
        >
          Мои офферы ({myOffersCount})
        </Button>
      </div>

      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder={t('dashboard.offers.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-emerald-500 font-mono"
                data-testid="input-search-offers"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px] bg-muted border-border text-foreground font-mono text-xs" data-testid="select-category">
                  <Tag className="w-3 h-3 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="font-mono text-xs">Все категории</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="font-mono text-xs">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <SearchableSelect
                value={selectedGeo}
                onValueChange={setSelectedGeo}
                placeholder="ГЕО"
                searchPlaceholder="Поиск ГЕО..."
                className="w-[120px] font-mono text-xs"
                data-testid="select-geo"
                options={[
                  { value: "all", label: "🌍 Все ГЕО" },
                  ...allGeos.map(geo => ({
                    value: geo,
                    label: `${getCountryFlag(geo)} ${geo}`
                  }))
                ]}
              />

              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-[150px] bg-muted border-border text-foreground font-mono text-xs" data-testid="select-source">
                  <Megaphone className="w-3 h-3 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Источник" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="font-mono text-xs">Все источники</SelectItem>
                  {allSources.map((source) => (
                    <SelectItem key={source} value={source} className="font-mono text-xs">{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border/50">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterNew}
                    onChange={(e) => setFilterNew(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border bg-muted accent-emerald-500"
                    data-testid="checkbox-filter-new"
                  />
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400">NEW</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterTop}
                    onChange={(e) => setFilterTop(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border bg-muted accent-yellow-500"
                    data-testid="checkbox-filter-top"
                  />
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-400">TOP</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterExclusive}
                    onChange={(e) => setFilterExclusive(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border bg-muted accent-purple-500"
                    data-testid="checkbox-filter-exclusive"
                  />
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-500/20 text-purple-400">EXCLUSIVE</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterPrivate}
                    onChange={(e) => setFilterPrivate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border bg-muted accent-red-500"
                    data-testid="checkbox-filter-private"
                  />
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/20 text-red-400">PRIVATE</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Офферы не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono table-fixed" style={{ minWidth: "1100px" }}>
              <colgroup>
                <col style={{ width: "100px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "60px" }} />
                <col style={{ width: "60px" }} />
                <col style={{ width: "70px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "70px" }} />
                <col style={{ width: "80px" }} />
                <col style={{ width: "80px" }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                  <th className="px-3 py-3 font-medium">ID</th>
                  <th className="px-3 py-3 font-medium">{t('dashboard.offers.name')}</th>
                  <th className="px-3 py-3 font-medium">{t('dashboard.offers.category')}</th>
                  <th className="px-3 py-3 font-medium">CR%</th>
                  <th className="px-3 py-3 font-medium">AR%</th>
                  <th className="px-3 py-3 font-medium">EPC</th>
                  <th className="px-3 py-3 font-medium">{t('dashboard.offers.geo')}</th>
                  <th className="px-3 py-3 font-medium">Payout</th>
                  <th className="px-3 py-3 font-medium">Model</th>
                  <th className="px-3 py-3 font-medium">Доступ</th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOffers.map((offer) => {
                const maxPayout = getMaxPayout(offer);
                const stat = statsMap.get(offer.id);
                return (
                  <tr key={offer.id} className="hover:bg-muted transition-colors group" data-testid={`row-offer-${offer.id}`}>
                    <td className="px-3 py-3 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {offer.logoUrl ? (
                          <img src={offer.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                            {offer.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate">#{offer.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/${role}/offer/${offer.id}`}>
                          <span className="font-medium text-foreground group-hover:text-emerald-400 transition-colors cursor-pointer truncate" data-testid={`text-offer-name-${offer.id}`}>
                            {offer.name}
                          </span>
                        </Link>
                        {offer.createdAt && new Date(offer.createdAt) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 animate-pulse">
                            NEW
                          </span>
                        )}
                        {offer.isTop && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-400">
                            TOP
                          </span>
                        )}
                        {offer.isExclusive && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-500/20 text-purple-400">
                            EXCLUSIVE
                          </span>
                        )}
                        {offer.isPrivate && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/20 text-red-400">
                            PRIVATE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground truncate">{offer.category}</td>
                    <td className="px-3 py-3 text-cyan-400 font-medium">
                      {stat ? `${stat.cr.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-3 text-pink-400 font-medium">
                      {stat && stat.conversions > 0 ? `${stat.ar?.toFixed(1) || 0}%` : "—"}
                    </td>
                    <td className="px-3 py-3 text-teal-400 font-medium">
                      {stat && stat.clicks > 0 ? `${getCurrencySymbol(getOfferCurrency(offer))}${stat.epc?.toFixed(2) || '0.00'}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1 flex-wrap">
                        {(() => {
                          const allGeos = Array.from(new Set(offer.geo));
                          const displayGeos = offer.approvedGeos && offer.approvedGeos.length > 0 
                            ? offer.approvedGeos 
                            : allGeos;
                          const isLimited = offer.approvedGeos && offer.approvedGeos.length > 0 && offer.approvedGeos.length < allGeos.length;
                          return (
                            <>
                              {displayGeos.slice(0, 3).map((g, i) => (
                                <span key={g} className={`inline-flex items-center gap-0.5 ${isLimited ? 'text-yellow-400' : ''}`}>
                                  <span>{getCountryFlag(g)}</span>
                                  <span>{g}</span>
                                  {i < Math.min(displayGeos.length, 3) - 1 && <span>,</span>}
                                </span>
                              ))}
                              {displayGeos.length > 3 && <span className={isLimited ? 'text-yellow-400' : 'text-muted-foreground'}>+{displayGeos.length - 3}</span>}
                              {isLimited && <span className="text-yellow-500 text-[10px] ml-1" title={`Доступ к ${displayGeos.length} из ${allGeos.length} ГЕО`}>(ограничено)</span>}
                            </>
                          );
                        })()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-emerald-400 font-bold">
                      {getCurrencySymbol(getOfferCurrency(offer))}{maxPayout}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground uppercase">
                      {offer.payoutModel}
                    </td>
                    <td className="px-3 py-3">
                      {getAccessBadge(offer)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/dashboard/${role}/offer/${offer.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-3 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10" data-testid={`button-view-${offer.id}`}>
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
