import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, Users, TrendingUp, ArrowUpRight, ArrowDownRight,
  Wallet, CreditCard, Clock, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { ExportMenu } from "@/components/ui/export-menu";

interface PlatformStats {
  totalRevenue: number;
  totalPayouts: number;
  platformMargin: number;
  pendingPayouts: number;
  activeAdvertisers: number;
  activePublishers: number;
  totalConversions: number;
  avgROI: number;
}

interface PayoutRequest {
  id: string;
  publisherId: string;
  publisherName: string;
  advertiserId: string;
  advertiserName: string;
  requestedAmount: string;
  status: string;
  createdAt: string;
}

export function AdminFinance() {
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/platform-stats"],
  });

  const { data: allPayouts = [], isLoading: payoutsLoading } = useQuery<PayoutRequest[]>({
    queryKey: ["/api/admin/all-payout-requests"],
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const platformStats = stats || {
    totalRevenue: 0,
    totalPayouts: 0,
    platformMargin: 0,
    pendingPayouts: 0,
    activeAdvertisers: 0,
    activePublishers: 0,
    totalConversions: 0,
    avgROI: 0,
  };

  const pendingRequests = allPayouts.filter(p => p.status === 'pending');
  const approvedRequests = allPayouts.filter(p => p.status === 'approved');
  const paidRequests = allPayouts.filter(p => p.status === 'paid');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground mb-2" data-testid="text-admin-finance-title">
            Финансы платформы
          </h2>
          <p className="text-muted-foreground text-sm font-mono">
            Глобальная статистика и управление финансами
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu dataset="finance-transactions" />
          <ExportMenu dataset="finance-payouts" />
        </div>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-xs font-mono uppercase">Общий доход</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ${platformStats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-xs font-mono uppercase">Выплаты партнёрам</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ${platformStats.totalPayouts.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-xs font-mono uppercase">Маржа платформы</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ${platformStats.platformMargin.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-xs font-mono uppercase">Ожидают выплаты</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ${platformStats.pendingPayouts.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Активных рекламодателей</p>
                <p className="text-xl font-bold text-foreground">{platformStats.activeAdvertisers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Активных партнёров</p>
                <p className="text-xl font-bold text-foreground">{platformStats.activePublishers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Средний ROI</p>
                <p className="text-xl font-bold text-foreground">{platformStats.avgROI.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Requests Overview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Заявки на выплату (все рекламодатели)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-muted-foreground text-sm">Ожидают: {pendingRequests.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-muted-foreground text-sm">Одобрено: {approvedRequests.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <span className="text-muted-foreground text-sm">Выплачено: {paidRequests.length}</span>
            </div>
          </div>

          {payoutsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : allPayouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Нет заявок на выплату</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Дата</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Партнёр</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Рекламодатель</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Сумма</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayouts.slice(0, 20).map((request) => (
                    <tr key={request.id} className="border-b border-white/5 hover:bg-muted">
                      <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                        {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-2 px-3 text-foreground">{request.publisherName || 'N/A'}</td>
                      <td className="py-2 px-3 text-muted-foreground">{request.advertiserName || 'N/A'}</td>
                      <td className="py-2 px-3 text-emerald-400 font-mono">${request.requestedAmount}</td>
                      <td className="py-2 px-3">
                        <Badge variant={
                          request.status === 'paid' ? 'default' :
                          request.status === 'approved' ? 'secondary' :
                          request.status === 'rejected' ? 'destructive' : 'outline'
                        } className={
                          request.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                          request.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                          request.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }>
                          {request.status === 'paid' ? 'Выплачено' :
                           request.status === 'approved' ? 'Одобрено' :
                           request.status === 'rejected' ? 'Отклонено' : 'Ожидает'}
                        </Badge>
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
