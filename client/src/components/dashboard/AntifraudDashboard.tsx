import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, AlertTriangle, Bot, Globe, Activity, Plus, Trash2, Edit2, Eye, HelpCircle, CheckCircle, XCircle, Clock, Flag, Zap, Copy, TrendingUp, Fingerprint } from "lucide-react";

interface AntifraudRule {
  id: string;
  scope: string;
  advertiserId?: string;
  name: string;
  description?: string;
  ruleType: string;
  threshold?: number;
  action: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

interface AntifraudLog {
  id: string;
  clickId?: string;
  offerId?: string;
  advertiserId?: string;
  publisherId?: string;
  fraudScore: number;
  isProxy: boolean;
  isVpn: boolean;
  isBot: boolean;
  isDatacenter: boolean;
  signals?: string;
  matchedRuleIds?: string[];
  action: string;
  ip?: string;
  userAgent?: string;
  country?: string;
  createdAt: string;
}

interface AntifraudSummary {
  totalClicks: number;
  blockedClicks: number;
  flaggedClicks: number;
  blockRate: number;
  avgFraudScore: number;
  byType: { type: string; count: number }[];
}

const RULE_TYPES = [
  { value: "fraud_score", label: "Fraud Score", description: "Блокировать по порогу fraud score", category: "score" },
  { value: "proxy_vpn", label: "Proxy/VPN", description: "Определять прокси и VPN трафик", category: "detection" },
  { value: "bot", label: "Боты", description: "Блокировать автоматизированных ботов", category: "detection" },
  { value: "datacenter", label: "Datacenter IP", description: "Определять IP датацентров", category: "detection" },
  { value: "duplicate_click", label: "Дубль клика", description: "Блокировать повторные клики", category: "duplicate" },
  { value: "duplicate_conversion", label: "Дубль конверсии", description: "Блокировать дубликаты конверсий (email/телефон/transaction)", category: "duplicate" },
  { value: "geo_mismatch", label: "GEO несоответствие", description: "Определять несоответствие геолокации", category: "detection" },
  { value: "device_fingerprint", label: "Fingerprint", description: "Подозрительный отпечаток устройства", category: "detection" },
  { value: "velocity_ip_minute", label: "Velocity IP/мин", description: "Лимит кликов с IP за минуту", category: "velocity" },
  { value: "velocity_ip_hour", label: "Velocity IP/час", description: "Лимит кликов с IP за час", category: "velocity" },
  { value: "velocity_ip_day", label: "Velocity IP/день", description: "Лимит кликов с IP за день", category: "velocity" },
  { value: "velocity_fingerprint", label: "Velocity Fingerprint", description: "Лимит кликов с устройства за час", category: "velocity" },
  { value: "velocity_publisher", label: "Velocity Publisher", description: "Лимит кликов паблишера за минуту", category: "velocity" },
  { value: "cr_anomaly", label: "CR аномалия", description: "Аномальный CR паблишера (отклонение >50%)", category: "anomaly" },
  { value: "ar_anomaly", label: "AR аномалия", description: "Аномальный Approval Rate паблишера", category: "anomaly" },
];

const ACTIONS = [
  { value: "allow", label: "Allow", color: "bg-green-500" },
  { value: "flag", label: "Flag", color: "bg-yellow-500" },
  { value: "hold", label: "Hold", color: "bg-orange-500" },
  { value: "reject", label: "Reject", color: "bg-red-400" },
  { value: "block", label: "Block", color: "bg-red-600" },
];

export default function AntifraudDashboard({ role }: { role: string }) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AntifraudRule | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    ruleType: "fraud_score",
    threshold: 80,
    action: "block",
    priority: 100,
    scope: role === "admin" ? "global" : "advertiser",
  });

  const { data: summary } = useQuery<AntifraudSummary>({
    queryKey: ["/api/antifraud/summary"],
  });

  const { data: rules = [] } = useQuery<AntifraudRule[]>({
    queryKey: ["/api/antifraud/rules"],
  });

  const { data: logs = [] } = useQuery<AntifraudLog[]>({
    queryKey: ["/api/antifraud/logs"],
  });

  const createRule = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/antifraud/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/antifraud/rules"] });
      setIsCreateOpen(false);
      setNewRule({
        name: "",
        description: "",
        ruleType: "fraud_score",
        threshold: 80,
        action: "block",
        priority: 100,
        scope: role === "admin" ? "global" : "advertiser",
      });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/antifraud/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/antifraud/rules"] });
      setEditingRule(null);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/antifraud/rules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/antifraud/rules"] });
    },
  });

  const getActionBadge = (action: string) => {
    const actionConfig = ACTIONS.find(a => a.value === action);
    return (
      <Badge className={actionConfig?.color || "bg-gray-500"}>
        {actionConfig?.label || action}
      </Badge>
    );
  };

  const getRuleTypeIcon = (ruleType: string) => {
    switch (ruleType) {
      case "bot": return <Bot className="h-4 w-4" />;
      case "proxy_vpn": return <Globe className="h-4 w-4" />;
      case "fraud_score": return <AlertTriangle className="h-4 w-4" />;
      case "datacenter": return <Globe className="h-4 w-4 text-purple-500" />;
      case "duplicate_click":
      case "duplicate_conversion": return <Copy className="h-4 w-4 text-orange-500" />;
      case "geo_mismatch": return <Globe className="h-4 w-4 text-yellow-500" />;
      case "device_fingerprint": return <Fingerprint className="h-4 w-4 text-blue-500" />;
      case "velocity_ip_minute":
      case "velocity_ip_hour":
      case "velocity_ip_day":
      case "velocity_fingerprint":
      case "velocity_publisher": return <Zap className="h-4 w-4 text-purple-500" />;
      case "cr_anomaly":
      case "ar_anomaly": return <TrendingUp className="h-4 w-4 text-red-500" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="antifraud-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Антифрод защита
          </h2>
          <p className="text-muted-foreground">
            {role === "admin" ? "Управление правилами для всей платформы" : "Настройки защиты для ваших офферов"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего кликов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-clicks">{summary?.totalClicks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Заблокировано</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="blocked-clicks">{summary?.blockedClicks || 0}</div>
            <p className="text-xs text-muted-foreground">{summary?.blockRate?.toFixed(1) || 0}% от всех</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Помечено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="flagged-clicks">{summary?.flaggedClicks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Активных правил</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="active-rules">{rules.filter(r => r.isActive).length}</div>
          </CardContent>
        </Card>
      </div>

      {summary?.byType && summary.byType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">По типу угрозы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              {summary.byType.map(item => (
                <div key={item.type} className="text-center">
                  <div className="text-xl font-bold">{item.count}</div>
                  <div className="text-sm text-muted-foreground">{item.type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules" data-testid="tab-rules">Правила</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Логи</TabsTrigger>
          <TabsTrigger value="help" data-testid="tab-help">
            <HelpCircle className="h-4 w-4 mr-1" />
            Инструкция
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Правила обнаружения</h3>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-rule">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить правило
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новое правило</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Название</Label>
                    <Input
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="Название правила"
                      data-testid="input-rule-name"
                    />
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <Input
                      value={newRule.description}
                      onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                      placeholder="Описание"
                      data-testid="input-rule-description"
                    />
                  </div>
                  <div>
                    <Label>Тип правила</Label>
                    <Select
                      value={newRule.ruleType}
                      onValueChange={(value) => setNewRule({ ...newRule, ruleType: value })}
                    >
                      <SelectTrigger data-testid="select-rule-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(newRule.ruleType === "fraud_score" || newRule.ruleType.startsWith("velocity_")) && (
                    <div>
                      <Label>
                        {newRule.ruleType === "fraud_score" ? "Порог (fraud score 0-100)" : 
                         newRule.ruleType === "velocity_ip_minute" ? "Лимит кликов/минуту" :
                         newRule.ruleType === "velocity_ip_hour" ? "Лимит кликов/час" :
                         newRule.ruleType === "velocity_ip_day" ? "Лимит кликов/день" :
                         newRule.ruleType === "velocity_fingerprint" ? "Лимит кликов/час" :
                         "Лимит кликов/минуту"}
                      </Label>
                      <Input
                        type="number"
                        value={newRule.threshold}
                        onChange={(e) => setNewRule({ ...newRule, threshold: parseInt(e.target.value) })}
                        placeholder={newRule.ruleType === "fraud_score" ? "80" : "10"}
                        data-testid="input-rule-threshold"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {newRule.ruleType === "fraud_score" 
                          ? "Рекомендуется: 60-80 для баланса точности" 
                          : "Рекомендуется: 10/мин, 100/час, 500/день"}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label>Действие</Label>
                    <Select
                      value={newRule.action}
                      onValueChange={(value) => setNewRule({ ...newRule, action: value })}
                    >
                      <SelectTrigger data-testid="select-rule-action">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIONS.map(action => (
                          <SelectItem key={action.value} value={action.value}>
                            {action.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Приоритет (меньше = выше)</Label>
                    <Input
                      type="number"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                      data-testid="input-rule-priority"
                    />
                  </div>
                  {role === "admin" && (
                    <div>
                      <Label>Область применения</Label>
                      <Select
                        value={newRule.scope}
                        onValueChange={(value) => setNewRule({ ...newRule, scope: value })}
                      >
                        <SelectTrigger data-testid="select-rule-scope">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Глобальное (вся платформа)</SelectItem>
                          <SelectItem value="advertiser">Для рекламодателя</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    onClick={() => createRule.mutate(newRule)}
                    disabled={!newRule.name || createRule.isPending}
                    className="w-full"
                    data-testid="button-save-rule"
                  >
                    {createRule.isPending ? "Сохранение..." : "Создать правило"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Нет правил антифрода. Создайте первое правило.
                </CardContent>
              </Card>
            ) : (
              rules.map((rule) => (
                <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""} data-testid={`rule-${rule.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded">
                          {getRuleTypeIcon(rule.ruleType)}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {rule.name}
                            {rule.scope === "global" && (
                              <Badge variant="outline" className="text-xs">Глобальное</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {RULE_TYPES.find(t => t.value === rule.ruleType)?.label}
                            {rule.threshold && ` ≥ ${rule.threshold}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getActionBadge(rule.action)}
                        <Badge variant="outline">Приоритет: {rule.priority}</Badge>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, data: { isActive: checked } })}
                          data-testid={`switch-rule-${rule.id}`}
                        />
                        {(role === "admin" || rule.scope === "advertiser") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRule.mutate(rule.id)}
                            data-testid={`button-delete-rule-${rule.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-muted-foreground mt-2">{rule.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <h3 className="text-lg font-semibold">Логи проверок</h3>
          
          {logs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Нет логов антифрода
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-sm font-medium">Время</th>
                    <th className="p-3 text-left text-sm font-medium">IP</th>
                    <th className="p-3 text-left text-sm font-medium">Страна</th>
                    <th className="p-3 text-left text-sm font-medium">Score</th>
                    <th className="p-3 text-left text-sm font-medium">Сигналы</th>
                    <th className="p-3 text-left text-sm font-medium">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="border-b" data-testid={`log-${log.id}`}>
                      <td className="p-3 text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm font-mono">{log.ip || "-"}</td>
                      <td className="p-3 text-sm">{log.country || "-"}</td>
                      <td className="p-3">
                        <Badge
                          variant={log.fraudScore > 60 ? "destructive" : log.fraudScore > 30 ? "outline" : "secondary"}
                        >
                          {log.fraudScore}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex gap-1 flex-wrap">
                          {log.isProxy && <Badge variant="outline" className="text-xs">Proxy</Badge>}
                          {log.isVpn && <Badge variant="outline" className="text-xs">VPN</Badge>}
                          {log.isBot && <Badge variant="outline" className="text-xs">Bot</Badge>}
                          {log.isDatacenter && <Badge variant="outline" className="text-xs">DC</Badge>}
                        </div>
                      </td>
                      <td className="p-3">{getActionBadge(log.action)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="help" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Как работает система антифрода
              </CardTitle>
              <CardDescription>
                Система защищает от фродового трафика и помогает сохранить качество конверсий
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-base">Принцип работы</h4>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-blue-500/20 rounded">
                      <Activity className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">1. Анализ клика</div>
                      <div className="text-sm text-muted-foreground">
                        При каждом клике собираются данные: IP, User-Agent, страна, fingerprint браузера
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-orange-500/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-medium">2. Проверка на угрозы</div>
                      <div className="text-sm text-muted-foreground">
                        Проверяется использование прокси/VPN, datacenter IP, ботов, автоматизации
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-purple-500/20 rounded">
                      <Shield className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <div className="font-medium">3. Расчёт Fraud Score</div>
                      <div className="text-sm text-muted-foreground">
                        Каждому клику присваивается оценка от 0 до 100 (выше = более подозрительный)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-green-500/20 rounded">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <div className="font-medium">4. Применение правил</div>
                      <div className="text-sm text-muted-foreground">
                        Правила проверяются по приоритету, первое сработавшее определяет действие
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-base">Типы правил</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {RULE_TYPES.map(type => (
                    <div key={type.value} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-muted rounded">
                        {getRuleTypeIcon(type.value)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-base">Действия при срабатывании</h4>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <div className="font-medium text-sm">Allow</div>
                    <div className="text-xs text-muted-foreground">Пропустить клик</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <Flag className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <div className="font-medium text-sm">Flag</div>
                    <div className="text-xs text-muted-foreground">Пометить как подозрительный</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <Clock className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <div className="font-medium text-sm">Hold</div>
                    <div className="text-xs text-muted-foreground">Задержать для проверки</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <XCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                    <div className="font-medium text-sm">Reject</div>
                    <div className="text-xs text-muted-foreground">Отклонить конверсию</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <div className="font-medium text-sm">Block</div>
                    <div className="text-xs text-muted-foreground">Полностью заблокировать</div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-base">Как добавить правило</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Перейдите на вкладку <span className="font-medium text-foreground">«Правила»</span></li>
                  <li>Нажмите кнопку <span className="font-medium text-foreground">«Добавить правило»</span></li>
                  <li>Укажите название и описание правила</li>
                  <li>Выберите тип правила (например, Fraud Score или Proxy/VPN)</li>
                  <li>Если выбран Fraud Score — укажите пороговое значение (рекомендуется 60-80)</li>
                  <li>Выберите действие при срабатывании (Block, Reject, Hold, Flag или Allow)</li>
                  <li>Укажите приоритет (меньшее число = выше приоритет)</li>
                  <li>Нажмите <span className="font-medium text-foreground">«Создать правило»</span></li>
                </ol>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-base">Категории правил</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-blue-400 mb-2">Детекция</div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Proxy/VPN, Боты</li>
                      <li>• Datacenter IP</li>
                      <li>• GEO несоответствие</li>
                      <li>• Fingerprint</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-purple-400 mb-2">Velocity (лимиты)</div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• IP/минуту (10)</li>
                      <li>• IP/час (100)</li>
                      <li>• IP/день (500)</li>
                      <li>• Fingerprint/час (30)</li>
                      <li>• Publisher/минуту (100)</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-orange-400 mb-2">Дубликаты</div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Дубль клика</li>
                      <li>• Дубль конверсии</li>
                      <li>• По email/телефону</li>
                      <li>• По transaction_id</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-red-400 mb-2">Аномалии</div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• CR аномалия (&gt;50%)</li>
                      <li>• AR аномалия (&gt;30%)</li>
                      <li>• Авто-расчёт baseline</li>
                      <li>• Требуется 50+ кликов</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-base">Рекомендуемые настройки</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="pt-4">
                      <h5 className="font-medium text-green-600 mb-2">Базовая защита</h5>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Fraud Score ≥ 80 → Block</li>
                        <li>• Bot Detection → Reject</li>
                        <li>• Velocity IP/мин ≥ 10 → Block</li>
                        <li>• Дубль конверсии → Reject</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-500/30 bg-orange-500/5">
                    <CardContent className="pt-4">
                      <h5 className="font-medium text-orange-600 mb-2">Строгая защита</h5>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Fraud Score ≥ 60 → Block</li>
                        <li>• Proxy/VPN → Reject</li>
                        <li>• Velocity IP/час ≥ 50 → Flag</li>
                        <li>• CR аномалия → Hold</li>
                        <li>• Datacenter IP → Reject</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-red-500/30 bg-red-500/5">
                    <CardContent className="pt-4">
                      <h5 className="font-medium text-red-600 mb-2">Максимальная защита</h5>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Fraud Score ≥ 50 → Block</li>
                        <li>• Все velocity → Block</li>
                        <li>• Proxy/VPN → Block</li>
                        <li>• Все аномалии → Reject</li>
                        <li>• GEO mismatch → Reject</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {role === "advertiser" && (
                <div className="border-t pt-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <h5 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Для рекламодателей
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      Вы можете создавать собственные правила, которые будут применяться только к вашим офферам. 
                      Глобальные правила платформы (отмеченные как «Глобальное») создаются администратором 
                      и действуют для всех рекламодателей.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
