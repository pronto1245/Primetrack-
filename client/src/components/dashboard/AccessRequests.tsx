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

  const { data: requests, isLoading, error } = useQuery<AccessRequestWithDetails[]>({
    queryKey: ["/api/advertiser/access-requests"],
    queryFn: async () => {
      const res = await fetch("/api/advertiser/access-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch access requests");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ requestId, action, reason }: { requestId: string; action: "approve" | "reject" | "revoke"; reason?: string }) => {
      const res = await fetch(`/api/advertiser/access-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
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
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-500">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/20 text-red-500">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case "revoked":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-orange-500/20 text-orange-500">
            <XCircle className="w-3 h-3" />
            Revoked
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
          <h2 className="text-2xl font-bold font-mono text-white mb-2" data-testid="text-requests-title">
            Заявки на доступ
          </h2>
          <p className="text-slate-400 text-sm font-mono">
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

      <Card className="bg-[#0A0A0A] border-white/10">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by offer or publisher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              data-testid="input-search-requests"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`border-white/10 font-mono ${!statusFilter ? 'text-blue-400 border-blue-500/50 bg-blue-500/10' : 'text-slate-300'}`}
              onClick={() => setStatusFilter(null)}
              data-testid="button-filter-all"
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-white/10 font-mono ${statusFilter === 'pending' ? 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' : 'text-slate-300'}`}
              onClick={() => setStatusFilter('pending')}
              data-testid="button-filter-pending"
            >
              Pending
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-white/10 font-mono ${statusFilter === 'approved' ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : 'text-slate-300'}`}
              onClick={() => setStatusFilter('approved')}
              data-testid="button-filter-approved"
            >
              Approved
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-white/10 font-mono ${statusFilter === 'rejected' ? 'text-red-400 border-red-500/50 bg-red-500/10' : 'text-slate-300'}`}
              onClick={() => setStatusFilter('rejected')}
              data-testid="button-filter-rejected"
            >
              Rejected
            </Button>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">No access requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Publisher</th>
                  <th className="px-4 py-3 font-medium">Offer</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors" data-testid={`row-request-${req.id}`}>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-white">{req.publisher.username}</div>
                        <div className="text-slate-500 text-[10px]">{req.publisher.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/advertiser/offer/${req.offerId}`}>
                        <span className="font-medium text-white hover:text-blue-400 transition-colors cursor-pointer">
                          {req.offer.name}
                        </span>
                      </Link>
                      <div className="text-slate-500 text-[10px]">{req.offer.category}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">
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
                            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={() => updateMutation.mutate({ requestId: req.id, action: "approve" })}
                            disabled={updateMutation.isPending}
                            data-testid={`button-approve-${req.id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Approve
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
                            Reject
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
                          Revoke
                        </Button>
                      )}
                      {req.status === "revoked" && (
                        <Button
                          size="sm"
                          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={() => updateMutation.mutate({ requestId: req.id, action: "approve" })}
                          disabled={updateMutation.isPending}
                          data-testid={`button-reapprove-${req.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Re-Approve
                        </Button>
                      )}
                      {req.status === "rejected" && (
                        <span className="text-slate-500">-</span>
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
        <DialogContent className="bg-[#0A0A0A] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-mono">Отклонить заявку</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm text-slate-400 font-mono mb-2 block">
              Причина отклонения (опционально)
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Укажите причину отклонения..."
              className="bg-white/5 border-white/10 text-white font-mono"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="border-white/10 text-slate-300"
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
              className="bg-red-600 hover:bg-red-500 text-white"
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
    </div>
  );
}
