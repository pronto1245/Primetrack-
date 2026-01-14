import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Search, RefreshCw, Loader2, CalendarPlus, ArrowRightLeft, Gift,
  Users, Crown, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface Subscription {
  id: string;
  advertiserId: string;
  planId: string | null;
  status: string;
  billingCycle: string;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  user: User;
  plan: SubscriptionPlan | null;
}

interface SubscriptionsResponse {
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
}

const statusLabels: Record<string, string> = {
  trial: "Пробный период",
  active: "Активна",
  cancelled: "Отменена",
  expired: "Истекла",
  past_due: "Просрочена",
  pending_payment: "Ожидает оплаты",
};

const statusColors: Record<string, string> = {
  trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  past_due: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  pending_payment: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("");
  
  const [extendModal, setExtendModal] = useState<Subscription | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  
  const [changePlanModal, setChangePlanModal] = useState<Subscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  
  const [grantModal, setGrantModal] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlanId, setGrantPlanId] = useState("");
  const [grantMonths, setGrantMonths] = useState("1");

  const { data, isLoading, refetch } = useQuery<SubscriptionsResponse>({
    queryKey: ["admin-subscriptions", search, statusFilter, planFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (planFilter) params.set("planId", planFilter);
      
      const res = await fetch(`/api/admin/subscriptions?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["admin-users-for-grant"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?role=advertiser", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return data.users || data;
    },
  });

  const extendMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const res = await fetch(`/api/admin/subscriptions/${id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ extendByDays: days }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to extend subscription");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Подписка продлена");
      setExtendModal(null);
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const res = await fetch(`/api/admin/subscriptions/${id}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to change plan");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("План изменён");
      setChangePlanModal(null);
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const grantMutation = useMutation({
    mutationFn: async ({ userId, planId, periodMonths }: { userId: string; planId: string; periodMonths: number }) => {
      const res = await fetch("/api/admin/subscriptions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, planId, periodMonths }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to grant subscription");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Подписка выдана");
      setGrantModal(false);
      setGrantUserId("");
      setGrantPlanId("");
      setGrantMonths("1");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const subscriptions = data?.subscriptions || [];
  const plans = data?.plans || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление подписками</h1>
          <p className="text-muted-foreground">Просмотр и управление подписками рекламодателей</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setGrantModal(true)} 
            data-testid="button-grant-subscription"
          >
            <Gift className="w-4 h-4 mr-2" />
            Выдать подписку
          </Button>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-subscriptions">
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Подписки ({subscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по email или username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-subscriptions"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={planFilter || "all"} onValueChange={(v) => setPlanFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-plan-filter">
                <SelectValue placeholder="Все планы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все планы</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Подписки не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>План</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Период</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id} data-testid={`subscription-row-${sub.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.user.username}</p>
                          <p className="text-xs text-muted-foreground">{sub.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.plan ? (
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-400" />
                            <span>{sub.plan.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Нет плана</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[sub.status] || ""}>
                          {statusLabels[sub.status] || sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.status === "trial" && sub.trialEndsAt ? (
                          <div className="text-sm">
                            <p className="text-muted-foreground">Триал до:</p>
                            <p>{format(new Date(sub.trialEndsAt), "dd MMM yyyy", { locale: ru })}</p>
                          </div>
                        ) : sub.currentPeriodEnd ? (
                          <div className="text-sm">
                            <p className="text-muted-foreground">Активна до:</p>
                            <p>{format(new Date(sub.currentPeriodEnd), "dd MMM yyyy", { locale: ru })}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setExtendModal(sub);
                              setExtendDays("30");
                            }}
                            data-testid={`button-extend-${sub.id}`}
                          >
                            <CalendarPlus className="w-4 h-4 mr-1" />
                            Продлить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setChangePlanModal(sub);
                              setSelectedPlanId(sub.planId || "");
                            }}
                            data-testid={`button-change-plan-${sub.id}`}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-1" />
                            План
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!extendModal} onOpenChange={() => setExtendModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Продлить подписку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Пользователь: <span className="font-medium text-foreground">{extendModal?.user.username}</span>
            </p>
            <div className="space-y-2">
              <Label>Количество дней</Label>
              <Input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                min="1"
                data-testid="input-extend-days"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendModal(null)} data-testid="button-cancel-extend">
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (extendModal) {
                  extendMutation.mutate({ id: extendModal.id, days: parseInt(extendDays) });
                }
              }}
              disabled={extendMutation.isPending}
              data-testid="button-confirm-extend"
            >
              {extendMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Продлить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!changePlanModal} onOpenChange={() => setChangePlanModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить план</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Пользователь: <span className="font-medium text-foreground">{changePlanModal?.user.username}</span>
            </p>
            <div className="space-y-2">
              <Label>Новый план</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger data-testid="select-new-plan">
                  <SelectValue placeholder="Выберите план" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} — ${plan.monthlyPrice}/мес
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanModal(null)} data-testid="button-cancel-change-plan">
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (changePlanModal && selectedPlanId) {
                  changePlanMutation.mutate({ id: changePlanModal.id, planId: selectedPlanId });
                }
              }}
              disabled={changePlanMutation.isPending || !selectedPlanId}
              data-testid="button-confirm-change-plan"
            >
              {changePlanMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Изменить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={grantModal} onOpenChange={setGrantModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выдать подписку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Пользователь</Label>
              <Select value={grantUserId} onValueChange={setGrantUserId}>
                <SelectTrigger data-testid="select-grant-user">
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>План</Label>
              <Select value={grantPlanId} onValueChange={setGrantPlanId}>
                <SelectTrigger data-testid="select-grant-plan">
                  <SelectValue placeholder="Выберите план" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} — ${plan.monthlyPrice}/мес
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Период (месяцев)</Label>
              <Input
                type="number"
                value={grantMonths}
                onChange={(e) => setGrantMonths(e.target.value)}
                min="1"
                data-testid="input-grant-months"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantModal(false)} data-testid="button-cancel-grant">
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (grantUserId && grantPlanId) {
                  grantMutation.mutate({ 
                    userId: grantUserId, 
                    planId: grantPlanId, 
                    periodMonths: parseInt(grantMonths) 
                  });
                }
              }}
              disabled={grantMutation.isPending || !grantUserId || !grantPlanId}
              data-testid="button-confirm-grant"
            >
              {grantMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Выдать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
