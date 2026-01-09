import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, BarChart3, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Variant {
  id: string;
  offerId: string;
  name: string;
  url: string;
  weight: number;
  status: "active" | "paused";
  clicks: number;
  conversions: number;
  createdAt: string;
}

interface ABVariantsManagerProps {
  offerId: string;
}

export function ABVariantsManager({ offerId }: ABVariantsManagerProps) {
  const queryClient = useQueryClient();
  const [newVariant, setNewVariant] = useState({ name: "", url: "", weight: 50 });
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: variants = [], isLoading } = useQuery<Variant[]>({
    queryKey: ["/api/offers", offerId, "variants"],
    queryFn: async () => {
      const res = await fetch(`/api/offers/${offerId}/variants`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch variants");
      return res.json();
    },
  });

  const handleAddVariant = async () => {
    if (!newVariant.name || !newVariant.url) {
      setError("Название и URL обязательны");
      return;
    }

    setLoading("add");
    setError("");
    try {
      const res = await fetch(`/api/offers/${offerId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newVariant),
      });
      if (!res.ok) throw new Error("Failed to add variant");
      await queryClient.invalidateQueries({ queryKey: ["/api/offers", offerId, "variants"] });
      setNewVariant({ name: "", url: "", weight: 50 });
    } catch (err) {
      setError("Не удалось добавить вариант");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateVariant = async (id: string, data: Partial<Variant>) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/variants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update variant");
      await queryClient.invalidateQueries({ queryKey: ["/api/offers", offerId, "variants"] });
    } catch (err) {
      setError("Не удалось обновить вариант");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm("Удалить этот вариант?")) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/variants/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete variant");
      await queryClient.invalidateQueries({ queryKey: ["/api/offers", offerId, "variants"] });
    } catch (err) {
      setError("Не удалось удалить вариант");
    } finally {
      setLoading(null);
    }
  };

  const totalWeight = variants.filter(v => v.status === "active").reduce((sum, v) => sum + v.weight, 0);
  const getPercent = (weight: number, status: string) => {
    if (status !== "active" || totalWeight === 0) return 0;
    return Math.round((weight / totalWeight) * 100);
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          A/B Тестирование лендингов
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {variants.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Активные варианты получают трафик пропорционально своему весу
            </div>
            
            {variants.map((variant) => {
              const cr = variant.clicks > 0 ? ((variant.conversions / variant.clicks) * 100).toFixed(2) : "0.00";
              const percent = getPercent(variant.weight, variant.status);
              
              return (
                <div
                  key={variant.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border space-y-3"
                  data-testid={`variant-${variant.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{variant.name}</div>
                      {variant.status === "active" && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          {percent}% трафика
                        </span>
                      )}
                      {variant.status === "paused" && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                          На паузе
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={variant.status}
                        onValueChange={(value) => handleUpdateVariant(variant.id, { status: value as "active" | "paused" })}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Активен</SelectItem>
                          <SelectItem value="paused">На паузе</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteVariant(variant.id)}
                        disabled={loading === variant.id}
                      >
                        {loading === variant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground break-all">
                    {variant.url}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Вес: {variant.weight}</span>
                      </div>
                      <Slider
                        value={[variant.weight]}
                        min={1}
                        max={100}
                        step={1}
                        onValueCommit={(value) => handleUpdateVariant(variant.id, { weight: value[0] })}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-mono text-foreground">{variant.clicks}</div>
                        <div className="text-xs text-muted-foreground">Клики</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-foreground">{variant.conversions}</div>
                        <div className="text-xs text-muted-foreground">Конверсии</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-green-400">{cr}%</div>
                        <div className="text-xs text-muted-foreground">CR</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-4">
          <div className="text-sm font-medium">Добавить вариант</div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Вариант A"
                value={newVariant.name}
                onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                data-testid="input-variant-name"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>URL лендинга</Label>
              <Input
                placeholder="https://landing.example.com/page-a"
                value={newVariant.url}
                onChange={(e) => setNewVariant({ ...newVariant, url: e.target.value })}
                data-testid="input-variant-url"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>Вес (1-100): {newVariant.weight}</Label>
              <Slider
                value={[newVariant.weight]}
                min={1}
                max={100}
                step={1}
                onValueChange={(value) => setNewVariant({ ...newVariant, weight: value[0] })}
                data-testid="slider-variant-weight"
              />
            </div>
            <Button
              onClick={handleAddVariant}
              disabled={loading === "add" || !newVariant.name || !newVariant.url}
              className="bg-blue-600 hover:bg-blue-500"
              data-testid="button-add-variant"
            >
              {loading === "add" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Добавить
            </Button>
          </div>
        </div>

        {variants.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Нет вариантов. Добавьте варианты лендингов для A/B тестирования.
            <br />
            <span className="text-xs">
              Если варианты не настроены, будет использоваться основной URL оффера.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
