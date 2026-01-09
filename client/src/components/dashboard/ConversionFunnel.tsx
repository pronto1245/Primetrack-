import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingDown, ArrowDown, Users, CreditCard, Repeat } from "lucide-react";
import { format, subDays } from "date-fns";

interface FunnelStage {
  name: string;
  count: number;
  percent: number;
  dropoff: number;
}

interface FunnelData {
  stages: FunnelStage[];
  totalClicks: number;
  totalRegistrations: number;
  totalFtd: number;
  totalRepeatDeposits: number;
  conversionRates: {
    clickToReg: number;
    regToFtd: number;
    ftdToRepeat: number;
    clickToFtd: number;
  };
}

interface ConversionFunnelProps {
  offerId?: string;
}

const STAGE_ICONS = [Users, Users, CreditCard, Repeat];
const STAGE_COLORS = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"];

export function ConversionFunnel({ offerId }: ConversionFunnelProps) {
  const [period, setPeriod] = useState("30");
  
  const dateFrom = subDays(new Date(), parseInt(period)).toISOString();
  const dateTo = new Date().toISOString();
  
  const { data: funnel, isLoading, error } = useQuery<FunnelData>({
    queryKey: ["/api/advertiser/funnel", offerId, period],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
      if (offerId) params.set("offerId", offerId);
      
      const res = await fetch(`/api/advertiser/funnel?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch funnel data");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !funnel) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          Не удалось загрузить данные воронки
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...funnel.stages.map(s => s.count), 1);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-blue-400" />
          Воронка конверсий
        </CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32" data-testid="select-funnel-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 дней</SelectItem>
            <SelectItem value="14">14 дней</SelectItem>
            <SelectItem value="30">30 дней</SelectItem>
            <SelectItem value="90">90 дней</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {funnel.stages.map((stage, index) => {
            const Icon = STAGE_ICONS[index] || Users;
            const barWidth = (stage.count / maxCount) * 100;
            const color = STAGE_COLORS[index] || "bg-gray-500";
            
            return (
              <div key={stage.name} className="relative" data-testid={`funnel-stage-${index}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono text-foreground">{stage.count.toLocaleString()}</span>
                    <span className="text-muted-foreground w-16 text-right">
                      {stage.percent.toFixed(1)}%
                    </span>
                    {stage.dropoff > 0 && (
                      <span className="text-red-400 text-xs flex items-center gap-1 w-20">
                        <ArrowDown className="w-3 h-3" />
                        -{stage.dropoff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-muted/30 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all duration-500 rounded-lg flex items-center justify-end pr-3`}
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  >
                    {barWidth > 10 && (
                      <span className="text-xs text-white font-medium">
                        {stage.count.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-sm font-medium mb-3">Коэффициенты конверсии</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-mono text-green-400">
                {funnel.conversionRates.clickToReg.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">Клик → Рег</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-mono text-yellow-400">
                {funnel.conversionRates.regToFtd.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">Рег → FTD</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-mono text-purple-400">
                {funnel.conversionRates.ftdToRepeat.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">FTD → Повтор</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-mono text-blue-400">
                {funnel.conversionRates.clickToFtd.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">Клик → FTD</div>
            </div>
          </div>
        </div>

        {funnel.totalClicks === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Нет данных за выбранный период.
            <br />
            <span className="text-xs">Данные воронки формируются из конверсий с указанием player_id.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
