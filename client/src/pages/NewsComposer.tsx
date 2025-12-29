import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Image, Loader2, Upload, X, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CurrentUser {
  id: string;
  role: string;
}

interface NewsComposerProps {
  embedded?: boolean;
}

export default function NewsComposer({ embedded = false }: NewsComposerProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("update");
  const [targetAudience, setTargetAudience] = useState("all");
  const [isPinned, setIsPinned] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/news", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Успешно",
        description: "Новость опубликована",
      });
      if (embedded && currentUser?.role) {
        setLocation(`/dashboard/${currentUser.role}/news`);
      } else {
        setLocation("/news");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать новость",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите изображение",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5 МБ",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("directory", "public/news");

      const res = await fetch("/api/object-storage/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      setImageUrl(data.url);
      toast({
        title: "Успешно",
        description: "Изображение загружено",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните заголовок и текст новости",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      title,
      body,
      category,
      targetAudience,
      isPinned,
      isPublished,
      imageUrl,
    });
  };

  const isAdmin = currentUser?.role === "admin";

  const goBack = () => {
    if (embedded && currentUser?.role) {
      setLocation(`/dashboard/${currentUser.role}/news`);
    } else {
      setLocation("/news");
    }
  };

  const content = (
    <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Содержимое новости</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите заголовок..."
                  data-testid="news-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Текст новости</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Введите текст новости..."
                  rows={6}
                  data-testid="news-body-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Изображение (опционально)</Label>
                {imageUrl ? (
                  <div className="relative">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setImageUrl(null)}
                      data-testid="remove-image-button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="flex flex-col items-center justify-center py-4">
                      {uploading ? (
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            Нажмите для загрузки изображения
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            PNG, JPG до 5 МБ
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      data-testid="image-upload-input"
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Категория</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="update">Обновление</SelectItem>
                      <SelectItem value="announcement">Объявление</SelectItem>
                      <SelectItem value="promo">Акция</SelectItem>
                      <SelectItem value="alert">Важно</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="audience">Аудитория</Label>
                    <Select value={targetAudience} onValueChange={setTargetAudience}>
                      <SelectTrigger data-testid="audience-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="advertisers">Рекламодатели</SelectItem>
                        <SelectItem value="publishers">Партнёры</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="pinned"
                      checked={isPinned}
                      onCheckedChange={setIsPinned}
                      data-testid="pinned-switch"
                    />
                    <Label htmlFor="pinned" className="text-sm">Закрепить</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="published"
                      checked={isPublished}
                      onCheckedChange={setIsPublished}
                      data-testid="published-switch"
                    />
                    <Label htmlFor="published" className="text-sm">Опубликовать сразу</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              data-testid="cancel-button"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim() || !body.trim()}
              data-testid="submit-button"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Опубликовать
            </Button>
          </div>
        </form>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} data-testid="back-button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Создать новость</h1>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={goBack} data-testid="back-button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Создать новость</h1>
        </div>
        {content}
      </div>
    </div>
  );
}
