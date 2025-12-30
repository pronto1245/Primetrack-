import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowLeft, User, Mail, Phone, Send, Calendar, 
  MousePointer, Target, DollarSign, Check, X, Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

interface PartnerOffer {
  id: string;
  name: string;
  logoUrl: string | null;
  status: string;
  accessStatus: string;
  payout: string | null;
  payoutModel: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

export function PartnerProfile({ publisherId }: PartnerProfileProps) {
  const queryClient = useQueryClient();

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
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      return apiRequest("PUT", `/api/advertiser/partners/${publisherId}/offers/${offerId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/partners", publisherId, "offers"] });
    }
  });

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      paused: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      blocked: "bg-red-500/20 text-red-400 border-red-500/30"
    };
    return <Badge className={variants[status] || "bg-muted text-muted-foreground"}>{status}</Badge>;
  };

  const accessBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      approved: { className: "bg-emerald-500/20 text-emerald-400", label: "Одобрен" },
      pending: { className: "bg-yellow-500/20 text-yellow-400", label: "Ожидает" },
      rejected: { className: "bg-red-500/20 text-red-400", label: "Отклонён" },
      revoked: { className: "bg-red-500/20 text-red-400", label: "Отозван" },
      not_requested: { className: "bg-muted text-muted-foreground", label: "Не запрошен" }
    };
    const v = variants[status] || variants.not_requested;
    return <Badge className={v.className}>{v.label}</Badge>;
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
                  <span className="text-xs uppercase">Выплаты</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">${partner.payout.toFixed(2)}</p>
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
                      <td className="px-4 py-3">{accessBadge(offer.accessStatus)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-emerald-400 font-mono">
                          {offer.payout ? `от $${offer.payout}` : "—"}
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
                              onClick={() => updateAccessMutation.mutate({ offerId: offer.id, status: "approved" })}
                              disabled={updateAccessMutation.isPending}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Дать доступ
                            </Button>
                          )}
                          {offer.accessStatus === "approved" && (
                            <Button
                              data-testid={`button-revoke-${offer.id}`}
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => updateAccessMutation.mutate({ offerId: offer.id, status: "revoked" })}
                              disabled={updateAccessMutation.isPending}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Отозвать
                            </Button>
                          )}
                          {offer.accessStatus === "pending" && (
                            <>
                              <Button
                                data-testid={`button-approve-${offer.id}`}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                                onClick={() => updateAccessMutation.mutate({ offerId: offer.id, status: "approved" })}
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
                                onClick={() => updateAccessMutation.mutate({ offerId: offer.id, status: "rejected" })}
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
                              onClick={() => updateAccessMutation.mutate({ offerId: offer.id, status: "approved" })}
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
    </div>
  );
}
