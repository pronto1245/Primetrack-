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
import { 
  Wallet, Plus, CreditCard, Bitcoin, Building2, ArrowRight, 
  Check, X, Clock, DollarSign, Send, Loader2, Trash2,
  AlertCircle, History
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";
import { PendingPartnershipOverlay } from "./PendingPartnershipOverlay";

const PAYMENT_ICONS: Record<string, any> = {
  crypto_usdt_trc20: { icon: Bitcoin, color: "text-green-500" },
  crypto_btc: { icon: Bitcoin, color: "text-orange-500" },
  bank_card: { icon: CreditCard, color: "text-blue-500" },
  binance: { icon: Building2, color: "text-yellow-500" },
  bybit: { icon: Building2, color: "text-purple-500" },
};

export function PublisherPayouts() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use global advertiser context
  const { selectedAdvertiserId: selectedAdvertiser, selectedAdvertiser: advertiserInfo, isPendingPartnership } = useAdvertiserContext();
  
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showRequestPayout, setShowRequestPayout] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");

  const { data: balance } = useQuery<any>({
    queryKey: ["/api/publisher/balance", selectedAdvertiser],
    enabled: !!selectedAdvertiser,
  });

  const { data: wallets = [] } = useQuery<any[]>({
    queryKey: ["/api/publisher/wallets", selectedAdvertiser],
    enabled: !!selectedAdvertiser,
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/publisher/advertiser-payment-methods", selectedAdvertiser],
    enabled: !!selectedAdvertiser,
  });

  const { data: payoutRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/publisher/payout-requests", selectedAdvertiser],
    enabled: !!selectedAdvertiser,
  });

  const { data: payouts = [] } = useQuery<any[]>({
    queryKey: ["/api/publisher/payouts", selectedAdvertiser],
    enabled: !!selectedAdvertiser,
  });

  const createWalletMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/publisher/wallets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publisher/wallets", selectedAdvertiser] });
      setShowAddWallet(false);
      toast({ title: "Кошелек добавлен" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteWalletMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/publisher/wallets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publisher/wallets", selectedAdvertiser] });
      toast({ title: "Кошелек удален" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const createPayoutRequestMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/publisher/payout-requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publisher/payout-requests", selectedAdvertiser] });
      queryClient.invalidateQueries({ queryKey: ["/api/publisher/balance", selectedAdvertiser] });
      setShowRequestPayout(false);
      setRequestAmount("");
      setRequestNote("");
      setSelectedWallet("");
      toast({ title: "Запрос на выплату отправлен" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleAddWallet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    createWalletMutation.mutate({
      advertiserId: selectedAdvertiser,
      paymentMethodId: formData.get("paymentMethodId"),
      walletAddress: formData.get("walletAddress"),
      accountName: formData.get("accountName") || null,
      additionalInfo: formData.get("additionalInfo") || null,
    });
  };

  const handleRequestPayout = () => {
    if (!selectedWallet || !requestAmount) return;
    createPayoutRequestMutation.mutate({
      advertiserId: selectedAdvertiser,
      walletId: selectedWallet,
      requestedAmount: requestAmount,
      publisherNote: requestNote || null,
    });
  };

  const availableBalance = balance?.available || 0;
  const pendingBalance = balance?.pending || 0;
  const holdBalance = balance?.hold || 0;
  const totalPaid = balance?.totalPaid || 0;

  // Show pending overlay if partnership is not active (after all hooks)
  if (isPendingPartnership) {
    return <PendingPartnershipOverlay />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Выплаты</h1>
          <p className="text-slate-400 text-sm">
            Управление кошельками и запросы на выплату
            {advertiserInfo && (
              <span className="ml-2 text-blue-400">• {advertiserInfo.username}</span>
            )}
          </p>
        </div>
      </div>

      {!selectedAdvertiser ? (
        <Card className="bg-[#0A0A0A] border-white/10">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Нет подключенных рекламодателей</p>
            <p className="text-sm text-slate-500 mt-2">
              Сначала подайте заявку на доступ к офферам
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[#0A0A0A] border-white/10" data-testid="card-available-balance">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Доступно к выводу</p>
                    <p className="text-xl font-bold text-emerald-500" data-testid="text-available-balance">${availableBalance.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A] border-white/10" data-testid="card-pending-balance">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">В обработке</p>
                    <p className="text-xl font-bold text-yellow-500" data-testid="text-pending-balance">${pendingBalance.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A] border-white/10" data-testid="card-hold-balance">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">На холде</p>
                    <p className="text-xl font-bold text-red-400" data-testid="text-hold-balance">${holdBalance.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A] border-white/10" data-testid="card-total-paid">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Всего выплачено</p>
                    <p className="text-xl font-bold text-white" data-testid="text-total-paid">${totalPaid.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
            <Dialog open={showRequestPayout} onOpenChange={setShowRequestPayout}>
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={availableBalance <= 0 || wallets.length === 0}
                  data-testid="button-request-payout"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Запросить выплату
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0A0A0A] border-white/10">
                <DialogHeader>
                  <DialogTitle>Запрос на выплату</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-sm text-slate-400">Доступно к выводу</p>
                    <p className="text-2xl font-bold text-emerald-500">${availableBalance.toFixed(2)}</p>
                  </div>

                  <div>
                    <Label>Кошелек для выплаты</Label>
                    <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                      <SelectTrigger className="bg-[#111] border-white/10">
                        <SelectValue placeholder="Выберите кошелек" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((wallet: any) => {
                          const method = paymentMethods.find((m: any) => m.id === wallet.paymentMethodId);
                          return (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              <div className="flex items-center gap-2">
                                <span>{method?.methodName || "Wallet"}</span>
                                <span className="text-slate-400 text-xs">
                                  {wallet.walletAddress.slice(0, 10)}...
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Сумма</Label>
                    <Input
                      type="number"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      max={availableBalance}
                      step="0.01"
                      className="bg-[#111] border-white/10"
                      placeholder="100.00"
                      data-testid="input-request-amount"
                    />
                    <Button
                      variant="link"
                      className="text-xs text-emerald-500 p-0 h-auto"
                      onClick={() => setRequestAmount(availableBalance.toString())}
                      data-testid="button-withdraw-all"
                    >
                      Вывести все
                    </Button>
                  </div>

                  <div>
                    <Label>Комментарий (опционально)</Label>
                    <Textarea
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      className="bg-[#111] border-white/10"
                      placeholder="Дополнительная информация..."
                    />
                  </div>

                  <Button
                    onClick={handleRequestPayout}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={
                      !selectedWallet ||
                      !requestAmount ||
                      parseFloat(requestAmount) <= 0 ||
                      parseFloat(requestAmount) > availableBalance ||
                      createPayoutRequestMutation.isPending
                    }
                  >
                    {createPayoutRequestMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Отправить запрос"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {wallets.length === 0 && (
              <p className="text-sm text-yellow-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Сначала добавьте кошелек для получения выплат
              </p>
            )}
          </div>

          <Tabs defaultValue="wallets" className="space-y-4">
            <TabsList className="bg-[#0A0A0A] border border-white/10">
              <TabsTrigger value="wallets" data-testid="tab-wallets">Мои кошельки</TabsTrigger>
              <TabsTrigger value="requests" data-testid="tab-requests">
                Запросы
                {payoutRequests.filter((r: any) => r.status === "pending").length > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-black">
                    {payoutRequests.filter((r: any) => r.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">История</TabsTrigger>
            </TabsList>

            <TabsContent value="wallets" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={showAddWallet} onOpenChange={setShowAddWallet}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={paymentMethods.length === 0}
                      data-testid="button-add-wallet"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить кошелек
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0A] border-white/10">
                    <DialogHeader>
                      <DialogTitle>Добавить кошелек</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddWallet} className="space-y-4">
                      <div>
                        <Label>Способ оплаты</Label>
                        <Select name="paymentMethodId" required>
                          <SelectTrigger className="bg-[#111] border-white/10">
                            <SelectValue placeholder="Выберите способ" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method: any) => {
                              const iconInfo = PAYMENT_ICONS[method.methodType] || { icon: Wallet, color: "text-slate-400" };
                              const Icon = iconInfo.icon;
                              return (
                                <SelectItem key={method.id} value={method.id}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${iconInfo.color}`} />
                                    {method.methodName} ({method.currency})
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Адрес кошелька / Номер карты</Label>
                        <Input
                          name="walletAddress"
                          required
                          className="bg-[#111] border-white/10"
                          placeholder="TRC20 адрес, номер карты и т.д."
                        />
                      </div>
                      <div>
                        <Label>Имя владельца (опционально)</Label>
                        <Input
                          name="accountName"
                          className="bg-[#111] border-white/10"
                          placeholder="Имя на карте / UID"
                        />
                      </div>
                      <div>
                        <Label>Дополнительная информация</Label>
                        <Textarea
                          name="additionalInfo"
                          className="bg-[#111] border-white/10"
                          placeholder="Банк, страна и т.д."
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={createWalletMutation.isPending}
                      >
                        {createWalletMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Добавить"
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {paymentMethods.length === 0 ? (
                <Card className="bg-[#0A0A0A] border-white/10">
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Рекламодатель не настроил способы оплаты</p>
                  </CardContent>
                </Card>
              ) : wallets.length === 0 ? (
                <Card className="bg-[#0A0A0A] border-white/10">
                  <CardContent className="py-12 text-center">
                    <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Добавьте кошелек для получения выплат</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wallets.map((wallet: any) => {
                    const method = paymentMethods.find((m: any) => m.id === wallet.paymentMethodId);
                    const iconInfo = PAYMENT_ICONS[method?.methodType] || { icon: Wallet, color: "text-slate-400" };
                    const Icon = iconInfo.icon;
                    return (
                      <Card key={wallet.id} className="bg-[#0A0A0A] border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                <Icon className={`w-5 h-5 ${iconInfo.color}`} />
                              </div>
                              <div>
                                <p className="font-medium text-white">{method?.methodName}</p>
                                <p className="text-xs text-slate-400">{method?.currency}</p>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-red-500"
                              onClick={() => deleteWalletMutation.mutate(wallet.id)}
                              data-testid={`button-delete-wallet-${wallet.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-slate-400 text-xs">Адрес</p>
                              <p className="text-white font-mono text-xs break-all">
                                {wallet.walletAddress}
                              </p>
                            </div>
                            {wallet.accountName && (
                              <div>
                                <p className="text-slate-400 text-xs">Владелец</p>
                                <p className="text-white">{wallet.accountName}</p>
                              </div>
                            )}
                            {method?.minPayout && (
                              <div className="pt-2 border-t border-white/5">
                                <p className="text-xs text-slate-400">
                                  Мин. выплата: <span className="text-white">${method.minPayout}</span>
                                </p>
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

            <TabsContent value="requests" className="space-y-4">
              {payoutRequests.length === 0 ? (
                <Card className="bg-[#0A0A0A] border-white/10">
                  <CardContent className="py-12 text-center">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Нет запросов на выплату</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {payoutRequests.map((request: any) => {
                    const wallet = wallets.find((w: any) => w.id === request.walletId);
                    const method = paymentMethods.find((m: any) => m.id === request.paymentMethodId);
                    return (
                      <Card key={request.id} className="bg-[#0A0A0A] border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  request.status === "pending"
                                    ? "bg-yellow-500/20"
                                    : request.status === "approved"
                                    ? "bg-blue-500/20"
                                    : request.status === "paid"
                                    ? "bg-emerald-500/20"
                                    : "bg-red-500/20"
                                }`}
                              >
                                {request.status === "pending" && <Clock className="w-5 h-5 text-yellow-500" />}
                                {request.status === "approved" && <Check className="w-5 h-5 text-blue-500" />}
                                {request.status === "paid" && <Check className="w-5 h-5 text-emerald-500" />}
                                {request.status === "rejected" && <X className="w-5 h-5 text-red-500" />}
                              </div>
                              <div>
                                <p className="font-medium text-white font-mono">
                                  ${request.requestedAmount}
                                  {request.approvedAmount &&
                                    request.approvedAmount !== request.requestedAmount && (
                                      <span className="text-slate-400 text-sm ml-2">
                                        (одобрено: ${request.approvedAmount})
                                      </span>
                                    )}
                                </p>
                                <p className="text-sm text-slate-400">
                                  {method?.methodName} •{" "}
                                  {new Date(request.createdAt).toLocaleDateString()}
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
                            >
                              {request.status === "pending" && "На рассмотрении"}
                              {request.status === "approved" && "Одобрено"}
                              {request.status === "paid" && "Выплачено"}
                              {request.status === "rejected" && "Отклонено"}
                            </Badge>
                          </div>

                          {request.rejectionReason && (
                            <div className="mt-3 p-3 bg-red-500/10 rounded border border-red-500/20">
                              <p className="text-sm text-red-400">
                                <strong>Причина отказа:</strong> {request.rejectionReason}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {payouts.length === 0 ? (
                <Card className="bg-[#0A0A0A] border-white/10">
                  <CardContent className="py-12 text-center">
                    <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">История выплат пуста</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="text-left py-3 px-4">Дата</th>
                        <th className="text-left py-3 px-4">Способ</th>
                        <th className="text-right py-3 px-4">Сумма</th>
                        <th className="text-right py-3 px-4">Комиссия</th>
                        <th className="text-right py-3 px-4">Получено</th>
                        <th className="text-left py-3 px-4">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((payout: any) => {
                        const method = paymentMethods.find((m: any) => m.id === payout.paymentMethodId);
                        return (
                          <tr key={payout.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                              {new Date(payout.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-white">
                              {method?.methodName || payout.currency}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
