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
          <h2 className="text-2xl font-bold font-mono text-white mb-2" data-testid="text-postbacks-title">
            Лог постбеков
          </h2>
          <p className="text-slate-400 text-sm font-mono">
            История отправки уведомлений о ваших конверсиях
          </p>
        </div>
        <Globe className="w-8 h-8 text-emerald-400" />
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Что такое постбеки?</h3>
            <p className="text-xs text-slate-300">
              Постбеки — это автоматические уведомления, которые рекламодатель получает при каждой вашей конверсии. 
              Здесь вы можете видеть историю отправки этих уведомлений.
            </p>
          </div>
        </div>
      </Card>

      {logs && logs.length > 0 ? (
        <Card className="bg-[#0A0A0A] border-white/10">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">История постбеков</h3>
            <p className="text-xs text-slate-500">Последние 50 уведомлений</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Время</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">HTTP код</th>
                  <th className="px-4 py-3">Попыток</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-slate-400">
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
                    <td className="px-4 py-3 text-slate-400">{log.responseCode || "-"}</td>
                    <td className="px-4 py-3 text-slate-400">{log.retryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="bg-[#0A0A0A] border-white/10 p-8">
          <div className="text-center">
            <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">Нет данных о постбеках</p>
            <p className="text-xs text-slate-600 mt-2">
              Постбеки появятся после первых конверсий
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
