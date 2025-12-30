import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Notification {
  id: string;
  senderId: string | null;
  senderRole: string | null;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsPanel() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=100", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "conversion":
      case "sale":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "lead":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "payout":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "offer":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "access_request":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "system":
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "conversion": return "Конверсия";
      case "sale": return "Продажа";
      case "lead": return "Лид";
      case "payout": return "Выплата";
      case "offer": return "Оффер";
      case "access_request": return "Запрос доступа";
      case "system": return "Система";
      default: return type;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-notifications-title">
            <Bell className="h-6 w-6" />
            Уведомления
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} непрочитанных` : "Все прочитано"}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            data-testid="mark-all-read"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Прочитать все
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет уведомлений</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card 
              key={notification.id}
              className={`cursor-pointer transition-colors ${
                !notification.isRead ? "border-blue-500/30 bg-blue-500/5" : ""
              }`}
              onClick={() => !notification.isRead && markReadMutation.mutate(notification.id)}
              data-testid={`notification-card-${notification.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getTypeColor(notification.type)}`}>
                        {getTypeLabel(notification.type)}
                      </span>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      {formatDistanceToNow(new Date(notification.createdAt), { 
                        addSuffix: true, 
                        locale: ru 
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
