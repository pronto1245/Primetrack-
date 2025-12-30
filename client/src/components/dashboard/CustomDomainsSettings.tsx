import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Plus, Trash2, RefreshCw, Copy, Shield, Globe, Star, Check, AlertTriangle, Clock, X } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";

interface CustomDomain {
  id: string;
  domain: string;
  verificationToken: string;
  verificationMethod: string;
  isVerified: boolean;
  verifiedAt: string | null;
  sslStatus: string;
  sslExpiresAt: string | null;
  isPrimary: boolean;
  isActive: boolean;
  lastError: string | null;
  createdAt: string;
}

interface DnsInstruction {
  type: string;
  name: string;
  value: string;
}

export function CustomDomainsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<CustomDomain | null>(null);
  
  const [formData, setFormData] = useState({
    domain: "",
    verificationMethod: "cname" as "cname" | "txt",
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setIsCreateOpen(false);
      setFormData({ domain: "", verificationMethod: "cname" });
      setSelectedDomain(data);
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
      toast({ title: "Домен подтверждён", description: "SSL сертификат будет выпущен автоматически" });
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано" });
  };

  const getSslBadge = (status: string, expiresAt: string | null) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <Shield className="w-3 h-3 mr-1" />
            SSL активен
          </Badge>
        );
      case "provisioning":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            Выпуск SSL...
          </Badge>
        );
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
                Введите домен и выберите метод верификации
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
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                <p className="text-xs text-blue-400">
                  <strong>Для SSL через Cloudflare:</strong>
                </p>
                <ol className="text-xs text-blue-400 list-decimal list-inside space-y-1">
                  <li>Добавьте домен в Cloudflare</li>
                  <li>Смените NS-серверы у регистратора на Cloudflare NS</li>
                  <li>Добавьте CNAME запись с включенным проксированием (оранжевое облачко)</li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  Cloudflare предоставит бесплатный SSL автоматически
                </p>
              </div>
              <div className="space-y-3">
                <Label>Метод верификации</Label>
                <RadioGroup
                  value={formData.verificationMethod}
                  onValueChange={(value: "cname" | "txt") => setFormData(prev => ({ ...prev, verificationMethod: value }))}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="cname" id="cname" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="cname" className="font-medium cursor-pointer">
                        CNAME запись (рекомендуется)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Добавьте одну CNAME запись: <code className="bg-muted px-1 rounded">ваш-домен → tracking.primetrack.pro</code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="txt" id="txt" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="txt" className="font-medium cursor-pointer">
                        TXT + CNAME записи
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Для CDN/прокси: добавьте две записи:
                      </p>
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <div><code className="bg-muted px-1 rounded">TXT: _primetrack.ваш-домен → токен</code></div>
                        <div><code className="bg-muted px-1 rounded">CNAME: ваш-домен → tracking.primetrack.pro</code></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Токен будет показан после добавления домена
                      </p>
                    </div>
                  </div>
                </RadioGroup>
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
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-3">Настройте DNS записи:</h4>
                      <DnsInstructions 
                        domain={domain.domain}
                        token={domain.verificationToken}
                        method={domain.verificationMethod as "cname" | "txt"}
                        onCopy={copyToClipboard}
                      />
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
                  <div className="space-y-3">
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
            <p>Добавьте домен и выберите метод верификации</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</div>
            <p>Настройте DNS записи у вашего регистратора доменов</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</div>
            <p>Нажмите "Проверить DNS" для верификации</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">4</div>
            <p>SSL сертификат будет выпущен автоматически</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DnsInstructions({ 
  domain, 
  token, 
  method,
  onCopy 
}: { 
  domain: string; 
  token: string; 
  method: "cname" | "txt";
  onCopy: (text: string) => void;
}) {
  const platformDomain = "tracking.primetrack.pro";
  
  if (method === "cname") {
    return (
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
            <TableCell className="font-mono text-xs">{domain}</TableCell>
            <TableCell className="font-mono text-xs">{platformDomain}</TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" onClick={() => onCopy(platformDomain)}>
                <Copy className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
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
          <TableCell><Badge>TXT</Badge></TableCell>
          <TableCell className="font-mono text-xs">_primetrack.{domain}</TableCell>
          <TableCell className="font-mono text-xs max-w-xs truncate">{token}</TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" onClick={() => onCopy(token)}>
              <Copy className="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell><Badge>CNAME</Badge></TableCell>
          <TableCell className="font-mono text-xs">{domain}</TableCell>
          <TableCell className="font-mono text-xs">{platformDomain}</TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" onClick={() => onCopy(platformDomain)}>
              <Copy className="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
