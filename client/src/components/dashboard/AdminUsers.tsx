import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Search, UserCheck, UserX, Clock, Loader2, 
  Building2, User, Shield, Filter, TrendingUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface Publisher extends AdminUser {
  advertiserId?: string;
  advertiserName?: string;
}

interface AdminStats {
  totalAdvertisers: number;
  pendingAdvertisers: number;
  totalPublishers: number;
  totalOffers: number;
  totalClicks: number;
  totalConversions: number;
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("advertisers");

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users", roleFilter, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);
      
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: publishers = [], isLoading: publishersLoading } = useQuery<Publisher[]>({
    queryKey: ["admin-publishers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/publishers");
      if (!res.ok) throw new Error("Failed to fetch publishers");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-publishers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const advertisers = users.filter(u => u.role === "advertiser");
  const filteredPublishers = publishers.filter(p => 
    p.username.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.advertiserName && p.advertiserName.toLowerCase().includes(search.toLowerCase()))
  );

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" /> },
      active: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <UserCheck className="w-3 h-3" /> },
      blocked: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <UserX className="w-3 h-3" /> },
    };
    const { color, icon } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={`${color} flex items-center gap-1`}>
        {icon}
        {status === "pending" ? "Ожидает" : status === "active" ? "Активен" : "Заблокирован"}
      </Badge>
    );
  };

  const roleBadge = (role: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      admin: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <Shield className="w-3 h-3" />, label: "Админ" },
      advertiser: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Building2 className="w-3 h-3" />, label: "Рекламодатель" },
      publisher: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <User className="w-3 h-3" />, label: "Партнёр" },
    };
    const { color, icon, label } = config[role] || config.publisher;
    return (
      <Badge variant="outline" className={`${color} flex items-center gap-1`}>
        {icon}
        {label}
      </Badge>
    );
  };

  const pendingCount = advertisers.filter(a => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-6 h-6" />
            Пользователи
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} ожидают
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Управление рекламодателями и партнёрами</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-muted-foreground text-sm">Рекламодатели</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">{stats.totalAdvertisers}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-muted-foreground text-sm">Ожидают</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.pendingAdvertisers}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                <span className="text-muted-foreground text-sm">Партнёры</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">{stats.totalPublishers}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-muted-foreground text-sm">Офферы</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">{stats.totalOffers}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-muted-foreground text-sm">Клики</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">{stats.totalClicks}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-muted-foreground text-sm">Конверсии</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">{stats.totalConversions}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border gap-2 p-1">
          <TabsTrigger value="advertisers" className="px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Building2 className="w-4 h-4 mr-2 text-blue-400" />
            Рекламодатели
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="publishers" className="px-4 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <User className="w-4 h-4 mr-2 text-emerald-400" />
            Партнёры
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advertisers" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search-advertisers"
                    placeholder="Поиск по имени или email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-muted border-border"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter" className="w-48 bg-muted border-border">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-border">
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="pending">Ожидают</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="blocked">Заблокированные</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : advertisers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Рекламодатели не найдены
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Пользователь</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Email</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Статус</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Регистрация</th>
                        <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advertisers.map((user) => (
                        <tr key={user.id} data-testid={`row-advertiser-${user.id}`} className="border-b border-white/5 hover:bg-muted">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-blue-400" />
                              </div>
                              <span className="text-foreground font-medium">{user.username}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                          <td className="py-3 px-4">{statusBadge(user.status)}</td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              {user.status === "pending" && (
                                <Button
                                  data-testid={`button-approve-${user.id}`}
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ id: user.id, status: "active" })}
                                  disabled={updateStatusMutation.isPending}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Одобрить
                                </Button>
                              )}
                              {user.status === "active" && (
                                <Button
                                  data-testid={`button-block-${user.id}`}
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateStatusMutation.mutate({ id: user.id, status: "blocked" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  Заблокировать
                                </Button>
                              )}
                              {user.status === "blocked" && (
                                <Button
                                  data-testid={`button-unblock-${user.id}`}
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ id: user.id, status: "active" })}
                                  disabled={updateStatusMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
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
        </TabsContent>

        <TabsContent value="publishers" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-search-publishers"
                  placeholder="Поиск по имени, email или рекламодателю..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-muted border-border"
                />
              </div>
            </CardHeader>
            <CardContent>
              {publishersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPublishers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Партнёры не найдены
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Партнёр</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Email</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Рекламодатель</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Статус</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Регистрация</th>
                        <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPublishers.map((pub) => (
                        <tr key={pub.id} data-testid={`row-publisher-${pub.id}`} className="border-b border-white/5 hover:bg-muted">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <User className="w-4 h-4 text-emerald-400" />
                              </div>
                              <span className="text-foreground font-medium">{pub.username}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{pub.email}</td>
                          <td className="py-3 px-4">
                            {pub.advertiserName ? (
                              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                {pub.advertiserName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">{statusBadge(pub.status)}</td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {new Date(pub.createdAt).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              {pub.status === "active" && (
                                <Button
                                  data-testid={`button-block-pub-${pub.id}`}
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateStatusMutation.mutate({ id: pub.id, status: "blocked" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  Заблокировать
                                </Button>
                              )}
                              {pub.status === "blocked" && (
                                <Button
                                  data-testid={`button-unblock-pub-${pub.id}`}
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ id: pub.id, status: "active" })}
                                  disabled={updateStatusMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
