import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, User, Mail, Phone, Send, Calendar, 
  MousePointer, Target, DollarSign, Check, X, Loader2, Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getCurrencySymbol, getOfferCurrency, formatCurrency } from "@/lib/utils";

interface PartnerProfileProps {
  publisherId: string;
}

interface PartnerDetails {
  id: string;
  username: string;
  email: string;
  telegram?: string | null;
  phone?: string | null;
  companyName?: string | null;
  createdAt: string;
  status: string;
  relationCreatedAt: string;
  clicks: number;
  conversions: number;
  payout: number;
}

interface Landing {
  id: string;
  name: string;
  url: string;
  currency?: string;
}

interface PartnerOffer {
  id: string;
  name: string;
  logoUrl: string | null;
  status: string;
  accessStatus: string;
  payout: string | null;
  payoutModel: string;
  currency: string;
  clicks: number;
  conversions: number;
  revenue: number;
  landings: Landing[];
  approvedLandings: string[] | null;
}

export function PartnerProfile({ publisherId }: PartnerProfileProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"grant" | "revoke" | "edit">("grant");
  const [selectedOffer, setSelectedOffer] = useState<PartnerOffer | null>(null);
  const [selectedLandings, setSelectedLandings] = useState<string[]>([]);

  const { data: partner, isLoading: isLoadingPartner } = useQuery<PartnerDetails>({
    queryKey: ["/api/advertiser/partners", publisherId],
    queryFn: async () => {
      const res = await fetch(`/api/advertiser/partners/${publisherId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch partner");
      return res.json();
    }
  });

  const { data: offers = [], isLoading: isLoadingOffers } = useQuery<PartnerOffer[]>({
    queryKey: ["/api/advertiser/partners", publisherId, "offers"],
    queryFn: async () => {
      const res = await fetch(`/api/advertiser/partners/${publisherId}/offers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    }
  });

  const updateAccessMutation = useMutation({
    mutationFn: async ({ offerId, status, approvedLandings }: { offerId: string; status: string; approvedLandings?: string[] }) => {
      return apiRequest("PUT", `/api/advertiser/partners/${publisherId}/offers/${offerId}`, { status, approvedLandings });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/partners", publisherId, "offers"] });
      setDialogOpen(false);
      setSelectedOffer(null);
      setSelectedLandings([]);
      
      const statusMessages: Record<string, string> = {
        approved: "Доступ выдан",
        revoked: "Доступ отозван",
        rejected: "Запрос отклонён"
      };
      toast({
        title: statusMessages[variables.status] || "Успешно",
        description: "Изменения сохранены"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить доступ",
        variant: "destructive"
      });
    }
  });

  const openGrantDialog = (offer: PartnerOffer) => {
    setSelectedOffer(offer);
    setDialogAction("grant");
    setSelectedLandings(offer.landings.map(l => l.id));
    setDialogOpen(true);
  };

  const openEditDialog = (offer: PartnerOffer) => {
    setSelectedOffer(offer);
    setDialogAction("edit");
    const currentApproved = offer.approvedLandings;
    if (currentApproved && currentApproved.length > 0) {
      setSelectedLandings(currentApproved);
    } else {
      setSelectedLandings(offer.landings.map(l => l.id));
    }
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedOffer) return;
    
    if (dialogAction === "grant" || dialogAction === "edit") {
      const approvedLandings = selectedLandings.length === selectedOffer.landings.length 
        ? [] 
        : selectedLandings;
      updateAccessMutation.mutate({ 
        offerId: selectedOffer.id, 
        status: "approved", 
        approvedLandings 
      });
    }
  };

  const handleRevoke = (offerId: string) => {
    updateAccessMutation.mutate({ offerId, status: "revoked" });
  };

  const handleReject = (offerId: string) => {
    updateAccessMutation.mutate({ offerId, status: "rejected" });
  };

  const handleRestore = (offer: PartnerOffer) => {
    openGrantDialog(offer);
  };

  const toggleLanding = (landingId: string) => {
    setSelectedLandings(prev => 
      prev.includes(landingId) 
        ? prev.filter(id => id !== landingId)
        : [...prev, landingId]
    );
  };

  const selectAllLandings = () => {
    if (selectedOffer) {
      setSelectedLandings(selectedOffer.landings.map(l => l.id));
    }
  };

  const deselectAllLandings = () => {
    setSelectedLandings([]);
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      paused: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      blocked: "bg-red-500/20 text-red-400 border-red-500/30"
    };
    return <Badge className={variants[status] || "bg-muted text-muted-foreground"}>{status}</Badge>;
  };

  const accessBadge = (offer: PartnerOffer) => {
    const status = offer.accessStatus;
    const variants: Record<string, { className: string; label: string }> = {
      approved: { className: "bg-emerald-500/20 text-emerald-400", label: "Одобрен" },
      pending: { className: "bg-yellow-500/20 text-yellow-400", label: "Ожидает" },
      rejected: { className: "bg-red-500/20 text-red-400", label: "Отклонён" },
      revoked: { className: "bg-red-500/20 text-red-400", label: "Отозван" },
      not_requested: { className: "bg-muted text-muted-foreground", label: "Не запрошен" }
    };
    const v = variants[status] || variants.not_requested;
    
    const hasRestrictions = status === "approved" && 
      offer.approvedLandings && 
      offer.approvedLandings.length > 0 && 
      offer.approvedLandings.length < offer.landings.length;
    
    return (
      <div className="flex flex-col gap-1">
        <Badge className={v.className}>{v.label}</Badge>
        {hasRestrictions && (
          <span className="text-xs text-yellow-400">(ограничено)</span>
        )}
      </div>
    );
  };

  if (isLoadingPartner) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-6">
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Партнёр не найден</p>
            <Link href="/dashboard/advertiser/partners">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к списку
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/advertiser/partners">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Профиль партнёра
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Информация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{partner.companyName || partner.username}</p>
              <p className="text-sm text-muted-foreground">@{partner.username}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Статус:</span>
              {statusBadge(partner.status)}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <TooltipProvider>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${partner.email}`} className="text-sm text-blue-400 hover:underline">
                    {partner.email}
                  </a>
                </div>
                
                {partner.telegram && (
                  <div className="flex items-center gap-3">
                    <Send className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={`https://t.me/${partner.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline"
                    >
                      {partner.telegram}
                    </a>
                  </div>
                )}
                
                {partner.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${partner.phone}`} className="text-sm text-blue-400 hover:underline">
                      {partner.phone}
                    </a>
                  </div>
                )}
              </TooltipProvider>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Партнёр с {new Date(partner.relationCreatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Статистика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-400 mb-1">
                  <MousePointer className="w-4 h-4" />
                  <span className="text-xs uppercase">Клики</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">{partner.clicks.toLocaleString()}</p>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-400 mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-xs uppercase">Конверсии</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">{partner.conversions.toLocaleString()}</p>
              </div>
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs uppercase">Выплаты (USD)</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(partner.payout)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Офферы</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingOffers ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : offers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет офферов</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Оффер</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Доступ</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Выплата</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Клики</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Конверсии</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {offers.map((offer) => (
                    <tr key={offer.id} data-testid={`row-offer-${offer.id}`} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {offer.logoUrl ? (
                            <img 
                              src={offer.logoUrl} 
                              alt={offer.name} 
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {offer.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-foreground font-medium">{offer.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{accessBadge(offer)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-emerald-400 font-mono">
                          {offer.payout ? `от ${getCurrencySymbol(getOfferCurrency(offer))}${offer.payout}` : "—"}
                        </span>
                        <span className="text-muted-foreground text-xs ml-1">/{offer.payoutModel}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono">{offer.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono">{offer.conversions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {offer.accessStatus === "not_requested" && (
                            <Button
                              data-testid={`button-grant-${offer.id}`}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                              onClick={() => openGrantDialog(offer)}
                              disabled={updateAccessMutation.isPending}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Дать доступ
                            </Button>
                          )}
                          {offer.accessStatus === "approved" && (
                            <>
                              {offer.landings.length > 0 && (
                                <Button
                                  data-testid={`button-edit-${offer.id}`}
                                  size="sm"
                                  variant="outline"
                                  className="border-border h-7 text-xs"
                                  onClick={() => openEditDialog(offer)}
                                  disabled={updateAccessMutation.isPending}
                                >
                                  <Settings className="w-3 h-3 mr-1" />
                                  Лендинги
                                </Button>
                              )}
                              <Button
                                data-testid={`button-revoke-${offer.id}`}
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => handleRevoke(offer.id)}
                                disabled={updateAccessMutation.isPending}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Отозвать
                              </Button>
                            </>
                          )}
                          {offer.accessStatus === "pending" && (
                            <>
                              <Button
                                data-testid={`button-approve-${offer.id}`}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                                onClick={() => openGrantDialog(offer)}
                                disabled={updateAccessMutation.isPending}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Одобрить
                              </Button>
                              <Button
                                data-testid={`button-reject-${offer.id}`}
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => handleReject(offer.id)}
                                disabled={updateAccessMutation.isPending}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Отклонить
                              </Button>
                            </>
                          )}
                          {(offer.accessStatus === "rejected" || offer.accessStatus === "revoked") && (
                            <Button
                              data-testid={`button-restore-${offer.id}`}
                              size="sm"
                              variant="outline"
                              className="border-border h-7 text-xs"
                              onClick={() => handleRestore(offer)}
                              disabled={updateAccessMutation.isPending}
                            >
                              Восстановить
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "grant" && "Выдать доступ к офферу"}
              {dialogAction === "edit" && "Изменить доступ к лендингам"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOffer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedOffer.logoUrl ? (
                  <img 
                    src={selectedOffer.logoUrl} 
                    alt={selectedOffer.name} 
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-background flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {selectedOffer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-foreground font-medium">{selectedOffer.name}</span>
              </div>

              {selectedOffer.landings.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Выберите лендинги для доступа:
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={selectAllLandings}
                      >
                        Все
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={deselectAllLandings}
                      >
                        Снять
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
                    {selectedOffer.landings.map((landing) => (
                      <label 
                        key={landing.id} 
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedLandings.includes(landing.id)}
                          onCheckedChange={() => toggleLanding(landing.id)}
                          data-testid={`checkbox-landing-${landing.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {landing.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {landing.url}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Выбрано: {selectedLandings.length} из {selectedOffer.landings.length}
                    {selectedLandings.length === selectedOffer.landings.length && " (все лендинги)"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  У этого оффера нет лендингов. Будет выдан полный доступ.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={updateAccessMutation.isPending}
            >
              Отмена
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirm}
              disabled={updateAccessMutation.isPending || (selectedOffer?.landings.length ? selectedLandings.length === 0 : false)}
              data-testid="button-confirm-access"
            >
              {updateAccessMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {dialogAction === "grant" ? "Выдать доступ" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
