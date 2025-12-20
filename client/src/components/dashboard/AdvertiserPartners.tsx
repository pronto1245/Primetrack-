import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Search, Link as LinkIcon, Copy, Check, UserPlus, 
  Ban, Play, Pause, Clock, Loader2, Filter
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Partner {
  id: string;
  publisherId: string;
  username: string;
  email: string;
  status: string;
  createdAt: string;
  clicks: number;
  conversions: number;
  payout: number;
}

export function AdvertiserPartners() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: partners = [], isLoading } = useQuery<Partner[]>({
    queryKey: ["advertiser-partners", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/advertiser/partners"
        : `/api/advertiser/partners?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch partners");
      return res.json();
    },
  });

  const { data: linkData } = useQuery({
    queryKey: ["advertiser-registration-link"],
    queryFn: async () => {
      const res = await fetch("/api/advertiser/registration-link");
      if (!res.ok) throw new Error("Failed to get link");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/advertiser/partners/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-partners"] });
    },
  });

  const copyLink = () => {
    if (linkData?.registrationLink) {
      navigator.clipboard.writeText(linkData.registrationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredPartners = partners.filter(p => 
    p.username.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" /> },
      active: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <Play className="w-3 h-3" /> },
      paused: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Pause className="w-3 h-3" /> },
      blocked: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <Ban className="w-3 h-3" /> },
    };
    const { color, icon } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={`${color} flex items-center gap-1`}>
        {icon}
        {status}
      </Badge>
    );
  };

  const pendingCount = partners.filter(p => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-6 h-6" />
            Партнёры
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} ожидают
              </Badge>
            )}
          </h1>
          <p className="text-slate-400 mt-1">Управление партнёрами и их доступом</p>
        </div>

        <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-get-link" className="bg-emerald-600 hover:bg-emerald-700">
              <LinkIcon className="w-4 h-4 mr-2" />
              Получить ссылку
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0A0A] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Ссылка для регистрации партнёров</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-slate-400 text-sm">
                Поделитесь этой ссылкой с партнёрами. После регистрации они появятся в списке со статусом "pending".
              </p>
              <div className="flex gap-2">
                <Input 
                  data-testid="input-registration-link"
                  value={linkData?.registrationLink || ""} 
                  readOnly 
                  className="bg-[#111] border-white/10 text-white font-mono text-sm"
                />
                <Button 
                  data-testid="button-copy-link"
                  variant="outline" 
                  onClick={copyLink}
                  className="border-white/10"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="text-xs text-slate-500">
                Реферальный код: <code className="text-emerald-400">{linkData?.referralCode}</code>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-[#0A0A0A] border-white/10">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                data-testid="input-search-partners"
                placeholder="Поиск по имени или email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#111] border-white/10 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter" className="w-40 bg-[#111] border-white/10">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-white/10">
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="pending">Ожидают</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="paused">На паузе</SelectItem>
                <SelectItem value="blocked">Заблокированы</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Партнёры не найдены</p>
              <p className="text-sm mt-1">Поделитесь ссылкой для регистрации</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Партнёр</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Статус</th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Клики</th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Конверсии</th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Выплаты</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Дата</th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPartners.map((partner) => (
                    <tr key={partner.id} data-testid={`row-partner-${partner.id}`} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-white font-medium">{partner.username}</div>
                          <div className="text-slate-500 text-sm">{partner.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(partner.status)}</td>
                      <td className="px-4 py-3 text-right text-slate-300 font-mono">{partner.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-300 font-mono">{partner.conversions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-mono">${partner.payout.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500 text-sm">
                        {new Date(partner.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {partner.status === "pending" && (
                            <Button
                              data-testid={`button-approve-${partner.id}`}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                              onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "active" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              Одобрить
                            </Button>
                          )}
                          {partner.status === "active" && (
                            <>
                              <Button
                                data-testid={`button-pause-${partner.id}`}
                                size="sm"
                                variant="outline"
                                className="border-white/10 h-7 text-xs"
                                onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "paused" })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <Pause className="w-3 h-3 mr-1" />
                                Пауза
                              </Button>
                              <Button
                                data-testid={`button-block-${partner.id}`}
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "blocked" })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                Блок
                              </Button>
                            </>
                          )}
                          {partner.status === "paused" && (
                            <Button
                              data-testid={`button-activate-${partner.id}`}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                              onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "active" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Активировать
                            </Button>
                          )}
                          {partner.status === "blocked" && (
                            <Button
                              data-testid={`button-unblock-${partner.id}`}
                              size="sm"
                              variant="outline"
                              className="border-white/10 h-7 text-xs"
                              onClick={() => updateStatusMutation.mutate({ id: partner.id, status: "active" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              Разблокировать
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
