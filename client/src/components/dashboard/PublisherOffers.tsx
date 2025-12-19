import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, ExternalLink, Globe, Tag, Building, Loader2 } from "lucide-react";
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

const CATEGORY_COLORS: Record<string, string> = {
  "nutra": "bg-green-500/20",
  "gambling": "bg-red-500/20",
  "betting": "bg-orange-500/20",
  "crypto": "bg-yellow-500/20",
  "dating": "bg-pink-500/20",
  "finance": "bg-blue-500/20",
  "ecommerce": "bg-purple-500/20",
  "gaming": "bg-indigo-500/20",
  "utilities": "bg-cyan-500/20",
  "sweepstakes": "bg-amber-500/20",
};

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
        <p className="text-red-400">Failed to load marketplace</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white mb-2" data-testid="text-marketplace-title">
            {t('dashboard.offers.marketplace')}
          </h2>
          <p className="text-slate-400 text-sm font-mono">{t('dashboard.offers.marketplaceDesc')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder={t('dashboard.offers.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 rounded pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            data-testid="input-search-offers"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            className={`border-white/10 bg-[#0A0A0A] font-mono hover:bg-white/5 ${!selectedCategory ? 'text-emerald-400 border-emerald-500/50' : 'text-slate-300'}`}
            onClick={() => setSelectedCategory(null)}
            data-testid="button-filter-all"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button 
              key={cat}
              variant="outline" 
              className={`border-white/10 bg-[#0A0A0A] font-mono hover:bg-white/5 ${selectedCategory === cat ? 'text-emerald-400 border-emerald-500/50' : 'text-slate-300'}`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => {
            const categoryColor = CATEGORY_COLORS[offer.category.toLowerCase()] || "bg-slate-500/20";
            const maxPayout = getMaxPayout(offer);
            
            return (
              <Link key={offer.id} href={`/dashboard/${role}/offer/${offer.id}`}>
                <Card className="bg-[#0A0A0A] border-white/10 hover:border-emerald-500/50 transition-all group cursor-pointer h-full" data-testid={`card-offer-${offer.id}`}>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-lg ${categoryColor} flex items-center justify-center`}>
                          {offer.logoUrl ? (
                            <img src={offer.logoUrl} alt={offer.name} className="w-8 h-8 object-contain rounded" />
                          ) : (
                            <Tag className="w-6 h-6 text-white/80" />
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white font-mono">
                            ${maxPayout}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                            {offer.payoutModel}
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors" data-testid={`text-offer-name-${offer.id}`}>
                        {offer.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${categoryColor} text-white/80`}>
                          {offer.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-6">
                        <div className="bg-white/5 rounded px-2 py-1.5">
                          <div className="text-[10px] text-slate-500 uppercase font-mono">GEO</div>
                          <div className="text-xs font-medium text-slate-300 truncate">
                            {offer.geo.slice(0, 3).join(", ")}{offer.geo.length > 3 ? ` +${offer.geo.length - 3}` : ""}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded px-2 py-1.5">
                          <div className="text-[10px] text-slate-500 uppercase font-mono">LANDINGS</div>
                          <div className="text-xs font-medium text-emerald-400">
                            {offer.landings?.length || 0}
                          </div>
                        </div>
                      </div>

                      <Button className="w-full bg-white/5 hover:bg-emerald-600 hover:text-white text-emerald-500 border border-emerald-500/30 transition-all font-mono text-xs font-bold" data-testid={`button-view-offer-${offer.id}`}>
                        VIEW DETAILS <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
