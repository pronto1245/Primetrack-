import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, TestTube, RefreshCw, Copy, Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

const EVENT_TYPES = [
  { id: "click", label: "Клик" },
  { id: "lead", label: "Лид" },
  { id: "sale", label: "Продажа" },
  { id: "install", label: "Установка" },
  { id: "rejected", label: "Отклонён" },
  { id: "hold_released", label: "Снят с холда" },
  { id: "payout_approved", label: "Выплата одобрена" },
  { id: "payout_paid", label: "Выплата выполнена" },
];

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  offerIds: string[] | null;
  publisherIds: string[] | null;
  method: string;
  headers: string | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastError: string | null;
  failedAttempts: number;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  eventType: string;
  status: string;
  statusCode: number | null;
  response: string | null;
  attemptNumber: number;
  createdAt: string;
}

export function WebhooksSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: ["lead", "sale"] as string[],
    method: "POST",
  });

  const { data: webhooks = [], isLoading } = useQuery<WebhookEndpoint[]>({
    queryKey: ["/api/webhooks"],
  });

  const { data: webhookLogs = [] } = useQuery<WebhookLog[]>({
    queryKey: ["/api/webhooks", selectedWebhook, "logs"],
    enabled: !!selectedWebhook,
    queryFn: async () => {
      if (!selectedWebhook) return [];
      const res = await fetch(`/api/webhooks/${selectedWebhook}/logs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setIsCreateOpen(false);
      setFormData({ name: "", url: "", events: ["lead", "sale"], method: "POST" });
      toast({ title: "Webhook создан" });
    },
    onError: () => {
      toast({ title: "Ошибка создания webhook", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete webhook");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook удалён" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}/test`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to test webhook");
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Тест успешен", description: `HTTP ${result.statusCode}` });
      } else {
        toast({ 
          title: "Тест не прошёл", 
          description: result.error || `HTTP ${result.statusCode}`,
          variant: "destructive" 
        });
      }
    },
  });

  const regenerateSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}/regenerate-secret`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to regenerate secret");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Секрет обновлён" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано" });
  };

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-webhooks-title">Webhooks</h2>
          <p className="text-muted-foreground">
            Получайте уведомления о событиях в реальном времени
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-webhook">
              <Plus className="w-4 h-4 mr-2" />
              Добавить Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Новый Webhook</DialogTitle>
              <DialogDescription>
                Укажите URL и выберите события для отправки
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Мой Webhook"
                  data-testid="input-webhook-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/webhook"
                  data-testid="input-webhook-url"
                />
              </div>
              <div className="space-y-2">
                <Label>События</Label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map(event => (
                    <div key={event.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`event-${event.id}`}
                        checked={formData.events.includes(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                        data-testid={`checkbox-event-${event.id}`}
                      />
                      <label htmlFor={`event-${event.id}`} className="text-sm">
                        {event.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Отмена
              </Button>
              <Button 
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.name || !formData.url || formData.events.length === 0}
                data-testid="button-save-webhook"
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">У вас пока нет webhooks</p>
            <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать первый webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {webhooks.map(webhook => (
            <AccordionItem key={webhook.id} value={webhook.id} className="border rounded-lg bg-card">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: webhook.id, isActive: checked })}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`switch-webhook-${webhook.id}`}
                    />
                    <span className="font-medium">{webhook.name}</span>
                  </div>
                  <div className="flex gap-1 ml-auto mr-4">
                    {webhook.events.slice(0, 3).map(event => (
                      <Badge key={event} variant="secondary" className="text-xs">
                        {EVENT_TYPES.find(e => e.id === event)?.label || event}
                      </Badge>
                    ))}
                    {webhook.events.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{webhook.events.length - 3}
                      </Badge>
                    )}
                  </div>
                  {webhook.lastError && (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">URL</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-sm bg-muted px-2 py-1 rounded truncate">
                          {webhook.url}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(webhook.url)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Секретный ключ</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-sm bg-muted px-2 py-1 rounded truncate">
                          {showSecrets[webhook.id] ? webhook.secret : "••••••••••••••••"}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSecrets(prev => ({ ...prev, [webhook.id]: !prev[webhook.id] }))}
                        >
                          {showSecrets[webhook.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(webhook.secret)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {webhook.lastError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                      <strong>Последняя ошибка:</strong> {webhook.lastError}
                      <span className="ml-2 text-muted-foreground">
                        (попытка {webhook.failedAttempts})
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testMutation.mutate(webhook.id)}
                      disabled={testMutation.isPending}
                      data-testid={`button-test-webhook-${webhook.id}`}
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Тест
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateSecretMutation.mutate(webhook.id)}
                      data-testid={`button-regenerate-${webhook.id}`}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Новый ключ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWebhook(selectedWebhook === webhook.id ? null : webhook.id)}
                    >
                      Логи
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(webhook.id)}
                      data-testid={`button-delete-webhook-${webhook.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {selectedWebhook === webhook.id && webhookLogs.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Последние запросы
                      </Label>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Событие</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead>HTTP</TableHead>
                            <TableHead>Дата</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {webhookLogs.slice(0, 10).map(log => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {EVENT_TYPES.find(e => e.id === log.eventType)?.label || log.eventType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {log.status === "success" ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <X className="w-4 h-4 text-red-500" />
                                )}
                              </TableCell>
                              <TableCell>{log.statusCode || "-"}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ru })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Проверка подписи</CardTitle>
          <CardDescription>
            Все запросы подписываются с помощью HMAC-SHA256
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
{`// Пример проверки подписи (Node.js)
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expected;
}

// В обработчике webhook:
const signature = req.headers['x-webhook-signature'];
const isValid = verifySignature(req.body, signature, YOUR_SECRET);`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
