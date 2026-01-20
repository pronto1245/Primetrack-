import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users2, Search, Percent, DollarSign, UserPlus, Save, Loader2, TrendingUp, Settings2, Wallet, CheckCircle2, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PublisherReferralStats {
  publisherId: string;
  publisherName: string;
  referralEnabled: boolean;
  referralRate: string;
  referredCount: number;
  totalPaid: number;
}

export function AdvertiserReferrals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [bulkRate, setBulkRate] = useState("5");

  const { data: publishers = [], isLoading } = useQuery<PublisherReferralStats[]>({
    queryKey: ["advertiser-referrals"],
    queryFn: async () => {
      const res = await fetch("/api/advertiser/referrals", { credentials: "include" });
      if (!res.ok) throw new Error("Не удалось загрузить данные");
      return res.json();
    },
  });

  const { data: financialStats } = useQuery<{ accrued: number; paid: number; pending: number }>({
    queryKey: ["advertiser-referrals-stats"],
    queryFn: async () => {
      const res = await fetch("/api/advertiser/referrals/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Не удалось загрузить статистику");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ publisherId, referralEnabled, referralRate }: { 
      publisherId: string; 
      referralEnabled?: boolean; 
      referralRate?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/advertiser/referrals/${publisherId}`, { 
        referralEnabled, 
        referralRate 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-referrals"] });
      setEditingId(null);
      setEditRate("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ referralEnabled, referralRate }: { referralEnabled: boolean; referralRate: string }) => {
      const res = await apiRequest("PATCH", "/api/advertiser/referrals/bulk", { referralEnabled, referralRate });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-referrals"] });
      toast({
        title: "Настройки обновлены",
        description: `Обновлено партнёров: ${data.updated}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const filteredPublishers = publishers.filter(p => 
    p.publisherName.toLowerCase().includes(search.toLowerCase())
  );

  const totalReferred = publishers.reduce((sum, p) => sum + p.referredCount, 0);
  const totalPaid = publishers.reduce((sum, p) => sum + p.totalPaid, 0);
  const activePrograms = publishers.filter(p => p.referralEnabled).length;

  const handleToggle = (publisherId: string, currentEnabled: boolean) => {
    updateMutation.mutate({ publisherId, referralEnabled: !currentEnabled });
  };

  const handleSaveRate = (publisherId: string) => {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return;
    }
    updateMutation.mutate({ publisherId, referralRate: editRate });
  };

  const startEditing = (publisherId: string, currentRate: string) => {
    setEditingId(publisherId);
    setEditRate(currentRate);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3" data-testid="text-referrals-title">
          <Users2 className="w-6 h-6" />
          Реферальная программа
        </h1>
        <p className="text-muted-foreground mt-1">
          Настройка реферальных вознаграждений для партнёров
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных программ</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-active-programs">{activePrograms}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего привлечено</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-referred">{totalReferred}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <UserPlus className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего выплачено</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-paid">${totalPaid.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/20">
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Начислено</p>
                <p className="text-2xl font-bold text-purple-400" data-testid="text-accrued">${(financialStats?.accrued || 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <Wallet className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Выплачено</p>
                <p className="text-2xl font-bold text-emerald-400" data-testid="text-paid">${(financialStats?.paid || 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Осталось к выплате</p>
                <p className="text-2xl font-bold text-orange-400" data-testid="text-pending">${(financialStats?.pending || 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/20">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Партнёры</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  data-testid="input-search-publishers"
                  placeholder="Поиск партнёра..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Массовые действия:</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  data-testid="input-bulk-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={bulkRate}
                  onChange={(e) => setBulkRate(e.target.value)}
                  className="w-20 h-8 text-center"
                  placeholder="%"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button
                data-testid="button-bulk-enable"
                size="sm"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  const rate = parseFloat(bulkRate);
                  if (isNaN(rate) || rate < 0 || rate > 100) {
                    toast({ variant: "destructive", title: "Ошибка", description: "Процент должен быть от 0 до 100" });
                    return;
                  }
                  bulkMutation.mutate({ referralEnabled: true, referralRate: bulkRate });
                }}
                disabled={bulkMutation.isPending || publishers.length === 0}
              >
                {bulkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Включить для всех
              </Button>
              <Button
                data-testid="button-bulk-disable"
                size="sm"
                variant="outline"
                onClick={() => {
                  const rate = parseFloat(bulkRate);
                  if (isNaN(rate) || rate < 0 || rate > 100) {
                    toast({ variant: "destructive", title: "Ошибка", description: "Процент должен быть от 0 до 100" });
                    return;
                  }
                  bulkMutation.mutate({ referralEnabled: false, referralRate: bulkRate });
                }}
                disabled={bulkMutation.isPending || publishers.length === 0}
              >
                Выключить для всех
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPublishers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Нет партнёров для отображения</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Партнёр</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Реферальная программа</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Процент</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Привлечено</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Выплачено</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPublishers.map((publisher) => (
                    <tr key={publisher.publisherId} className="border-b border-border/50 hover:bg-muted/20" data-testid={`row-publisher-${publisher.publisherId}`}>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground" data-testid={`text-publisher-name-${publisher.publisherId}`}>
                          {publisher.publisherName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          data-testid={`switch-referral-${publisher.publisherId}`}
                          checked={publisher.referralEnabled}
                          onCheckedChange={() => handleToggle(publisher.publisherId, publisher.referralEnabled)}
                          disabled={updateMutation.isPending}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {editingId === publisher.publisherId ? (
                            <>
                              <Input
                                data-testid={`input-rate-${publisher.publisherId}`}
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={editRate}
                                onChange={(e) => setEditRate(e.target.value)}
                                className="w-20 h-8 text-center"
                              />
                              <span className="text-muted-foreground">%</span>
                              <Button
                                data-testid={`button-save-rate-${publisher.publisherId}`}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveRate(publisher.publisherId)}
                                disabled={updateMutation.isPending}
                              >
                                {updateMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4 text-emerald-400" />
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              data-testid={`button-edit-rate-${publisher.publisherId}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(publisher.publisherId, publisher.referralRate)}
                              className="flex items-center gap-1"
                            >
                              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                <Percent className="w-3 h-3 mr-1" />
                                {publisher.referralRate}%
                              </Badge>
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className={publisher.referredCount > 0 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : ""}>
                          <UserPlus className="w-3 h-3 mr-1" />
                          {publisher.referredCount}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={publisher.totalPaid > 0 ? "text-emerald-400 font-medium" : "text-muted-foreground"} data-testid={`text-paid-${publisher.publisherId}`}>
                          ${publisher.totalPaid.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-blue-500/20">
              <Users2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Как работает реферальная программа?</h3>
              <p className="text-sm text-muted-foreground">
                Когда партнёр привлекает нового партнёра по реферальной ссылке, он получает процент от 
                выплат привлечённого партнёра. Например, если установлен процент 5% и привлечённый партнёр 
                заработал $100, реферер получит $5 бонуса.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
