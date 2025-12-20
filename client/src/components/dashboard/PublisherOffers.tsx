import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Filter, Eye, Loader2, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useState, useMemo } from "react";

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
}

export function PublisherOffers({ role }: { role: string }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: offers, isLoading, error } = useQuery<MarketplaceOffer[]>({
    queryKey: ["/api/marketplace"],
    queryFn: async () => {
      const res = await fetch("/api/marketplace", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch marketplace");
      return res.json();
    },
  });

  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    return offers.filter((offer) => {
      const matchesSearch = searchQuery === "" || 
        offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.geo.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || offer.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [offers, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    if (!offers) return [];
    return [...new Set(offers.map(o => o.category))];
  }, [offers]);

  const getMaxPayout = (offer: MarketplaceOffer) => {
    if (offer.landings && offer.landings.length > 0) {
      const max = Math.max(...offer.landings.map(l => parseFloat(l.partnerPayout)));
      return max.toFixed(2);
    }
    return offer.partnerPayout;
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

      <Card className="bg-[#0A0A0A] border-white/10">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              className={`border-white/10 font-mono ${!selectedCategory ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : 'text-slate-300'}`}
              onClick={() => setSelectedCategory(null)}
              data-testid="button-filter-all"
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button 
                key={cat}
                variant="outline" 
                size="sm"
                className={`border-white/10 font-mono ${selectedCategory === cat ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : 'text-slate-300'}`}
                onClick={() => setSelectedCategory(cat)}
                data-testid={`button-filter-${cat.toLowerCase()}`}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
        
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">No offers found</p>
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
                  <th className="px-4 py-3 font-medium">Landings</th>
                  <th className="px-4 py-3 font-medium">{t('dashboard.offers.status')}</th>
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
                      <td className="px-4 py-3 text-slate-300">
                        {offer.landings?.length || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                          {offer.status}
                        </span>
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
