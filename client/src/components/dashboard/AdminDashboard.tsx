import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, DollarSign, TrendingUp, Activity, 
  RefreshCw, Loader2, Target, MousePointer2,
  ArrowUpRight, ArrowDownRight, Building2, UserCheck
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

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

interface AdminStats {
  totalUsers: number;
  totalAdvertisers: number;
  totalPublishers: number;
  totalOffers: number;
  totalClicks: number;
  totalConversions: number;
  recentUsers: Array<{
    id: string;
    username: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

function safeNumber(value: any, defaultValue = 0): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function formatCurrency(value: any): string {
  return `$${safeNumber(value).toFixed(2)}`;
}

function formatNumber(value: any): string {
  return safeNumber(value).toLocaleString();
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [platformRes, statsRes] = await Promise.all([
        fetch("/api/admin/platform-stats", { credentials: "include" }),
        fetch("/api/admin/stats", { credentials: "include" })
      ]);

      if (platformRes.status === 401 || statsRes.status === 401) {
        setLocation("/login");
        return;
      }

      if (!platformRes.ok) throw new Error("Failed to fetch platform stats");
      if (!statsRes.ok) throw new Error("Failed to fetch admin stats");

      const platformData = await platformRes.json();
      const statsData = await statsRes.json();

      setPlatformStats(platformData);
      setAdminStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Повторить
        </Button>
      </div>
    );
  }

  const userDistribution = [
    { name: 'Рекламодатели', value: safeNumber(adminStats?.totalAdvertisers) },
    { name: 'Партнёры', value: safeNumber(adminStats?.totalPublishers) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Панель администратора</h1>
          <p className="text-muted-foreground text-sm">Общая статистика платформы</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" data-testid="button-refresh">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Доход платформы</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
                  {formatCurrency(platformStats?.totalRevenue)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 mr-1" />
              <span className="text-emerald-500">Маржа: {formatCurrency(platformStats?.platformMargin)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Выплаты партнёрам</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-payouts">
                  {formatCurrency(platformStats?.totalPayouts)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className="text-yellow-500">Ожидает: {formatCurrency(platformStats?.pendingPayouts)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Всего конверсий</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-conversions">
                  {formatNumber(platformStats?.totalConversions)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className="text-muted-foreground">ROI: {safeNumber(platformStats?.avgROI).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Всего пользователей</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-users">
                  {formatNumber(adminStats?.totalUsers)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-muted-foreground">
              <span>{safeNumber(platformStats?.activeAdvertisers)} адв. / {safeNumber(platformStats?.activePublishers)} парт.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4" />
              Быстрые действия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/dashboard/admin/users">
                <Button variant="outline" className="w-full h-20 flex-col gap-2 bg-secondary/50 border-border hover:bg-secondary" data-testid="link-users">
                  <Users className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs">Пользователи</span>
                </Button>
              </Link>
              <Link href="/dashboard/admin/finance">
                <Button variant="outline" className="w-full h-20 flex-col gap-2 bg-secondary/50 border-border hover:bg-secondary" data-testid="link-finance">
                  <DollarSign className="w-6 h-6 text-yellow-400" />
                  <span className="text-xs">Финансы</span>
                </Button>
              </Link>
              <Link href="/dashboard/admin/antifraud">
                <Button variant="outline" className="w-full h-20 flex-col gap-2 bg-secondary/50 border-border hover:bg-secondary" data-testid="link-antifraud">
                  <Activity className="w-6 h-6 text-red-400" />
                  <span className="text-xs">Антифрод</span>
                </Button>
              </Link>
              <Link href="/dashboard/admin/reports">
                <Button variant="outline" className="w-full h-20 flex-col gap-2 bg-secondary/50 border-border hover:bg-secondary" data-testid="link-reports">
                  <MousePointer2 className="w-6 h-6 text-purple-400" />
                  <span className="text-xs">Статистика</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Распределение
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {userDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {userDistribution.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Сводка платформы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-orange-400" />
                  <span className="text-sm text-muted-foreground">Всего офферов</span>
                </div>
                <span className="font-mono font-bold text-foreground" data-testid="text-total-offers">
                  {formatNumber(adminStats?.totalOffers)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MousePointer2 className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-muted-foreground">Всего кликов</span>
                </div>
                <span className="font-mono font-bold text-foreground" data-testid="text-total-clicks">
                  {formatNumber(adminStats?.totalClicks)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-muted-foreground">Всего конверсий</span>
                </div>
                <span className="font-mono font-bold text-foreground" data-testid="text-admin-total-conversions">
                  {formatNumber(adminStats?.totalConversions)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Новые пользователи
            </CardTitle>
            <Link href="/dashboard/admin/users">
              <Button variant="link" size="sm" className="text-xs text-blue-400">
                Все пользователи →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adminStats?.recentUsers?.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg" data-testid={`user-row-${user.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'advertiser' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    user.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {user.status}
                  </span>
                </div>
              )) || (
                <p className="text-center text-muted-foreground py-4">Нет данных</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
