import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, Save, Play, CheckCircle, XCircle, Clock, 
  Loader2, ChevronDown, ChevronRight, RefreshCw, AlertCircle,
  Key, Copy, Trash2, Plus, ExternalLink
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface PostbackSetting {
  id: string;
  offerId: string;
  postbackUrl: string | null;
  httpMethod: string | null;
  sendOnLead: boolean | null;
  sendOnSale: boolean | null;
  sendOnRejected: boolean | null;
  isActive: boolean;
  offer: {
    id: string;
    name: string;
    category: string;
  };
}

interface PostbackLog {
  id: string;
  conversionId: string;
  url: string;
  method: string;
  responseCode: number | null;
  success: boolean;
  retryCount: number;
  createdAt: string;
}

interface PostbackData {
  globalSettings: {
    postbackUrl: string | null;
    postbackMethod: string | null;
  } | null;
  offerSettings: PostbackSetting[];
  logs: PostbackLog[];
}

export function AdvertiserPostbacks() {
  const queryClient = useQueryClient();
  const [globalUrl, setGlobalUrl] = useState<string | null>(null);
  const [globalMethod, setGlobalMethod] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<PostbackData>({
    queryKey: ["/api/advertiser/postbacks"],
  });
  
  useEffect(() => {
    if (data?.globalSettings && globalUrl === null) {
      setGlobalUrl(data.globalSettings.postbackUrl || "");
      setGlobalMethod(data.globalSettings.postbackMethod || "GET");
    }
  }, [data]);
  
  const currentUrl = globalUrl ?? "";
  const currentMethod = globalMethod ?? "GET";

  const { data: offers } = useQuery<any[]>({
    queryKey: ["/api/advertiser/offers"],
  });

  const updateGlobalMutation = useMutation({
    mutationFn: async (data: { postbackUrl: string; postbackMethod: string }) => {
      const res = await fetch("/api/advertiser/postbacks/global", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/postbacks"] });
      if (response?.postbackUrl !== undefined) {
        setGlobalUrl(response.postbackUrl || "");
      }
      if (response?.postbackMethod !== undefined) {
        setGlobalMethod(response.postbackMethod || "GET");
      }
      toast.success("Глобальные настройки сохранены");
    },
    onError: () => {
      toast.error("Ошибка сохранения");
    },
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ offerId, ...data }: any) => {
      const res = await fetch(`/api/advertiser/postbacks/offer/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/postbacks"] });
      toast.success("Настройки оффера сохранены");
    },
  });

  const handleTest = async () => {
    if (!testUrl) return;
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const res = await fetch("/api/advertiser/postbacks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: testUrl, method: "GET" }),
      });
      const result = await res.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, error: "Network error" });
    } finally {
      setTestLoading(false);
    }
  };

  const toggleOffer = (offerId: string) => {
    const newSet = new Set(expandedOffers);
    if (newSet.has(offerId)) {
      newSet.delete(offerId);
    } else {
      newSet.add(offerId);
    }
    setExpandedOffers(newSet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground mb-2" data-testid="text-postbacks-title">
            Постбеки
          </h2>
          <p className="text-muted-foreground text-sm font-mono">
            Настройка URL для получения уведомлений о конверсиях
          </p>
        </div>
        <Globe className="w-8 h-8 text-blue-400" />
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Поддерживаемые макросы</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground font-mono">
              <span><code className="text-blue-400">{"{click_id}"}</code> - ID клика</span>
              <span><code className="text-blue-400">{"{status}"}</code> - Статус</span>
              <span><code className="text-blue-400">{"{sum}"}</code> - Сумма</span>
              <span><code className="text-blue-400">{"{payout}"}</code> - Выплата</span>
              <span><code className="text-blue-400">{"{sub1}"}</code> - Sub1</span>
              <span><code className="text-blue-400">{"{sub2}"}</code> - Sub2</span>
              <span><code className="text-blue-400">{"{sub3}"}</code> - Sub3</span>
              <span><code className="text-blue-400">{"{sub4}"}</code> - Sub4</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-card border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Глобальный постбек</h3>
        <p className="text-xs text-muted-foreground mb-4">
          URL по умолчанию для всех офферов (можно переопределить для каждого оффера)
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground font-mono mb-2 block">Postback URL</Label>
            <Input
              placeholder="https://your-tracker.com/postback?click_id={click_id}&status={status}"
              value={currentUrl}
              onChange={(e) => setGlobalUrl(e.target.value)}
              className="bg-muted border-border text-foreground font-mono text-sm"
              data-testid="input-global-postback-url"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-2 block">Метод</Label>
            <Select 
              value={currentMethod} 
              onValueChange={setGlobalMethod}
            >
              <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-global-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button
          onClick={() => updateGlobalMutation.mutate({ 
            postbackUrl: currentUrl, 
            postbackMethod: currentMethod 
          })}
          disabled={updateGlobalMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-save-global"
        >
          {updateGlobalMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Сохранить
        </Button>
      </Card>

      <Card className="bg-card border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Тест постбека</h3>
        
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="https://your-tracker.com/postback?click_id={click_id}"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="bg-muted border-border text-foreground font-mono text-sm flex-1"
            data-testid="input-test-url"
          />
          <Button
            onClick={handleTest}
            disabled={testLoading || !testUrl}
            variant="outline"
            className="border-border"
            data-testid="button-test-postback"
          >
            {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
        
        {testResult && (
          <div className={`p-3 rounded border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm font-semibold ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.success ? 'Успешно' : 'Ошибка'}
              </span>
              {testResult.status && (
                <span className="text-xs text-muted-foreground">HTTP {testResult.status}</span>
              )}
              {testResult.responseTime && (
                <span className="text-xs text-muted-foreground">{testResult.responseTime}ms</span>
              )}
            </div>
            <code className="text-[10px] text-muted-foreground break-all block">{testResult.url}</code>
            {testResult.error && (
              <p className="text-xs text-red-400 mt-1">{testResult.error}</p>
            )}
          </div>
        )}
      </Card>

      <KeitaroIntegration />

      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Настройки по офферам</h3>
          <p className="text-xs text-muted-foreground">Переопределение URL и событий для каждого оффера</p>
        </div>
        
        <div className="divide-y divide-white/5">
          {offers?.map((offer) => {
            const setting = data?.offerSettings.find(s => s.offerId === offer.id);
            const isExpanded = expandedOffers.has(offer.id);
            
            return (
              <OfferPostbackRow
                key={offer.id}
                offer={offer}
                setting={setting}
                isExpanded={isExpanded}
                onToggle={() => toggleOffer(offer.id)}
                onSave={(data) => updateOfferMutation.mutate({ offerId: offer.id, ...data })}
                isSaving={updateOfferMutation.isPending}
              />
            );
          })}
          
          {(!offers || offers.length === 0) && (
            <div className="p-8 text-center">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Нет офферов</p>
            </div>
          )}
        </div>
      </Card>

      {data?.logs && data.logs.length > 0 && (
        <Card className="bg-card border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Лог постбеков</h3>
              <p className="text-xs text-muted-foreground">Последние 50 запросов</p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Время</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Код</th>
                  <th className="px-4 py-3">Попыток</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {log.url}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Fail
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.responseCode || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.retryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function OfferPostbackRow({ 
  offer, 
  setting, 
  isExpanded, 
  onToggle, 
  onSave,
  isSaving
}: { 
  offer: any; 
  setting?: PostbackSetting; 
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [url, setUrl] = useState(setting?.postbackUrl || "");
  const [method, setMethod] = useState(setting?.httpMethod || "GET");
  const [sendOnLead, setSendOnLead] = useState(setting?.sendOnLead ?? true);
  const [sendOnSale, setSendOnSale] = useState(setting?.sendOnSale ?? true);
  const [sendOnRejected, setSendOnRejected] = useState(setting?.sendOnRejected ?? false);
  const [isActive, setIsActive] = useState(setting?.isActive ?? true);

  return (
    <div className="border-b border-white/5 last:border-0">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted"
        onClick={onToggle}
        data-testid={`postback-offer-${offer.id}`}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <div>
            <p className="font-medium text-foreground">{offer.name}</p>
            <p className="text-xs text-muted-foreground">{offer.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {setting?.postbackUrl && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              Настроено
            </span>
          )}
          {setting?.isActive === false && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400">
              Отключено
            </span>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 ml-7 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-2 block">
              Postback URL (оставьте пустым для глобального)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-muted border-border text-foreground font-mono text-sm flex-1"
                data-testid={`input-postback-url-${offer.id}`}
              />
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-24 bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                checked={sendOnLead} 
                onCheckedChange={setSendOnLead}
                data-testid={`switch-lead-${offer.id}`}
              />
              <Label className="text-xs text-muted-foreground">Lead</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={sendOnSale} 
                onCheckedChange={setSendOnSale}
                data-testid={`switch-sale-${offer.id}`}
              />
              <Label className="text-xs text-muted-foreground">Sale</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={sendOnRejected} 
                onCheckedChange={setSendOnRejected}
                data-testid={`switch-rejected-${offer.id}`}
              />
              <Label className="text-xs text-muted-foreground">Rejected</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={isActive} 
                onCheckedChange={setIsActive}
                data-testid={`switch-active-${offer.id}`}
              />
              <Label className="text-xs text-muted-foreground">Активно</Label>
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={() => onSave({ postbackUrl: url, httpMethod: method, sendOnLead, sendOnSale, sendOnRejected, isActive })}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid={`button-save-${offer.id}`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Сохранить
          </Button>
        </div>
      )}
    </div>
  );
}

interface PostbackToken {
  id: string;
  token: string;
  label: string;
  trackerType: "keitaro" | "binom";
  lastUsedAt: string | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

function KeitaroIntegration() {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [selectedTracker, setSelectedTracker] = useState<"keitaro" | "binom">("keitaro");

  const { data: tokens, isLoading } = useQuery<PostbackToken[]>({
    queryKey: ["/api/postback-tokens"],
  });

  const createTokenMutation = useMutation({
    mutationFn: async ({ label, trackerType }: { label: string; trackerType: "keitaro" | "binom" }) => {
      const res = await fetch("/api/postback-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label, trackerType }),
      });
      if (!res.ok) throw new Error("Failed to create token");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/postback-tokens"] });
      setNewLabel("");
      toast.success("Токен создан");
    },
    onError: () => {
      toast.error("Ошибка создания токена");
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/postback-tokens/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete token");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/postback-tokens"] });
      toast.success("Токен удалён");
    },
    onError: () => {
      toast.error("Ошибка удаления токена");
    },
  });

  const toggleTokenMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/postback-tokens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update token");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/postback-tokens"] });
      toast.success("Токен обновлён");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано в буфер обмена");
  };

  const getPostbackUrl = (token: string, trackerType: "keitaro" | "binom") => {
    const baseUrl = window.location.origin;
    if (trackerType === "binom") {
      return `${baseUrl}/api/postbacks/binom?token=${token}&clickid={clickid}&status={status}&payout={payout}`;
    }
    return `${baseUrl}/api/postbacks/keitaro?token=${token}&subid_1={subid_1}&status={status}&sum={revenue}`;
  };

  return (
    <Card className="bg-card border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          <Key className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-foreground">Интеграция с трекерами</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Генерация токенов для приёма постбеков от Keitaro и Binom
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <select
            value={selectedTracker}
            onChange={(e) => setSelectedTracker(e.target.value as "keitaro" | "binom")}
            className="bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm"
            data-testid="select-tracker-type"
          >
            <option value="keitaro">Keitaro</option>
            <option value="binom">Binom</option>
          </select>
          <Input
            placeholder="Название токена"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="bg-muted border-border text-foreground flex-1"
            data-testid="input-new-token-label"
          />
          <Button
            onClick={() => createTokenMutation.mutate({ label: newLabel, trackerType: selectedTracker })}
            disabled={createTokenMutation.isPending}
            className={selectedTracker === "binom" ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"}
            data-testid="button-create-token"
          >
            {createTokenMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tokens && tokens.length > 0 ? (
          <div className="space-y-3">
            {tokens.map((token) => (
              <div key={token.id} className="p-4 rounded-lg bg-muted border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Key className={`w-4 h-4 ${token.trackerType === "binom" ? "text-blue-400" : "text-orange-400"}`} />
                    <span className="font-semibold text-foreground">{token.label || (token.trackerType === "binom" ? "Binom" : "Keitaro")}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${token.trackerType === "binom" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>
                      {token.trackerType === "binom" ? "Binom" : "Keitaro"}
                    </span>
                    {token.isActive ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        Активен
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                        Отключён
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={token.isActive}
                      onCheckedChange={(isActive) => 
                        toggleTokenMutation.mutate({ id: token.id, isActive })
                      }
                      data-testid={`switch-token-${token.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTokenMutation.mutate(token.id)}
                      disabled={deleteTokenMutation.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      data-testid={`button-delete-token-${token.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Токен</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-black/20 px-2 py-1 rounded text-orange-400 flex-1 truncate">
                        {token.token}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(token.token)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Postback URL для {token.trackerType === "binom" ? "Binom" : "Keitaro"}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className={`text-[10px] bg-black/20 px-2 py-1 rounded flex-1 break-all ${token.trackerType === "binom" ? "text-blue-400" : "text-emerald-400"}`}>
                        {getPostbackUrl(token.token, token.trackerType || "keitaro")}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(getPostbackUrl(token.token, token.trackerType || "keitaro"))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                    <span>Использований: {token.usageCount}</span>
                    {token.lastUsedAt && (
                      <span>Последнее: {new Date(token.lastUsedAt).toLocaleString()}</span>
                    )}
                    <span>Создан: {new Date(token.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Нет токенов</p>
            <p className="text-xs text-muted-foreground">Создайте токен для интеграции с Keitaro или Binom</p>
          </div>
        )}

        {selectedTracker === "keitaro" ? (
          <Card className="bg-orange-500/10 border-orange-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Инструкция для Keitaro</h4>
                
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Шаг 1: Настройка оффера в Keitaro</p>
                  <p className="text-xs text-muted-foreground mb-1">URL оффера должен содержать параметр <code className="text-orange-400">sub1=&#123;subid&#125;</code></p>
                  <code className="text-[10px] bg-black/30 px-2 py-1 rounded block text-orange-300 break-all">
                    https://primetrack.pro/api/click/OFFER_ID/PUBLISHER_ID?sub1=&#123;subid&#125;&sub2=&#123;campaign_id&#125;&sub3=&#123;source&#125;
                  </code>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Шаг 2: Настройка постбека в Keitaro</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Офферы → выберите оффер → Постбеки → Добавить</li>
                    <li>Скопируйте Postback URL из карточки токена выше</li>
                    <li>Выберите события: Lead, Sale или все нужные</li>
                    <li>Метод: GET</li>
                  </ol>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Маппинг параметров:</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p><code className="text-orange-400">&#123;subid_1&#125;</code> → click_id (ID клика PrimeTrack, переданный в sub1)</p>
                    <p><code className="text-orange-400">&#123;status&#125;</code> → тип события (lead, sale, install)</p>
                    <p><code className="text-orange-400">&#123;revenue&#125;</code> → сумма выплаты</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-blue-500/10 border-blue-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Инструкция для Binom</h4>
                
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Шаг 1: Настройка оффера в Binom</p>
                  <p className="text-xs text-muted-foreground mb-1">URL оффера должен содержать параметр <code className="text-blue-400">sub1=&#123;clickid&#125;</code></p>
                  <code className="text-[10px] bg-black/30 px-2 py-1 rounded block text-blue-300 break-all">
                    https://primetrack.pro/api/click/OFFER_ID/PUBLISHER_ID?sub1=&#123;clickid&#125;&sub2=&#123;campaign_id&#125;&sub3=&#123;source&#125;
                  </code>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Шаг 2: Настройка постбека в Binom</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Офферы → выберите оффер → Постбеки → Добавить</li>
                    <li>Скопируйте Postback URL из карточки токена выше</li>
                    <li>Выберите события: Lead, Sale, Rebill</li>
                    <li>Метод: GET</li>
                  </ol>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Маппинг параметров:</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p><code className="text-blue-400">&#123;clickid&#125;</code> → click_id (ID клика PrimeTrack, переданный в sub1)</p>
                    <p><code className="text-blue-400">&#123;status&#125;</code> → тип события (lead, sale, rebill, approved)</p>
                    <p><code className="text-blue-400">&#123;payout&#125;</code> → сумма выплаты</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Card>
  );
}
