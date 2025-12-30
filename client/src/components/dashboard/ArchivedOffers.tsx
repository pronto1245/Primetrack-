import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArchiveRestore, Loader2, Tag, Search } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";

interface Offer {
  id: string;
  advertiserId: string;
  name: string;
  description: string;
  logoUrl: string | null;
  partnerPayout: string;
  category: string;
  geo: string[];
  status: string;
  archived: boolean;
  archivedAt: string | null;
}

export function ArchivedOffers({ role }: { role: string }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [offerToRestore, setOfferToRestore] = useState<Offer | null>(null);

  const { data: offers, isLoading, error } = useQuery<Offer[]>({
    queryKey: ["/api/offers/archived"],
    queryFn: async () => {
      const res = await fetch("/api/offers/archived", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch archived offers");
      return res.json();
    },
  });

  const restoreOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await fetch(`/api/offers/${offerId}/restore`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to restore offer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast.success("Оффер восстановлен");
      setRestoreDialogOpen(false);
      setOfferToRestore(null);
    },
    onError: () => {
      toast.error("Не удалось восстановить оффер");
    },
  });

  const handleRestoreClick = (offer: Offer) => {
    setOfferToRestore(offer);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = () => {
    if (offerToRestore) {
      restoreOfferMutation.mutate(offerToRestore.id);
    }
  };

  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    return offers.filter(offer => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return offer.name.toLowerCase().includes(query) || 
               offer.description?.toLowerCase().includes(query);
      }
      return true;
    });
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
        <p className="text-red-400">Не удалось загрузить архив</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/${role}/offers`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold font-mono text-foreground mb-1" data-testid="text-archive-title">
              Архив офферов
            </h2>
            <p className="text-muted-foreground text-sm font-mono">
              {filteredOffers.length} {filteredOffers.length === 1 ? 'оффер' : 'офферов'} в архиве
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Поиск в архиве..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500 font-mono"
              data-testid="input-search-archived"
            />
          </div>
        </div>
        
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Архив пуст</p>
            <Link href={`/dashboard/${role}/offers`}>
              <Button variant="outline" className="font-mono">
                <ArrowLeft className="w-4 h-4 mr-2" />
                К офферам
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Категория</th>
                  <th className="px-4 py-3 font-medium">ГЕО</th>
                  <th className="px-4 py-3 font-medium">Архивирован</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-muted transition-colors group" data-testid={`row-archived-${offer.id}`}>
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
                      <span className="font-medium text-foreground opacity-70" data-testid={`text-archived-name-${offer.id}`}>
                        {offer.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{offer.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {offer.geo.slice(0, 3).join(", ")}{offer.geo.length > 3 ? ` +${offer.geo.length - 3}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {offer.archivedAt ? new Date(offer.archivedAt).toLocaleDateString('ru-RU') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" 
                        data-testid={`button-restore-${offer.id}`}
                        onClick={() => handleRestoreClick(offer)}
                      >
                        <ArchiveRestore className="w-3 h-3 mr-1" />
                        Восстановить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Восстановить оффер?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите восстановить оффер "{offerToRestore?.name}"? 
              Оффер станет активным и партнёры снова получат к нему доступ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmRestore();
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={restoreOfferMutation.isPending}
            >
              {restoreOfferMutation.isPending ? "Восстановление..." : "Восстановить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
