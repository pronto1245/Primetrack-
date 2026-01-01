import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, CheckCircle, XCircle, Loader2, RefreshCw, Search, Copy, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PostbackLog {
  id: string;
  conversionId: string;
  direction: string;
  url: string;
  method: string;
  responseCode: number | null;
  success: boolean;
  retryCount: number;
  recipientType: string;
  createdAt: string;
}

export function AdminPostbacks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logs, isLoading, refetch } = useQuery<PostbackLog[]>({
    queryKey: ["/api/admin/postback-logs"],
  });

  const filteredLogs = logs?.filter(log => {
    if (statusFilter === "success" && !log.success) return false;
    if (statusFilter === "failed" && log.success) return false;
    if (directionFilter === "inbound" && log.direction !== "inbound") return false;
    if (directionFilter === "outbound" && log.direction !== "outbound") return false;
    if (searchQuery && !log.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  const successCount = logs?.filter(l => l.success).length || 0;
  const failedCount = logs?.filter(l => !l.success).length || 0;
  const inboundCount = logs?.filter(l => l.direction === "inbound").length || 0;
  const outboundCount = logs?.filter(l => l.direction === "outbound").length || 0;

  const platformDomain = window.location.host;
  const universalPostbackUrl = `https://${platformDomain}/api/postback?click_id={click_id}&status={status}&payout={payout}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground mb-2" data-testid="text-admin-postbacks-title">
            Мониторинг постбеков
          </h2>
          <p className="text-muted-foreground text-sm font-mono">
            Обзор всех постбеков в системе
          </p>
        </div>
        <Globe className="w-8 h-8 text-red-400" />
      </div>

      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowDownToLine className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Универсальный входящий постбек</h3>
            <p className="text-xs text-muted-foreground">
              Один URL для приёма конверсий от всех внешних трекеров
            </p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-mono">Постбек URL</span>
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
            <code className="text-muted-foreground">lead, reg → Lead | sale, dep, ftd → Sale | rejected → Rejected</code>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Всего</div>
          <div className="text-2xl font-bold text-foreground font-mono">{logs?.length || 0}</div>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20 p-4">
          <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Успешных</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{successCount}</div>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20 p-4">
          <div className="flex items-center gap-1 text-xs text-green-400 uppercase tracking-wider mb-1">
            <ArrowDownToLine className="w-3 h-3" /> Входящих
          </div>
          <div className="text-2xl font-bold text-green-400 font-mono">{inboundCount}</div>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20 p-4">
          <div className="flex items-center gap-1 text-xs text-blue-400 uppercase tracking-wider mb-1">
            <ArrowUpFromLine className="w-3 h-3" /> Исходящих
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">{outboundCount}</div>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted border-border text-foreground text-sm"
              data-testid="input-search-postbacks"
            />
          </div>
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-40 bg-muted border-border text-foreground" data-testid="select-direction-filter">
              <SelectValue placeholder="Направление" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="inbound">Входящие</SelectItem>
              <SelectItem value="outbound">Исходящие</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-muted border-border text-foreground" data-testid="select-status-filter">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="success">Успешные</SelectItem>
              <SelectItem value="failed">С ошибками</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-muted-foreground">
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
                <th className="px-4 py-3">Метод</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Попыток</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs?.map((log) => (
                <tr key={log.id} className="hover:bg-muted">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
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
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={log.url}>
                    {log.url}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.method}</td>
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
              {(!filteredLogs || filteredLogs.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Нет данных о постбеках
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
