import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Check, X, Loader2, UserPlus, Clock, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

interface Landing {
  id: string;
  name: string;
  geo: string;
}

interface AccessRequestWithDetails {
  id: string;
  offerId: string;
  publisherId: string;
  status: string;
  message: string | null;
  rejectionReason: string | null;
  createdAt: string;
  offer: {
    id: string;
    name: string;
    category: string;
    geo: string[];
    landings: Landing[];
  };
  publisher: {
    id: string;
    username: string;
    email: string;
  };
}

export function AccessRequests() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<AccessRequestWithDetails | null>(null);
  const [selectedGeos, setSelectedGeos] = useState<string[]>([]);
  const [selectedLandings, setSelectedLandings] = useState<string[]>([]);

  const { data: requests, isLoading, error } = useQuery<AccessRequestWithDetails[]>({
    queryKey: ["/api/advertiser/access-requests"],
    queryFn: async () => {
      const res = await fetch("/api/advertiser/access-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch access requests");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ requestId, action, reason, approvedGeos, approvedLandings }: { requestId: string; action: "approve" | "reject" | "revoke"; reason?: string; approvedGeos?: string[]; approvedLandings?: string[] }) => {
      const res = await fetch(`/api/advertiser/access-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason, approvedGeos, approvedLandings }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/access-requests"] });
      toast({
        title: "Success",
        description: "Request updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive",
      });
    },
  });

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((req) => {
      const matchesSearch = searchQuery === "" ||
        req.offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.publisher.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.publisher.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const pendingCount = useMemo(() => {
    return requests?.filter(r => r.status === "pending").length || 0;
  }, [requests]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-500">
            <Clock className="w-3 h-3" />
            Ожидает
          </span>
        );
      case "approved":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-500">
            <CheckCircle className="w-3 h-3" />
            Одобрено
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/20 text-red-500">
            <XCircle className="w-3 h-3" />
            Отклонено
          </span>
        );
      case "revoked":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-orange-500/20 text-orange-500">
            <XCircle className="w-3 h-3" />
            Отозвано
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Failed to load access requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground mb-2" data-testid="text-requests-title">
            Заявки на доступ
          </h2>
          <p className="text-muted-foreground text-sm font-mono">
            Управление запросами партнёров на доступ к офферам
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-500 font-mono font-bold">{pendingCount} pending</span>
          </div>
        )}
      </div>

      <Card className="bg-card border-border">
        <div className="p-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по офферу или партнёру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500 font-mono"
              data-testid="input-search-requests"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`border-border font-mono ${!statusFilter ? 'text-blue-400 border-blue-500/50 bg-blue-500/10' : 'text-muted-foreground'}`}
              onClick={() => setStatusFilter(null)}
              data-testid="button-filter-all"
            >
              Все
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-border font-mono ${statusFilter === 'pending' ? 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' : 'text-muted-foreground'}`}
              onClick={() => setStatusFilter('pending')}
              data-testid="button-filter-pending"
            >
              Ожидают
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-border font-mono ${statusFilter === 'approved' ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : 'text-muted-foreground'}`}
              onClick={() => setStatusFilter('approved')}
              data-testid="button-filter-approved"
            >
              Одобрены
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-border font-mono ${statusFilter === 'rejected' ? 'text-red-400 border-red-500/50 bg-red-500/10' : 'text-muted-foreground'}`}
              onClick={() => setStatusFilter('rejected')}
              data-testid="button-filter-rejected"
            >
              Отклонены
            </Button>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Заявок не найдено</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Партнёр</th>
                  <th className="px-4 py-3 font-medium">Оффер</th>
                  <th className="px-4 py-3 font-medium">Сообщение</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted transition-colors" data-testid={`row-request-${req.id}`}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-foreground">{req.publisher.username}</div>
                        <div className="text-muted-foreground text-[10px]">{req.publisher.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/advertiser/offer/${req.offerId}`}>
                        <span className="font-medium text-foreground hover:text-blue-400 transition-colors cursor-pointer">
                          {req.offer.name}
                        </span>
                      </Link>
                      <div className="text-muted-foreground text-[10px]">{req.offer.category}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                      {req.message || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-foreground"
                            onClick={() => {
                              setApprovingRequest(req);
                              setSelectedGeos([...req.offer.geo]);
                              setSelectedLandings(req.offer.landings.map(l => l.id));
                              setApproveDialogOpen(true);
                            }}
                            disabled={updateMutation.isPending}
                            data-testid={`button-approve-${req.id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Одобрить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 border-red-500/50 text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                              setRejectingRequestId(req.id);
                              setRejectionReason("");
                              setRejectDialogOpen(true);
                            }}
                            disabled={updateMutation.isPending}
                            data-testid={`button-reject-${req.id}`}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      )}
                      {req.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                          onClick={() => updateMutation.mutate({ requestId: req.id, action: "revoke" })}
                          disabled={updateMutation.isPending}
                          data-testid={`button-revoke-${req.id}`}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Отозвать
                        </Button>
                      )}
                      {req.status === "revoked" && (
                        <Button
                          size="sm"
                          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-foreground"
                          onClick={() => {
                            setApprovingRequest(req);
                            setSelectedGeos([...req.offer.geo]);
                            setApproveDialogOpen(true);
                          }}
                          disabled={updateMutation.isPending}
                          data-testid={`button-reapprove-${req.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Восстановить
                        </Button>
                      )}
                      {req.status === "rejected" && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-mono">Отклонить заявку</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm text-muted-foreground font-mono mb-2 block">
              Причина отклонения (опционально)
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Укажите причину отклонения..."
              className="bg-muted border-border text-foreground font-mono"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="border-border text-muted-foreground"
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (rejectingRequestId) {
                  updateMutation.mutate({
                    requestId: rejectingRequestId,
                    action: "reject",
                    reason: rejectionReason || undefined,
                  });
                  setRejectDialogOpen(false);
                }
              }}
              disabled={updateMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-foreground"
              data-testid="button-confirm-reject"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Отклонить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground font-mono">Одобрить заявку</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <label className="text-sm text-muted-foreground font-mono mb-3 block">
                Выберите ГЕО для доступа партнёра
              </label>
              <div className="flex items-center gap-2 mb-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setSelectedGeos([...(approvingRequest?.offer.geo || [])])}
                  data-testid="button-select-all-geos"
                >
                  Выбрать все
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setSelectedGeos([])}
                  data-testid="button-deselect-all-geos"
                >
                  Снять все
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-[150px] overflow-y-auto">
                {approvingRequest?.offer.geo.map((geo) => (
                  <label
                    key={geo}
                    className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                      selectedGeos.includes(geo)
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                        : "bg-muted border-border text-muted-foreground hover:border-blue-500/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGeos.includes(geo)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGeos([...selectedGeos, geo]);
                        } else {
                          setSelectedGeos(selectedGeos.filter((g) => g !== geo));
                        }
                      }}
                      className="w-4 h-4 rounded border-border"
                      data-testid={`checkbox-geo-${geo}`}
                    />
                    <span className="font-mono text-sm">{geo}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {selectedGeos.length === approvingRequest?.offer.geo.length
                  ? "Доступ ко всем ГЕО"
                  : selectedGeos.length === 0
                  ? "Доступ ко всем ГЕО (по умолчанию)"
                  : `Доступ к ${selectedGeos.length} из ${approvingRequest?.offer.geo.length} ГЕО`}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-3 block">
                Выберите лендинги для доступа партнёра
              </label>
              <div className="flex items-center gap-2 mb-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setSelectedLandings(approvingRequest?.offer.landings.map(l => l.id) || [])}
                  data-testid="button-select-all-landings"
                >
                  Выбрать все
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setSelectedLandings([])}
                  data-testid="button-deselect-all-landings"
                >
                  Снять все
                </Button>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {approvingRequest?.offer.landings.map((landing) => (
                  <label
                    key={landing.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition-colors ${
                      selectedLandings.includes(landing.id)
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "bg-muted border-border text-muted-foreground hover:border-emerald-500/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLandings.includes(landing.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLandings([...selectedLandings, landing.id]);
                        } else {
                          setSelectedLandings(selectedLandings.filter((id) => id !== landing.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-border"
                      data-testid={`checkbox-landing-${landing.id}`}
                    />
                    <span className="font-mono text-sm flex-1">{landing.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{landing.geo}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {selectedLandings.length === approvingRequest?.offer.landings.length || selectedLandings.length === 0
                  ? "Доступ ко всем лендингам"
                  : `Доступ к ${selectedLandings.length} из ${approvingRequest?.offer.landings.length} лендингов`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              className="border-border text-muted-foreground"
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (approvingRequest) {
                  const geosToSend = selectedGeos.length === approvingRequest.offer.geo.length || selectedGeos.length === 0
                    ? undefined
                    : selectedGeos;
                  const landingsToSend = selectedLandings.length === approvingRequest.offer.landings.length
                    ? undefined
                    : selectedLandings;
                  updateMutation.mutate({
                    requestId: approvingRequest.id,
                    action: "approve",
                    approvedGeos: geosToSend,
                    approvedLandings: landingsToSend,
                  });
                  setApproveDialogOpen(false);
                }
              }}
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-foreground"
              data-testid="button-confirm-approve"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Одобрить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
