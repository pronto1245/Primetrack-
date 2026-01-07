import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, UserPlus, Loader2, Mail, User, Shield, Briefcase, 
  BarChart2, HeadphonesIcon, Wallet, Trash2, Edit, KeyRound, Info, ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { useStaff } from "@/contexts/StaffContext";

interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  staffRole: string;
  status: string;
  createdAt: string;
}

const ROLES = [
  { value: "manager", label: "Менеджер", icon: Briefcase, description: "Полный доступ" },
  { value: "analyst", label: "Аналитик", icon: BarChart2, description: "Статистика и отчёты" },
  { value: "support", label: "Поддержка", icon: HeadphonesIcon, description: "Партнёры и запросы" },
  { value: "finance", label: "Финансист", icon: Wallet, description: "Финансы и выплаты" },
];

export function AdvertiserTeam() {
  const queryClient = useQueryClient();
  const { canWrite } = useStaff();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({ fullName: "", email: "", staffRole: "analyst", password: "" });
  const [isInstructionOpen, setIsInstructionOpen] = useState(false);
  const hasWriteAccess = canWrite("team");

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["advertiser-staff"],
    queryFn: async () => {
      const res = await fetch("/api/advertiser/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/advertiser/staff", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-staff"] });
      setIsAddOpen(false);
      setFormData({ fullName: "", email: "", staffRole: "analyst", password: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> & { status?: string } }) => {
      const res = await apiRequest("PUT", `/api/advertiser/staff/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-staff"] });
      setEditingStaff(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/advertiser/staff/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-staff"] });
    },
  });

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      const updateData: any = { fullName: formData.fullName, staffRole: formData.staffRole };
      if (formData.password) updateData.password = formData.password;
      updateMutation.mutate({ id: editingStaff.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({ fullName: member.fullName, email: member.email, staffRole: member.staffRole, password: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Команда
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Управление доступом сотрудников</p>
        </div>
        
        {hasWriteAccess && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-staff" className="bg-emerald-600 hover:bg-emerald-500">
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить сотрудника
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить сотрудника</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Имя</Label>
                <Input
                  data-testid="input-staff-name"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Иван Иванов"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  data-testid="input-staff-email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ivan@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Select value={formData.staffRole} onValueChange={v => setFormData({ ...formData, staffRole: v })}>
                  <SelectTrigger data-testid="select-staff-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <role.icon className="w-4 h-4" />
                          <span>{role.label}</span>
                          <span className="text-muted-foreground text-xs">— {role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input
                  data-testid="input-staff-password"
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Добавить
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {ROLES.map(role => (
          <Card key={role.value} className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <role.icon className="w-4 h-4 text-muted-foreground" />
                {role.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{role.description}</p>
              <p className="text-2xl font-bold mt-2">
                {staff.filter(s => s.staffRole === role.value).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Collapsible open={isInstructionOpen} onOpenChange={setIsInstructionOpen}>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-blue-500/10 transition-colors">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400">
                  <Info className="w-4 h-4" />
                  Инструкция по управлению командой
                </div>
                <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${isInstructionOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 text-sm text-muted-foreground space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Как добавить сотрудника:</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Нажмите кнопку "Добавить сотрудника"</li>
                  <li>Заполните имя, email и пароль</li>
                  <li>Выберите роль с нужными правами доступа</li>
                  <li>Сотрудник получит доступ по email + пароль</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Роли и права доступа:</h4>
                <div className="space-y-2 ml-2">
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 mt-0.5 text-purple-400" />
                    <div>
                      <span className="font-medium text-foreground">Менеджер</span>
                      <span className="text-muted-foreground"> — полный доступ ко всем разделам: офферы, партнёры, статистика, финансы</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <BarChart2 className="w-4 h-4 mt-0.5 text-blue-400" />
                    <div>
                      <span className="font-medium text-foreground">Аналитик</span>
                      <span className="text-muted-foreground"> — просмотр статистики, отчётов и дашбордов (без редактирования)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <HeadphonesIcon className="w-4 h-4 mt-0.5 text-emerald-400" />
                    <div>
                      <span className="font-medium text-foreground">Поддержка</span>
                      <span className="text-muted-foreground"> — работа с партнёрами, запросами и коммуникациями</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Wallet className="w-4 h-4 mt-0.5 text-yellow-400" />
                    <div>
                      <span className="font-medium text-foreground">Финансист</span>
                      <span className="text-muted-foreground"> — управление балансами, выплатами и финансовыми операциями</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Важно:</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Каждый сотрудник входит под своим email и паролем</li>
                  <li>Сотрудники видят только данные вашего аккаунта рекламодателя</li>
                  <li>Вы можете изменить роль или заблокировать сотрудника в любой момент</li>
                  <li>При смене пароля старый пароль перестаёт работать сразу</li>
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Сотрудники</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Нет сотрудников</p>
              <p className="text-sm">Добавьте первого члена команды</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="py-3 px-4">Сотрудник</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Роль</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4">Дата</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(member => {
                    const roleInfo = getRoleInfo(member.staffRole);
                    return (
                      <tr key={member.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{member.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="gap-1">
                            <roleInfo.icon className="w-3 h-3" />
                            {roleInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={member.status === "active" ? "default" : "destructive"}>
                            {member.status === "active" ? "Активен" : "Заблокирован"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {new Date(member.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            {hasWriteAccess && (
                              <>
                                <Dialog open={editingStaff?.id === member.id} onOpenChange={open => !open && setEditingStaff(null)}>
                                  <DialogTrigger asChild>
                                    <Button
                                      data-testid={`button-edit-staff-${member.id}`}
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEdit(member)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Редактировать сотрудника</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                      <div className="space-y-2">
                                        <Label>Имя</Label>
                                        <Input
                                          value={formData.fullName}
                                          onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                          required
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Роль</Label>
                                        <Select value={formData.staffRole} onValueChange={v => setFormData({ ...formData, staffRole: v })}>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {ROLES.map(role => (
                                              <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Новый пароль (опционально)</Label>
                                        <Input
                                          type="password"
                                          value={formData.password}
                                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                                          placeholder="Оставьте пустым, чтобы не менять"
                                        />
                                      </div>
                                      <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                                        {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Сохранить
                                      </Button>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                                
                                <Button
                                  data-testid={`button-toggle-staff-${member.id}`}
                                  size="sm"
                                  variant={member.status === "active" ? "destructive" : "default"}
                                  onClick={() => updateMutation.mutate({ 
                                    id: member.id, 
                                    data: { status: member.status === "active" ? "blocked" : "active" }
                                  })}
                                  disabled={updateMutation.isPending}
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  data-testid={`button-delete-staff-${member.id}`}
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteMutation.mutate(member.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
