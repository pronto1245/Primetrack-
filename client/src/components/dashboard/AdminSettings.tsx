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
  User, Lock, Bell, Settings, Loader2, Save, Eye, EyeOff,
  Send, MessageSquare, Shield, Key, CheckCircle2, Globe,
  Users, ShieldAlert, CreditCard, Upload, Database, AlertCircle, Image
} from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AdminSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="text-settings-title">Настройки администратора</h2>
        <p className="text-muted-foreground">Управление платформой, безопасностью и глобальными настройками</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="platform" className="flex items-center gap-2" data-testid="tab-platform">
            <Settings className="h-4 w-4" />
            Платформа
          </TabsTrigger>
          <TabsTrigger value="migration" className="flex items-center gap-2" data-testid="tab-migration">
            <Database className="h-4 w-4" />
            Миграция
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
        <TabsContent value="platform">
          <PlatformTab />
        </TabsContent>
        <TabsContent value="migration">
          <MigrationTab />
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
          Профиль администратора
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              data-testid="input-email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@platform.com"
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
              placeholder="@admin"
            />
          </div>
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
          <CardDescription>Изменить пароль администратора</CardDescription>
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
          <CardDescription>Обязательно для администраторов</CardDescription>
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
            <>
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <span className="text-sm">Рекомендуется включить 2FA для административного аккаунта!</span>
              </div>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBotToken, setShowBotToken] = useState(false);
  const [telegramData, setTelegramData] = useState({
    telegramChatId: "",
    telegramNotifySystem: true,
    telegramNotifyPayouts: true,
  });

  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    if (user) {
      setTelegramData({
        telegramChatId: user.telegramChatId || "",
        telegramNotifySystem: user.telegramNotifySystem ?? true,
        telegramNotifyPayouts: user.telegramNotifyPayouts ?? true,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Telegram уведомления для администратора
        </CardTitle>
        <CardDescription>Получайте системные уведомления платформы</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="chatId">Chat ID администратора</Label>
          <Input
            id="chatId"
            data-testid="input-chat-id"
            value={telegramData.telegramChatId}
            onChange={(e) => setTelegramData({ ...telegramData, telegramChatId: e.target.value })}
            placeholder="123456789"
          />
          <p className="text-sm text-muted-foreground">
            Узнайте свой Chat ID через @userinfobot в Telegram
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium">Типы уведомлений</h4>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "telegramNotifySystem", label: "Системные события", description: "Регистрации, ошибки, предупреждения" },
              { key: "telegramNotifyPayouts", label: "Финансовые операции", description: "Крупные выплаты, подозрительная активность" },
            ].map((item) => (
              <div key={item.key} className="flex items-start gap-3 p-3 border rounded-lg">
                <Switch
                  checked={(telegramData as any)[item.key]}
                  onCheckedChange={(checked) => setTelegramData({ ...telegramData, [item.key]: checked })}
                  data-testid={`switch-${item.key}`}
                />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </div>
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
            disabled={testTelegramMutation.isPending || !telegramData.telegramChatId}
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

function PlatformTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBotToken, setShowBotToken] = useState(false);
  const [showIpinfoToken, setShowIpinfoToken] = useState(false);
  const [showFingerprintKey, setShowFingerprintKey] = useState(false);
  const [showCloudflareToken, setShowCloudflareToken] = useState(false);
  
  const { uploadFile, isUploading: isUploadingLogo } = useUpload({
    onSuccess: (response) => {
      setFormData(prev => ({ ...prev, platformLogoUrl: response.objectPath }));
      toast({ title: "Логотип загружен" });
    },
    onError: (error) => {
      toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" });
    },
  });

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Ошибка", description: "Выберите изображение", variant: "destructive" });
        return;
      }
      await uploadFile(file);
    }
  };

  const [formData, setFormData] = useState({
    platformName: "",
    platformDescription: "",
    platformLogoUrl: "",
    platformFaviconUrl: "",
    supportEmail: "",
    supportPhone: "",
    supportTelegram: "",
    copyrightText: "",
    defaultTelegramBotToken: "",
    ipinfoToken: "",
    fingerprintjsApiKey: "",
    allowPublisherRegistration: true,
    allowAdvertiserRegistration: true,
    requireAdvertiserApproval: true,
    enableProxyDetection: true,
    enableVpnDetection: true,
    enableFingerprintTracking: true,
    maxFraudScore: 70,
    cloudflareZoneId: "",
    cloudflareApiToken: "",
    cloudflareCnameTarget: "",
    cloudflareFallbackOrigin: "",
    cloudflareAccountId: "",
    cloudflareWorkerName: "",
    cloudflareWorkerEnvironment: "",
  });

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/platform-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        platformName: settings.platformName || "",
        platformDescription: settings.platformDescription || "",
        platformLogoUrl: settings.platformLogoUrl || "",
        platformFaviconUrl: settings.platformFaviconUrl || "",
        supportEmail: settings.supportEmail || "",
        supportPhone: settings.supportPhone || "",
        supportTelegram: settings.supportTelegram || "",
        copyrightText: settings.copyrightText || "",
        defaultTelegramBotToken: "",
        ipinfoToken: "",
        fingerprintjsApiKey: "",
        cloudflareZoneId: settings.cloudflareZoneId || "",
        cloudflareApiToken: "",
        cloudflareCnameTarget: settings.cloudflareCnameTarget || "",
        cloudflareFallbackOrigin: settings.cloudflareFallbackOrigin || "",
        cloudflareAccountId: settings.cloudflareAccountId || "",
        cloudflareWorkerName: settings.cloudflareWorkerName || "",
        cloudflareWorkerEnvironment: settings.cloudflareWorkerEnvironment || "",
        allowPublisherRegistration: settings.allowPublisherRegistration ?? true,
        allowAdvertiserRegistration: settings.allowAdvertiserRegistration ?? true,
        requireAdvertiserApproval: settings.requireAdvertiserApproval ?? true,
        enableProxyDetection: settings.enableProxyDetection ?? true,
        enableVpnDetection: settings.enableVpnDetection ?? true,
        enableFingerprintTracking: settings.enableFingerprintTracking ?? true,
        maxFraudScore: settings.maxFraudScore ?? 70,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/admin/platform-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      toast({ title: "Настройки платформы сохранены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Брендинг платформы
          </CardTitle>
          <CardDescription>Настройте внешний вид платформы</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="platformName">Название платформы</Label>
              <Input
                id="platformName"
                data-testid="input-platform-name"
                value={formData.platformName}
                onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                placeholder="Название платформы"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Email поддержки</Label>
              <Input
                id="supportEmail"
                type="email"
                data-testid="input-support-email"
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                placeholder="support@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="supportPhone">Телефон поддержки</Label>
              <Input
                id="supportPhone"
                data-testid="input-support-phone"
                value={formData.supportPhone}
                onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                placeholder="+7 999 123-45-67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportTelegram">Telegram поддержки</Label>
              <Input
                id="supportTelegram"
                data-testid="input-support-telegram"
                value={formData.supportTelegram}
                onChange={(e) => setFormData({ ...formData, supportTelegram: e.target.value })}
                placeholder="@support"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platformDescription">Описание платформы</Label>
            <Input
              id="platformDescription"
              data-testid="input-platform-description"
              value={formData.platformDescription}
              onChange={(e) => setFormData({ ...formData, platformDescription: e.target.value })}
              placeholder="SaaS платформа для партнёрского трекинга"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="copyrightText">Текст копирайта</Label>
            <Input
              id="copyrightText"
              data-testid="input-copyright-text"
              value={formData.copyrightText}
              onChange={(e) => setFormData({ ...formData, copyrightText: e.target.value })}
              placeholder="© 2025 Название. Все права защищены."
            />
          </div>

          <div className="space-y-4">
            <Label>Логотип платформы</Label>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {formData.platformLogoUrl ? (
                  <img 
                    src={formData.platformLogoUrl} 
                    alt="Логотип" 
                    className="w-24 h-24 object-contain border rounded-lg bg-muted p-2"
                    data-testid="img-platform-logo"
                  />
                ) : (
                  <div className="w-24 h-24 border rounded-lg bg-muted flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Input
                    id="platformLogoUrl"
                    data-testid="input-platform-logo"
                    value={formData.platformLogoUrl}
                    onChange={(e) => setFormData({ ...formData, platformLogoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                      data-testid="input-logo-file"
                    />
                    <Button type="button" variant="outline" disabled={isUploadingLogo} asChild>
                      <span>
                        {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </span>
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Вставьте URL или загрузите файл с компьютера (PNG, JPG, SVG)</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platformFaviconUrl">URL фавикона</Label>
            <Input
              id="platformFaviconUrl"
              data-testid="input-platform-favicon"
              value={formData.platformFaviconUrl}
              onChange={(e) => setFormData({ ...formData, platformFaviconUrl: e.target.value })}
              placeholder="https://example.com/favicon.ico"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultBotToken">Telegram бот платформы</Label>
            <div className="relative">
              <Input
                id="defaultBotToken"
                type={showBotToken ? "text" : "password"}
                data-testid="input-default-bot-token"
                value={formData.defaultTelegramBotToken}
                onChange={(e) => setFormData({ ...formData, defaultTelegramBotToken: e.target.value })}
                placeholder="Токен бота для системных уведомлений"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowBotToken(!showBotToken)}
              >
                {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Бот для отправки системных уведомлений платформы
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Регистрация пользователей
          </CardTitle>
          <CardDescription>Управление регистрацией на платформе</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "allowPublisherRegistration", label: "Разрешить регистрацию партнёров", description: "Партнёры могут регистрироваться самостоятельно" },
            { key: "allowAdvertiserRegistration", label: "Разрешить регистрацию рекламодателей", description: "Рекламодатели могут подавать заявки на регистрацию" },
            { key: "requireAdvertiserApproval", label: "Требовать одобрение рекламодателей", description: "Новые рекламодатели ожидают одобрения администратора" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.description}</div>
              </div>
              <Switch
                checked={(formData as any)[item.key]}
                onCheckedChange={(checked) => setFormData({ ...formData, [item.key]: checked })}
                data-testid={`switch-${item.key}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Глобальные настройки антифрода
          </CardTitle>
          <CardDescription>Настройки защиты от мошенничества для всей платформы</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "enableProxyDetection", label: "Детекция прокси", description: "Определять трафик через прокси-серверы" },
            { key: "enableVpnDetection", label: "Детекция VPN", description: "Определять трафик через VPN" },
            { key: "enableFingerprintTracking", label: "Трекинг отпечатков", description: "Собирать fingerprint устройств" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.description}</div>
              </div>
              <Switch
                checked={(formData as any)[item.key]}
                onCheckedChange={(checked) => setFormData({ ...formData, [item.key]: checked })}
                data-testid={`switch-${item.key}`}
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="maxFraudScore">Максимальный fraud score</Label>
            <div className="flex items-center gap-4">
              <Input
                id="maxFraudScore"
                type="number"
                min={0}
                max={100}
                data-testid="input-max-fraud-score"
                value={formData.maxFraudScore}
                onChange={(e) => setFormData({ ...formData, maxFraudScore: parseInt(e.target.value) || 70 })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                Конверсии с fraud score выше этого значения будут отклоняться автоматически
              </span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ipinfoToken">IPinfo.io API Token</Label>
              <CardDescription className="text-xs">Токен для определения геолокации, ISP, ASN, прокси/VPN детекции</CardDescription>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="ipinfoToken"
                    type={showIpinfoToken ? "text" : "password"}
                    placeholder={settings?.ipinfoToken ? "***configured***" : "Введите токен ipinfo.io"}
                    value={formData.ipinfoToken}
                    onChange={(e) => setFormData({ ...formData, ipinfoToken: e.target.value })}
                    data-testid="input-ipinfo-token"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowIpinfoToken(!showIpinfoToken)}
                    data-testid="button-toggle-ipinfo-token"
                  >
                    {showIpinfoToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {settings?.ipinfoToken && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Токен настроен
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fingerprintjsApiKey">FingerprintJS API Key (опционально)</Label>
              <CardDescription className="text-xs">Для Pro версии FingerprintJS. Оставьте пустым для open-source версии</CardDescription>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="fingerprintjsApiKey"
                    type={showFingerprintKey ? "text" : "password"}
                    placeholder={settings?.fingerprintjsApiKey ? "***configured***" : "Введите API ключ (опционально)"}
                    value={formData.fingerprintjsApiKey}
                    onChange={(e) => setFormData({ ...formData, fingerprintjsApiKey: e.target.value })}
                    data-testid="input-fingerprintjs-key"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowFingerprintKey(!showFingerprintKey)}
                    data-testid="button-toggle-fingerprintjs-key"
                  >
                    {showFingerprintKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {settings?.fingerprintjsApiKey && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> API ключ настроен (Pro версия)
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Cloudflare SSL for SaaS
          </CardTitle>
          <CardDescription>Автоматические SSL сертификаты для кастомных доменов рекламодателей</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cloudflareZoneId">Zone ID</Label>
              <Input
                id="cloudflareZoneId"
                placeholder="Найдите в Cloudflare Dashboard → Overview"
                value={formData.cloudflareZoneId}
                onChange={(e) => setFormData({ ...formData, cloudflareZoneId: e.target.value })}
                data-testid="input-cloudflare-zone-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloudflareApiToken">API Token</Label>
              <div className="relative">
                <Input
                  id="cloudflareApiToken"
                  type={showCloudflareToken ? "text" : "password"}
                  placeholder={settings?.cloudflareApiToken ? "***configured***" : "Создайте в Profile → API Tokens"}
                  value={formData.cloudflareApiToken}
                  onChange={(e) => setFormData({ ...formData, cloudflareApiToken: e.target.value })}
                  data-testid="input-cloudflare-api-token"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCloudflareToken(!showCloudflareToken)}
                >
                  {showCloudflareToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cloudflareFallbackOrigin">Fallback Origin</Label>
              <Input
                id="cloudflareFallbackOrigin"
                placeholder="tracking.example.com"
                value={formData.cloudflareFallbackOrigin}
                onChange={(e) => setFormData({ ...formData, cloudflareFallbackOrigin: e.target.value })}
                data-testid="input-cloudflare-fallback-origin"
              />
              <p className="text-xs text-muted-foreground">Домен вашего трекинга на Replit</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloudflareCnameTarget">CNAME Target</Label>
              <Input
                id="cloudflareCnameTarget"
                placeholder="customers.example.com"
                value={formData.cloudflareCnameTarget}
                onChange={(e) => setFormData({ ...formData, cloudflareCnameTarget: e.target.value })}
                data-testid="input-cloudflare-cname-target"
              />
              <p className="text-xs text-muted-foreground">Куда рекламодатели будут направлять CNAME</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Worker Routing (для кастомных доменов)</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Настройка автоматической привязки кастомных доменов к Cloudflare Worker
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cloudflareAccountId">Account ID</Label>
                <Input
                  id="cloudflareAccountId"
                  placeholder="Найдите в Dashboard → Overview"
                  value={formData.cloudflareAccountId}
                  onChange={(e) => setFormData({ ...formData, cloudflareAccountId: e.target.value })}
                  data-testid="input-cloudflare-account-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cloudflareWorkerName">Worker Name</Label>
                <Input
                  id="cloudflareWorkerName"
                  placeholder="primetrack-proxy"
                  value={formData.cloudflareWorkerName}
                  onChange={(e) => setFormData({ ...formData, cloudflareWorkerName: e.target.value })}
                  data-testid="input-cloudflare-worker-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cloudflareWorkerEnvironment">Environment</Label>
                <Input
                  id="cloudflareWorkerEnvironment"
                  placeholder="production"
                  value={formData.cloudflareWorkerEnvironment}
                  onChange={(e) => setFormData({ ...formData, cloudflareWorkerEnvironment: e.target.value })}
                  data-testid="input-cloudflare-worker-environment"
                />
              </div>
            </div>
          </div>

          {settings?.cloudflareZoneId && settings?.cloudflareApiToken && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Cloudflare настроен. Рекламодатели могут добавлять кастомные домены.
              </p>
            </div>
          )}

          {(!settings?.cloudflareZoneId || !settings?.cloudflareApiToken) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Заполните Zone ID и API Token для включения автоматических SSL сертификатов
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CryptoWalletsSettings />

      <Button 
        onClick={() => updateMutation.mutate(formData)} 
        disabled={updateMutation.isPending}
        className="w-full"
        data-testid="button-save-platform"
      >
        {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Сохранить все настройки платформы
      </Button>
    </div>
  );
}

function CryptoWalletsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    btcWallet: "",
    ethWallet: "",
    usdtTrc20Wallet: "",
    usdtErc20Wallet: "",
  });

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/crypto-wallets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/crypto-wallets", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        btcWallet: settings.btcWallet || "",
        ethWallet: settings.ethWallet || "",
        usdtTrc20Wallet: settings.usdtTrc20Wallet || "",
        usdtErc20Wallet: settings.usdtErc20Wallet || "",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/admin/crypto-wallets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crypto-wallets"] });
      toast({ title: "Крипто-кошельки сохранены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Card><CardContent className="py-8"><div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Крипто-кошельки для оплаты
        </CardTitle>
        <CardDescription>Адреса кошельков для приёма оплаты подписок от рекламодателей</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="btcWallet">Bitcoin (BTC)</Label>
            <Input
              id="btcWallet"
              value={formData.btcWallet}
              onChange={(e) => setFormData({ ...formData, btcWallet: e.target.value })}
              placeholder="bc1q..."
              data-testid="input-btc-wallet"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ethWallet">Ethereum (ETH)</Label>
            <Input
              id="ethWallet"
              value={formData.ethWallet}
              onChange={(e) => setFormData({ ...formData, ethWallet: e.target.value })}
              placeholder="0x..."
              data-testid="input-eth-wallet"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usdtTrc20Wallet">USDT (TRC-20)</Label>
            <Input
              id="usdtTrc20Wallet"
              value={formData.usdtTrc20Wallet}
              onChange={(e) => setFormData({ ...formData, usdtTrc20Wallet: e.target.value })}
              placeholder="T..."
              data-testid="input-usdt-trc20-wallet"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usdtErc20Wallet">USDT (ERC-20)</Label>
            <Input
              id="usdtErc20Wallet"
              value={formData.usdtErc20Wallet}
              onChange={(e) => setFormData({ ...formData, usdtErc20Wallet: e.target.value })}
              placeholder="0x..."
              data-testid="input-usdt-erc20-wallet"
            />
          </div>
        </div>

        <Button 
          onClick={() => updateMutation.mutate(formData)} 
          disabled={updateMutation.isPending}
          data-testid="button-save-crypto-wallets"
        >
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Сохранить кошельки
        </Button>
      </CardContent>
    </Card>
  );
}

function MigrationTab() {
  const { toast } = useToast();
  const [selectedTracker, setSelectedTracker] = useState<string>("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [advertiserId, setAdvertiserId] = useState("");
  const [importOffers, setImportOffers] = useState(true);
  const [importPublishers, setImportPublishers] = useState(true);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const { data: trackers } = useQuery<any[]>({
    queryKey: ["/api/admin/migration/trackers"],
  });

  const { data: advertisers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    select: (data) => data?.filter((u: any) => u.role === "advertiser"),
  });

  const migrationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/migration/import", data),
    onSuccess: (result: any) => {
      setMigrationResult(result);
      if (result.success) {
        toast({
          title: "Миграция завершена",
          description: `Импортировано: ${result.offersImported} офферов, ${result.publishersImported} партнёров`,
        });
      } else {
        toast({
          title: "Миграция завершена с ошибками",
          description: `Ошибок: ${result.errors?.length || 0}`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка миграции",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMigrate = () => {
    if (!selectedTracker || !apiUrl || !apiKey || !advertiserId) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    migrationMutation.mutate({
      tracker: selectedTracker,
      apiUrl,
      apiKey,
      advertiserId,
      options: { importOffers, importPublishers },
    });
  };

  const selectedTrackerInfo = trackers?.find((t) => t.id === selectedTracker);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Миграция данных
          </CardTitle>
          <CardDescription>
            Импорт офферов и партнёров из других трекинговых платформ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Исходная платформа</Label>
              <Select value={selectedTracker} onValueChange={setSelectedTracker}>
                <SelectTrigger data-testid="select-tracker">
                  <SelectValue placeholder="Выберите платформу" />
                </SelectTrigger>
                <SelectContent>
                  {trackers?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Рекламодатель-получатель</Label>
              <Select value={advertiserId} onValueChange={setAdvertiserId}>
                <SelectTrigger data-testid="select-advertiser">
                  <SelectValue placeholder="Выберите рекламодателя" />
                </SelectTrigger>
                <SelectContent>
                  {advertisers?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.username} ({a.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTrackerInfo && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">{selectedTrackerInfo.name}</p>
              <p className="text-sm text-muted-foreground">{selectedTrackerInfo.apiKeyHelp}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="apiUrl">API URL</Label>
            <Input
              id="apiUrl"
              placeholder={selectedTrackerInfo?.apiUrlPlaceholder || "https://api.tracker.com"}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              data-testid="input-api-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API ключ</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-api-key"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base">Что импортировать</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="importOffers"
                  checked={importOffers}
                  onCheckedChange={(checked) => setImportOffers(checked as boolean)}
                  data-testid="checkbox-import-offers"
                />
                <label htmlFor="importOffers" className="text-sm font-medium cursor-pointer">
                  Офферы
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="importPublishers"
                  checked={importPublishers}
                  onCheckedChange={(checked) => setImportPublishers(checked as boolean)}
                  data-testid="checkbox-import-publishers"
                />
                <label htmlFor="importPublishers" className="text-sm font-medium cursor-pointer">
                  Партнёры (аффилиаты)
                </label>
              </div>
            </div>
          </div>

          <Button
            onClick={handleMigrate}
            disabled={migrationMutation.isPending || !selectedTracker || !apiUrl || !apiKey || !advertiserId}
            className="w-full"
            data-testid="button-start-migration"
          >
            {migrationMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Импортируем данные...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Начать миграцию
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {migrationResult && (
        <Card className={migrationResult.success ? "border-green-500" : "border-destructive"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {migrationResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              Результат миграции
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold" data-testid="text-offers-imported">
                  {migrationResult.offersImported}
                </div>
                <div className="text-sm text-muted-foreground">Офферов импортировано</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold" data-testid="text-publishers-imported">
                  {migrationResult.publishersImported}
                </div>
                <div className="text-sm text-muted-foreground">Партнёров импортировано</div>
              </div>
            </div>

            {migrationResult.errors?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-destructive">Ошибки ({migrationResult.errors.length})</Label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {migrationResult.errors.map((err: string, i: number) => (
                    <div key={i} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Поддерживаемые платформы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[
              { name: "Scaleo", color: "bg-blue-500" },
              { name: "Affilka", color: "bg-purple-500" },
              { name: "Affise", color: "bg-orange-500" },
              { name: "Voluum", color: "bg-green-500" },
              { name: "Keitaro", color: "bg-red-500" },
            ].map((platform) => (
              <div key={platform.name} className="flex items-center gap-2 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                <span className="text-sm font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
