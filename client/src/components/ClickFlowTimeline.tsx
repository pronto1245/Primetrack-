import { CheckCircle, XCircle, Clock, AlertTriangle, Globe, Shield, Target, Link2, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClickFlowStage {
  id: string;
  name: string;
  status: "passed" | "failed" | "pending" | "skipped";
  details?: string;
  timestamp?: Date;
}

interface ClickFlowTimelineProps {
  stages: ClickFlowStage[];
  className?: string;
}

const stageIcons: Record<string, any> = {
  click: MousePointer,
  offer: Target,
  landing: Link2,
  geo: Globe,
  cap: AlertTriangle,
  fraud: Shield,
};

const stageLabels: Record<string, string> = {
  click: "Клик получен",
  offer: "Проверка оффера",
  landing: "Выбор лендинга",
  geo: "Проверка GEO",
  cap: "Проверка капов",
  fraud: "Антифрод проверка",
  redirect: "Редирект",
};

export function ClickFlowTimeline({ stages, className }: ClickFlowTimelineProps) {
  return (
    <div className={cn("space-y-4", className)} data-testid="click-flow-timeline">
      {stages.map((stage, index) => {
        const IconComponent = stageIcons[stage.id] || CheckCircle;
        const label = stageLabels[stage.id] || stage.name;
        
        return (
          <div 
            key={stage.id} 
            className="relative flex items-start gap-3"
            data-testid={`click-flow-stage-${stage.id}`}
          >
            {index < stages.length - 1 && (
              <div 
                className={cn(
                  "absolute left-[15px] top-[32px] w-0.5 h-[calc(100%+8px)]",
                  stage.status === "passed" ? "bg-green-500/30" : 
                  stage.status === "failed" ? "bg-red-500/30" : "bg-muted"
                )}
              />
            )}
            
            <div 
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                stage.status === "passed" && "bg-green-500/10 text-green-500",
                stage.status === "failed" && "bg-red-500/10 text-red-500",
                stage.status === "pending" && "bg-muted text-muted-foreground",
                stage.status === "skipped" && "bg-muted/50 text-muted-foreground/50"
              )}
            >
              {stage.status === "passed" && <CheckCircle className="w-4 h-4" />}
              {stage.status === "failed" && <XCircle className="w-4 h-4" />}
              {stage.status === "pending" && <Clock className="w-4 h-4" />}
              {stage.status === "skipped" && <IconComponent className="w-4 h-4 opacity-50" />}
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2">
                <span 
                  className={cn(
                    "text-sm font-medium",
                    stage.status === "passed" && "text-foreground",
                    stage.status === "failed" && "text-red-500",
                    stage.status === "pending" && "text-muted-foreground",
                    stage.status === "skipped" && "text-muted-foreground/50"
                  )}
                  data-testid={`click-flow-stage-label-${stage.id}`}
                >
                  {label}
                </span>
                {stage.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(stage.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {stage.details && (
                <p 
                  className="text-xs text-muted-foreground mt-0.5 truncate"
                  data-testid={`click-flow-stage-details-${stage.id}`}
                >
                  {stage.details}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function buildClickFlowStages(rawClick: {
  status?: string;
  rejectReason?: string | null;
  checkStage?: string | null;
  resolvedOfferId?: string | null;
  resolvedLandingId?: string | null;
  geo?: string | null;
  clickId?: string | null;
}): ClickFlowStage[] {
  const checkStage = rawClick.checkStage || "";
  const stageOrder = ["click", "offer", "landing", "geo", "cap", "fraud", "redirect"];
  const stageIndex = stageOrder.indexOf(checkStage);
  
  const determineStatus = (stage: string, idx: number): "passed" | "failed" | "pending" | "skipped" => {
    if (rawClick.status === "processed") {
      return "passed";
    }
    
    if (rawClick.status === "rejected") {
      if (idx < stageIndex) return "passed";
      if (idx === stageIndex) return "failed";
      return "skipped";
    }
    
    if (stage === "click") return "passed";
    if (rawClick.resolvedOfferId && stage === "offer") return "passed";
    if (rawClick.resolvedLandingId && stage === "landing") return "passed";
    if (rawClick.clickId) return "passed";
    
    return "pending";
  };
  
  const getDetails = (stage: string): string | undefined => {
    switch (stage) {
      case "click":
        return rawClick.geo ? `GEO: ${rawClick.geo}` : undefined;
      case "offer":
        return rawClick.resolvedOfferId || undefined;
      case "landing":
        return rawClick.resolvedLandingId || undefined;
      case "fraud":
        if (rawClick.rejectReason === "fraud_block") return "Заблокировано антифрод-системой";
        break;
      case "geo":
        if (rawClick.rejectReason === "geo_mismatch") return "GEO не соответствует";
        break;
      case "cap":
        if (rawClick.rejectReason === "cap_reached") return "Достигнут лимит";
        break;
    }
    return undefined;
  };
  
  return stageOrder.map((stage, idx) => ({
    id: stage,
    name: stageLabels[stage] || stage,
    status: determineStatus(stage, idx),
    details: getDetails(stage),
  }));
}
