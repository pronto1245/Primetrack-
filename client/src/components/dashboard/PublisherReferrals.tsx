import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";
import { 
  Users2, Copy, Check, DollarSign, UserPlus, TrendingUp, Link as LinkIcon, Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReferralStats {
  enabled: boolean;
  referralRate?: string;
  totalReferred?: number;
  totalEarnings?: number;
  pendingEarnings?: number;
  referredPartners?: Array<{
    id: string;
    username: string;
    createdAt: string;
  }>;
}

interface ReferralInfo {
  enabled: boolean;
  hasCode?: boolean;
  referralCode?: string;
  referralLink?: string;
  referralRate?: string;
}

interface ReferralEarning {
  id: string;
  referredPublisherId: string;
  amount: string;
  originalPayout: string;
  status: string;
  createdAt: string;
}

export function PublisherReferrals() {
  const { selectedAdvertiserId, selectedAdvertiser } = useAdvertiserContext();
  const [copied, setCopied] = useState(false);

  const { data: referralInfo, isLoading: infoLoading } = useQuery<ReferralInfo>({
    queryKey: ["publisher-referrals-info", selectedAdvertiserId],
    queryFn: async () => {
      if (!selectedAdvertiserId) throw new Error("Нет рекламодателя");
      const res = await fetch(`/api/publisher/referrals/${selectedAdvertiserId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Не удалось загрузить данные");
      return res.json();
    },
    enabled: !!selectedAdvertiserId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["publisher-referrals-stats", selectedAdvertiserId],
    queryFn: async () => {
      if (!selectedAdvertiserId) throw new Error("Нет рекламодателя");
      const res = await fetch(`/api/publisher/referrals/${selectedAdvertiserId}/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Не удалось загрузить статистику");
      return res.json();
    },
    enabled: !!selectedAdvertiserId && referralInfo?.enabled === true,
  });

  const { data: earnings = [], isLoading: earningsLoading } = useQuery<ReferralEarning[]>({
    queryKey: ["publisher-referrals-earnings", selectedAdvertiserId],
    queryFn: async () => {
      if (!selectedAdvertiserId) throw new Error("Нет рекламодателя");
      const res = await fetch(`/api/publisher/referrals/${selectedAdvertiserId}/earnings`, { credentials: "include" });
      if (!res.ok) throw new Error("Не удалось загрузить начисления");
      return res.json();
    },
    enabled: !!selectedAdvertiserId && referralInfo?.enabled === true,
  });

  const copyLink = () => {
    if (referralInfo?.referralLink) {
      navigator.clipboard.writeText(referralInfo.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLoading = infoLoading || (!referralInfo?.enabled ? false : statsLoading);

  if (!selectedAdvertiserId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Users2 className="w-6 h-6" />
          Реферальная программа
        </h1>
        <Card>
          <CardContent className="pt-6 text-center py-12 text-muted-foreground">
            <Users2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Выберите рекламодателя в верхнем меню</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  if (!referralInfo?.enabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3" data-testid="text-referrals-title">
            <Users2 className="w-6 h-6" />
            Реферальная программа
          </h1>
          <p className="text-muted-foreground mt-1">
            Привлекайте новых партнёров и получайте бонусы
          </p>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="pt-6 text-center py-12">
            <Users2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">Реферальная программа недоступна</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Рекламодатель {selectedAdvertiser?.companyName || selectedAdvertiser?.username} 
              не включил для вас реферальную программу. 
              Свяжитесь с рекламодателем для получения доступа.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const referralRate = parseFloat(stats?.referralRate || referralInfo?.referralRate || "0");
  const totalReferred = stats?.totalReferred || 0;
  const totalEarnings = stats?.totalEarnings || 0;
  const pendingEarnings = stats?.pendingEarnings || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3" data-testid="text-referrals-title">
          <Users2 className="w-6 h-6" />
          Реферальная программа
        </h1>
        <p className="text-muted-foreground mt-1">
          Привлекайте партнёров и получайте {referralRate}% от их заработка
        </p>
      </div>

      {referralInfo?.referralLink && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/20">
                <LinkIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Ваша реферальная ссылка</p>
                <div className="flex items-center gap-2">
                  <Input
                    data-testid="input-referral-link"
                    value={referralInfo.referralLink}
                    readOnly
                    className="bg-background/50"
                  />
                  <Button
                    data-testid="button-copy-link"
                    variant="outline"
                    onClick={copyLink}
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <p className="text-xs text-muted-foreground">Процент</p>
          </div>
          <p className="text-xl font-bold text-purple-400" data-testid="text-referral-rate">{referralRate}%</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-muted-foreground">Привлечено</p>
          </div>
          <p className="text-xl font-bold text-blue-400" data-testid="text-total-referred">{totalReferred}</p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-muted-foreground">Заработано</p>
          </div>
          <p className="text-xl font-bold text-emerald-400" data-testid="text-total-earnings">{formatCurrency(totalEarnings)}</p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <p className="text-xs text-muted-foreground">Ожидает</p>
          </div>
          <p className="text-xl font-bold text-yellow-400" data-testid="text-pending-earnings">{formatCurrency(pendingEarnings)}</p>
        </div>
      </div>

      {stats?.referredPartners && stats.referredPartners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Привлечённые партнёры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.referredPartners.map((partner) => (
                <div 
                  key={partner.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`row-referred-${partner.id}`}
                >
                  <span className="font-medium text-foreground">{partner.username}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(partner.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!earningsLoading && earnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              История начислений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Дата</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Оригинальная выплата</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Бонус</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((earning) => (
                    <tr key={earning.id} className="border-b border-border/50" data-testid={`row-earning-${earning.id}`}>
                      <td className="py-3 px-4 text-foreground">
                        {new Date(earning.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">
                        ${parseFloat(earning.originalPayout).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-emerald-400">
                        +${parseFloat(earning.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge 
                          variant="outline" 
                          className={earning.status === "paid" 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {earning.status === "paid" ? "Выплачено" : "Ожидает"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-blue-500/20">
              <Users2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Как это работает?</h3>
              <p className="text-sm text-muted-foreground">
                Поделитесь реферальной ссылкой с потенциальными партнёрами. Когда они зарегистрируются 
                и начнут зарабатывать, вы будете получать {referralRate}% от каждой их выплаты. 
                Бонусы начисляются автоматически при одобрении конверсий.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
