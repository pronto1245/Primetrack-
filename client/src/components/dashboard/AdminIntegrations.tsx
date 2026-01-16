import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Key, Webhook, Copy, Eye, EyeOff, Play, Ban, RefreshCw, ExternalLink } from "lucide-react";

const PERMISSIONS = [
  { value: "offers:read", label: "Офферы (чтение)" },
  { value: "offers:write", label: "Офферы (запись)" },
  { value: "partners:read", label: "Партнёры (чтение)" },
  { value: "partners:write", label: "Партнёры (запись)" },
  { value: "clicks:read", label: "Клики (чтение)" },
  { value: "conversions:read", label: "Конверсии (чтение)" },
  { value: "conversions:write", label: "Конверсии (запись)" },
  { value: "payouts:read", label: "Выплаты (чтение)" },
  { value: "payouts:write", label: "Выплаты (запись)" },
];

const WEBHOOK_EVENTS = [
  { value: "conversion.created", label: "Конверсия создана" },
  { value: "conversion.approved", label: "Конверсия одобрена" },
  { value: "conversion.rejected", label: "Конверсия отклонена" },
  { value: "payout.requested", label: "Выплата запрошена" },
  { value: "payout.approved", label: "Выплата одобрена" },
  { value: "payout.completed", label: "Выплата завершена" },
  { value: "partner.registered", label: "Партнёр зарегистрирован" },
  { value: "partner.activated", label: "Партнёр активирован" },
  { value: "offer.created", label: "Оффер создан" },
  { value: "offer.updated", label: "Оффер обновлён" },
];

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  apiKey?: string;
}

interface PlatformWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  method: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  failedAttempts: number;
  lastError: string | null;
  createdAt: string;
}

