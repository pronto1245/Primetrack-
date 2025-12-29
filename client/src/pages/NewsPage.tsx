import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Newspaper, Plus, Pin, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

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

export default function NewsPage() {
  const [, setLocation] = useLocation();

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

  const goBack = () => {
    if (currentUser?.role) {
      setLocation(`/dashboard/${currentUser.role}`);
    } else {
      setLocation("/dashboard/publisher");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack} data-testid="back-button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Newspaper className="h-6 w-6" />
                Новости и объявления
              </h1>
              <p className="text-sm text-muted-foreground">
                Последние обновления платформы
              </p>
            </div>
          </div>
          
          {canCreateNews && (
            <Link href="/news/create">
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
                {post.imageUrl && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={post.imageUrl} 
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {post.publishedAt && format(new Date(post.publishedAt), "d MMM yyyy", { locale: ru })}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {post.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
