import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";

export function PendingPartnershipOverlay() {
  const { selectedAdvertiser } = useAdvertiserContext();

  return (
    <div className="flex items-center justify-center min-h-[400px]" data-testid="pending-partnership-overlay">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-yellow-100 rounded-full">
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold">Партнёрство ожидает подтверждения</h3>
            <p className="text-muted-foreground">
              Ваша заявка на партнёрство с рекламодателем{" "}
              <span className="font-medium text-foreground">{selectedAdvertiser?.username}</span>{" "}
              находится на рассмотрении.
            </p>
            <p className="text-sm text-muted-foreground">
              После одобрения заявки вам будет доступен полный функционал: офферы, статистика, финансы и отчёты.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