export default function AdminIntegrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("api-keys");
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [showNewWebhookDialog, setShowNewWebhookDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [newWebhookSecret, setNewWebhookSecret] = useState("");

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/platform-api-keys"],
  });

  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery<PlatformWebhook[]>({
    queryKey: ["/api/admin/platform-webhooks"],
  });

  const createKeyMutation = useMutation({
    mutationFn: async (data: { name: string; permissions: string[]; expiresInDays: number | null }) => {
      const res = await fetch("/api/admin/platform-api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-api-keys"] });
      setCreatedKey(data.apiKey);
      setNewKeyName("");
      setNewKeyPermissions([]);
      setNewKeyExpiry("never");
      toast({ title: "API ключ успешно создан" });
    },
    onError: () => {
      toast({ title: "Ошибка создания API ключа", variant: "destructive" });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-api-keys/${id}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-api-keys"] });
      toast({ title: "API ключ отозван" });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-api-keys"] });
      toast({ title: "API ключ удалён" });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data: { name: string; url: string; events: string[]; secret?: string }) => {
      const res = await fetch("/api/admin/platform-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-webhooks"] });
      setShowNewWebhookDialog(false);
      setNewWebhookName("");
      setNewWebhookUrl("");
      setNewWebhookEvents([]);
      setNewWebhookSecret("");
      toast({ title: "Вебхук успешно создан" });
    },
    onError: () => {
      toast({ title: "Ошибка создания вебхука", variant: "destructive" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-webhooks"] });
      toast({ title: "Вебхук удалён" });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-webhooks/${id}/test`, { method: "POST" });
      if (!res.ok) throw new Error("Test failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Тест вебхука успешен", description: `Статус: ${data.statusCode}` });
      } else {
        toast({ title: "Тест вебхука провален", description: `Статус: ${data.statusCode}`, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-webhooks"] });
    },
    onError: () => {
      toast({ title: "Тест вебхука провален", variant: "destructive" });
    },
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/platform-webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-webhooks"] });
    },
  });

  const handleCreateKey = () => {
    const expiresInDays = newKeyExpiry === "never" ? null : parseInt(newKeyExpiry);
    createKeyMutation.mutate({ name: newKeyName, permissions: newKeyPermissions, expiresInDays });
  };

  const handleCreateWebhook = () => {
    createWebhookMutation.mutate({
      name: newWebhookName,
      url: newWebhookUrl,
      events: newWebhookEvents,
      secret: newWebhookSecret || undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано в буфер обмена" });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API & Интеграции</h1>
        <p className="text-muted-foreground mt-1">
          Управление API ключами для внешних интеграций (n8n, Zapier, кастомные скрипты)
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="api-keys" data-testid="tab-api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Ключи
          </TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Вебхуки платформы
          </TabsTrigger>
          <TabsTrigger value="docs" data-testid="tab-docs">
            <ExternalLink className="h-4 w-4 mr-2" />
            Документация
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Ключи</CardTitle>
                <CardDescription>Ключи для X-API-Key аутентификации к /api/v1/* эндпоинтам</CardDescription>
              </div>
              <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-create-api-key">
                    <Plus className="h-4 w-4 mr-2" />
                    Создать ключ
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Создание API ключа</DialogTitle>
                    <DialogDescription>Сгенерировать новый API ключ для внешних интеграций</DialogDescription>
                  </DialogHeader>
                  {createdKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium mb-2">API ключ создан!</p>
                        <p className="text-xs text-green-600 mb-2">Скопируйте ключ сейчас — он больше не будет показан</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-white p-2 rounded border break-all">{createdKey}</code>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdKey)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => {
                          setCreatedKey(null);
                          setShowNewKeyDialog(false);
                        }}
                        data-testid="btn-close-key-dialog"
                      >
                        Готово
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Название</Label>
                        <Input
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="например, n8n Production"
                          data-testid="input-key-name"
                        />
                      </div>
                      <div>
                        <Label>Права доступа</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {PERMISSIONS.map((perm) => (
                            <div key={perm.value} className="flex items-center gap-2">
                              <Checkbox
                                id={perm.value}
                                checked={newKeyPermissions.includes(perm.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setNewKeyPermissions([...newKeyPermissions, perm.value]);
                                  } else {
                                    setNewKeyPermissions(newKeyPermissions.filter((p) => p !== perm.value));
                                  }
                                }}
                                data-testid={`checkbox-${perm.value}`}
                              />
                              <label htmlFor={perm.value} className="text-sm">{perm.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Срок действия</Label>
                        <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                          <SelectTrigger data-testid="select-expiry">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Бессрочно</SelectItem>
                            <SelectItem value="7">7 дней</SelectItem>
                            <SelectItem value="30">30 дней</SelectItem>
                            <SelectItem value="90">90 дней</SelectItem>
                            <SelectItem value="365">1 год</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleCreateKey}
                        disabled={!newKeyName || newKeyPermissions.length === 0}
                        data-testid="btn-submit-key"
                      >
                        Создать ключ
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {keysLoading ? (
                <p>Загрузка...</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">API ключи ещё не созданы</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Префикс</TableHead>
                      <TableHead>Права</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Посл. использование</TableHead>
                      <TableHead>Истекает</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{key.keyPrefix}...</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.permissions.slice(0, 3).map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                            ))}
                            {key.permissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{key.permissions.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.revokedAt ? (
                            <Badge variant="destructive">Отозван</Badge>
                          ) : key.isActive ? (
                            <Badge variant="default">Активен</Badge>
                          ) : (
                            <Badge variant="secondary">Неактивен</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Никогда"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "Никогда"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {key.isActive && !key.revokedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revokeKeyMutation.mutate(key.id)}
                                data-testid={`btn-revoke-${key.id}`}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteKeyMutation.mutate(key.id)}
                              data-testid={`btn-delete-key-${key.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Вебхуки платформы</CardTitle>
                <CardDescription>Отправка событий во внешние сервисы (n8n, Zapier, кастомные эндпоинты)</CardDescription>
              </div>
              <Dialog open={showNewWebhookDialog} onOpenChange={setShowNewWebhookDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-create-webhook">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить вебхук
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Добавление вебхука</DialogTitle>
                    <DialogDescription>Настроить новый эндпоинт вебхука</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Название</Label>
                      <Input
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        placeholder="например, n8n Conversions"
                        data-testid="input-webhook-name"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        placeholder="https://..."
                        data-testid="input-webhook-url"
                      />
                    </div>
                    <div>
                      <Label>События</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                        {WEBHOOK_EVENTS.map((event) => (
                          <div key={event.value} className="flex items-center gap-2">
                            <Checkbox
                              id={event.value}
                              checked={newWebhookEvents.includes(event.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewWebhookEvents([...newWebhookEvents, event.value]);
                                } else {
                                  setNewWebhookEvents(newWebhookEvents.filter((e) => e !== event.value));
                                }
                              }}
                              data-testid={`checkbox-event-${event.value}`}
                            />
                            <label htmlFor={event.value} className="text-sm">{event.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Секрет (опционально)</Label>
                      <Input
                        value={newWebhookSecret}
                        onChange={(e) => setNewWebhookSecret(e.target.value)}
                        placeholder="HMAC секрет для подписи"
                        type="password"
                        data-testid="input-webhook-secret"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Используется для заголовка X-Webhook-Signature</p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleCreateWebhook}
                      disabled={!newWebhookName || !newWebhookUrl || newWebhookEvents.length === 0}
                      data-testid="btn-submit-webhook"
                    >
                      Создать вебхук
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {webhooksLoading ? (
                <p>Загрузка...</p>
              ) : webhooks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Вебхуки ещё не настроены</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>События</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Посл. вызов</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id} data-testid={`row-webhook-${webhook.id}`}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px] block">
                            {webhook.url}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.slice(0, 2).map((e) => (
                              <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                            ))}
                            {webhook.events.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{webhook.events.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={webhook.isActive}
                              onCheckedChange={(checked) => toggleWebhookMutation.mutate({ id: webhook.id, isActive: checked })}
                              data-testid={`switch-webhook-${webhook.id}`}
                            />
                            {webhook.failedAttempts > 0 && (
                              <Badge variant="destructive" className="text-xs">{webhook.failedAttempts} ошибок</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {webhook.lastTriggeredAt ? new Date(webhook.lastTriggeredAt).toLocaleDateString() : "Никогда"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testWebhookMutation.mutate(webhook.id)}
                              disabled={testWebhookMutation.isPending}
                              data-testid={`btn-test-${webhook.id}`}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                              data-testid={`btn-delete-webhook-${webhook.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Документация API</CardTitle>
              <CardDescription>Как использовать API платформы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Аутентификация</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Все API запросы требуют API ключ в заголовке X-API-Key:
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`curl -H "X-API-Key: pt_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxx" \\
     https://your-domain.com/api/v1/offers`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Доступные эндпоинты</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/offers</code>
                    <span className="text-muted-foreground">- Список всех офферов</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/offers/:id</code>
                    <span className="text-muted-foreground">- Детали оффера</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/partners</code>
                    <span className="text-muted-foreground">- Список всех партнёров</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/partners/:id</code>
                    <span className="text-muted-foreground">- Детали партнёра</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/clicks</code>
                    <span className="text-muted-foreground">- Список кликов</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/conversions</code>
                    <span className="text-muted-foreground">- Список конверсий</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">POST</Badge>
                    <code>/api/v1/conversions</code>
                    <span className="text-muted-foreground">- Создать конверсию</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/payouts</code>
                    <span className="text-muted-foreground">- Список запросов на выплату</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">PATCH</Badge>
                    <code>/api/v1/payouts/:id</code>
                    <span className="text-muted-foreground">- Обновить статус выплаты</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/v1/stats</code>
                    <span className="text-muted-foreground">- Статистика платформы</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Интеграция с n8n</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Для интеграции с n8n создайте HTTP Request ноду с настройками:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Аутентификация: Header Auth</li>
                  <li>Имя заголовка: X-API-Key</li>
                  <li>Значение заголовка: Ваш API ключ</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Формат Webhook событий</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Вебхуки отправляют JSON с такой структурой:
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "event": "conversion.created",
  "timestamp": "2024-01-16T12:00:00.000Z",
  "data": {
    "conversionId": "...",
    "clickId": "...",
    "offerId": "...",
    "publisherId": "...",
    "conversionType": "lead",
    "status": "pending",
    "publisherPayout": 50,
    "advertiserCost": 60
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
