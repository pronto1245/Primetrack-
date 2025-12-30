import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, Plus, Pin, Calendar, Edit2, Trash2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface NewsPost {
  id: string;
  authorId: string;
  authorRole: string;
  title: string;
  body: string;
  imageUrl: string | null;
  category: string;
  targetAudience: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface CurrentUser {
  id: string;
  role: string;
}

export function NewsFeed() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
  });

  const { data: news = [], isLoading } = useQuery<NewsPost[]>({
    queryKey: ["/api/news"],
    queryFn: async () => {
      const res = await fetch("/api/news", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Mark all loaded news as read when page is visited
  useEffect(() => {
    if (news.length > 0) {
      const newsIds = news.map(n => n.id);
      fetch("/api/news/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newsIds }),
      }).then(() => {
        // Invalidate unread count to update sidebar badge
        queryClient.invalidateQueries({ queryKey: ["unread-news-count"] });
      }).catch(() => {
        // Silently ignore errors
      });
    }
  }, [news, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/news/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Успешно", description: "Новость удалена" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить новость", variant: "destructive" });
    },
  });

  const canEditNews = (post: NewsPost) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "advertiser" && post.authorId === currentUser.id) return true;
    return false;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "update":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "announcement":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "promo":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "alert":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "update": return "Обновление";
      case "announcement": return "Объявление";
      case "promo": return "Акция";
      case "alert": return "Важно";
      default: return category;
    }
  };

  const canCreateNews = currentUser?.role === "admin" || currentUser?.role === "advertiser";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Newspaper className="h-6 w-6" />
            Новости и объявления
          </h1>
          <p className="text-sm text-muted-foreground">
            Последние обновления платформы
          </p>
        </div>
        
        {canCreateNews && currentUser?.role && (
          <Link href={`/dashboard/${currentUser.role}/news/create`}>
            <Button data-testid="create-news-button">
              <Plus className="h-4 w-4 mr-2" />
              Создать новость
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : news.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет новостей</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {news.map((post) => (
            <Card 
              key={post.id}
              className={`overflow-hidden ${post.isPinned ? "border-yellow-500/30" : ""}`}
              data-testid={`news-card-${post.id}`}
            >
              <div className={`flex ${post.imageUrl ? "flex-col sm:flex-row" : ""}`}>
                {post.imageUrl && (
                  <div className="sm:w-36 sm:min-w-36 h-32 sm:h-auto sm:min-h-24 overflow-hidden flex-shrink-0">
                    <img 
                      src={post.imageUrl} 
                      alt={post.title}
                      className="w-full h-full object-cover sm:rounded-l-lg"
                    />
                  </div>
                )}
                <CardContent className="p-4 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.isPinned && (
                        <Pin className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getCategoryColor(post.category)}`}>
                        {getCategoryLabel(post.category)}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {post.authorRole === "admin" ? "Платформа" : "Рекламодатель"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {post.publishedAt && format(new Date(post.publishedAt), "d MMM yyyy", { locale: ru })}
                      </div>
                      
                      {canEditNews(post) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`news-actions-${post.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setLocation(`/dashboard/${currentUser?.role}/news/edit/${post.id}`)}
                              data-testid={`edit-news-${post.id}`}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-500 focus:text-red-500"
                                  data-testid={`delete-news-${post.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Удалить
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить новость?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Эта новость будет удалена безвозвратно. Это действие нельзя отменить.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(post.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {post.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {post.body}
                  </p>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
