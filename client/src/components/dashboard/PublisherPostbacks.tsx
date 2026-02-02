import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, CheckCircle, XCircle, Loader2, AlertCircle, Save, 
  ArrowDownToLine, ArrowUpFromLine, Copy, Play, RefreshCw, Eye 
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ExportMenu } from "@/components/ui/export-menu";

interface RawClick {
  id: string;
  createdAt: string;
  rawOfferId: string | null;
  rawLandingId: string | null;
  rawPartnerId: string | null;
  resolvedOfferId: string | null;
  ip: string | null;
  userAgent: string | null;
  geo: string | null;
  status: string;
  rejectReason: string | null;
  clickId: string | null;
  offerName: string | null;
  sub1: string | null;
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

interface PostbackSettings {
  leadPostbackUrl: string | null;
  salePostbackUrl: string | null;
  leadPostbackMethod: string | null;
  salePostbackMethod: string | null;
}

export function PublisherPostbacks() {
  const queryClient = useQueryClient();
  const [leadUrl, setLeadUrl] = useState("");
  const [leadMethod, setLeadMethod] = useState("GET");
  const [saleUrl, setSaleUrl] = useState("");
  const [saleMethod, setSaleMethod] = useState("GET");
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery<PostbackSettings>({
    queryKey: ["/api/postback-settings"],
  });

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<PostbackLog[]>({
    queryKey: ["/api/publisher/postback-logs"],
  });

  useEffect(() => {
    if (settings && !isInitialized) {
      setLeadUrl(settings.leadPostbackUrl || "");
      setLeadMethod(settings.leadPostbackMethod || "GET");
      setSaleUrl(settings.salePostbackUrl || "");
      setSaleMethod(settings.salePostbackMethod || "GET");
      setIsInitialized(true);
    }
  }, [settings, isInitialized]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { leadPostbackUrl: string | null; salePostbackUrl: string | null; leadPostbackMethod: string; salePostbackMethod: string }) => {
      const res = await fetch("/api/postback-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/postback-settings"] });
      toast.success("Настройки сохранены");
    },
    onError: () => {
      toast.error("Ошибка сохранения");
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      leadPostbackUrl: leadUrl || null,
      salePostbackUrl: saleUrl || null,
      leadPostbackMethod: leadMethod,
      salePostbackMethod: saleMethod,
    });
  };

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано");
  };

  const [activeTab, setActiveTab] = useState("outgoing");
  const [rawClicksPage, setRawClicksPage] = useState(0);

  const { data: rawClicksData, isLoading: rawClicksLoading } = useQuery<{ data: RawClick[]; total: number }>({
    queryKey: ["/api/publisher/raw-clicks", rawClicksPage],
    queryFn: async () => {
      const res = await fetch(`/api/publisher/raw-clicks?limit=50&offset=${rawClicksPage * 50}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: activeTab === "incoming",
  });

  if (settingsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
            Настройка получения уведомлений о ваших конверсиях
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <ExportMenu dataset="postback-logs" />
          <Globe className="w-8 h-8 text-emerald-400" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted mb-4">
          <TabsTrigger value="outgoing" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" data-testid="tab-outgoing">
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
          <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ваши постбек URL</h3>
            <p className="text-xs text-muted-foreground">
              URL для получения уведомлений о конверсиях от рекламодателей
            </p>
          </div>
        </div>

        <div className="bg-emerald-500/10 border-emerald-500/20 p-3 rounded mb-4">
          <h4 className="text-xs font-semibold text-foreground mb-2">Доступные макросы:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground font-mono">
            <span><code className="text-emerald-400">{"{click_id}"}</code> - ID клика</span>
            <span><code className="text-emerald-400">{"{status}"}</code> - Статус</span>
            <span><code className="text-emerald-400">{"{payout}"}</code> - Выплата</span>
            <span><code className="text-emerald-400">{"{sum}"}</code> - Сумма</span>
            <span><code className="text-emerald-400">{"{offer_id}"}</code> - ID оффера</span>
            <span><code className="text-emerald-400">{"{subid}"}</code> - SubID партнёра</span>
            <span><code className="text-emerald-400">{"{sub1}"}</code> - Sub1</span>
            <span><code className="text-emerald-400">{"{geo}"}</code> - Страна</span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <h4 className="font-semibold text-blue-400 mb-2 text-sm">Настройка трекера (шаг 1)</h4>
            <p className="text-xs text-muted-foreground mb-2">
              При создании оффера в вашем трекере добавьте параметр с вашим click_id:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-red-400 font-semibold">Keitaro:</span>
                <code className="ml-2 text-muted-foreground">subid={"{subid}"}</code>
              </div>
              <div>
                <span className="text-purple-400 font-semibold">Binom:</span>
                <code className="ml-2 text-muted-foreground">subid={"{clickid}"}</code>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
              <h4 className="font-semibold text-red-400 mb-1 text-sm">Постбек для Keitaro (шаг 2)</h4>
              <p className="text-[10px] text-muted-foreground mb-1">Укажите ниже в поле Lead/Sale:</p>
              <div className="font-mono text-[11px] text-emerald-400 break-all">
                http://ваш-keitaro/postback?subid={"{subid}"}&status={"{status}"}&payout={"{payout}"}
              </div>
              <p className="text-[10px] text-amber-400 mt-1">{"{subid}"} — ваш оригинальный subid из Keitaro</p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded">
              <h4 className="font-semibold text-purple-400 mb-1 text-sm">Постбек для Binom (шаг 2)</h4>
              <p className="text-[10px] text-muted-foreground mb-1">Укажите ниже в поле Lead/Sale:</p>
              <div className="font-mono text-[11px] text-emerald-400 break-all">
                http://ваш-binom/postback?clickid={"{subid}"}&status={"{status}"}&payout={"{payout}"}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{"{subid}"} — ваш оригинальный clickid из Binom</p>
            </div>
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
                placeholder="https://your-tracker.com/postback?subid={subid}&status=lead"
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
                placeholder="https://your-tracker.com/postback?subid={subid}&status=sale"
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
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="button-save"
        >
          {updateSettingsMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Сохранить
        </Button>
      </Card>

      <Card className="bg-card border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Тест постбека</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Проверьте доступность вашего URL перед сохранением
        </p>
        
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

      <Card className="bg-blue-500/10 border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Как это работает?</h3>
            <p className="text-xs text-muted-foreground">
              Когда рекламодатель засчитывает вашу конверсию, система автоматически отправит уведомление на ваш URL 
              с информацией о клике, статусе и выплате. Вы можете использовать этот URL в своём трекере для автоматического 
              учёта конверсий.
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">История постбеков</h3>
            <p className="text-xs text-muted-foreground">Последние 50 уведомлений</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchLogs()} className="text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        {logs && logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Время</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Метод</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">HTTP код</th>
                  <th className="px-4 py-3">Попыток</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={log.url}>
                      {log.url}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.method}</td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Доставлено
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Ошибка
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
        ) : (
          <div className="p-8 text-center">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Нет данных о постбеках</p>
            <p className="text-xs text-muted-foreground mt-2">
              Постбеки появятся после первых конверсий
            </p>
          </div>
        )}
      </Card>

        </TabsContent>

        <TabsContent value="incoming" className="space-y-6">
          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Лог входящих запросов</h3>
                <p className="text-xs text-muted-foreground">
                  Ваши переходы по трекинг-ссылкам (для диагностики потерь кликов)
                </p>
              </div>
            </div>

            {rawClicksLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : rawClicksData?.data && rawClicksData.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-3">Время</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Оффер</th>
                        <th className="px-4 py-3">GEO</th>
                        <th className="px-4 py-3">IP</th>
                        <th className="px-4 py-3">Sub1</th>
                        <th className="px-4 py-3">Причина</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rawClicksData.data.map((rc) => (
                        <tr key={rc.id} className="hover:bg-muted" data-testid={`row-raw-click-${rc.id}`}>
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
                            {rc.rejectReason ? (
                              <span className="text-red-400 text-[10px]">{rc.rejectReason}</span>
                            ) : rc.clickId ? (
                              <span className="text-emerald-400 text-[10px]">→ {rc.clickId.slice(0, 8)}...</span>
                            ) : '-'}
                          </td>
                        </tr>
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
                <p className="text-xs mt-2">Запросы появятся при переходах по вашим трекинг-ссылкам</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
