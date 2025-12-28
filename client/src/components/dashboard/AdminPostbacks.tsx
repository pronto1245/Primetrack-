import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, CheckCircle, XCircle, Loader2, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

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

export function AdminPostbacks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logs, isLoading, refetch } = useQuery<PostbackLog[]>({
    queryKey: ["/api/admin/postback-logs"],
  });

  const filteredLogs = logs?.filter(log => {
    if (statusFilter === "success" && !log.success) return false;
    if (statusFilter === "failed" && log.success) return false;
    if (searchQuery && !log.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  const successCount = logs?.filter(l => l.success).length || 0;
  const failedCount = logs?.filter(l => !l.success).length || 0;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Всего</div>
          <div className="text-2xl font-bold text-foreground font-mono">{logs?.length || 0}</div>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20 p-4">
          <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Успешных</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{successCount}</div>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20 p-4">
          <div className="text-xs text-red-400 uppercase tracking-wider mb-1">Ошибок</div>
          <div className="text-2xl font-bold text-red-400 font-mono">{failedCount}</div>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
