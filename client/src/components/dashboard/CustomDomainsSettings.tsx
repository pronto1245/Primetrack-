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
      toast({ title: "Домен подтверждён", description: "Настройте SSL через Cloudflare" });
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

  const checkSslMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/domains/${id}/check-ssl`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "SSL check failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      const status = data.sslCheck?.status;
      if (status === "ssl_active") {
        toast({ 
          title: "SSL активен!", 
          description: data.sslCheck?.issuer ? `Сертификат от ${data.sslCheck.issuer}` : undefined 
        });
      } else if (status === "ssl_activating") {
        toast({ 
          title: "SSL в процессе", 
          description: "Попробуйте через несколько минут" 
        });
      } else if (status === "verified_no_ssl") {
        toast({ 
          title: "SSL не настроен", 
          description: "Настройте SSL через Cloudflare",
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Проверка SSL", 
          description: data.sslCheck?.error || "Статус обновлён",
          variant: status === "ssl_failed" ? "destructive" : "default"
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка проверки SSL", description: error.message, variant: "destructive" });
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
            <ExternalLink className="w-3 h-3 mr-1" />
            Настройте SSL в Cloudflare
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
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-2">
                <p className="text-sm font-medium text-emerald-400">
                  Настройка DNS через Cloudflare (рекомендуется)
                </p>
                <p className="text-xs text-muted-foreground">
                  Добавьте CNAME запись:
                </p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  {formData.domain || "ваш-домен"} → tracking.primetrack.pro
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Включите оранжевое облачко (Proxy) для автоматического SSL
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
                {!domain.isVerified && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h4 className="font-medium">Добавьте CNAME запись:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Тип</TableHead>
                            <TableHead>Имя</TableHead>
                            <TableHead>Значение</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell><Badge>CNAME</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{domain.domain}</TableCell>
                            <TableCell className="font-mono text-xs">tracking.primetrack.pro</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard("tracking.primetrack.pro")}>
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <p className="text-xs text-muted-foreground">
                        В Cloudflare включите оранжевое облачко (Proxy) для автоматического SSL
                      </p>
                    </div>
                    <Button
                      onClick={() => verifyMutation.mutate(domain.id)}
                      disabled={verifyMutation.isPending}
                      data-testid={`button-verify-${domain.id}`}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
                      Проверить DNS
                    </Button>
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
                        <p className="text-sm font-medium text-blue-400">Настройте SSL через Cloudflare:</p>
                        <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                          <li>Добавьте домен <code className="bg-muted px-1 rounded">{domain.domain}</code> в Cloudflare</li>
                          <li>Смените NS-серверы у регистратора на Cloudflare NS</li>
                          <li>Включите проксирование (оранжевое облачко) для CNAME записи</li>
                          <li>Cloudflare автоматически выдаст SSL сертификат</li>
                        </ol>
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => checkSslMutation.mutate(domain.id)}
                      disabled={checkSslMutation.isPending}
                      data-testid={`button-check-ssl-${domain.id}`}
                    >
                      <Shield className={`w-4 h-4 mr-2 ${checkSslMutation.isPending ? 'animate-spin' : ''}`} />
                      Проверить SSL
                    </Button>
                    
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
            <p>Добавьте домен</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</div>
            <p>Добавьте CNAME запись в Cloudflare с включенным проксированием</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</div>
            <p>Проверьте DNS и SSL</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
