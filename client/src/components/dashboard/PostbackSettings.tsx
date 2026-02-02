import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Save, Loader2, CheckCircle, AlertCircle, History, ExternalLink, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface PostbackSettingsData {
  id?: string;
  userId?: string;
  leadPostbackUrl: string | null;
  leadPostbackMethod: string;
  salePostbackUrl: string | null;
  salePostbackMethod: string;
}

interface PostbackLog {
  id: string;
  conversionId: string;
  url: string;
  method: string;
  responseCode: number | null;
  responseBody: string | null;
  success: boolean;
  retryCount: number;
  createdAt: string;
}

export function PostbackSettings() {
  const queryClient = useQueryClient();
  
  const [leadUrl, setLeadUrl] = useState("");
  const [leadMethod, setLeadMethod] = useState("GET");
  const [saleUrl, setSaleUrl] = useState("");
  const [saleMethod, setSaleMethod] = useState("GET");
  const [isSaved, setIsSaved] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data, isLoading } = useQuery<PostbackSettingsData>({
    queryKey: ["/api/postback-settings"],
    staleTime: 0,
    gcTime: 0,
  });

  const { data: logsData } = useQuery<PostbackLog[]>({
    queryKey: ["/api/postback-logs"],
    staleTime: 30000,
  });

  useEffect(() => {
    if (data && !isInitialized) {
      setLeadUrl(data.leadPostbackUrl || "");
      setLeadMethod(data.leadPostbackMethod || "GET");
      setSaleUrl(data.salePostbackUrl || "");
      setSaleMethod(data.salePostbackMethod || "GET");
      setIsInitialized(true);
      if (data.leadPostbackUrl || data.salePostbackUrl) {
        setIsSaved(true);
      }
    }
  }, [data, isInitialized]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<PostbackSettingsData>) => {
      const res = await fetch("/api/postback-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/postback-settings"] });
      setIsSaved(true);
      toast.success("Настройки постбеков сохранены");
    },
    onError: () => {
      toast.error("Ошибка сохранения");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      leadPostbackUrl: leadUrl || null,
      leadPostbackMethod: leadMethod,
      salePostbackUrl: saleUrl || null,
      salePostbackMethod: saleMethod,
    });
  };

  const hasChanges = () => {
    if (!data) return leadUrl || saleUrl;
    return (
      leadUrl !== (data.leadPostbackUrl || "") ||
      leadMethod !== (data.leadPostbackMethod || "GET") ||
      saleUrl !== (data.salePostbackUrl || "") ||
      saleMethod !== (data.salePostbackMethod || "GET")
    );
  };

  if (isLoading) {
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
            Настройка URL для получения уведомлений о конверсиях
          </p>
        </div>
        <Globe className="w-8 h-8 text-emerald-400" />
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Как работают постбеки?</h3>
            <p className="text-xs text-muted-foreground mb-2">
              При каждой конверсии система отправит HTTP запрос на указанные URL. Вы можете настроить отдельные URL для разных типов конверсий.
            </p>
            <p className="text-xs text-muted-foreground">
              Поддерживаемые макросы: <code className="bg-white/10 px-1 rounded">{"{click_id}"}</code>, <code className="bg-white/10 px-1 rounded">{"{status}"}</code>, <code className="bg-white/10 px-1 rounded">{"{sum}"}</code>, <code className="bg-white/10 px-1 rounded">{"{payout}"}</code>, <code className="bg-white/10 px-1 rounded">{"{subid}"}</code>, <code className="bg-white/10 px-1 rounded">{"{sub1}"}</code>-<code className="bg-white/10 px-1 rounded">{"{sub5}"}</code>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">REG</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Регистрация / Лид</h3>
              <p className="text-xs text-muted-foreground">Postback при регистрации пользователя</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs mb-2 block">Postback URL (Lead / Registration)</Label>
              <Input
                placeholder="https://your-tracker.com/postback?click_id={click_id}&status=lead"
                value={leadUrl}
                onChange={(e) => {
                  setLeadUrl(e.target.value);
                  setIsSaved(false);
                }}
                className="bg-muted border-border text-foreground font-mono text-sm"
                data-testid="input-lead-postback-url"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Используйте <code className="bg-white/5 px-1 rounded">status=lead</code> для регистраций
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs mb-2 block">HTTP метод</Label>
              <Select value={leadMethod} onValueChange={(v) => { setLeadMethod(v); setIsSaved(false); }}>
                <SelectTrigger className="w-full bg-muted border-border text-foreground" data-testid="select-lead-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-yellow-400 font-bold text-sm">FTD</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Депозит / Продажа</h3>
              <p className="text-xs text-muted-foreground">Postback при первом депозите или продаже</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs mb-2 block">Postback URL (Sale / Deposit)</Label>
              <Input
                placeholder="https://your-tracker.com/postback?click_id={click_id}&status=sale&payout={payout}"
                value={saleUrl}
                onChange={(e) => {
                  setSaleUrl(e.target.value);
                  setIsSaved(false);
                }}
                className="bg-muted border-border text-foreground font-mono text-sm"
                data-testid="input-sale-postback-url"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Используйте <code className="bg-white/5 px-1 rounded">status=sale</code> и <code className="bg-white/5 px-1 rounded">payout={"{payout}"}</code> для депозитов
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs mb-2 block">HTTP метод</Label>
              <Select value={saleMethod} onValueChange={(v) => { setSaleMethod(v); setIsSaved(false); }}>
                <SelectTrigger className="w-full bg-muted border-border text-foreground" data-testid="select-sale-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSaved && !hasChanges() && (
            <span className="flex items-center gap-1 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              Сохранено
            </span>
          )}
          {hasChanges() && (
            <span className="text-yellow-400 text-sm">
              Есть несохранённые изменения
            </span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending || (!hasChanges() && isSaved)}
          className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
          data-testid="button-save-postbacks"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Сохранить
        </Button>
      </div>

      {/* Postback Logs Section */}
      <Card className="bg-card border-border p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">История постбеков</h3>
        </div>
        
        {logsData && logsData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Дата</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">URL</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Метод</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Код</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Статус</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Retry</th>
                </tr>
              </thead>
              <tbody>
                {logsData.slice(0, 20).map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-muted">
                    <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                      {new Date(log.createdAt).toLocaleString('ru-RU', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-xs max-w-[300px] truncate">
                      <a 
                        href={log.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-emerald-400 flex items-center gap-1"
                      >
                        {log.url.length > 50 ? log.url.substring(0, 50) + '...' : log.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                      {log.method}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">
                      <span className={log.responseCode && log.responseCode >= 200 && log.responseCode < 300 ? 'text-emerald-400' : 'text-red-400'}>
                        {log.responseCode || '-'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {log.success ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                          <CheckCircle className="w-3 h-3" />
                          OK
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <XCircle className="w-3 h-3" />
                          Fail
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {log.retryCount > 0 ? `#${log.retryCount}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>История постбеков пуста</p>
            <p className="text-xs mt-1">Логи появятся после первых конверсий</p>
          </div>
        )}
      </Card>
    </div>
  );
}
