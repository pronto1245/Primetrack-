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
  AlertCircle, History, BookOpen, HelpCircle, FileText
} from "lucide-react";
import { PublisherInvoices } from "./PublisherInvoices";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";
import { PendingPartnershipOverlay } from "./PendingPartnershipOverlay";
import { ExportMenu } from "@/components/ui/export-menu";

const PAYMENT_ICONS: Record<string, any> = {
  crypto_usdt_trc20: { icon: Bitcoin, color: "text-green-500" },
  crypto_usdt_erc20: { icon: Bitcoin, color: "text-blue-400" },
  crypto_usdt_bep20: { icon: Bitcoin, color: "text-yellow-400" },
  crypto_btc: { icon: Bitcoin, color: "text-orange-500" },
  crypto_eth: { icon: Bitcoin, color: "text-purple-400" },
  crypto_ltc: { icon: Bitcoin, color: "text-muted-foreground" },
  bank_card: { icon: CreditCard, color: "text-blue-500" },
  bank_transfer: { icon: CreditCard, color: "text-cyan-500" },
  binance: { icon: Building2, color: "text-yellow-500" },
  bybit: { icon: Building2, color: "text-purple-500" },
  kraken: { icon: Building2, color: "text-blue-500" },
  coinbase: { icon: Building2, color: "text-blue-400" },
  exmo: { icon: Building2, color: "text-cyan-500" },
  mexc: { icon: Building2, color: "text-teal-500" },
  okx: { icon: Building2, color: "text-muted-foreground" },
  paypal: { icon: CreditCard, color: "text-blue-600" },
  webmoney: { icon: CreditCard, color: "text-blue-500" },
  capitalist: { icon: CreditCard, color: "text-red-500" },
  qiwi: { icon: CreditCard, color: "text-orange-400" },
  skrill: { icon: CreditCard, color: "text-purple-600" },
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
          <h1 className="text-2xl font-bold text-foreground">Выплаты</h1>
          <p className="text-muted-foreground text-sm">
            Управление кошельками и запросы на выплату
            {advertiserInfo && (
              <span className="ml-2 text-blue-400">• {advertiserInfo.username}</span>
            )}
          </p>
        </div>
        <ExportMenu dataset="publisher-payouts" />
      </div>

      {!selectedAdvertiser ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Нет подключенных рекламодателей</p>
            <p className="text-sm text-muted-foreground mt-2">
              Сначала подайте заявку на доступ к офферам
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border" data-testid="card-available-balance">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Доступно к выводу</p>
                    <p className="text-xl font-bold text-emerald-500" data-testid="text-available-balance">${availableBalance.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border" data-testid="card-pending-balance">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">В обработке</p>
                    <p className="text-xl font-bold text-yellow-500" data-testid="text-pending-balance">${pendingBalance.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border" data-testid="card-hold-balance">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">На холде</p>
                    <p className="text-xl font-bold text-red-400" data-testid="text-hold-balance">${holdBalance.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border" data-testid="card-total-paid">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Всего выплачено</p>
                    <p className="text-xl font-bold text-foreground" data-testid="text-total-paid">${totalPaid.toFixed(2)}</p>
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
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Запрос на выплату</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-sm text-muted-foreground">Доступно к выводу</p>
                    <p className="text-2xl font-bold text-emerald-500">${availableBalance.toFixed(2)}</p>
                  </div>

                  <div>
                    <Label>Кошелек для выплаты</Label>
                    <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Выберите кошелек" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((wallet: any) => {
                          const method = paymentMethods.find((m: any) => m.id === wallet.paymentMethodId);
                          return (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              <div className="flex items-center gap-2">
                                <span>{method?.methodName || "Wallet"}</span>
                                <span className="text-muted-foreground text-xs">
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
                      className="bg-input border-border"
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
                      className="bg-input border-border"
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
            <TabsList className="bg-card border border-border gap-2 p-1">
              <TabsTrigger value="wallets" data-testid="tab-wallets" className="px-4 py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Wallet className="w-4 h-4 mr-2 text-blue-400" />
                Мои кошельки
              </TabsTrigger>
              <TabsTrigger value="requests" data-testid="tab-requests" className="px-4 py-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                <Clock className="w-4 h-4 mr-2 text-yellow-400" />
                Запросы
                {payoutRequests.filter((r: any) => r.status === "pending").length > 0 && (
                  <Badge className="ml-2 bg-yellow-600 text-black">
                    {payoutRequests.filter((r: any) => r.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history" className="px-4 py-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <History className="w-4 h-4 mr-2 text-purple-400" />
                История
              </TabsTrigger>
              <TabsTrigger value="invoices" data-testid="tab-invoices" className="px-4 py-2 data-[state=active]:bg-green-500 data-[state=active]:text-white">
                <FileText className="w-4 h-4 mr-2 text-green-400" />
                Инвойсы
              </TabsTrigger>
              <TabsTrigger value="instructions" data-testid="tab-instructions" className="px-4 py-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                <BookOpen className="w-4 h-4 mr-2 text-cyan-400" />
                Инструкция
              </TabsTrigger>
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
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Добавить кошелек</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddWallet} className="space-y-4">
                      <div>
                        <Label>Способ оплаты</Label>
                        <Select name="paymentMethodId" required>
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue placeholder="Выберите способ" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method: any) => {
                              const iconInfo = PAYMENT_ICONS[method.methodType] || { icon: Wallet, color: "text-muted-foreground" };
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
                          className="bg-input border-border"
                          placeholder="TRC20 адрес, номер карты и т.д."
                        />
                      </div>
                      <div>
                        <Label>Имя владельца (опционально)</Label>
                        <Input
                          name="accountName"
                          className="bg-input border-border"
                          placeholder="Имя на карте / UID"
                        />
                      </div>
                      <div>
                        <Label>Дополнительная информация</Label>
                        <Textarea
                          name="additionalInfo"
                          className="bg-input border-border"
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
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Рекламодатель не настроил способы оплаты</p>
                  </CardContent>
                </Card>
              ) : wallets.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Добавьте кошелек для получения выплат</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wallets.map((wallet: any) => {
                    const method = paymentMethods.find((m: any) => m.id === wallet.paymentMethodId);
                    const iconInfo = PAYMENT_ICONS[method?.methodType] || { icon: Wallet, color: "text-muted-foreground" };
                    const Icon = iconInfo.icon;
                    return (
                      <Card key={wallet.id} className="bg-card border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                <Icon className={`w-5 h-5 ${iconInfo.color}`} />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{method?.methodName}</p>
                                <p className="text-xs text-muted-foreground">{method?.currency}</p>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-red-500"
                              onClick={() => deleteWalletMutation.mutate(wallet.id)}
                              data-testid={`button-delete-wallet-${wallet.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Адрес</p>
                              <p className="text-foreground font-mono text-xs break-all">
                                {wallet.walletAddress}
                              </p>
                            </div>
                            {wallet.accountName && (
                              <div>
                                <p className="text-muted-foreground text-xs">Владелец</p>
                                <p className="text-foreground">{wallet.accountName}</p>
                              </div>
                            )}
                            {method?.minPayout && (
                              <div className="pt-2 border-t border-white/5">
                                <p className="text-xs text-muted-foreground">
                                  Мин. выплата: <span className="text-foreground">${method.minPayout}</span>
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
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Нет запросов на выплату</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {payoutRequests.map((request: any) => {
                    const wallet = wallets.find((w: any) => w.id === request.walletId);
                    const method = paymentMethods.find((m: any) => m.id === request.paymentMethodId);
                    return (
                      <Card key={request.id} className="bg-card border-border">
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
                                <p className="font-medium text-foreground font-mono">
                                  ${request.requestedAmount}
                                  {request.approvedAmount &&
                                    request.approvedAmount !== request.requestedAmount && (
                                      <span className="text-muted-foreground text-sm ml-2">
                                        (одобрено: ${request.approvedAmount})
                                      </span>
                                    )}
                                </p>
                                <p className="text-sm text-muted-foreground">
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
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">История выплат пуста</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
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
                          <tr key={payout.id} className="border-b border-white/5 hover:bg-muted">
                            <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                              {new Date(payout.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-foreground">
                              {method?.methodName || payout.currency}
                            </td>
                            <td className="text-right py-3 px-4 font-mono text-foreground">
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

            <TabsContent value="invoices">
              <PublisherInvoices />
            </TabsContent>

            <TabsContent value="instructions" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BookOpen className="h-6 w-6 text-cyan-500" />
                    Руководство для партнёра
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Как работать с выплатами, кошельками и балансами
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-8">
                      
                      <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-blue-500 flex items-center gap-2">
                          <Wallet className="w-5 h-5" />
                          1. Привязка кошелька
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                          <p><strong className="text-foreground">Зачем нужен кошелёк:</strong> Чтобы получать выплаты, вам нужно привязать свой кошелёк к способу оплаты рекламодателя.</p>
                          <div className="space-y-2">
                            <p className="text-foreground font-medium">Как добавить кошелёк:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                              <li>Нажмите кнопку <Badge className="bg-blue-500/20 text-blue-500">+ Добавить кошелек</Badge></li>
                              <li>Выберите способ оплаты из списка рекламодателя</li>
                              <li>Введите адрес вашего кошелька</li>
                              <li>Укажите имя владельца (для верификации)</li>
                              <li>Добавьте дополнительную информацию при необходимости</li>
                              <li>Сохраните кошелёк</li>
                            </ol>
                          </div>
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mt-2">
                            <p className="text-amber-400"><AlertCircle className="w-4 h-4 inline mr-1" /> <strong>ВАЖНО:</strong> Тщательно проверяйте адрес кошелька! Ошибка может привести к потере средств.</p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-emerald-500 flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          2. Ваш баланс
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                          <p><strong className="text-foreground">Типы баланса:</strong></p>
                          <ul className="space-y-2 ml-2">
                            <li><Badge className="bg-emerald-500/20 text-emerald-500">Доступно</Badge> — средства, которые можно вывести прямо сейчас</li>
                            <li><Badge className="bg-yellow-500/20 text-yellow-500">В ожидании</Badge> — средства в процессе обработки (запрос отправлен)</li>
                            <li><Badge className="bg-muted text-muted-foreground">На холде</Badge> — средства заморожены на период Hold</li>
                          </ul>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mt-2">
                            <p className="text-blue-400"><HelpCircle className="w-4 h-4 inline mr-1" /> Баланс обновляется автоматически при получении новых конверсий и после окончания Hold периода.</p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
                          <Send className="w-5 h-5" />
                          3. Запрос на выплату
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                          <p><strong className="text-foreground">Как запросить выплату:</strong></p>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>Убедитесь, что у вас есть <strong>доступный баланс</strong></li>
                            <li>Проверьте, что кошелёк привязан</li>
                            <li>Нажмите <Badge className="bg-yellow-500/20 text-yellow-500">Запросить выплату</Badge></li>
                            <li>Выберите кошелёк для получения</li>
                            <li>Укажите сумму (не меньше минимальной)</li>
                            <li>Добавьте комментарий (опционально)</li>
                            <li>Отправьте запрос</li>
                          </ol>
                          <div className="mt-3 space-y-2">
                            <p className="text-foreground font-medium">Статусы запроса:</p>
                            <ul className="space-y-1 ml-2">
                              <li><Badge className="bg-yellow-500/20 text-yellow-500">pending</Badge> — ожидает рассмотрения рекламодателем</li>
                              <li><Badge className="bg-emerald-500/20 text-emerald-500">approved</Badge> — одобрен, ожидает перевода</li>
                              <li><Badge className="bg-blue-500/20 text-blue-500">paid</Badge> — выплачен, проверьте ваш кошелёк</li>
                              <li><Badge className="bg-red-500/20 text-red-500">rejected</Badge> — отклонён (причина указана)</li>
                            </ul>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          4. Hold период
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                          <p><strong className="text-foreground">Что такое Hold:</strong></p>
                          <p>Hold — это период заморозки средств после конверсии. В течение этого времени рекламодатель проверяет качество лида.</p>
                          <div className="mt-3 space-y-2">
                            <p className="text-foreground font-medium">Как это работает:</p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                              <li>Каждый оффер имеет свой Hold период (0-30 дней)</li>
                              <li>После конверсии деньги попадают в "На холде"</li>
                              <li>По истечении Hold периода средства переходят в "Доступно"</li>
                              <li>Если лид отклонён — средства не начисляются</li>
                            </ul>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mt-2">
                            <p className="text-blue-400"><HelpCircle className="w-4 h-4 inline mr-1" /> Hold защищает рекламодателя от некачественного трафика. Чем качественнее ваш трафик, тем меньше отклонений.</p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-purple-500 flex items-center gap-2">
                          <History className="w-5 h-5" />
                          5. История выплат
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                          <p><strong className="text-foreground">Что отображается в истории:</strong></p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>Дата выплаты</li>
                            <li>Способ оплаты</li>
                            <li>Сумма до комиссии</li>
                            <li>Удержанная комиссия</li>
                            <li>Итоговая сумма (получено на кошелёк)</li>
                            <li>Статус транзакции</li>
                          </ul>
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 mt-2">
                            <p className="text-emerald-400"><Check className="w-4 h-4 inline mr-1" /> Храните историю выплат для отчётности и сверки.</p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-red-500 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          6. Частые вопросы
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-4 text-sm text-muted-foreground">
                          <div>
                            <p className="text-foreground font-medium">Почему я не могу запросить выплату?</p>
                            <p className="mt-1">Проверьте: 1) Достаточно ли доступного баланса 2) Привязан ли кошелёк 3) Сумма не меньше минимальной</p>
                          </div>
                          <div>
                            <p className="text-foreground font-medium">Сколько ждать выплату?</p>
                            <p className="mt-1">Обычно 1-3 рабочих дня. Если у рекламодателя настроены автовыплаты — быстрее.</p>
                          </div>
                          <div>
                            <p className="text-foreground font-medium">Мой запрос отклонён. Что делать?</p>
                            <p className="mt-1">Посмотрите причину отказа в карточке запроса. Часто это связано с Hold или верификацией кошелька.</p>
                          </div>
                          <div>
                            <p className="text-foreground font-medium">Почему мой баланс на холде?</p>
                            <p className="mt-1">Конверсии находятся в периоде проверки. Дождитесь окончания Hold периода оффера.</p>
                          </div>
                          <div>
                            <p className="text-foreground font-medium">Где узнать минимальную сумму выплаты?</p>
                            <p className="mt-1">Минимальная сумма указана в способе оплаты рекламодателя при выборе кошелька.</p>
                          </div>
                        </div>
                      </section>

                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
