import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, CheckCircle, XCircle, Loader2, AlertCircle, Save, 
  ArrowDownToLine, Copy, Play, RefreshCw 
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ExportMenu } from "@/components/ui/export-menu";

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
  const [postbackUrl, setPostbackUrl] = useState("");
  const [postbackMethod, setPostbackMethod] = useState("GET");
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery<PostbackSettings>({
    queryKey: ["/api/user/postback-settings"],
  });

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<PostbackLog[]>({
    queryKey: ["/api/publisher/postback-logs"],
  });

  useEffect(() => {
    if (settings) {
      setPostbackUrl(settings.leadPostbackUrl || settings.salePostbackUrl || "");
      setPostbackMethod(settings.leadPostbackMethod || "GET");
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { leadPostbackUrl: string; salePostbackUrl: string; leadPostbackMethod: string; salePostbackMethod: string }) => {
      const res = await fetch("/api/user/postback-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/postback-settings"] });
      toast.success("Настройки сохранены");
    },
    onError: () => {
      toast.error("Ошибка сохранения");
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      leadPostbackUrl: postbackUrl,
      salePostbackUrl: postbackUrl,
      leadPostbackMethod: postbackMethod,
      salePostbackMethod: postbackMethod,
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
        body: JSON.stringify({ url: testUrl, method: postbackMethod }),
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

      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ваш постбек URL</h3>
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
            <span><code className="text-emerald-400">{"{sub1}"}</code> - Sub1</span>
            <span><code className="text-emerald-400">{"{sub2}"}</code> - Sub2</span>
            <span><code className="text-emerald-400">{"{geo}"}</code> - Страна</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground font-mono mb-2 block">Postback URL</Label>
            <Input
              placeholder="https://your-tracker.com/postback?subid={click_id}&status={status}&payout={payout}"
              value={postbackUrl}
              onChange={(e) => setPostbackUrl(e.target.value)}
              className="bg-muted border-border text-foreground font-mono text-sm"
              data-testid="input-postback-url"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-2 block">Метод</Label>
            <Select value={postbackMethod} onValueChange={setPostbackMethod}>
              <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-method">
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
    </div>
  );
}
