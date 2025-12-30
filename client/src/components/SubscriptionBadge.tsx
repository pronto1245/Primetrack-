import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "wouter";

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    planId: string | null;
  };
  plan: {
    name: string;
  } | null;
}

export function SubscriptionBadge({ role }: { role: string }) {
  if (role !== "advertiser") return null;

  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription/current"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/current", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading || !data) return null;

  const { subscription, plan } = data;
  
  const getTimeRemaining = () => {
    let endDate: Date | null = null;
    
    if (subscription.status === "trial" && subscription.trialEndsAt) {
      endDate = new Date(subscription.trialEndsAt);
    } else if (subscription.status === "active" && subscription.currentPeriodEnd) {
      endDate = new Date(subscription.currentPeriodEnd);
    }
    
    if (!endDate) return null;
    
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return { days: 0, hours: 0, expired: true };
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days: diffDays, hours: diffHours, expired: false };
  };
  
  const time = getTimeRemaining();
  
  const getVariant = () => {
    if (!time || time.expired) return "destructive";
    if (time.days < 7) return "destructive";
    if (time.days <= 14) return "secondary";
    return "outline";
  };
  
  const getColor = () => {
    if (!time || time.expired) return "text-red-400";
    if (time.days < 7) return "text-red-400";
    if (time.days <= 14) return "text-yellow-400";
    return "text-emerald-400";
  };

  const formatTime = () => {
    if (!time) return "";
    if (time.expired) return "Истёк";
    
    if (time.days <= 7) {
      return `${time.days}д ${time.hours}ч`;
    }
    return `${time.days} дней`;
  };

  if (subscription.status === "expired") {
    return (
      <Link href={`/dashboard/advertiser/settings?tab=subscription`}>
        <Badge 
          variant="destructive" 
          className="cursor-pointer flex items-center gap-1.5 px-2 py-1 text-xs font-mono"
          data-testid="subscription-badge-expired"
        >
          <AlertTriangle className="w-3 h-3" />
          Подписка истекла
        </Badge>
      </Link>
    );
  }

  if (subscription.status === "active" && plan) {
    return (
      <Link href={`/dashboard/advertiser/settings?tab=subscription`}>
        <Badge 
          variant="outline" 
          className={`cursor-pointer flex items-center gap-1.5 px-2 py-1 text-xs font-mono border-emerald-500/50 ${getColor()}`}
          data-testid="subscription-badge-active"
        >
          <CheckCircle className="w-3 h-3" />
          {plan.name}
          {time && !time.expired && (
            <span className="text-muted-foreground ml-1">({formatTime()})</span>
          )}
        </Badge>
      </Link>
    );
  }

  if (subscription.status === "trial") {
    return (
      <Link href={`/dashboard/advertiser/settings?tab=subscription`}>
        <Badge 
          variant={getVariant()} 
          className={`cursor-pointer flex items-center gap-1.5 px-2 py-1 text-xs font-mono ${getColor()}`}
          data-testid="subscription-badge-trial"
        >
          <Clock className="w-3 h-3" />
          Триал: {formatTime()}
        </Badge>
      </Link>
    );
  }

  return null;
}
