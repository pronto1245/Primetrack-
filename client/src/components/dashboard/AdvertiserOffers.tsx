import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash, Eye, Loader2, Tag, Globe, Megaphone, FolderOpen } from "lucide-react";
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
  internalCost: string | null;
  currency: string;
}

interface Offer {
  id: string;
  advertiserId: string;
  name: string;
  description: string;
  logoUrl: string | null;
  partnerPayout: string;
  internalCost: string | null;
  payoutModel: string;
  currency: string;
  geo: string[];
  category: string;
  trafficSources: string[];
  appTypes: string[];
  status: string;
  landings?: OfferLanding[];
}

export function AdvertiserOffers({ role }: { role: string }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGeo, setSelectedGeo] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: offers, isLoading, error } = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
    queryFn: async () => {
      const res = await fetch("/api/offers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    },
  });

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
    return offers.filter((offer) => {
      const matchesSearch = searchQuery === "" || 
        offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.geo.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || offer.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesGeo = selectedGeo === "all" || offer.geo.includes(selectedGeo);
      const matchesSource = selectedSource === "all" || offer.trafficSources?.includes(selectedSource);
      const matchesStatus = selectedStatus === "all" || offer.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesGeo && matchesSource && matchesStatus;
    });
  }, [offers, searchQuery, selectedCategory, selectedGeo, selectedSource, selectedStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
        <Link href={`/dashboard/${role}/offers/new`}>
          <Button className="bg-blue-600 hover:bg-blue-500 text-white font-mono" data-testid="button-create-offer">
            <Plus className="w-4 h-4 mr-2" />
            {t('dashboard.offers.create')}
          </Button>
        </Link>
      </div>

      <Card className="bg-[#0A0A0A] border-white/10">
        <div className="p-4 border-b border-white/10 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder={t('dashboard.offers.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                data-testid="input-search-offers"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedGeo} onValueChange={setSelectedGeo}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white font-mono text-xs h-8" data-testid="select-geo">
                <Globe className="w-3 h-3 mr-1 text-slate-400" />
                <SelectValue placeholder="ГЕО" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="all" className="text-white font-mono text-xs">Все ГЕО</SelectItem>
                {allGeos.map(geo => (
                  <SelectItem key={geo} value={geo} className="text-white font-mono text-xs">{geo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white font-mono text-xs h-8" data-testid="select-category">
                <FolderOpen className="w-3 h-3 mr-1 text-slate-400" />
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="all" className="text-white font-mono text-xs">Все категории</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-white font-mono text-xs">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white font-mono text-xs h-8" data-testid="select-source">
                <Megaphone className="w-3 h-3 mr-1 text-slate-400" />
                <SelectValue placeholder="Источник" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="all" className="text-white font-mono text-xs">Все источники</SelectItem>
                {allSources.map(src => (
                  <SelectItem key={src} value={src} className="text-white font-mono text-xs">{src}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white font-mono text-xs h-8" data-testid="select-status">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="all" className="text-white font-mono text-xs">Все статусы</SelectItem>
                <SelectItem value="active" className="text-white font-mono text-xs">Active</SelectItem>
                <SelectItem value="paused" className="text-white font-mono text-xs">Paused</SelectItem>
              </SelectContent>
            </Select>

            {(selectedGeo !== "all" || selectedCategory !== "all" || selectedSource !== "all" || selectedStatus !== "all") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedGeo("all");
                  setSelectedCategory("all");
                  setSelectedSource("all");
                  setSelectedStatus("all");
                }}
                className="text-slate-400 hover:text-white text-xs h-8"
                data-testid="button-clear-filters"
              >
                Сбросить
              </Button>
            )}
          </div>
        </div>
        
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No offers yet</p>
            <Link href={`/dashboard/${role}/offers/new`}>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-mono">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Offer
              </Button>
            </Link>
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
                  <th className="px-4 py-3 font-medium">Partner Payout</th>
                  <th className="px-4 py-3 font-medium">Internal Cost</th>
                  <th className="px-4 py-3 font-medium">{t('dashboard.offers.status')}</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-white/5 transition-colors group" data-testid={`row-offer-${offer.id}`}>
                    <td className="px-4 py-3 text-slate-500">#{offer.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/${role}/offer/${offer.id}`}>
                        <span className="font-medium text-white group-hover:text-blue-400 transition-colors cursor-pointer" data-testid={`text-offer-name-${offer.id}`}>
                          {offer.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{offer.category}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {offer.geo.slice(0, 3).join(", ")}{offer.geo.length > 3 ? ` +${offer.geo.length - 3}` : ""}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">
                      {offer.partnerPayout ? `$${offer.partnerPayout}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-red-400 font-bold">
                      {offer.internalCost ? `$${offer.internalCost}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/${role}/offer/${offer.id}`}>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-white" data-testid={`button-view-${offer.id}`}>
                            <Eye className="w-3 h-3" />
                          </Button>
                        </Link>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-blue-400" data-testid={`button-edit-${offer.id}`}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-red-400" data-testid={`button-delete-${offer.id}`}>
                          <Trash className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
