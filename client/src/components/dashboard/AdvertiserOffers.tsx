import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Eye, Loader2, Tag, Globe, Megaphone, FolderOpen, Archive, ArchiveRestore } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { getCountryFlag } from "./CountrySelector";
import { useStaff } from "@/contexts/StaffContext";

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
  isTop: boolean;
  isExclusive: boolean;
  isPrivate: boolean;
  createdAt: string;
  landings?: OfferLanding[];
}

function getOfferPayout(offer: Offer): string {
  if (offer.partnerPayout) return offer.partnerPayout;
  if (offer.landings && offer.landings.length > 0) {
    return offer.landings[0].partnerPayout;
  }
  return '';
}

function getOfferInternalCost(offer: Offer): string | null {
  if (offer.internalCost) return offer.internalCost;
  if (offer.landings && offer.landings.length > 0) {
    return offer.landings[0].internalCost;
  }
  return null;
}

export function AdvertiserOffers({ role }: { role: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canWrite } = useStaff();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGeo, setSelectedGeo] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [filterNew, setFilterNew] = useState(false);
  const [filterTop, setFilterTop] = useState(false);
  const [filterExclusive, setFilterExclusive] = useState(false);
  const [filterPrivate, setFilterPrivate] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [offerToArchive, setOfferToArchive] = useState<Offer | null>(null);
  const hasWriteAccess = canWrite("offers");

  const archiveOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await fetch(`/api/offers/${offerId}/archive`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to archive offer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast.success("Оффер перемещён в архив");
      setArchiveDialogOpen(false);
      setOfferToArchive(null);
    },
    onError: () => {
      toast.error("Не удалось архивировать оффер");
    },
  });

  const handleArchiveClick = (offer: Offer) => {
    setOfferToArchive(offer);
    setArchiveDialogOpen(true);
  };

  const confirmArchive = () => {
    if (offerToArchive) {
      archiveOfferMutation.mutate(offerToArchive.id);
    }
  };

  const { data: offers, isLoading, error } = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
    queryFn: async () => {
      const res = await fetch("/api/offers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    },
  });

  const { data: offerStats } = useQuery<{ offerId: string; clicks: number; conversions: number; cr: number }[]>({
    queryKey: ["/api/offers/stats"],
    queryFn: async () => {
      const res = await fetch("/api/offers/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch offer stats");
      return res.json();
    },
  });

  const statsMap = useMemo(() => {
    if (!offerStats) return new Map<string, { clicks: number; conversions: number; cr: number }>();
    return new Map(offerStats.map(s => [s.offerId, { clicks: s.clicks, conversions: s.conversions, cr: s.cr }]));
  }, [offerStats]);

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
      const matchesSearch = searchQuery === "" || 
        offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.geo.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || offer.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesGeo = selectedGeo === "all" || offer.geo.includes(selectedGeo);
      const matchesSource = selectedSource === "all" || offer.trafficSources?.includes(selectedSource);
      const matchesStatus = selectedStatus === "all" || offer.status === selectedStatus;
      const isNew = offer.createdAt && new Date(offer.createdAt) > fourteenDaysAgo;
      const matchesNew = !filterNew || isNew;
      const matchesTop = !filterTop || offer.isTop;
      const matchesExclusive = !filterExclusive || offer.isExclusive;
      const matchesPrivate = !filterPrivate || offer.isPrivate;
      return matchesSearch && matchesCategory && matchesGeo && matchesSource && matchesStatus && matchesNew && matchesTop && matchesExclusive && matchesPrivate;
    });
  }, [offers, searchQuery, selectedCategory, selectedGeo, selectedSource, selectedStatus, filterNew, filterTop, filterExclusive, filterPrivate]);

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
          <h2 className="text-2xl font-bold font-mono text-foreground mb-2" data-testid="text-offers-title">
            {t('dashboard.offers.title')}
          </h2>
          <p className="text-muted-foreground text-sm font-mono">{t('dashboard.offers.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {canWrite("offers") && (
            <Link href={`/dashboard/${role}/offers/archived`}>
              <Button variant="outline" className="text-foreground font-mono" data-testid="button-view-archive">
                <Archive className="w-4 h-4 mr-2" />
                Архив
              </Button>
            </Link>
          )}
          {hasWriteAccess && (
            <Link href={`/dashboard/${role}/offers/new`}>
              <Button className="bg-blue-600 hover:bg-blue-500 text-foreground font-mono" data-testid="button-create-offer">
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.offers.create')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder={t('dashboard.offers.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500 font-mono"
                data-testid="input-search-offers"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedGeo} onValueChange={setSelectedGeo}>
              <SelectTrigger className="w-[140px] bg-muted border-border text-foreground font-mono text-xs h-8" data-testid="select-geo">
                <Globe className="w-3 h-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="ГЕО" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border max-h-[300px]">
                <SelectItem value="all" className="text-foreground font-mono text-xs">🌍 Все ГЕО</SelectItem>
                {allGeos.map(geo => (
                  <SelectItem key={geo} value={geo} className="text-foreground font-mono text-xs">
                    {getCountryFlag(geo)} {geo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px] bg-muted border-border text-foreground font-mono text-xs h-8" data-testid="select-category">
                <FolderOpen className="w-3 h-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border">
                <SelectItem value="all" className="text-foreground font-mono text-xs">Все категории</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-foreground font-mono text-xs">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[160px] bg-muted border-border text-foreground font-mono text-xs h-8" data-testid="select-source">
                <Megaphone className="w-3 h-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Источник" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border">
                <SelectItem value="all" className="text-foreground font-mono text-xs">Все источники</SelectItem>
                {allSources.map(src => (
                  <SelectItem key={src} value={src} className="text-foreground font-mono text-xs">{src}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] bg-muted border-border text-foreground font-mono text-xs h-8" data-testid="select-status">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border">
                <SelectItem value="all" className="text-foreground font-mono text-xs">Все статусы</SelectItem>
                <SelectItem value="active" className="text-foreground font-mono text-xs">Active</SelectItem>
                <SelectItem value="paused" className="text-foreground font-mono text-xs">Paused</SelectItem>
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

            {(selectedGeo !== "all" || selectedCategory !== "all" || selectedSource !== "all" || selectedStatus !== "all" || filterNew || filterTop || filterExclusive || filterPrivate) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedGeo("all");
                  setSelectedCategory("all");
                  setSelectedSource("all");
                  setSelectedStatus("all");
                  setFilterNew(false);
                  setFilterTop(false);
                  setFilterExclusive(false);
                  setFilterPrivate(false);
                }}
                className="text-muted-foreground hover:text-foreground text-xs h-8"
                data-testid="button-clear-filters"
              >
                Сбросить
              </Button>
            )}
          </div>
        </div>
        
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No offers yet</p>
            {hasWriteAccess && (
              <Link href={`/dashboard/${role}/offers/new`}>
                <Button className="bg-blue-600 hover:bg-blue-500 text-foreground font-mono">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Offer
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono table-fixed">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium w-[120px]">ID</th>
                  <th className="px-4 py-3 font-medium w-[200px]">{t('dashboard.offers.name')}</th>
                  <th className="px-4 py-3 font-medium w-[100px]">{t('dashboard.offers.category')}</th>
                  <th className="px-4 py-3 font-medium w-[70px]">CR%</th>
                  <th className="px-4 py-3 font-medium w-[120px]">Partner Payout</th>
                  <th className="px-4 py-3 font-medium w-[120px]">{t('dashboard.offers.geo')}</th>
                  <th className="px-4 py-3 font-medium w-[110px]">Internal Cost</th>
                  <th className="px-4 py-3 font-medium w-[80px]">{t('dashboard.offers.status')}</th>
                  <th className="px-4 py-3 font-medium text-right w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-muted transition-colors group" data-testid={`row-offer-${offer.id}`}>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {offer.logoUrl ? (
                          <img src={offer.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                            {offer.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>#{offer.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/${role}/offer/${offer.id}`}>
                          <span className="font-medium text-foreground group-hover:text-blue-400 transition-colors cursor-pointer" data-testid={`text-offer-name-${offer.id}`}>
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
                    <td className="px-4 py-3 text-muted-foreground">{offer.category}</td>
                    <td className="px-4 py-3 text-blue-400 font-bold" data-testid={`text-cr-${offer.id}`}>
                      {(() => {
                        const stats = statsMap.get(offer.id);
                        if (!stats || stats.clicks === 0) return "—";
                        return `${stats.cr}%`;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-bold" data-testid={`text-payout-${offer.id}`}>
                      {getOfferPayout(offer) ? `$${getOfferPayout(offer)}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1 flex-wrap">
                        {(() => {
                          const uniqueGeo = Array.from(new Set(offer.geo));
                          return (
                            <>
                              {uniqueGeo.slice(0, 3).map((g, i) => (
                                <span key={g} className="inline-flex items-center gap-0.5">
                                  <span>{getCountryFlag(g)}</span>
                                  <span>{g}</span>
                                  {i < Math.min(uniqueGeo.length, 3) - 1 && <span>,</span>}
                                </span>
                              ))}
                              {uniqueGeo.length > 3 && <span className="text-muted-foreground">+{uniqueGeo.length - 3}</span>}
                            </>
                          );
                        })()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-400 font-bold" data-testid={`text-cost-${offer.id}`}>
                      {getOfferInternalCost(offer) ? `$${getOfferInternalCost(offer)}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/${role}/offer/${offer.id}`}>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" data-testid={`button-view-${offer.id}`}>
                            <Eye className="w-3 h-3" />
                          </Button>
                        </Link>
                        {hasWriteAccess && (
                          <>
                            <Link href={`/dashboard/${role}/offers/new?edit=${offer.id}`}>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10" 
                                data-testid={`button-edit-${offer.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </Link>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10" 
                              data-testid={`button-archive-${offer.id}`}
                              onClick={() => handleArchiveClick(offer)}
                              title="В архив"
                            >
                              <Archive className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Архивировать оффер?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите архивировать оффер "{offerToArchive?.name}"? 
              Оффер будет скрыт из списка активных офферов, и партнёры потеряют к нему доступ. 
              Вы сможете восстановить оффер из архива в любое время.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmArchive();
              }}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={archiveOfferMutation.isPending}
            >
              {archiveOfferMutation.isPending ? "Архивация..." : "В архив"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
