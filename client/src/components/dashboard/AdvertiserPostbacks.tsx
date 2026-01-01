import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, Save, Play, CheckCircle, XCircle, 
  Loader2, ChevronDown, ChevronRight, RefreshCw, AlertCircle,
  Copy, ArrowDownToLine, ArrowUpFromLine
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
  direction: string;
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
      toast.success("Настройки сохранены");
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано");
  };

  const platformDomain = window.location.host;
  const universalPostbackUrl = `https://${platformDomain}/api/postback?click_id={click_id}&status={status}&payout={payout}`;

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
            Настройка приёма и отправки конверсий
          </p>
        </div>
        <Globe className="w-8 h-8 text-blue-400" />
      </div>

      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowDownToLine className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Входящий постбек (приём конверсий)</h3>
            <p className="text-xs text-muted-foreground">
              Один универсальный URL для приёма конверсий от внешних трекеров
            </p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground font-mono">Ваш постбек URL</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(universalPostbackUrl)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-copy-postback-url"
            >
              <Copy className="w-4 h-4 mr-1" /> Копировать
            </Button>
          </div>
          <code className="text-sm text-green-400 break-all block font-mono">
            {universalPostbackUrl}
          </code>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
            <h4 className="font-semibold text-blue-400 mb-2">Поддерживаемые параметры click_id:</h4>
            <code className="text-muted-foreground">click_id, clickid, subid, subid_1, tid, sub1, cid</code>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
            <h4 className="font-semibold text-amber-400 mb-2">Маппинг статусов:</h4>
            <code className="text-muted-foreground">lead, reg → Lead | sale, dep, ftd → Sale | install → Install</code>
          </div>
        </div>

        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded">
          <p className="text-xs text-muted-foreground">
            <strong className="text-emerald-400">Как это работает:</strong> Вставьте этот URL в настройки вашего трекера (Keitaro, Binom, Voluum, etc.). 
            Система автоматически определит оффер и партнёра по click_id.
          </p>
        </div>
      </Card>

      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowUpFromLine className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Исходящий постбек (уведомление вашей системы)</h3>
            <p className="text-xs text-muted-foreground">
              URL куда система будет отправлять уведомления о конверсиях
            </p>
          </div>
        </div>

        <div className="bg-blue-500/10 border-blue-500/20 p-3 rounded mb-4">
          <h4 className="text-xs font-semibold text-foreground mb-2">Доступные макросы:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground font-mono">
            <span><code className="text-blue-400">{"{click_id}"}</code> - ID клика</span>
            <span><code className="text-blue-400">{"{status}"}</code> - Статус</span>
            <span><code className="text-blue-400">{"{payout}"}</code> - Выплата</span>
            <span><code className="text-blue-400">{"{sum}"}</code> - Сумма</span>
            <span><code className="text-blue-400">{"{offer_id}"}</code> - ID оффера</span>
            <span><code className="text-blue-400">{"{publisher_id}"}</code> - ID партнёра</span>
            <span><code className="text-blue-400">{"{sub1}"}</code> - Sub1</span>
            <span><code className="text-blue-400">{"{geo}"}</code> - Страна</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground font-mono mb-2 block">Postback URL</Label>
            <Input
              placeholder="https://your-system.com/postback?click_id={click_id}&status={status}"
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
            placeholder="https://your-tracker.com/postback?click_id=test123"
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
            </div>
            {testResult.error && (
              <p className="text-xs text-red-400 mt-1">{testResult.error}</p>
            )}
          </div>
        )}
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
                  <th className="px-4 py-3">Направление</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Код</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        log.direction === 'inbound' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {log.direction === 'inbound' ? '← Входящий' : '→ Исходящий'}
                      </span>
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
