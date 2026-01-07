import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Check, X, Clock, Globe, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";

interface DomainRequest {
  id: string;
  domain: string;
  advertiserId: string;
  requestStatus: string;
  requestedAt: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  advertiser: {
    id: string;
    username: string;
    email: string;
    companyName: string | null;
  };
}

export function AdminDomainRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<DomainRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests = [], isLoading } = useQuery<DomainRequest[]>({
    queryKey: ["/api/admin/domain-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await fetch(`/api/admin/domain-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Approval failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/domain-requests"] });
      toast({ title: "Заявка одобрена", description: "Домен переведён в статус provisioning" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка одобрения", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/admin/domain-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Rejection failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/domain-requests"] });
      toast({ title: "Заявка отклонена" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка отклонения", description: error.message, variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/domain-requests/${id}/activate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Activation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/domain-requests"] });
      toast({ title: "Домен активирован", description: "Домен готов к использованию" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка активации", description: error.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAdminNotes("");
    setRejectionReason("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "admin_review":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
            <Clock className="w-3 h-3 mr-1" />
            На рассмотрении
          </Badge>
        );
      case "provisioning":
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Provisioning
          </Badge>
        );
      case "active":
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            Активен
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Отклонён
          </Badge>
        );
      case "pending":
      case "ns_configured":
      default:
        return (
          <Badge variant="outline">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Ожидает NS
          </Badge>
        );
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Загрузка заявок...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="text-domain-requests-title">Заявки на домены</h2>
        <p className="text-muted-foreground">
          Управление заявками рекламодателей на подключение кастомных доменов
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет активных заявок на домены</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Домен</TableHead>
                  <TableHead>Рекламодатель</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата заявки</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-domain-request-${request.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{request.domain}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.advertiser.companyName || request.advertiser.username}</div>
                        <div className="text-sm text-muted-foreground">{request.advertiser.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.requestStatus)}</TableCell>
                    <TableCell>
                      {request.requestedAt ? (
                        <div>
                          <div>{format(new Date(request.requestedAt), "d MMM yyyy", { locale: ru })}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: ru })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.requestStatus === "admin_review" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType("approve");
                              }}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Одобрить
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType("reject");
                              }}
                              data-testid={`button-reject-${request.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Отклонить
                            </Button>
                          </>
                        )}
                        {request.requestStatus === "provisioning" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => activateMutation.mutate(request.id)}
                            disabled={activateMutation.isPending}
                            data-testid={`button-activate-${request.id}`}
                          >
                            <ExternalLink className={`w-4 h-4 mr-1 ${activateMutation.isPending ? 'animate-spin' : ''}`} />
                            Активировать
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Инструкция по настройке</CardTitle>
          <CardDescription>После одобрения заявки выполните следующие шаги</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-medium">1. Добавьте домен в Replit Deployment</h4>
            <p className="text-sm text-muted-foreground">
              Откройте Deployments → Settings → Custom Domains и добавьте домен.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-medium">2. Настройте DNS в Cloudflare</h4>
            <p className="text-sm text-muted-foreground">
              Добавьте CNAME запись для домена, указывающую на Replit deployment URL.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-medium">3. Активируйте домен</h4>
            <p className="text-sm text-muted-foreground">
              После проверки работоспособности нажмите "Активировать" для завершения настройки.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Одобрить заявку" : "Отклонить заявку"}
            </DialogTitle>
            <DialogDescription>
              Домен: <span className="font-mono">{selectedRequest?.domain}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === "approve" && (
              <div className="space-y-2">
                <Label htmlFor="adminNotes">Заметки (опционально)</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Внутренние заметки для администратора..."
                  data-testid="input-admin-notes"
                />
              </div>
            )}
            {actionType === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Причина отклонения *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Укажите причину отклонения заявки..."
                  data-testid="input-rejection-reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Отмена
            </Button>
            {actionType === "approve" && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => selectedRequest && approveMutation.mutate({ id: selectedRequest.id, notes: adminNotes })}
                disabled={approveMutation.isPending}
                data-testid="button-confirm-approve"
              >
                Одобрить
              </Button>
            )}
            {actionType === "reject" && (
              <Button
                variant="destructive"
                onClick={() => selectedRequest && rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason })}
                disabled={!rejectionReason || rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                Отклонить
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
