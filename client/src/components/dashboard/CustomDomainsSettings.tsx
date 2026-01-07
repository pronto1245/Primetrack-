import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, RefreshCw, Copy, Shield, Globe, Star, Check, AlertTriangle, Clock, X, ExternalLink } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";

interface CustomDomain {
  id: string;
  domain: string;
  verificationToken: string;
  isVerified: boolean;
  verifiedAt: string | null;
  sslStatus: string;
  sslExpiresAt: string | null;
  isPrimary: boolean;
  isActive: boolean;
  lastError: string | null;
  createdAt: string;
  dnsTarget: string | null;
  cloudflareHostnameId: string | null;
  cloudflareStatus: string | null;
  cloudflareSslStatus: string | null;
  requestStatus: string | null;
  nsVerified: boolean | null;
  rejectionReason: string | null;
  adminNotes: string | null;
  requestedAt: string | null;
  activatedAt: string | null;
}

export function CustomDomainsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    domain: "",
  });

  const { data: domains = [], isLoading } = useQuery<CustomDomain[]>({
    queryKey: ["/api/domains"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add domain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setIsCreateOpen(false);
      setFormData({ domain: "" });
      toast({ title: "Домен добавлен", description: "Настройте DNS записи для верификации" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/domains/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete domain");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Домен удалён" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/domains/${id}/verify`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Verification failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Домен подтверждён", description: "SSL сертификат выдаётся автоматически" });
    },
    onError: (error: Error) => {
      toast({ title: "Верификация не прошла", description: error.message, variant: "destructive" });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/domains/${id}/set-primary`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to set primary");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Основной домен установлен" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/domains/${id}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Sync failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Статус обновлён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка синхронизации", description: error.message, variant: "destructive" });
    },
  });

  const reprovisionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/domains/${id}/reprovision`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Reprovision failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Домен перенастроен", description: "Ожидайте активации SSL" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка перенастройки", description: error.message, variant: "destructive" });
    },
  });

  const submitRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/domains/${id}/submit-request`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Submit failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Заявка отправлена", description: "Администратор рассмотрит вашу заявку в ближайшее время" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка отправки заявки", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано" });
  };

  const getSslBadge = (status: string, expiresAt: string | null) => {
    switch (status) {
      case "ssl_active":
      case "active":
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <Shield className="w-3 h-3 mr-1" />
            SSL активен
          </Badge>
        );
      case "ssl_activating":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            SSL активируется...
          </Badge>
        );
      case "verified_no_ssl":
      case "pending_external":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            SSL ожидает выдачи
          </Badge>
        );
      case "ssl_failed":
      case "failed":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            SSL ошибка
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Ожидание
          </Badge>
        );
    }
  };

  const getRequestStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            Активен
          </Badge>
        );
      case "admin_review":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
            <Clock className="w-3 h-3 mr-1" />
            На рассмотрении
          </Badge>
        );
      case "provisioning":
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Настройка...
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Отклонён
          </Badge>
        );
      case "pending":
      case "ns_configured":
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Ожидает настройки NS
          </Badge>
        );
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-domains-title">Кастомные домены</h2>
          <p className="text-muted-foreground">
            Используйте свои домены для трекинг-ссылок
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-domain">
              <Plus className="w-4 h-4 mr-2" />
              Добавить домен
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Добавить домен</DialogTitle>
              <DialogDescription>
                Введите домен для трекинг-ссылок
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Домен</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="tracking.example.com"
                  data-testid="input-domain"
                />
                <p className="text-xs text-muted-foreground">
                  Рекомендуется использовать поддомен, например: track.yourdomain.com
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-3">
                <p className="text-sm font-medium text-blue-400">
                  Как подключить домен (NS-делегирование)
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    <strong>Шаг 1:</strong> Добавьте домен и перейдите к настройке
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Шаг 2:</strong> Измените NS-записи у регистратора на:
                  </p>
                  <div className="space-y-1">
                    <code className="block bg-muted px-2 py-1 rounded text-xs font-mono">angela.ns.cloudflare.com</code>
                    <code className="block bg-muted px-2 py-1 rounded text-xs font-mono">drake.ns.cloudflare.com</code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Шаг 3:</strong> Отправьте заявку на проверку администратору
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Шаг 4:</strong> После одобрения домен будет активирован
                  </p>
                </div>
                <p className="text-xs text-amber-500 mt-2">
                  ⏱ Изменение NS-записей может занять до 24-48 часов
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Отмена
              </Button>
              <Button 
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.domain || createMutation.isPending}
                data-testid="button-save-domain"
              >
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">У вас пока нет кастомных доменов</p>
            <p className="text-sm text-muted-foreground mb-4">
              Добавьте свой домен, чтобы трекинг-ссылки выглядели как часть вашего бренда
            </p>
            <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить первый домен
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map(domain => (
            <Card key={domain.id} className={domain.isPrimary ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {domain.isPrimary && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <CardTitle className="text-lg font-mono">{domain.domain}</CardTitle>
                    {domain.isVerified ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-400">
                        <Check className="w-3 h-3 mr-1" />
                        Подтверждён
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Не подтверждён
                      </Badge>
                    )}
                    {domain.isVerified && getSslBadge(domain.sslStatus, domain.sslExpiresAt)}
                  </div>
                  <div className="flex gap-2">
                    {domain.isVerified && !domain.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryMutation.mutate(domain.id)}
                        data-testid={`button-set-primary-${domain.id}`}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Основной
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(domain.id)}
                      data-testid={`button-delete-domain-${domain.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {domain.requestStatus && getRequestStatusBadge(domain.requestStatus)}
                
                {domain.requestStatus === "rejected" && domain.rejectionReason && (
                  <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                    <strong>Причина отклонения:</strong> {domain.rejectionReason}
                  </div>
                )}

                {(!domain.isVerified && domain.requestStatus !== "active") && (
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-3">
                      <h4 className="font-medium text-blue-400">Шаг 1: Настройте NS записи у регистратора</h4>
                      <p className="text-sm text-muted-foreground">
                        Измените NS записи вашего домена на Cloudflare nameservers:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm">angela.ns.cloudflare.com</code>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard("angela.ns.cloudflare.com")}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm">drake.ns.cloudflare.com</code>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard("drake.ns.cloudflare.com")}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Изменения NS могут занять до 24-48 часов для распространения.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-3">
                      <h4 className="font-medium text-yellow-400">Шаг 2: Отправьте заявку на проверку</h4>
                      <p className="text-sm text-muted-foreground">
                        После настройки NS записей отправьте заявку. Администратор проверит и активирует домен.
                      </p>
                    </div>
                    
                    {domain.requestStatus !== "admin_review" && domain.requestStatus !== "provisioning" && (
                      <Button
                        onClick={() => submitRequestMutation.mutate(domain.id)}
                        disabled={submitRequestMutation.isPending}
                        data-testid={`button-submit-request-${domain.id}`}
                      >
                        <ExternalLink className={`w-4 h-4 mr-2 ${submitRequestMutation.isPending ? 'animate-spin' : ''}`} />
                        Отправить заявку на проверку
                      </Button>
                    )}
                    
                    {domain.requestStatus === "admin_review" && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-blue-400">
                        Ваша заявка на рассмотрении. Ожидайте ответа администратора.
                      </div>
                    )}
                    
                    {domain.requestStatus === "provisioning" && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-400">
                        Домен настраивается. Это может занять несколько минут.
                      </div>
                    )}
                    
                    {domain.lastError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                        {domain.lastError}
                      </div>
                    )}
                  </div>
                )}
                
                {domain.isVerified && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Пример трекинг-ссылки</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 text-sm bg-muted px-2 py-1 rounded truncate">
                            https://{domain.domain}/click/offer-id/landing-id
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(`https://${domain.domain}/click/offer-id/landing-id`)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {domain.sslExpiresAt && (
                        <div>
                          <Label className="text-xs text-muted-foreground">SSL истекает</Label>
                          <p className="text-sm mt-1">
                            {format(new Date(domain.sslExpiresAt), "d MMMM yyyy", { locale: ru })}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {(domain.sslStatus !== "ssl_active" && domain.sslStatus !== "active") && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-3">
                        <p className="text-sm font-medium text-blue-400">SSL сертификат:</p>
                        <p className="text-xs text-muted-foreground">
                          SSL сертификат выдаётся автоматически после активации домена администратором.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {domain.cloudflareHostnameId && (
                        <Button
                          variant="outline"
                          onClick={() => syncMutation.mutate(domain.id)}
                          disabled={syncMutation.isPending}
                          data-testid={`button-sync-${domain.id}`}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                          Синхронизировать
                        </Button>
                      )}
                      
                      {(domain.sslStatus === "ssl_failed" || domain.sslStatus === "failed") && (
                        <Button
                          variant="outline"
                          className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                          onClick={() => reprovisionMutation.mutate(domain.id)}
                          disabled={reprovisionMutation.isPending}
                          data-testid={`button-reprovision-${domain.id}`}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${reprovisionMutation.isPending ? 'animate-spin' : ''}`} />
                          Перенастроить
                        </Button>
                      )}
                    </div>
                    
                    {domain.cloudflareHostnameId && (
                      <div className="text-xs text-muted-foreground">
                        Cloudflare: {domain.cloudflareStatus || "pending"} | SSL: {domain.cloudflareSslStatus || "pending"}
                      </div>
                    )}
                    
                    {domain.lastError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                        {domain.lastError}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Как это работает</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</div>
            <p>Добавьте домен в системе</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</div>
            <p>Измените NS-записи на Cloudflare (angela/drake.ns.cloudflare.com)</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</div>
            <p>Отправьте заявку на проверку администратору</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">4</div>
            <p>После одобрения домен активируется с SSL-сертификатом</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
