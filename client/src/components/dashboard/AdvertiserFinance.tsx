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
  Send, AlertCircle, CheckSquare, History, Key, Shield, Eye, EyeOff,
  BookOpen, HelpCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ExportMenu } from "@/components/ui/export-menu";

const PAYMENT_TYPES = [
  { value: "crypto_usdt_trc20", label: "USDT TRC20", icon: Bitcoin, color: "text-green-500" },
  { value: "crypto_usdt_erc20", label: "USDT ERC20", icon: Bitcoin, color: "text-blue-400" },
  { value: "crypto_usdt_bep20", label: "USDT BEP20", icon: Bitcoin, color: "text-yellow-400" },
  { value: "crypto_btc", label: "Bitcoin (BTC)", icon: Bitcoin, color: "text-orange-500" },
  { value: "crypto_eth", label: "Ethereum (ETH)", icon: Bitcoin, color: "text-purple-400" },
  { value: "crypto_ltc", label: "Litecoin (LTC)", icon: Bitcoin, color: "text-muted-foreground" },
  { value: "bank_card", label: "Банковская карта", icon: CreditCard, color: "text-blue-500" },
  { value: "bank_transfer", label: "Банковский перевод", icon: CreditCard, color: "text-cyan-500" },
  { value: "binance", label: "Binance Pay", icon: Building2, color: "text-yellow-500" },
  { value: "bybit", label: "Bybit", icon: Building2, color: "text-purple-500" },
  { value: "kraken", label: "Kraken", icon: Building2, color: "text-blue-500" },
  { value: "coinbase", label: "Coinbase", icon: Building2, color: "text-blue-400" },
  { value: "exmo", label: "EXMO", icon: Building2, color: "text-cyan-500" },
  { value: "mexc", label: "MEXC", icon: Building2, color: "text-teal-500" },
  { value: "okx", label: "OKX", icon: Building2, color: "text-muted-foreground" },
  { value: "paypal", label: "PayPal", icon: CreditCard, color: "text-blue-600" },
  { value: "webmoney", label: "WebMoney", icon: CreditCard, color: "text-blue-500" },
  { value: "capitalist", label: "Capitalist", icon: CreditCard, color: "text-red-500" },
  { value: "qiwi", label: "QIWI", icon: CreditCard, color: "text-orange-400" },
  { value: "skrill", label: "Skrill", icon: CreditCard, color: "text-purple-600" },
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
  const [exchangeKeyForms, setExchangeKeyForms] = useState<Record<string, boolean>>({});
  const [exchangeInputs, setExchangeInputs] = useState<Record<string, { apiKey: string; secretKey: string; passphrase?: string }>>({});

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

  const { data: cryptoKeysStatus = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/advertiser/crypto/keys/status"],
  });

  const saveCryptoKeysMutation = useMutation({
    mutationFn: (data: { exchange: string; apiKey: string; secretKey: string; passphrase?: string }) => 
      apiRequest("POST", "/api/advertiser/crypto/keys", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/crypto/keys/status"] });
      setExchangeInputs(prev => ({ ...prev, [variables.exchange]: { apiKey: "", secretKey: "", passphrase: "" } }));
      setExchangeKeyForms(prev => ({ ...prev, [variables.exchange]: false }));
      toast({ title: "API ключи сохранены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteCryptoKeysMutation = useMutation({
    mutationFn: (exchange: string) => apiRequest("DELETE", `/api/advertiser/crypto/keys/${exchange}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/crypto/keys/status"] });
      toast({ title: "API ключи удалены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
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
          <h1 className="text-2xl font-bold text-foreground">Финансы</h1>
          <p className="text-muted-foreground text-sm">Управление выплатами партнерам</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu dataset="finance-transactions" />
          <ExportMenu dataset="finance-payouts" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border" data-testid="card-pending-requests">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ожидает одобрения</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-pending-count">{pendingRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border" data-testid="card-pending-amount">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">К выплате (pending)</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-pending-amount">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border" data-testid="card-total-owed">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Общий долг</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-total-owed">${totalOwed.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border" data-testid="card-active-partners">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Активных партнеров</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-active-partners">{publisherBalances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="bg-card border border-border">
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
          <TabsTrigger value="api-keys" data-testid="tab-api-keys" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Key className="h-4 w-4 mr-1 text-orange-500" />
            API ключи бирж
          </TabsTrigger>
          <TabsTrigger value="instructions" data-testid="tab-instructions" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <BookOpen className="h-4 w-4 mr-1 text-blue-500" />
            Инструкция
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {requestsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : payoutRequests.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Нет запросов на выплату</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Mass Payout Panel */}
              {approvedRequests.length > 0 && (
                <Card className="bg-card border-emerald-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CheckSquare className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-sm text-foreground">Одобренных к выплате: <span className="font-bold">{approvedRequests.length}</span></p>
                          {selectedRequestIds.length > 0 && (
                            <p className="text-xs text-muted-foreground">Выбрано: {selectedRequestIds.length} на сумму ${selectedTotal.toFixed(2)}</p>
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
                <Card key={request.id} className="bg-card border-border" data-testid={`card-request-${request.id}`}>
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
                            <p className="font-medium text-foreground" data-testid={`text-publisher-name-${request.id}`}>{request.publisherName || `Publisher #${request.publisherId?.slice(0, 8)}`}</p>
                            <p className="text-xs text-muted-foreground">{request.publisherEmail}</p>
                            <p className="text-sm text-muted-foreground">
                              Запрошено: <span className="text-foreground font-mono" data-testid={`text-request-amount-${request.id}`}>${request.requestedAmount}</span>
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
                      <div className="p-3 bg-muted rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-2">Реквизиты для выплаты:</p>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{request.methodName || request.methodType}</Badge>
                        </div>
                        <p className="font-mono text-sm text-foreground break-all" data-testid={`text-wallet-address-${request.id}`}>{request.walletAddress}</p>
                        {request.walletAccountName && (
                          <p className="text-xs text-muted-foreground mt-1">Имя: {request.walletAccountName}</p>
                        )}
                        {request.walletAdditionalInfo && (
                          <p className="text-xs text-muted-foreground">Доп. инфо: {request.walletAdditionalInfo}</p>
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
                              <DialogContent className="bg-card border-border">
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
                                      className="bg-input border-border"
                                      data-testid="input-partial-amount"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
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
                              <DialogContent className="bg-card border-border">
                                <DialogHeader>
                                  <DialogTitle>Отклонить запрос</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Причина отказа</Label>
                                    <Textarea
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                      className="bg-input border-border"
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
                            <DialogContent className="bg-card border-border">
                              <DialogHeader>
                                <DialogTitle>Подтверждение выплаты</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-sm text-muted-foreground">Сумма</p>
                                  <p className="text-2xl font-bold text-foreground" data-testid="text-pay-amount">
                                    ${request.approvedAmount || request.requestedAmount}
                                  </p>
                                </div>
                                <div>
                                  <Label>ID транзакции (опционально)</Label>
                                  <Input
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className="bg-input border-border"
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
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : publisherBalances.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Нет активных партнеров</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
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
                    <tr key={balance.publisherId} className="border-b border-white/5 hover:bg-muted">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{balance.publisherName}</p>
                          <p className="text-xs text-muted-foreground">{balance.publisherEmail}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-emerald-500">
                        ${balance.available.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-yellow-500">
                        ${balance.pending.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-muted-foreground">
                        ${balance.hold.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-foreground">
                        ${balance.totalPaid.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Button 
                          size="sm" 
                          className="bg-emerald-500 hover:bg-emerald-600 text-foreground font-semibold"
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
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Новый способ оплаты</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateMethod} className="space-y-4" data-testid="form-create-method">
                  <div>
                    <Label>Тип</Label>
                    <Select name="methodType" required>
                      <SelectTrigger className="bg-input border-border" data-testid="select-method-type">
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
                      className="bg-input border-border"
                      placeholder="Например: USDT TRC20"
                    />
                  </div>
                  <div>
                    <Label>Валюта</Label>
                    <Select name="currency" required>
                      <SelectTrigger className="bg-input border-border">
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
                        className="bg-input border-border"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <Label>Макс. выплата</Label>
                      <Input
                        name="maxPayout"
                        type="number"
                        step="0.01"
                        className="bg-input border-border"
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
                        className="bg-input border-border"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Фикс. комиссия</Label>
                      <Input
                        name="feeFixed"
                        type="number"
                        step="0.01"
                        className="bg-input border-border"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Инструкции</Label>
                    <Textarea
                      name="instructions"
                      className="bg-input border-border"
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
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Добавьте способы оплаты для партнеров</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map((method: any) => {
                const typeInfo = PAYMENT_TYPES.find((t) => t.value === method.methodType);
                const Icon = typeInfo?.icon || Wallet;
                return (
                  <Card key={method.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${typeInfo?.color || "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{method.methodName}</p>
                            <p className="text-xs text-muted-foreground">{method.currency}</p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => deleteMethodMutation.mutate(method.id)}
                          data-testid={`button-delete-method-${method.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Мин. выплата</span>
                          <span className="text-foreground">${method.minPayout}</span>
                        </div>
                        {method.maxPayout && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Макс. выплата</span>
                            <span className="text-foreground">${method.maxPayout}</span>
                          </div>
                        )}
                        {(parseFloat(method.feePercent) > 0 || parseFloat(method.feeFixed) > 0) && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Комиссия</span>
                            <span className="text-foreground">
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
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : payouts.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">История выплат пуста</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
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
                    <tr key={payout.id} className="border-b border-white/5 hover:bg-muted">
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        #{payout.publisherId?.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            payout.payoutType === "bonus"
                              ? "bg-purple-500/20 text-purple-500"
                              : payout.payoutType === "auto"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {payout.payoutType}
                        </Badge>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-orange-500" />
                API ключи криптобирж
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Добавьте API ключи ваших биржевых аккаунтов для автоматических выплат.
                Ключи хранятся в зашифрованном виде.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "binance", name: "Binance", color: "yellow", statusKey: "hasBinance" },
                { key: "bybit", name: "Bybit", color: "purple", statusKey: "hasBybit" },
                { key: "kraken", name: "Kraken", color: "blue", statusKey: "hasKraken" },
                { key: "coinbase", name: "Coinbase", color: "blue", statusKey: "hasCoinbase" },
                { key: "exmo", name: "EXMO", color: "cyan", statusKey: "hasExmo" },
                { key: "mexc", name: "MEXC", color: "teal", statusKey: "hasMexc" },
                { key: "okx", name: "OKX", color: "slate", statusKey: "hasOkx", requiresPassphrase: true },
              ].map((exchange) => {
                const hasKeys = cryptoKeysStatus[exchange.statusKey as keyof typeof cryptoKeysStatus];
                const showForm = exchangeKeyForms[exchange.key];
                const inputs = exchangeInputs[exchange.key] || { apiKey: "", secretKey: "", passphrase: "" };
                const colorClass = `${exchange.color}-500`;
                
                return (
                  <div key={exchange.key} className={`border border-${colorClass}/30 rounded-lg p-4 space-y-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-${colorClass}/20 flex items-center justify-center`}>
                          <Building2 className={`w-5 h-5 text-${colorClass}`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{exchange.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {hasKeys ? (
                              <span className="text-emerald-500 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ключи настроены
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Ключи не настроены</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasKeys && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteCryptoKeysMutation.mutate(exchange.key)}
                            disabled={deleteCryptoKeysMutation.isPending}
                            data-testid={`button-delete-${exchange.key}-keys`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExchangeKeyForms(prev => ({ ...prev, [exchange.key]: !prev[exchange.key] }))}
                          data-testid={`button-toggle-${exchange.key}-form`}
                        >
                          {showForm ? "Скрыть" : hasKeys ? "Обновить" : "Добавить"}
                        </Button>
                      </div>
                    </div>
                    
                    {showForm && (
                      <div className="space-y-3 pt-3 border-t border-border">
                        <div>
                          <Label className="text-muted-foreground">API Key</Label>
                          <Input
                            type="text"
                            value={inputs.apiKey}
                            onChange={(e) => setExchangeInputs(prev => ({ 
                              ...prev, 
                              [exchange.key]: { ...inputs, apiKey: e.target.value } 
                            }))}
                            placeholder="Введите API Key"
                            className="bg-input border-border font-mono text-sm"
                            data-testid={`input-${exchange.key}-api-key`}
                          />
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Secret Key</Label>
                          <Input
                            type="password"
                            value={inputs.secretKey}
                            onChange={(e) => setExchangeInputs(prev => ({ 
                              ...prev, 
                              [exchange.key]: { ...inputs, secretKey: e.target.value } 
                            }))}
                            placeholder="Введите Secret Key"
                            className="bg-input border-border font-mono text-sm"
                            data-testid={`input-${exchange.key}-secret-key`}
                          />
                        </div>
                        {exchange.requiresPassphrase && (
                          <div>
                            <Label className="text-muted-foreground">Passphrase (обязательно для OKX)</Label>
                            <Input
                              type="password"
                              value={inputs.passphrase || ""}
                              onChange={(e) => setExchangeInputs(prev => ({ 
                                ...prev, 
                                [exchange.key]: { ...inputs, passphrase: e.target.value } 
                              }))}
                              placeholder="Введите Passphrase"
                              className="bg-input border-border font-mono text-sm"
                              data-testid={`input-${exchange.key}-passphrase`}
                            />
                          </div>
                        )}
                        <Button
                          className="w-full"
                          disabled={
                            !inputs.apiKey || 
                            !inputs.secretKey || 
                            (exchange.requiresPassphrase && !inputs.passphrase) ||
                            saveCryptoKeysMutation.isPending
                          }
                          onClick={() => saveCryptoKeysMutation.mutate({
                            exchange: exchange.key,
                            apiKey: inputs.apiKey,
                            secretKey: inputs.secretKey,
                            passphrase: inputs.passphrase
                          })}
                          data-testid={`button-save-${exchange.key}-keys`}
                        >
                          {saveCryptoKeysMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Key className="w-4 h-4 mr-2" />
                          )}
                          Сохранить {exchange.name} ключи
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm text-amber-500">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Убедитесь, что API ключи имеют права только на вывод средств (Withdraw) без доступа к торговле.
                  Никогда не делитесь своими ключами с третьими лицами.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpen className="h-6 w-6 text-blue-500" />
                Руководство по работе с финансами
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Полная инструкция по настройке платежей, выплат и работе с партнёрами
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-8">
                  
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-500 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      1. Способы оплаты (Рекламодатель)
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Что это:</strong> Способы оплаты — это методы, которыми вы будете выплачивать деньги партнёрам.</p>
                      <div className="space-y-2">
                        <p className="text-foreground font-medium">Как добавить способ оплаты:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Перейдите на вкладку <Badge className="bg-yellow-500/20 text-yellow-500">Финансы</Badge></li>
                          <li>Нажмите кнопку <Badge className="bg-emerald-500/20 text-emerald-500">+ Способ оплаты</Badge></li>
                          <li>Выберите тип (USDT TRC20, Bitcoin, Binance Pay, Bank Card)</li>
                          <li>Укажите название, валюту, мин/макс суммы</li>
                          <li>Установите комиссию (% и/или фикс.)</li>
                          <li>Добавьте инструкции для партнёров</li>
                        </ol>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mt-2">
                        <p className="text-blue-400"><HelpCircle className="w-4 h-4 inline mr-1" /> Партнёры увидят только те способы, которые вы создали. Они смогут привязать свои кошельки к вашим способам оплаты.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      2. Запросы на выплату (Рекламодатель)
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Процесс обработки запросов:</strong></p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li><strong>Новый запрос</strong> — партнёр создаёт запрос на выплату</li>
                        <li><strong>Рассмотрение</strong> — вы видите запрос во вкладке "Запросы на выплату"</li>
                        <li><strong>Одобрение/Отклонение</strong> — нажмите на запрос:
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li><span className="text-emerald-400">Одобрить</span> — подтвердите сумму (можно изменить)</li>
                            <li><span className="text-red-400">Отклонить</span> — укажите причину отказа</li>
                          </ul>
                        </li>
                        <li><strong>Выплата</strong> — после одобрения переведите средства и нажмите "Выплачено"</li>
                      </ol>
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 mt-2">
                        <p className="text-emerald-400"><Check className="w-4 h-4 inline mr-1" /> При одобрении система автоматически создаст запись в истории выплат и обновит баланс партнёра.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-500 flex items-center gap-2">
                      <CheckSquare className="w-5 h-5" />
                      3. Массовые выплаты (Рекламодатель)
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Для обработки нескольких запросов сразу:</strong></p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Отметьте галочками нужные запросы в списке</li>
                        <li>Нажмите кнопку <Badge className="bg-purple-500/20 text-purple-500">Массовая выплата</Badge></li>
                        <li>Проверьте список выбранных запросов</li>
                        <li>Подтвердите массовую выплату</li>
                      </ol>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mt-2">
                        <p className="text-amber-400"><AlertCircle className="w-4 h-4 inline mr-1" /> Массовая выплата одобряет все выбранные запросы на полную сумму. Для частичного одобрения обрабатывайте запросы по отдельности.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-cyan-500 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      4. Бонусные выплаты (Рекламодатель)
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Как начислить бонус партнёру:</strong></p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Перейдите во вкладку <Badge className="bg-emerald-500/20 text-emerald-500">Балансы партнёров</Badge></li>
                        <li>Найдите нужного партнёра</li>
                        <li>Нажмите кнопку <Badge className="bg-yellow-500/20 text-yellow-500">$ Бонус</Badge></li>
                        <li>Выберите способ оплаты</li>
                        <li>Укажите сумму и комментарий (например: "Бонус за отличную работу")</li>
                        <li>Подтвердите выплату</li>
                      </ol>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mt-2">
                        <p className="text-blue-400"><HelpCircle className="w-4 h-4 inline mr-1" /> Бонусы отображаются отдельно в истории выплат с типом "bonus". Партнёр увидит уведомление о получении бонуса.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-500 flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      5. API ключи бирж (Рекламодатель)
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Для автоматических криптовыплат:</strong></p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Перейдите на вкладку <Badge className="bg-orange-500/20 text-orange-500">API ключи бирж</Badge></li>
                        <li>Выберите биржу (Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX)</li>
                        <li>Создайте API ключ на бирже с правами <strong>только на вывод</strong></li>
                        <li>Введите API Key и Secret Key (для OKX также Passphrase)</li>
                        <li>Нажмите "Сохранить"</li>
                      </ol>
                      <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mt-2">
                        <p className="text-red-400"><AlertCircle className="w-4 h-4 inline mr-1" /> <strong>ВАЖНО:</strong> Создавайте API ключи ТОЛЬКО с правами на вывод (Withdraw). Никогда не давайте права на торговлю!</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-foreground font-medium">Как создать API ключ на бирже:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li><strong>Binance:</strong> Настройки → API Management → Создать API → Включить только Withdraw</li>
                          <li><strong>Bybit:</strong> Аккаунт → API → Создать ключ → Выбрать Withdraw Only</li>
                          <li><strong>OKX:</strong> Настройки → API → Создать ключ + Passphrase → Права Withdraw</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <div className="border-t border-border pt-6 mt-6">
                    <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                      <Users className="w-6 h-6" />
                      Инструкция для партнёров (Publisher)
                    </h2>
                  </div>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-500 flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      6. Привязка кошелька (Партнёр)
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Как добавить кошелёк для выплат:</strong></p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Перейдите в раздел <Badge className="bg-emerald-500/20 text-emerald-500">Финансы</Badge></li>
                        <li>Нажмите <Badge className="bg-emerald-500/20 text-emerald-500">+ Добавить кошелёк</Badge></li>
                        <li>Выберите способ оплаты рекламодателя</li>
                        <li>Введите адрес кошелька (проверьте правильность!)</li>
                        <li>Укажите имя владельца и доп. информацию</li>
                        <li>Сохраните кошелёк</li>
                      </ol>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mt-2">
                        <p className="text-amber-400"><AlertCircle className="w-4 h-4 inline mr-1" /> Внимательно проверяйте адрес кошелька! Ошибка в адресе может привести к потере средств.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      7. Запрос на выплату (Партнёр)
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Как запросить выплату:</strong></p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Убедитесь, что у вас есть доступный баланс</li>
                        <li>Проверьте, что кошелёк привязан и верифицирован</li>
                        <li>Нажмите кнопку <Badge className="bg-yellow-500/20 text-yellow-500">Запросить выплату</Badge></li>
                        <li>Выберите кошелёк для получения</li>
                        <li>Укажите сумму (учитывая минимальную сумму)</li>
                        <li>Добавьте комментарий (опционально)</li>
                        <li>Отправьте запрос</li>
                      </ol>
                      <div className="mt-3 space-y-2">
                        <p className="text-foreground font-medium">Статусы запроса:</p>
                        <ul className="space-y-1 ml-2">
                          <li><Badge className="bg-yellow-500/20 text-yellow-500">pending</Badge> — ожидает рассмотрения</li>
                          <li><Badge className="bg-emerald-500/20 text-emerald-500">approved</Badge> — одобрен</li>
                          <li><Badge className="bg-blue-500/20 text-blue-500">paid</Badge> — выплачен</li>
                          <li><Badge className="bg-red-500/20 text-red-500">rejected</Badge> — отклонён</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      8. Hold период (Общее)
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Что такое Hold:</strong></p>
                      <p>Hold период — это время, в течение которого заработок партнёра заморожен и недоступен для вывода.</p>
                      <div className="mt-3 space-y-2">
                        <p className="text-foreground font-medium">Как это работает:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Рекламодатель устанавливает Hold для каждого оффера (0-30 дней)</li>
                          <li>После конверсии деньги попадают в статус "Hold"</li>
                          <li>По истечении Hold периода средства переходят в "Доступно"</li>
                          <li>Только доступные средства можно вывести</li>
                        </ul>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mt-2">
                        <p className="text-blue-400"><HelpCircle className="w-4 h-4 inline mr-1" /> Hold защищает рекламодателя от фрода. Если лид окажется невалидным, он будет отклонён до окончания Hold периода.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-red-500 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      9. Частые вопросы
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4 text-sm text-muted-foreground">
                      <div>
                        <p className="text-foreground font-medium">Почему я не могу вывести деньги?</p>
                        <p className="mt-1">Проверьте: 1) Достаточно ли доступного баланса 2) Привязан ли кошелёк 3) Превышает ли сумма минимальный порог</p>
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Сколько ждать выплату?</p>
                        <p className="mt-1">Обычно рекламодатели обрабатывают запросы в течение 1-3 рабочих дней. Если автовыплаты настроены — мгновенно.</p>
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Что делать, если запрос отклонён?</p>
                        <p className="mt-1">Свяжитесь с рекламодателем для уточнения причины. Возможно, нужно верифицировать кошелёк или дождаться окончания Hold.</p>
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Можно ли изменить адрес кошелька?</p>
                        <p className="mt-1">Да, вы можете добавить новый кошелёк и сделать его основным. Старые запросы будут обработаны на указанный при создании адрес.</p>
                      </div>
                    </div>
                  </section>

                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bonus Payout Dialog */}
      <Dialog open={showBonusDialog} onOpenChange={setShowBonusDialog}>
        <DialogContent className="bg-card border-border">
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
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Способ оплаты</Label>
              <Select value={bonusMethodId} onValueChange={setBonusMethodId}>
                <SelectTrigger className="bg-input border-border" data-testid="select-bonus-method">
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
                className="bg-input border-border"
                data-testid="input-bonus-amount"
              />
            </div>
            <div>
              <Label>Комментарий</Label>
              <Textarea
                value={bonusNote}
                onChange={(e) => setBonusNote(e.target.value)}
                placeholder="За хорошую работу..."
                className="bg-input border-border"
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
