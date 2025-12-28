import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Wallet, Plus, CreditCard, Bitcoin, Building2, ArrowRight, 
  Check, X, Clock, DollarSign, Users, Loader2, Trash2, Edit,
  Send, AlertCircle, CheckSquare, History
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const PAYMENT_TYPES = [
  { value: "crypto_usdt_trc20", label: "USDT TRC20", icon: Bitcoin, color: "text-green-500" },
  { value: "crypto_btc", label: "Bitcoin", icon: Bitcoin, color: "text-orange-500" },
  { value: "bank_card", label: "Bank Card", icon: CreditCard, color: "text-blue-500" },
  { value: "binance", label: "Binance Pay", icon: Building2, color: "text-yellow-500" },
  { value: "bybit", label: "Bybit", icon: Building2, color: "text-purple-500" },
];

const CURRENCIES = ["USD", "EUR", "USDT", "BTC"];

export function AdvertiserFinance() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateMethod, setShowCreateMethod] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [showMassPayout, setShowMassPayout] = useState(false);
  const [showBonusDialog, setShowBonusDialog] = useState(false);
  const [bonusPublisherId, setBonusPublisherId] = useState("");
  const [bonusMethodId, setBonusMethodId] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusNote, setBonusNote] = useState("");

  const { data: paymentMethods = [], isLoading: methodsLoading } = useQuery<any[]>({
    queryKey: ["/api/advertiser/payment-methods"],
  });

  const { data: payoutRequests = [], isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/advertiser/payout-requests"],
  });

  const { data: publisherBalances = [], isLoading: balancesLoading } = useQuery<any[]>({
    queryKey: ["/api/advertiser/publisher-balances"],
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<any[]>({
    queryKey: ["/api/advertiser/payouts"],
  });

  const createMethodMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/advertiser/payment-methods", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/payment-methods"] });
      setShowCreateMethod(false);
      toast({ title: "Способ оплаты добавлен" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/advertiser/payment-methods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/payment-methods"] });
      toast({ title: "Способ оплаты удален" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/advertiser/payout-requests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/payout-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/publisher-balances"] });
      setSelectedRequest(null);
      toast({ title: "Запрос обновлен" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateMethod = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    createMethodMutation.mutate({
      methodType: formData.get("methodType"),
      methodName: formData.get("methodName"),
      currency: formData.get("currency"),
      minPayout: formData.get("minPayout") || "0",
      maxPayout: formData.get("maxPayout") || null,
      feePercent: formData.get("feePercent") || "0",
      feeFixed: formData.get("feeFixed") || "0",
      instructions: formData.get("instructions") || null,
    });
  };

  const handleApprove = (request: any, partial: boolean = false) => {
    updateRequestMutation.mutate({
      id: request.id,
      data: {
        status: "approved",
        approvedAmount: partial ? approveAmount : request.requestedAmount,
      },
    });
  };

  const handleReject = (request: any) => {
    updateRequestMutation.mutate({
      id: request.id,
      data: {
        status: "rejected",
        rejectionReason: rejectReason,
      },
    });
  };

  const handlePay = (request: any) => {
    updateRequestMutation.mutate({
      id: request.id,
      data: {
        status: "paid",
        approvedAmount: request.approvedAmount || request.requestedAmount,
        transactionId: transactionId,
      },
    });
  };

  const massPayoutMutation = useMutation({
    mutationFn: (requestIds: string[]) => apiRequest("POST", "/api/advertiser/mass-payout", { requestIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/payout-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/publisher-balances"] });
      setSelectedRequestIds([]);
      setShowMassPayout(false);
      toast({ title: "Массовая выплата выполнена" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const bonusPayoutMutation = useMutation({
    mutationFn: (data: { publisherId: string; paymentMethodId: string; walletAddress: string; amount: string; currency: string; note: string }) => 
      apiRequest("POST", "/api/advertiser/payouts/bonus", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/publisher-balances"] });
      setShowBonusDialog(false);
      setBonusPublisherId("");
      setBonusMethodId("");
      setBonusAmount("");
      setBonusNote("");
      toast({ title: "Бонус выплачен" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleBonusPayout = () => {
    const method = paymentMethods.find((m: any) => m.id === bonusMethodId);
    if (!method) return;
    
    bonusPayoutMutation.mutate({
      publisherId: bonusPublisherId,
      paymentMethodId: bonusMethodId,
      walletAddress: "bonus",
      amount: bonusAmount,
      currency: method.currency || "USD",
      note: bonusNote || "Бонусная выплата",
    });
  };

  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllApproved = () => {
    setSelectedRequestIds(approvedRequests.map((r: any) => r.id));
  };

  const handleMassPayout = () => {
    massPayoutMutation.mutate(selectedRequestIds);
  };

  const pendingRequests = payoutRequests.filter((r: any) => r.status === "pending");
  const approvedRequests = payoutRequests.filter((r: any) => r.status === "approved");
  const selectedTotal = approvedRequests
    .filter((r: any) => selectedRequestIds.includes(r.id))
    .reduce((sum: number, r: any) => sum + parseFloat(r.approvedAmount || r.requestedAmount || 0), 0);
  const totalPending = pendingRequests.reduce((sum: number, r: any) => sum + parseFloat(r.requestedAmount || 0), 0);
  const totalOwed = publisherBalances.reduce((sum: number, b: any) => sum + b.available, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Финансы</h1>
          <p className="text-slate-400 text-sm">Управление выплатами партнерам</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#0A0A0A] border-white/10" data-testid="card-pending-requests">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Ожидает одобрения</p>
                <p className="text-xl font-bold text-white" data-testid="text-pending-count">{pendingRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0A0A] border-white/10" data-testid="card-pending-amount">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">К выплате (pending)</p>
                <p className="text-xl font-bold text-white" data-testid="text-pending-amount">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0A0A] border-white/10" data-testid="card-total-owed">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Общий долг</p>
                <p className="text-xl font-bold text-white" data-testid="text-total-owed">${totalOwed.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0A0A] border-white/10" data-testid="card-active-partners">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Активных партнеров</p>
                <p className="text-xl font-bold text-white" data-testid="text-active-partners">{publisherBalances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="bg-[#0A0A0A] border border-white/10">
          <TabsTrigger value="requests" data-testid="tab-requests" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Send className="h-4 w-4 mr-1 text-yellow-500" />
            Запросы на выплату
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-yellow-600 text-black">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="balances" data-testid="tab-balances" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-1 text-emerald-500" />
            Балансы партнеров
          </TabsTrigger>
          <TabsTrigger value="methods" data-testid="tab-methods" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <CreditCard className="h-4 w-4 mr-1 text-blue-500" />
            Способы оплаты
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <History className="h-4 w-4 mr-1 text-purple-500" />
            История выплат
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {requestsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : payoutRequests.length === 0 ? (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="py-12 text-center">
                <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Нет запросов на выплату</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Mass Payout Panel */}
              {approvedRequests.length > 0 && (
                <Card className="bg-[#0A0A0A] border-emerald-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CheckSquare className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-sm text-white">Одобренных к выплате: <span className="font-bold">{approvedRequests.length}</span></p>
                          {selectedRequestIds.length > 0 && (
                            <p className="text-xs text-slate-400">Выбрано: {selectedRequestIds.length} на сумму ${selectedTotal.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAllApproved} data-testid="button-select-all">
                          Выбрать все
                        </Button>
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700" 
                          size="sm"
                          disabled={selectedRequestIds.length === 0 || massPayoutMutation.isPending}
                          onClick={handleMassPayout}
                          data-testid="button-mass-payout"
                        >
                          {massPayoutMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Массовая выплата
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {payoutRequests.map((request: any) => (
                <Card key={request.id} className="bg-[#0A0A0A] border-white/10" data-testid={`card-request-${request.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Checkbox for approved requests */}
                          {request.status === "approved" && (
                            <Checkbox 
                              checked={selectedRequestIds.includes(request.id)}
                              onCheckedChange={() => toggleRequestSelection(request.id)}
                              data-testid={`checkbox-request-${request.id}`}
                            />
                          )}
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
                            {request.publisherName?.slice(0, 2).toUpperCase() || "??"}
                          </div>
                          <div>
                            <p className="font-medium text-white" data-testid={`text-publisher-name-${request.id}`}>{request.publisherName || `Publisher #${request.publisherId?.slice(0, 8)}`}</p>
                            <p className="text-xs text-slate-400">{request.publisherEmail}</p>
                            <p className="text-sm text-slate-400">
                              Запрошено: <span className="text-white font-mono" data-testid={`text-request-amount-${request.id}`}>${request.requestedAmount}</span>
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={
                            request.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : request.status === "approved"
                              ? "bg-blue-500/20 text-blue-500"
                              : request.status === "paid"
                              ? "bg-emerald-500/20 text-emerald-500"
                              : "bg-red-500/20 text-red-500"
                          }
                          data-testid={`badge-status-${request.id}`}
                        >
                          {request.status === "pending" && "Ожидает"}
                          {request.status === "approved" && "Одобрено"}
                          {request.status === "paid" && "Оплачено"}
                          {request.status === "rejected" && "Отклонено"}
                        </Badge>
                      </div>
                      
                      {/* Payment Requisites */}
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-xs text-slate-400 mb-2">Реквизиты для выплаты:</p>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{request.methodName || request.methodType}</Badge>
                        </div>
                        <p className="font-mono text-sm text-white break-all" data-testid={`text-wallet-address-${request.id}`}>{request.walletAddress}</p>
                        {request.walletAccountName && (
                          <p className="text-xs text-slate-400 mt-1">Имя: {request.walletAccountName}</p>
                        )}
                        {request.walletAdditionalInfo && (
                          <p className="text-xs text-slate-400">Доп. инфо: {request.walletAdditionalInfo}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-3">
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApprove(request)}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Одобрить
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="border-white/20" data-testid={`button-partial-${request.id}`}>
                                  Частично
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-[#0A0A0A] border-white/10">
                                <DialogHeader>
                                  <DialogTitle>Частичное одобрение</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Сумма к выплате</Label>
                                    <Input
                                      type="number"
                                      value={approveAmount}
                                      onChange={(e) => setApproveAmount(e.target.value)}
                                      max={request.requestedAmount}
                                      className="bg-[#111] border-white/10"
                                      data-testid="input-partial-amount"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                      Запрошено: ${request.requestedAmount}
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleApprove(request, true)}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    data-testid="button-confirm-partial"
                                  >
                                    Одобрить частично
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive" data-testid={`button-reject-${request.id}`}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-[#0A0A0A] border-white/10">
                                <DialogHeader>
                                  <DialogTitle>Отклонить запрос</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Причина отказа</Label>
                                    <Textarea
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                      className="bg-[#111] border-white/10"
                                      placeholder="Укажите причину..."
                                      data-testid="input-reject-reason"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleReject(request)}
                                    variant="destructive"
                                    className="w-full"
                                    data-testid="button-confirm-reject"
                                  >
                                    Отклонить
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}

                        {request.status === "approved" && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" data-testid={`button-pay-${request.id}`}>
                                <Send className="w-4 h-4 mr-1" />
                                Выплатить
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#0A0A0A] border-white/10">
                              <DialogHeader>
                                <DialogTitle>Подтверждение выплаты</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-lg">
                                  <p className="text-sm text-slate-400">Сумма</p>
                                  <p className="text-2xl font-bold text-white" data-testid="text-pay-amount">
                                    ${request.approvedAmount || request.requestedAmount}
                                  </p>
                                </div>
                                <div>
                                  <Label>ID транзакции (опционально)</Label>
                                  <Input
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className="bg-[#111] border-white/10"
                                    placeholder="TX hash или номер перевода"
                                    data-testid="input-transaction-id"
                                  />
                                </div>
                                <Button
                                  onClick={() => handlePay(request)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                                  data-testid="button-confirm-pay"
                                >
                                  Подтвердить выплату
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          {balancesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : publisherBalances.length === 0 ? (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Нет активных партнеров</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="text-left py-3 px-4">Партнер</th>
                    <th className="text-right py-3 px-4">Доступно</th>
                    <th className="text-right py-3 px-4">В ожидании</th>
                    <th className="text-right py-3 px-4">Холд</th>
                    <th className="text-right py-3 px-4">Выплачено</th>
                    <th className="text-right py-3 px-4">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {publisherBalances.map((balance: any) => (
                    <tr key={balance.publisherId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-white">{balance.publisherName}</p>
                          <p className="text-xs text-slate-400">{balance.publisherEmail}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-emerald-500">
                        ${balance.available.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-yellow-500">
                        ${balance.pending.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-slate-400">
                        ${balance.hold.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-white">
                        ${balance.totalPaid.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Button 
                          size="sm" 
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                          onClick={() => {
                            setBonusPublisherId(balance.publisherId);
                            setShowBonusDialog(true);
                          }}
                          data-testid={`button-bonus-${balance.publisherId}`}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Бонус
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCreateMethod} onOpenChange={setShowCreateMethod}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="button-add-method">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить способ оплаты
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0A0A0A] border-white/10">
                <DialogHeader>
                  <DialogTitle>Новый способ оплаты</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateMethod} className="space-y-4" data-testid="form-create-method">
                  <div>
                    <Label>Тип</Label>
                    <Select name="methodType" required>
                      <SelectTrigger className="bg-[#111] border-white/10" data-testid="select-method-type">
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className={`w-4 h-4 ${type.color}`} />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Название</Label>
                    <Input
                      name="methodName"
                      required
                      className="bg-[#111] border-white/10"
                      placeholder="Например: USDT TRC20"
                    />
                  </div>
                  <div>
                    <Label>Валюта</Label>
                    <Select name="currency" required>
                      <SelectTrigger className="bg-[#111] border-white/10">
                        <SelectValue placeholder="Выберите валюту" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Мин. выплата</Label>
                      <Input
                        name="minPayout"
                        type="number"
                        step="0.01"
                        className="bg-[#111] border-white/10"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <Label>Макс. выплата</Label>
                      <Input
                        name="maxPayout"
                        type="number"
                        step="0.01"
                        className="bg-[#111] border-white/10"
                        placeholder="10000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Комиссия %</Label>
                      <Input
                        name="feePercent"
                        type="number"
                        step="0.01"
                        className="bg-[#111] border-white/10"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Фикс. комиссия</Label>
                      <Input
                        name="feeFixed"
                        type="number"
                        step="0.01"
                        className="bg-[#111] border-white/10"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Инструкции</Label>
                    <Textarea
                      name="instructions"
                      className="bg-[#111] border-white/10"
                      placeholder="Инструкции для партнеров..."
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={createMethodMutation.isPending}
                  >
                    {createMethodMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Создать"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {methodsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="py-12 text-center">
                <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Добавьте способы оплаты для партнеров</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map((method: any) => {
                const typeInfo = PAYMENT_TYPES.find((t) => t.value === method.methodType);
                const Icon = typeInfo?.icon || Wallet;
                return (
                  <Card key={method.id} className="bg-[#0A0A0A] border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${typeInfo?.color || "text-slate-400"}`} />
                          </div>
                          <div>
                            <p className="font-medium text-white">{method.methodName}</p>
                            <p className="text-xs text-slate-400">{method.currency}</p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                          onClick={() => deleteMethodMutation.mutate(method.id)}
                          data-testid={`button-delete-method-${method.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Мин. выплата</span>
                          <span className="text-white">${method.minPayout}</span>
                        </div>
                        {method.maxPayout && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Макс. выплата</span>
                            <span className="text-white">${method.maxPayout}</span>
                          </div>
                        )}
                        {(parseFloat(method.feePercent) > 0 || parseFloat(method.feeFixed) > 0) && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Комиссия</span>
                            <span className="text-white">
                              {method.feePercent}% + ${method.feeFixed}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {payoutsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : payouts.length === 0 ? (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="py-12 text-center">
                <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">История выплат пуста</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="text-left py-3 px-4">Дата</th>
                    <th className="text-left py-3 px-4">Партнер</th>
                    <th className="text-left py-3 px-4">Тип</th>
                    <th className="text-right py-3 px-4">Сумма</th>
                    <th className="text-right py-3 px-4">Комиссия</th>
                    <th className="text-right py-3 px-4">Итого</th>
                    <th className="text-left py-3 px-4">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout: any) => (
                    <tr key={payout.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-white">
                        #{payout.publisherId?.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            payout.payoutType === "bonus"
                              ? "bg-purple-500/20 text-purple-500"
                              : payout.payoutType === "auto"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-slate-500/20 text-slate-400"
                          }
                        >
                          {payout.payoutType}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-white">
                        ${payout.amount}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-red-400">
                        -${payout.feeAmount}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-emerald-500 font-bold">
                        ${payout.netAmount}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-emerald-500/20 text-emerald-500">
                          {payout.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bonus Payout Dialog */}
      <Dialog open={showBonusDialog} onOpenChange={setShowBonusDialog}>
        <DialogContent className="bg-[#0A0A0A] border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              Бонусная выплата
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Партнер</Label>
              <Input
                value={publisherBalances.find((b: any) => b.publisherId === bonusPublisherId)?.publisherName || ""}
                disabled
                className="bg-[#111] border-white/10"
              />
            </div>
            <div>
              <Label>Способ оплаты</Label>
              <Select value={bonusMethodId} onValueChange={setBonusMethodId}>
                <SelectTrigger className="bg-[#111] border-white/10" data-testid="select-bonus-method">
                  <SelectValue placeholder="Выберите способ" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method: any) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.methodName} ({method.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Сумма</Label>
              <Input
                type="number"
                step="0.01"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                placeholder="100.00"
                className="bg-[#111] border-white/10"
                data-testid="input-bonus-amount"
              />
            </div>
            <div>
              <Label>Комментарий</Label>
              <Textarea
                value={bonusNote}
                onChange={(e) => setBonusNote(e.target.value)}
                placeholder="За хорошую работу..."
                className="bg-[#111] border-white/10"
                data-testid="input-bonus-note"
              />
            </div>
            <Button
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              disabled={!bonusMethodId || !bonusAmount || bonusPayoutMutation.isPending}
              onClick={handleBonusPayout}
              data-testid="button-send-bonus"
            >
              {bonusPayoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Выплатить бонус
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
