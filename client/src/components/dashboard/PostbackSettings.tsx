import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
          <h2 className="text-2xl font-bold font-mono text-white mb-2" data-testid="text-postbacks-title">
            Постбеки
          </h2>
          <p className="text-slate-400 text-sm font-mono">
            Настройка URL для получения уведомлений о конверсиях
          </p>
        </div>
        <Globe className="w-8 h-8 text-emerald-400" />
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Как работают постбеки?</h3>
            <p className="text-xs text-slate-300 mb-2">
              При каждой конверсии система отправит HTTP запрос на указанные URL. Вы можете настроить отдельные URL для разных типов конверсий.
            </p>
            <p className="text-xs text-slate-400">
              Поддерживаемые макросы: <code className="bg-white/10 px-1 rounded">{"{click_id}"}</code>, <code className="bg-white/10 px-1 rounded">{"{status}"}</code>, <code className="bg-white/10 px-1 rounded">{"{sum}"}</code>, <code className="bg-white/10 px-1 rounded">{"{payout}"}</code>, <code className="bg-white/10 px-1 rounded">{"{sub1}"}</code>-<code className="bg-white/10 px-1 rounded">{"{sub5}"}</code>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#0A0A0A] border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">REG</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Регистрация / Лид</h3>
              <p className="text-xs text-slate-500">Postback при регистрации пользователя</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-slate-400 text-xs mb-2 block">Postback URL</Label>
              <Input
                placeholder="https://your-tracker.com/postback?click_id={click_id}&status={status}"
                value={leadUrl}
                onChange={(e) => {
                  setLeadUrl(e.target.value);
                  setIsSaved(false);
                }}
                className="bg-white/5 border-white/10 text-white font-mono text-sm"
                data-testid="input-lead-postback-url"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-2 block">HTTP метод</Label>
              <Select value={leadMethod} onValueChange={(v) => { setLeadMethod(v); setIsSaved(false); }}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white" data-testid="select-lead-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-yellow-400 font-bold text-sm">FTD</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Депозит / Продажа</h3>
              <p className="text-xs text-slate-500">Postback при первом депозите или продаже</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-slate-400 text-xs mb-2 block">Postback URL</Label>
              <Input
                placeholder="https://your-tracker.com/postback?click_id={click_id}&status={status}&sum={sum}"
                value={saleUrl}
                onChange={(e) => {
                  setSaleUrl(e.target.value);
                  setIsSaved(false);
                }}
                className="bg-white/5 border-white/10 text-white font-mono text-sm"
                data-testid="input-sale-postback-url"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-2 block">HTTP метод</Label>
              <Select value={saleMethod} onValueChange={(v) => { setSaleMethod(v); setIsSaved(false); }}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white" data-testid="select-sale-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10">
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
    </div>
  );
}
