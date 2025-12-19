import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Search, Filter, Edit, Trash, Eye, Loader2, Tag } from "lucide-react";
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
  const queryClient = useQueryClient();

  const { data: offers, isLoading, error } = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
    queryFn: async () => {
      const res = await fetch("/api/offers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    },
  });

  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    if (!searchQuery) return offers;
    return offers.filter((offer) =>
      offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [offers, searchQuery]);

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
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
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
          <Button variant="outline" size="sm" className="border-white/10 text-slate-300 font-mono" data-testid="button-filter">
            <Filter className="w-4 h-4 mr-2" />
            {t('dashboard.offers.filter')}
          </Button>
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
                      ${offer.partnerPayout}
                    </td>
                    <td className="px-4 py-3 text-red-400 font-bold">
                      {offer.internalCost ? `$${offer.internalCost}` : '-'}
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
