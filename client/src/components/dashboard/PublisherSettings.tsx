import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  User, Lock, Bell, Key, Loader2, Save, Eye, EyeOff,
  Send, MessageSquare, Shield, Copy, RefreshCw, CheckCircle2, AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function PublisherSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="text-settings-title">Настройки</h2>
        <p className="text-muted-foreground">Управление профилем, безопасностью и интеграциями</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
            <User className="h-4 w-4" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2" data-testid="tab-security">
            <Lock className="h-4 w-4" />
            Безопасность
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2" data-testid="tab-notifications">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2" data-testid="tab-api">
            <Key className="h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="api">
          <ApiTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    telegram: "",
    logoUrl: "",
  });

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        telegram: user.telegram || "",
        logoUrl: user.logoUrl || "",
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/user/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Профиль обновлён" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Профиль
        </CardTitle>
        <CardDescription>Ваши контактные данные</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="username">Имя пользователя</Label>
            <Input
              id="username"
              data-testid="input-username"
              value={formData.username}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Имя пользователя нельзя изменить</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              data-testid="input-email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              data-testid="input-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 999 123-45-67"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram">Telegram</Label>
            <Input
              id="telegram"
              data-testid="input-telegram"
              value={formData.telegram}
              onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
              placeholder="@username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logoUrl">URL аватара</Label>
          <Input
            id="logoUrl"
            data-testid="input-logo-url"
            value={formData.logoUrl}
            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            placeholder="https://example.com/avatar.png"
          />
          {formData.logoUrl && (
            <div className="mt-2">
              <img src={formData.logoUrl} alt="Avatar preview" className="h-16 w-16 object-cover border rounded-full" />
            </div>
          )}
        </div>

        <Button 
          onClick={() => updateMutation.mutate(formData)} 
          disabled={updateMutation.isPending}
          data-testid="button-save-profile"
        >
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Сохранить
        </Button>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [setupMode, setSetupMode] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/user/password", data),
    onSuccess: () => {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Пароль изменён" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/2fa/setup", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      setTotpSecret(data.secret);
      setQrCode(data.qrCode);
      setSetupMode(true);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: (data: { secret: string; token: string }) => apiRequest("POST", "/api/user/2fa/enable", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setSetupMode(false);
      setTotpSecret("");
      setQrCode("");
      setVerificationCode("");
      toast({ title: "2FA включена", description: "Двухфакторная аутентификация успешно активирована" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: (token: string) => apiRequest("POST", "/api/user/2fa/disable", { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setDisableCode("");
      setSetupMode(false);
      setTotpSecret("");
      setQrCode("");
      toast({ title: "2FA отключена" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Ошибка", description: "Пароли не совпадают", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: "Ошибка", description: "Пароль должен быть не менее 6 символов", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleEnable2FA = () => {
    if (verificationCode.length !== 6) {
      toast({ title: "Ошибка", description: "Введите 6-значный код", variant: "destructive" });
      return;
    }
    enable2FAMutation.mutate({ secret: totpSecret, token: verificationCode });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Смена пароля
          </CardTitle>
          <CardDescription>Изменить пароль для входа в систему</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Текущий пароль</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                data-testid="input-current-password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Новый пароль</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                data-testid="input-new-password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
            <Input
              id="confirmPassword"
              type="password"
              data-testid="input-confirm-password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </div>
          <Button 
            onClick={handleChangePassword} 
            disabled={changePasswordMutation.isPending}
            data-testid="button-change-password"
          >
            {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
            Изменить пароль
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Двухфакторная аутентификация (2FA)
          </CardTitle>
          <CardDescription>Дополнительный уровень защиты вашего аккаунта через TOTP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.twoFactorEnabled ? (
            <>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">2FA активирована. Ваш аккаунт защищён.</span>
              </div>
              <Separator />
              <div className="space-y-4">
                <Label>Для отключения введите код из приложения</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="000000"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="w-32 text-center font-mono text-lg"
                    data-testid="input-disable-2fa-code"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => disable2FAMutation.mutate(disableCode)}
                    disabled={disable2FAMutation.isPending || disableCode.length !== 6}
                    data-testid="button-disable-2fa"
                  >
                    {disable2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отключить 2FA"}
                  </Button>
                </div>
              </div>
            </>
          ) : setupMode ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Отсканируйте QR-код в приложении Google Authenticator или введите секретный ключ вручную
                </p>
                {qrCode && (
                  <img src={qrCode} alt="QR Code" className="mx-auto border rounded-lg" data-testid="img-qr-code" />
                )}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Секретный ключ (для ручного ввода)</Label>
                  <p className="font-mono text-sm select-all" data-testid="text-totp-secret">{totpSecret}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Введите 6-значный код из приложения</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="w-32 text-center font-mono text-lg"
                    data-testid="input-verification-code"
                  />
                  <Button
                    onClick={handleEnable2FA}
                    disabled={enable2FAMutation.isPending || verificationCode.length !== 6}
                    data-testid="button-verify-2fa"
                  >
                    {enable2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить"}
                  </Button>
                  <Button variant="outline" onClick={() => setSetupMode(false)}>
                    Отмена
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">2FA через TOTP</div>
                  <div className="text-sm text-muted-foreground">
                    Используйте Google Authenticator, Authy или аналогичное приложение
                  </div>
                </div>
                <Button
                  onClick={() => setup2FAMutation.mutate()}
                  disabled={setup2FAMutation.isPending}
                  data-testid="button-setup-2fa"
                >
                  {setup2FAMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  Настроить 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [telegramData, setTelegramData] = useState({
    telegramChatId: "",
    telegramNotifyLeads: true,
    telegramNotifySales: true,
    telegramNotifyPayouts: true,
    telegramNotifySystem: true,
  });
  const [linkCode, setLinkCode] = useState<string | null>(null);

  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    if (user) {
      setTelegramData({
        telegramChatId: user.telegramChatId || "",
        telegramNotifyLeads: user.telegramNotifyLeads ?? true,
        telegramNotifySales: user.telegramNotifySales ?? true,
        telegramNotifyPayouts: user.telegramNotifyPayouts ?? true,
        telegramNotifySystem: user.telegramNotifySystem ?? true,
      });
    }
  }, [user]);

  const saveTelegramMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user/notifications/telegram", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Настройки уведомлений сохранены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const testTelegramMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/notifications/telegram/test"),
    onSuccess: () => {
      toast({ title: "Тестовое сообщение отправлено" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const getLinkCodeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/telegram/link-code"),
    onSuccess: (data: any) => {
      setLinkCode(data.code);
      toast({ title: "Код получен", description: "Отправьте его боту в Telegram" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/telegram/unlink"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Telegram отвязан" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const isLinked = !!user?.telegramChatId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Telegram уведомления
        </CardTitle>
        <CardDescription>Получайте мгновенные уведомления в Telegram</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="font-medium mb-2">Как настроить:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Напишите любое сообщение боту <a href="https://t.me/primetrack_notify_bot" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">@primetrack_notify_bot</a> в Telegram</li>
            <li>Узнайте свой Chat ID через @userinfobot</li>
            <li>Укажите Chat ID ниже и сохраните</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            По умолчанию используется бот <a href="https://t.me/primetrack_notify_bot" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@primetrack_notify_bot</a> платформы.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chatId">Chat ID <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Input
              id="chatId"
              data-testid="input-chat-id"
              value={telegramData.telegramChatId}
              onChange={(e) => setTelegramData({ ...telegramData, telegramChatId: e.target.value })}
              placeholder="123456789"
              className="flex-1"
            />
            {isLinked && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => unlinkMutation.mutate()}
                disabled={unlinkMutation.isPending}
                data-testid="button-unlink-telegram"
              >
                Отвязать
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Узнайте через @userinfobot в Telegram</p>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium">Типы уведомлений</h4>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "telegramNotifyLeads", label: "Новые лиды" },
              { key: "telegramNotifySales", label: "Продажи" },
              { key: "telegramNotifyPayouts", label: "Выплаты" },
              { key: "telegramNotifySystem", label: "Системные" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                <span>{item.label}</span>
                <Switch
                  checked={(telegramData as any)[item.key]}
                  onCheckedChange={(checked) => setTelegramData({ ...telegramData, [item.key]: checked })}
                  data-testid={`switch-${item.key}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => saveTelegramMutation.mutate(telegramData)} 
            disabled={saveTelegramMutation.isPending}
            data-testid="button-save-telegram"
          >
            {saveTelegramMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Сохранить
          </Button>
          <Button 
            variant="outline"
            onClick={() => testTelegramMutation.mutate()}
            disabled={testTelegramMutation.isPending || !isLinked || !telegramData.telegramChatId}
            data-testid="button-test-telegram"
          >
            {testTelegramMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Тест
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApiTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const generateTokenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/api-token/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "API токен сгенерирован" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/user/api-token"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "API токен отозван" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const copyToken = () => {
    if (user?.apiToken) {
      navigator.clipboard.writeText(user.apiToken);
      toast({ title: "Токен скопирован" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API токен
        </CardTitle>
        <CardDescription>Используйте API для интеграции с вашими системами</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Важно!</p>
            <p className="text-muted-foreground">
              API токен даёт полный доступ к вашему аккаунту. Храните его в безопасности и никогда не передавайте третьим лицам.
            </p>
          </div>
        </div>

        {user?.apiToken ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ваш API токен</Label>
              <div className="flex gap-2">
                <Input
                  value={user.apiToken}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-api-token"
                />
                <Button variant="outline" onClick={copyToken} data-testid="button-copy-token">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {user.apiTokenCreatedAt && (
                <p className="text-xs text-muted-foreground">
                  Создан: {new Date(user.apiTokenCreatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                data-testid="button-regenerate-token"
              >
                {generateTokenMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Перегенерировать
              </Button>
              <Button 
                variant="destructive"
                onClick={() => revokeTokenMutation.mutate()}
                disabled={revokeTokenMutation.isPending}
                data-testid="button-revoke-token"
              >
                Отозвать токен
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">У вас пока нет API токена</p>
            <Button 
              onClick={() => generateTokenMutation.mutate()}
              disabled={generateTokenMutation.isPending}
              data-testid="button-generate-token"
            >
              {generateTokenMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
              Сгенерировать токен
            </Button>
          </div>
        )}

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium">Примеры использования API</h4>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Получение статистики:</p>
            <code className="text-xs block bg-background p-2 rounded border">
              curl -H "Authorization: Bearer YOUR_TOKEN" \<br/>
              &nbsp;&nbsp;{window.location.origin}/api/v1/stats
            </code>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Получение конверсий:</p>
            <code className="text-xs block bg-background p-2 rounded border">
              curl -H "Authorization: Bearer YOUR_TOKEN" \<br/>
              &nbsp;&nbsp;{window.location.origin}/api/v1/conversions
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
