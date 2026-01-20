import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, ExternalLink, MessageSquare, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdvertiserSource {
  id: string;
  name: string;
  brand: string | null;
  contact: string | null;
  chatLink: string | null;
  siteName: string | null;
  login: string | null;
  siteUrl: string | null;
  hasPassword: boolean;
  createdAt: string;
}

interface SourceFormData {
  name: string;
  brand: string;
  contact: string;
  chatLink: string;
  siteName: string;
  login: string;
  password: string;
  siteUrl: string;
}

const emptyFormData: SourceFormData = {
  name: "",
  brand: "",
  contact: "",
  chatLink: "",
  siteName: "",
  login: "",
  password: "",
  siteUrl: "",
};

export function AdvertiserSources() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<AdvertiserSource | null>(null);
  const [formData, setFormData] = useState<SourceFormData>(emptyFormData);
  const [showPassword, setShowPassword] = useState(false);

  const { data: sources = [], isLoading } = useQuery<AdvertiserSource[]>({
    queryKey: ["/api/advertiser/sources"],
  });

  const createMutation = useMutation({
    mutationFn: (data: SourceFormData) =>
      apiRequest("POST", "/api/advertiser/sources", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/sources"] });
      toast({ title: "Источник добавлен" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось добавить источник", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SourceFormData> }) =>
      apiRequest("PUT", `/api/advertiser/sources/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/sources"] });
      toast({ title: "Источник обновлён" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить источник", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/advertiser/sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/sources"] });
      toast({ title: "Источник удалён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить источник", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingSource(null);
    setFormData(emptyFormData);
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (source: AdvertiserSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      brand: source.brand || "",
      contact: source.contact || "",
      chatLink: source.chatLink || "",
      siteName: source.siteName || "",
      login: source.login || "",
      password: "",
      siteUrl: source.siteUrl || "",
    });
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSource(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Ошибка", description: "Имя обязательно", variant: "destructive" });
      return;
    }

    if (editingSource) {
      const updateData: Partial<SourceFormData> = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateMutation.mutate({ id: editingSource.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (source: AdvertiserSource) => {
    if (confirm(`Удалить источник "${source.name}"?`)) {
      deleteMutation.mutate(source.id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Источники офферов
            </CardTitle>
            <CardDescription>
              Партнёры-рекламодатели, которые предоставляют офферы
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="button-add-source">
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSource ? "Редактировать источник" : "Новый источник"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Имя *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Royal Partners"
                    data-testid="input-source-name"
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Бренд</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="888casino"
                    data-testid="input-source-brand"
                  />
                </div>
                <div>
                  <Label htmlFor="contact">Контакт</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="manager@example.com"
                    data-testid="input-source-contact"
                  />
                </div>
                <div>
                  <Label htmlFor="chatLink">Ссылка на чат</Label>
                  <Input
                    id="chatLink"
                    value={formData.chatLink}
                    onChange={(e) => setFormData({ ...formData, chatLink: e.target.value })}
                    placeholder="https://t.me/manager"
                    data-testid="input-source-chat"
                  />
                </div>
                <div>
                  <Label htmlFor="siteName">Название сайта</Label>
                  <Input
                    id="siteName"
                    value={formData.siteName}
                    onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                    placeholder="Royal Partners"
                    data-testid="input-source-sitename"
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">Ссылка на сайт</Label>
                  <Input
                    id="siteUrl"
                    value={formData.siteUrl}
                    onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                    placeholder="https://royal.partners"
                    data-testid="input-source-siteurl"
                  />
                </div>
                <div>
                  <Label htmlFor="login">Логин</Label>
                  <Input
                    id="login"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    placeholder="mylogin"
                    data-testid="input-source-login"
                  />
                </div>
                <div>
                  <Label htmlFor="password">
                    Пароль {editingSource?.hasPassword && "(оставьте пустым для сохранения)"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      data-testid="input-source-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-source">
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isSaving} data-testid="button-save-source">
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingSource ? "Сохранить" : "Добавить"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет источников. Добавьте первый источник офферов.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Бренд</TableHead>
                <TableHead>Контакт</TableHead>
                <TableHead>Сайт</TableHead>
                <TableHead>Логин</TableHead>
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id} data-testid={`row-source-${source.id}`}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>{source.brand || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {source.contact || "-"}
                      {source.chatLink && (
                        <a
                          href={source.chatLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                          data-testid={`link-chat-${source.id}`}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {source.siteUrl ? (
                      <a
                        href={source.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                        data-testid={`link-site-${source.id}`}
                      >
                        {source.siteName || "Сайт"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      source.siteName || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {source.login || "-"}
                    {source.hasPassword && <span className="ml-1 text-green-500">🔐</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(source)}
                        data-testid={`button-edit-source-${source.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source)}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`button-delete-source-${source.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
