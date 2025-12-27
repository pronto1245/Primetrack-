import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, Save, Play, CheckCircle, XCircle, Clock, 
  Loader2, ChevronDown, ChevronRight, RefreshCw, AlertCircle 
} from "lucide-react";
import { useState } from "react";
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
  
  const currentUrl = globalUrl !== null ? globalUrl : (data?.globalSettings?.postbackUrl || "");
  const currentMethod = globalMethod !== null ? globalMethod : (data?.globalSettings?.postbackMethod || "GET");

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/postbacks"] });
      setGlobalUrl(null);
      setGlobalMethod(null);
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
          <h2 className="text-2xl font-bold font-mono text-white mb-2" data-testid="text-postbacks-title">
            Постбеки
          </h2>
          <p className="text-slate-400 text-sm font-mono">
            Настройка URL для получения уведомлений о конверсиях
          </p>
        </div>
        <Globe className="w-8 h-8 text-blue-400" />
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Поддерживаемые макросы</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-300 font-mono">
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

      <Card className="bg-[#0A0A0A] border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Глобальный постбек</h3>
        <p className="text-xs text-slate-500 mb-4">
          URL по умолчанию для всех офферов (можно переопределить для каждого оффера)
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <Label className="text-xs text-slate-400 font-mono mb-2 block">Postback URL</Label>
            <Input
              placeholder="https://your-tracker.com/postback?click_id={click_id}&status={status}"
              value={currentUrl}
              onChange={(e) => setGlobalUrl(e.target.value)}
              className="bg-white/5 border-white/10 text-white font-mono text-sm"
              data-testid="input-global-postback-url"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400 font-mono mb-2 block">Метод</Label>
            <Select 
              value={currentMethod} 
              onValueChange={setGlobalMethod}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-global-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-white/10">
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

      <Card className="bg-[#0A0A0A] border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Тест постбека</h3>
        
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="https://your-tracker.com/postback?click_id={click_id}"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="bg-white/5 border-white/10 text-white font-mono text-sm flex-1"
            data-testid="input-test-url"
          />
          <Button
            onClick={handleTest}
            disabled={testLoading || !testUrl}
            variant="outline"
            className="border-white/10"
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
                <span className="text-xs text-slate-400">HTTP {testResult.status}</span>
              )}
              {testResult.responseTime && (
                <span className="text-xs text-slate-400">{testResult.responseTime}ms</span>
              )}
            </div>
            <code className="text-[10px] text-slate-400 break-all block">{testResult.url}</code>
            {testResult.error && (
              <p className="text-xs text-red-400 mt-1">{testResult.error}</p>
            )}
          </div>
        )}
      </Card>

      <Card className="bg-[#0A0A0A] border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Настройки по офферам</h3>
          <p className="text-xs text-slate-500">Переопределение URL и событий для каждого оффера</p>
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
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">Нет офферов</p>
            </div>
          )}
        </div>
      </Card>

      {data?.logs && data.logs.length > 0 && (
        <Card className="bg-[#0A0A0A] border-white/10">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Лог постбеков</h3>
              <p className="text-xs text-slate-500">Последние 50 запросов</p>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-400">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Время</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Код</th>
                  <th className="px-4 py-3">Попыток</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
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
                    <td className="px-4 py-3 text-slate-400">{log.responseCode || "-"}</td>
                    <td className="px-4 py-3 text-slate-400">{log.retryCount}</td>
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
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
        onClick={onToggle}
        data-testid={`postback-offer-${offer.id}`}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          <div>
            <p className="font-medium text-white">{offer.name}</p>
            <p className="text-xs text-slate-500">{offer.category}</p>
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
            <Label className="text-xs text-slate-400 font-mono mb-2 block">
              Postback URL (оставьте пустым для глобального)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-white/5 border-white/10 text-white font-mono text-sm flex-1"
                data-testid={`input-postback-url-${offer.id}`}
              />
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-24 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10">
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
              <Label className="text-xs text-slate-400">Lead</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={sendOnSale} 
                onCheckedChange={setSendOnSale}
                data-testid={`switch-sale-${offer.id}`}
              />
              <Label className="text-xs text-slate-400">Sale</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={sendOnRejected} 
                onCheckedChange={setSendOnRejected}
                data-testid={`switch-rejected-${offer.id}`}
              />
              <Label className="text-xs text-slate-400">Rejected</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={isActive} 
                onCheckedChange={setIsActive}
                data-testid={`switch-active-${offer.id}`}
              />
              <Label className="text-xs text-slate-400">Активно</Label>
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
