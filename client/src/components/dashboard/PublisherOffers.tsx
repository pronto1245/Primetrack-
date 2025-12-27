import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Loader2, Tag, CheckCircle, Clock, Globe, Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";
import { PendingPartnershipOverlay } from "./PendingPartnershipOverlay";

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
  landings: OfferLanding[];
  hasAccess?: boolean;
  accessStatus?: string | null;
}

export function PublisherOffers({ role }: { role: string }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGeo, setSelectedGeo] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [showMyOffers, setShowMyOffers] = useState<boolean>(false);
  
  // Use global advertiser context for filtering
  const { selectedAdvertiserId, isPendingPartnership } = useAdvertiserContext();

  const { data: offers, isLoading, error } = useQuery<MarketplaceOffer[]>({
    queryKey: ["/api/marketplace/offers", selectedAdvertiserId],
    queryFn: async () => {
      const res = await fetch("/api/marketplace/offers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch marketplace");
      return res.json();
    },
  });

  const categories = useMemo(() => {
    if (!offers) return [];
    return [...new Set(offers.map(o => o.category).filter(Boolean))];
  }, [offers]);

  const allGeos = useMemo(() => {
    if (!offers) return [];
    const geos = new Set<string>();
    offers.forEach(o => o.geo.forEach(g => geos.add(g)));
    return [...geos].sort();
  }, [offers]);

  const allSources = useMemo(() => {
    if (!offers) return [];
    const sources = new Set<string>();
    offers.forEach(o => o.trafficSources?.forEach(s => sources.add(s)));
    return [...sources].sort();
  }, [offers]);

  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    return offers.filter((offer) => {
      // Filter by selected advertiser (if selected)
      const matchesAdvertiser = !selectedAdvertiserId || offer.advertiserId === selectedAdvertiserId;
      const matchesSearch = searchQuery === "" || 
        offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.geo.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || offer.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesGeo = selectedGeo === "all" || offer.geo.includes(selectedGeo);
      const matchesSource = selectedSource === "all" || offer.trafficSources?.includes(selectedSource);
      const matchesMyOffers = !showMyOffers || offer.hasAccess === true;
      return matchesAdvertiser && matchesSearch && matchesCategory && matchesGeo && matchesSource && matchesMyOffers;
    });
  }, [offers, searchQuery, selectedCategory, selectedGeo, selectedSource, showMyOffers, selectedAdvertiserId]);

  const getMaxPayout = (offer: MarketplaceOffer) => {
    if (offer.landings && offer.landings.length > 0) {
      const max = Math.max(...offer.landings.map(l => parseFloat(l.partnerPayout)));
      return max.toFixed(2);
    }
    return offer.partnerPayout;
  };

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
          Ожидание
        </span>
      );
    }
    return null;
  };

  // Show pending overlay if partnership is not active (after all hooks)
  if (isPendingPartnership) {
    return <PendingPartnershipOverlay />;
  }

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
          <h2 className="text-2xl font-bold font-mono text-white mb-2" data-testid="text-offers-title">
            {t('dashboard.offers.title')}
          </h2>
          <p className="text-slate-400 text-sm font-mono">{t('dashboard.offers.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className={`font-mono ${!showMyOffers ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' : 'text-slate-300 border-white/10'}`}
          onClick={() => setShowMyOffers(false)}
          data-testid="button-all-offers"
        >
          Все офферы
        </Button>
        <Button
          variant="outline"
          className={`font-mono ${showMyOffers ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' : 'text-slate-300 border-white/10'}`}
          onClick={() => setShowMyOffers(true)}
          data-testid="button-my-offers"
        >
          Мои офферы ({myOffersCount})
        </Button>
      </div>

      <Card className="bg-[#0A0A0A] border-white/10">
        <div className="p-4 border-b border-white/10 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder={t('dashboard.offers.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                data-testid="input-search-offers"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white font-mono text-xs" data-testid="select-category">
                  <Tag className="w-3 h-3 mr-2 text-slate-500" />
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10">
                  <SelectItem value="all" className="font-mono text-xs">Все категории</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="font-mono text-xs">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedGeo} onValueChange={setSelectedGeo}>
                <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white font-mono text-xs" data-testid="select-geo">
                  <Globe className="w-3 h-3 mr-2 text-slate-500" />
                  <SelectValue placeholder="ГЕО" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10 max-h-[300px]">
                  <SelectItem value="all" className="font-mono text-xs">Все ГЕО</SelectItem>
                  {allGeos.map((geo) => (
                    <SelectItem key={geo} value={geo} className="font-mono text-xs">{geo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-white font-mono text-xs" data-testid="select-source">
                  <Megaphone className="w-3 h-3 mr-2 text-slate-500" />
                  <SelectValue placeholder="Источник" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10">
                  <SelectItem value="all" className="font-mono text-xs">Все источники</SelectItem>
                  {allSources.map((source) => (
                    <SelectItem key={source} value={source} className="font-mono text-xs">{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">Офферы не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">{t('dashboard.offers.name')}</th>
                  <th className="px-4 py-3 font-medium">{t('dashboard.offers.category')}</th>
                  <th className="px-4 py-3 font-medium">{t('dashboard.offers.geo')}</th>
                  <th className="px-4 py-3 font-medium">Payout</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Доступ</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOffers.map((offer) => {
                  const maxPayout = getMaxPayout(offer);
                  return (
                    <tr key={offer.id} className="hover:bg-white/5 transition-colors group" data-testid={`row-offer-${offer.id}`}>
                      <td className="px-4 py-3 text-slate-500">#{offer.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/${role}/offer/${offer.id}`}>
                          <span className="font-medium text-white group-hover:text-emerald-400 transition-colors cursor-pointer" data-testid={`text-offer-name-${offer.id}`}>
                            {offer.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{offer.category}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {offer.geo.slice(0, 3).join(", ")}{offer.geo.length > 3 ? ` +${offer.geo.length - 3}` : ""}
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">
                        ${maxPayout}
                      </td>
                      <td className="px-4 py-3 text-slate-300 uppercase">
                        {offer.payoutModel}
                      </td>
                      <td className="px-4 py-3">
                        {getAccessBadge(offer)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/${role}/offer/${offer.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-3 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10" data-testid={`button-view-${offer.id}`}>
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
