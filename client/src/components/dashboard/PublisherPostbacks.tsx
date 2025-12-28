import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Globe, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";

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

export function PublisherPostbacks() {
  const { selectedAdvertiserId } = useAdvertiserContext();

  const { data: logs, isLoading } = useQuery<PostbackLog[]>({
    queryKey: ["/api/publisher/postback-logs", selectedAdvertiserId],
    enabled: !!selectedAdvertiserId,
  });

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
            Лог постбеков
          </h2>
          <p className="text-muted-foreground text-sm font-mono">
            История отправки уведомлений о ваших конверсиях
          </p>
        </div>
        <Globe className="w-8 h-8 text-emerald-400" />
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Что такое постбеки?</h3>
            <p className="text-xs text-muted-foreground">
              Постбеки — это автоматические уведомления, которые рекламодатель получает при каждой вашей конверсии. 
              Здесь вы можете видеть историю отправки этих уведомлений.
            </p>
          </div>
        </div>
      </Card>

      {logs && logs.length > 0 ? (
        <Card className="bg-card border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">История постбеков</h3>
            <p className="text-xs text-muted-foreground">Последние 50 уведомлений</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Время</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">HTTP код</th>
                  <th className="px-4 py-3">Попыток</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
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
        </Card>
      ) : (
        <Card className="bg-card border-border p-8">
          <div className="text-center">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Нет данных о постбеках</p>
            <p className="text-xs text-muted-foreground mt-2">
              Постбеки появятся после первых конверсий
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
