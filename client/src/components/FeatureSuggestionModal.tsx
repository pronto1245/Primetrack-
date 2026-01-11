import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FeatureSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureSuggestionModal({ open, onOpenChange }: FeatureSuggestionModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      return apiRequest("POST", "/api/feature-suggestion", data);
    },
    onSuccess: () => {
      toast({ title: "Спасибо за предложение!", description: "Мы рассмотрим вашу идею." });
      setTitle("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось отправить", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }
    submitMutation.mutate({ title, description });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Предложить фичу
          </DialogTitle>
          <DialogDescription>
            Расскажите, какую функцию вы хотели бы видеть в платформе
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feature-title">Название</Label>
            <Input
              id="feature-title"
              data-testid="input-feature-title"
              placeholder="Краткое название функции"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feature-description">Описание</Label>
            <Textarea
              id="feature-description"
              data-testid="input-feature-description"
              placeholder="Опишите подробнее, как должна работать эта функция и зачем она нужна"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitMutation.isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              data-testid="button-submit-feature"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка...
                </>
              ) : (
                "Отправить"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
