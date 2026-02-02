import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Bell, DollarSign, UserPlus, FileText, CheckCircle, XCircle, Target } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

function getNotificationRoute(notification: Notification): string | null {
  const { entityType, entityId, type } = notification;
  
  switch (type) {
    case "access_request":
      return "/dashboard?tab=access-requests";
    case "offer":
      return entityId ? `/dashboard/offers/${entityId}` : "/dashboard?tab=offers";
    case "conversion":
    case "sale":
    case "lead":
      return "/dashboard?tab=reports";
    case "payout":
    case "payout_rate":
      return "/dashboard?tab=finance";
    case "system":
      if (entityType === "publisher") return "/dashboard?tab=partners";
      return "/dashboard?tab=notifications";
    case "new_offer":
      return entityId ? `/dashboard/offers/${entityId}` : "/dashboard?tab=offers";
    default:
      return "/dashboard?tab=notifications";
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "conversion":
    case "sale":
    case "lead":
      return <Target className="w-4 h-4 text-emerald-400" />;
    case "payout":
    case "payout_rate":
      return <DollarSign className="w-4 h-4 text-yellow-400" />;
    case "access_request":
    case "system":
      return <UserPlus className="w-4 h-4 text-blue-400" />;
    case "offer":
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case "new_offer":
      return <FileText className="w-4 h-4 text-purple-400" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

export function NotificationListener() {
  const { toast, dismiss } = useToast();
  const [, setLocation] = useLocation();
  // Start checking from 1 minute ago to catch recent notifications
  const lastCheckRef = useRef<Date>(new Date(Date.now() - 60000));
  const shownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkNewNotifications = async () => {
      try {
        const since = lastCheckRef.current.toISOString();
        const res = await fetch(`/api/notifications/new?since=${encodeURIComponent(since)}`, {
          credentials: "include"
        });
        
        if (!res.ok) return;
        
        const notifications: Notification[] = await res.json();
        
        for (const notification of notifications) {
          if (shownIdsRef.current.has(notification.id)) continue;
          shownIdsRef.current.add(notification.id);
          
          const route = getNotificationRoute(notification);
          
          const showToast = () => {
            const { id: toastId } = toast({
              title: notification.title,
              description: notification.body,
              duration: 5000,
              action: route ? (
                <button
                  onClick={() => {
                    dismiss(toastId);
                    setLocation(route);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  data-testid={`toast-action-${notification.id}`}
                >
                  Открыть
                </button>
              ) : undefined,
            });
          };
          showToast();
        }
        
        if (notifications.length > 0) {
          const latestCreatedAt = notifications.reduce((max, n) => 
            new Date(n.createdAt) > new Date(max) ? n.createdAt : max, 
            notifications[0].createdAt
          );
          lastCheckRef.current = new Date(latestCreatedAt);
        } else {
          // No new notifications, update cursor to now
          lastCheckRef.current = new Date();
        }
      } catch (error) {
        // Silent fail - don't spam errors
      }
    };

    // Check immediately on mount
    checkNewNotifications();
    
    const interval = setInterval(checkNewNotifications, 10000);
    
    return () => clearInterval(interval);
  }, [toast, dismiss, setLocation]);

  return null;
}
