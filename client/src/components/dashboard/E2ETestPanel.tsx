import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Play, TestTube2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TestStep {
  step: number;
  name: string;
  status: "passed" | "failed";
  data?: Record<string, any>;
  error?: string;
}

interface TestResult {
  timestamp: string;
  offerId: number;
  offerName: string;
  steps: TestStep[];
  success: boolean;
  summary: string;
}

interface Offer {
  id: number;
  name: string;
  payoutAmount: string;
  advertiserPrice: string;
  payoutModel: string;
}

export function E2ETestPanel() {
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const { data: offers = [], isLoading: loadingOffers } = useQuery<Offer[]>({
    queryKey: ["/api/test/e2e/offers"],
  });

  const runTestMutation = useMutation({
    mutationFn: async (offerId: number) => {
      const response = await apiRequest("POST", "/api/test/e2e", { offerId });
      return response.json();
    },
    onSuccess: (data: TestResult) => {
      setTestResult(data);
    },
    onError: (error: any) => {
      setTestResult({
        timestamp: new Date().toISOString(),
        offerId: parseInt(selectedOfferId),
        offerName: "",
        steps: [],
        success: false,
        summary: `Error: ${error.message}`,
      });
    },
  });

  const handleRunTest = () => {
    if (!selectedOfferId) return;
    setTestResult(null);
    runTestMutation.mutate(parseInt(selectedOfferId));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube2 className="h-5 w-5" />
          E2E Тестирование
        </CardTitle>
        <CardDescription>
          Симуляция полного цикла: клик → конверсия → выплата (без изменения данных)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Выберите оффер для теста</label>
            <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
              <SelectTrigger data-testid="select-e2e-offer">
                <SelectValue placeholder={loadingOffers ? "Загрузка..." : "Выберите оффер"} />
              </SelectTrigger>
              <SelectContent>
                {offers.map((offer) => (
                  <SelectItem key={offer.id} value={offer.id.toString()}>
                    {offer.name} (${offer.payoutAmount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleRunTest}
            disabled={!selectedOfferId || runTestMutation.isPending}
            data-testid="button-run-e2e-test"
          >
            {runTestMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Тестирование...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Запустить тест
              </>
            )}
          </Button>
        </div>

        {offers.length === 0 && !loadingOffers && (
          <div className="flex items-center gap-2 text-muted-foreground p-4 border rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span>Нет доступных офферов для тестирования. Создайте оффер и добавьте партнёра.</span>
          </div>
        )}

        {testResult && (
          <div className="mt-6 space-y-4">
            <div className={`p-4 rounded-lg ${testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border`}>
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${testResult.success ? "text-green-700" : "text-red-700"}`}>
                  {testResult.success ? "Тест пройден" : "Тест не пройден"}
                </span>
              </div>
              <p className={`text-sm ${testResult.success ? "text-green-600" : "text-red-600"}`}>
                {testResult.summary}
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b">
                <span className="font-medium">Детали выполнения</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {testResult.offerName} • {new Date(testResult.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="divide-y">
                {testResult.steps.map((step) => (
                  <div key={step.step} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {step.status === "passed" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Шаг {step.step}
                        </Badge>
                        <span className="font-medium">{step.name}</span>
                      </div>
                      {step.data && (
                        <div className="mt-1 text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                          {Object.entries(step.data).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-foreground">{key}:</span> {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                      {step.error && (
                        <div className="mt-1 text-xs text-red-600">
                          {step.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          <strong>Как работает симуляция:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Находит партнёра с доступом к офферу</li>
            <li>Проверяет наличие лендинга</li>
            <li>Читает текущий баланс партнёра (без изменений)</li>
            <li>Проверяет настройки выплат</li>
            <li>Симулирует расчёт нового баланса</li>
            <li>Проверяет корректность настроек</li>
          </ol>
          <p className="mt-2 text-green-600 font-medium">✓ Безопасно: реальные данные не изменяются</p>
        </div>
      </CardContent>
    </Card>
  );
}
