import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, Save, Play, CheckCircle, XCircle, 
  Loader2, ChevronDown, ChevronRight, RefreshCw, AlertCircle,
  Copy, ArrowDownToLine, ArrowUpFromLine, Eye
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ExportMenu } from "@/components/ui/export-menu";
import { ClickFlowTimeline, buildClickFlowStages } from "@/components/ClickFlowTimeline";

interface RawClick {
  id: string;
  createdAt: string;
  rawOfferId: string | null;
  rawLandingId: string | null;
  rawPartnerId: string | null;
  resolvedOfferId: string | null;
  resolvedLandingId: string | null;
  resolvedPublisherId: string | null;
  ip: string | null;
  userAgent: string | null;
  geo: string | null;
  status: string;
  rejectReason: string | null;
  checkStage: string | null;
  clickId: string | null;
  offerName: string | null;
  publisherName: string | null;
  publisherShortId: string | null;
  sub1: string | null;
}

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
    leadPostbackUrl: string | null;
    leadPostbackMethod: string | null;
    salePostbackUrl: string | null;
    salePostbackMethod: string | null;
  } | null;
  offerSettings: PostbackSetting[];
  logs: PostbackLog[];
}

export function AdvertiserPostbacks() {
  const queryClient = useQueryClient();
  const [leadUrl, setLeadUrl] = useState("");
  const [leadMethod, setLeadMethod] = useState("GET");
  const [saleUrl, setSaleUrl] = useState("");
  const [saleMethod, setSaleMethod] = useState("GET");
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  const { data, isLoading } = useQuery<PostbackData>({
    queryKey: ["/api/advertiser/postbacks"],
  });
  
  useEffect(() => {
    if (data?.globalSettings && !isInitialized) {
      setLeadUrl(data.globalSettings.leadPostbackUrl || "");
      setLeadMethod(data.globalSettings.leadPostbackMethod || "GET");
      setSaleUrl(data.globalSettings.salePostbackUrl || "");
      setSaleMethod(data.globalSettings.salePostbackMethod || "GET");
      setIsInitialized(true);
    }
  }, [data, isInitialized]);

  const { data: offers } = useQuery<any[]>({
    queryKey: ["/api/advertiser/offers"],
  });

  const updateGlobalMutation = useMutation({
    mutationFn: async (data: { 
      leadPostbackUrl: string | null; 
      leadPostbackMethod: string;
      salePostbackUrl: string | null;
      salePostbackMethod: string;
    }) => {
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
      const res = await fetch("/api/postback-test", {
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

  const [activeTab, setActiveTab] = useState("outgoing");
  const [rawClicksPage, setRawClicksPage] = useState(0);
  const [expandedRawClicks, setExpandedRawClicks] = useState<Set<string>>(new Set());
  
  const toggleRawClickExpand = (id: string) => {
    setExpandedRawClicks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const { data: rawClicksData, isLoading: rawClicksLoading } = useQuery<{ data: RawClick[]; total: number }>({
    queryKey: ["/api/advertiser/raw-clicks", rawClicksPage],
    queryFn: async () => {
      const res = await fetch(`/api/advertiser/raw-clicks?limit=50&offset=${rawClicksPage * 50}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: activeTab === "incoming",
  });

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
        <div className="flex gap-2 items-center">
          <ExportMenu dataset="postback-logs" />
          <Globe className="w-8 h-8 text-blue-400" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted mb-4">
          <TabsTrigger value="outgoing" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400" data-testid="tab-outgoing">
            <ArrowUpFromLine className="w-4 h-4 mr-2" />
            Исходящие
          </TabsTrigger>
          <TabsTrigger value="incoming" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-incoming">
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Входящие запросы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outgoing" className="space-y-6">

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
            <h4 className="font-semibold text-blue-400 mb-2">Поддерживаемые параметры:</h4>
            <code className="text-muted-foreground">click_id, clickid, subid, tid, sub1, cid</code>
            <br />
            <code className="text-muted-foreground">payout, sum, revenue, amount</code>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
            <h4 className="font-semibold text-amber-400 mb-2">Статусы (указывайте явно):</h4>
            <code className="text-muted-foreground">status=lead (регистрация)</code>
            <br />
            <code className="text-muted-foreground">status=sale (депозит/покупка)</code>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <h4 className="font-semibold text-blue-400 mb-2">Настройка постбека в вашей системе</h4>
            <p className="text-xs text-muted-foreground mb-2">
              PrimeTrack передаёт вам <code className="bg-muted px-1 rounded">click_id</code> при редиректе на лендинг. 
              Когда происходит конверсия, отправьте этот click_id обратно в постбеке:
            </p>
            <div className="space-y-1 font-mono text-xs">
              <div className="text-muted-foreground break-all">
                https://{platformDomain}/api/postback?click_id=<span className="text-amber-400">CLICK_ID</span>&status=lead&payout=10
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Замените <code className="bg-muted px-1 rounded text-amber-400">CLICK_ID</code> на значение которое вы получили при редиректе (параметр указан в настройках лендинга, по умолчанию <code className="bg-muted px-1 rounded">aff_click_id</code>)
            </p>
          </div>
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

        <div className="grid gap-6 md:grid-cols-2 mb-4">
          <div className="space-y-4 p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-xs">REG</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Lead / Регистрация</h4>
                <p className="text-[10px] text-muted-foreground">Постбек при регистрации</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-2 block">Postback URL</Label>
              <Input
                placeholder="https://your-system.com/postback?click_id={click_id}&status=lead"
                value={leadUrl}
                onChange={(e) => setLeadUrl(e.target.value)}
                className="bg-muted border-border text-foreground font-mono text-sm"
                data-testid="input-lead-postback-url"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-2 block">Метод</Label>
              <Select value={leadMethod} onValueChange={setLeadMethod}>
                <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-lead-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4 p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-xs">FTD</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Sale / Депозит</h4>
                <p className="text-[10px] text-muted-foreground">Постбек при продаже</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-2 block">Postback URL</Label>
              <Input
                placeholder="https://your-system.com/postback?click_id={click_id}&status=sale"
                value={saleUrl}
                onChange={(e) => setSaleUrl(e.target.value)}
                className="bg-muted border-border text-foreground font-mono text-sm"
                data-testid="input-sale-postback-url"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-2 block">Метод</Label>
              <Select value={saleMethod} onValueChange={setSaleMethod}>
                <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-sale-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Button
          onClick={() => updateGlobalMutation.mutate({ 
            leadPostbackUrl: leadUrl || null,
            leadPostbackMethod: leadMethod,
            salePostbackUrl: saleUrl || null,
            salePostbackMethod: saleMethod,
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

        </TabsContent>

        <TabsContent value="incoming" className="space-y-6">
          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Лог входящих запросов</h3>
                <p className="text-xs text-muted-foreground">
                  Все HTTP-запросы на отслеживание кликов (для диагностики потерь)
                </p>
              </div>
            </div>

            {rawClicksLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : rawClicksData?.data && rawClicksData.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                        <th className="px-2 py-3 w-8"></th>
                        <th className="px-4 py-3">Время</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Оффер</th>
                        <th className="px-4 py-3">Партнёр</th>
                        <th className="px-4 py-3">GEO</th>
                        <th className="px-4 py-3">IP</th>
                        <th className="px-4 py-3">Sub1</th>
                        <th className="px-4 py-3">Этап</th>
                        <th className="px-4 py-3">Причина</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rawClicksData.data.map((rc) => (
                        <React.Fragment key={rc.id}>
                          <tr className="hover:bg-muted" data-testid={`row-raw-click-${rc.id}`}>
                            <td className="px-2 py-3">
                              <button
                                onClick={() => toggleRawClickExpand(rc.id)}
                                className="text-muted-foreground hover:text-foreground p-1"
                                data-testid={`button-expand-click-${rc.id}`}
                              >
                                {expandedRawClicks.has(rc.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {new Date(rc.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded ${
                                rc.status === 'processed' 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : rc.status === 'rejected'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {rc.status === 'processed' ? 'OK' : rc.status === 'rejected' ? 'Отклонён' : 'Ожидание'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {rc.offerName || rc.rawOfferId || '-'}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {rc.publisherShortId && rc.publisherName 
                                ? `${rc.publisherShortId} - ${rc.publisherName}`
                                : rc.rawPartnerId || '-'}
                            </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rc.geo || '-'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rc.ip || '-'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[100px] truncate">
                            {rc.sub1 || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {rc.checkStage ? (
                              <span className={`text-[10px] px-2 py-0.5 rounded ${
                                rc.checkStage === 'redirect' 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {rc.checkStage}
                              </span>
                            ) : '-'}
                          </td>
                            <td className="px-4 py-3">
                              {rc.rejectReason ? (
                                <span className="text-red-400 text-[10px]">{rc.rejectReason}</span>
                              ) : rc.clickId ? (
                                <span className="text-emerald-400 text-[10px]">→ {rc.clickId.slice(0, 8)}...</span>
                              ) : '-'}
                            </td>
                          </tr>
                          {expandedRawClicks.has(rc.id) && (
                            <tr className="bg-muted/30" data-testid={`row-click-flow-${rc.id}`}>
                              <td colSpan={10} className="px-6 py-4">
                                <div className="max-w-md">
                                  <h4 className="text-sm font-medium mb-3">Путь клика</h4>
                                  <ClickFlowTimeline stages={buildClickFlowStages(rc)} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Всего: {rawClicksData.total} записей
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={rawClicksPage === 0}
                      onClick={() => setRawClicksPage(p => p - 1)}
                      data-testid="button-prev-page"
                    >
                      Назад
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={(rawClicksPage + 1) * 50 >= rawClicksData.total}
                      onClick={() => setRawClicksPage(p => p + 1)}
                      data-testid="button-next-page"
                    >
                      Вперёд
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Нет входящих запросов</p>
                <p className="text-xs mt-2">Запросы появятся при переходах по трекинг-ссылкам</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
