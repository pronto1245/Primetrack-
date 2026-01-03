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
  User, Lock, Bell, Palette, Database, Loader2, Save, Eye, EyeOff,
  Send, MessageSquare, Mail, Globe, Upload, Shield, Key, AlertCircle,
  CheckCircle2, Copy, ExternalLink, Webhook, Fingerprint, CreditCard, Clock, TestTube2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WebhooksSettings } from "./WebhooksSettings";
import { CustomDomainsSettings } from "./CustomDomainsSettings";
import { E2ETestPanel } from "./E2ETestPanel";

export function AdvertiserSettings() {
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
        <TabsList className="grid w-full grid-cols-9 gap-1">
          <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white" data-testid="tab-profile">
            <User className="h-4 w-4" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-white" data-testid="tab-subscription">
            <CreditCard className="h-4 w-4" />
            Подписка
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white" data-testid="tab-security">
            <Lock className="h-4 w-4" />
            Безопасность
          </TabsTrigger>
          <TabsTrigger value="whitelabel" className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white" data-testid="tab-whitelabel">
            <Palette className="h-4 w-4" />
            White-label
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white" data-testid="tab-domains">
            <Globe className="h-4 w-4" />
            Домены
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white" data-testid="tab-notifications">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2 data-[state=active]:bg-teal-500 data-[state=active]:text-white" data-testid="tab-webhooks">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white" data-testid="tab-testing">
            <TestTube2 className="h-4 w-4" />
            Тесты
          </TabsTrigger>
          <TabsTrigger value="migration" className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white" data-testid="tab-migration">
            <Database className="h-4 w-4" />
            Миграция
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="whitelabel">
          <WhiteLabelTab />
        </TabsContent>
        <TabsContent value="domains">
          <CustomDomainsSettings />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
        <TabsContent value="testing">
          <E2ETestPanel />
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
    companyName: "",
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
        companyName: user.companyName || "",
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
          Профиль компании
        </CardTitle>
        <CardDescription>Информация о вашей компании, видимая партнёрам</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Название компании</Label>
            <Input
              id="companyName"
              data-testid="input-company-name"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Моя компания"
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
              placeholder="contact@company.com"
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
          <Label htmlFor="logoUrl">Логотип</Label>
          <div className="flex gap-2">
            <Input
              id="logoUrl"
              data-testid="input-logo-url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="flex-1"
            />
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-logo-file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const res = await fetch("/api/uploads/request-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                    });
                    const { uploadURL, objectPath } = await res.json();
                    await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
                    const logoUrl = window.location.origin + objectPath;
                    setFormData({ ...formData, logoUrl });
                  } catch (err) {
                    console.error("Upload failed:", err);
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" className="pointer-events-none">
                <Upload className="w-4 h-4 mr-1" />
                Загрузить
              </Button>
            </div>
          </div>
          {formData.logoUrl && (
            <div className="mt-2">
              <img src={formData.logoUrl} alt="Logo preview" className="h-16 w-16 object-contain border rounded" />
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

function WhiteLabelTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    brandName: "",
    logoUrl: "",
    primaryColor: "#3b82f6",
    hidePlatformBranding: false,
  });

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/advertiser/settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        brandName: settings.brandName || "",
        logoUrl: settings.logoUrl || "",
        primaryColor: settings.primaryColor || "#3b82f6",
        hidePlatformBranding: settings.hidePlatformBranding || false,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/advertiser/settings/whitelabel", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/settings"] });
      toast({ title: "White-label настройки сохранены" });
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
          <Palette className="h-5 w-5" />
          White-label настройки
        </CardTitle>
        <CardDescription>Настройте брендинг для ваших партнёров</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="brandName">Название бренда</Label>
            <Input
              id="brandName"
              data-testid="input-brand-name"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              placeholder="Ваш бренд"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Основной цвет</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                data-testid="input-primary-color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wlLogoUrl">Логотип бренда</Label>
          <div className="flex gap-2">
            <Input
              id="wlLogoUrl"
              data-testid="input-wl-logo-url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="flex-1"
            />
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-wl-logo-file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const res = await fetch("/api/uploads/request-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                    });
                    const { uploadURL, objectPath } = await res.json();
                    await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
                    const logoUrl = window.location.origin + objectPath;
                    setFormData({ ...formData, logoUrl });
                  } catch (err) {
                    console.error("Upload failed:", err);
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" className="pointer-events-none">
                <Upload className="w-4 h-4 mr-1" />
                Загрузить
              </Button>
            </div>
          </div>
          {formData.logoUrl && (
            <div className="mt-2">
              <img src={formData.logoUrl} alt="Logo preview" className="h-16 w-16 object-contain border rounded" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <div className="font-medium">Скрыть брендинг платформы</div>
            <div className="text-sm text-muted-foreground">
              Партнёры будут видеть только ваш бренд
            </div>
          </div>
          <Switch
            checked={formData.hidePlatformBranding}
            onCheckedChange={(checked) => setFormData({ ...formData, hidePlatformBranding: checked })}
            data-testid="switch-hide-branding"
          />
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            <div className="font-medium">FingerprintJS интеграция</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Добавьте этот скрипт на ваш landing page для сбора fingerprint и улучшения антифрод аналитики.
            Скрипт автоматически добавит visitor_id к tracking ссылкам.
          </p>
          <div className="relative">
            <pre className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto max-h-48 whitespace-pre-wrap">
{`<!-- FingerprintJS Integration -->
<script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.min.js"></script>
<script>
(function() {
  var fpPromise = FingerprintJS.load();
  
  window.AffiliateTracker = {
    getVisitorId: function() {
      return fpPromise.then(function(fp) {
        return fp.get();
      }).then(function(result) {
        return {
          visitorId: result.visitorId,
          confidence: result.confidence.score
        };
      });
    },
    
    enhanceLinks: function() {
      var domain = '${window.location.host}';
      this.getVisitorId().then(function(data) {
        document.querySelectorAll('a[href*="' + domain + '"]').forEach(function(link) {
          var url = new URL(link.href);
          url.searchParams.set('visitor_id', data.visitorId);
          url.searchParams.set('fp_confidence', data.confidence.toString());
          link.href = url.toString();
        });
      });
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.AffiliateTracker.enhanceLinks();
    });
  } else {
    window.AffiliateTracker.enhanceLinks();
  }
})();
</script>`}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => {
                const script = document.querySelector('pre')?.textContent || '';
                navigator.clipboard.writeText(script);
                toast({ title: "Скрипт скопирован в буфер обмена" });
              }}
              data-testid="button-copy-fingerprint-script"
            >
              <Copy className="h-3 w-3 mr-1" />
              Копировать
            </Button>
          </div>
        </div>

        <Button 
          onClick={() => updateMutation.mutate(formData)} 
          disabled={updateMutation.isPending}
          data-testid="button-save-whitelabel"
        >
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Сохранить
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBotToken, setShowBotToken] = useState(false);
  const [telegramData, setTelegramData] = useState({
    telegramBotToken: "",
    telegramChatId: "",
    telegramNotifyLeads: true,
    telegramNotifySales: true,
    telegramNotifyPayouts: true,
    telegramNotifySystem: true,
  });
  const [emailData, setEmailData] = useState({
    emailNotifyLeads: true,
    emailNotifySales: true,
    emailNotifyPayouts: true,
    emailNotifySystem: true,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFromEmail: "",
    smtpFromName: "",
  });

  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/advertiser/settings"],
  });

  useEffect(() => {
    if (user) {
      setTelegramData({
        telegramBotToken: "",
        telegramChatId: user.telegramChatId || "",
        telegramNotifyLeads: user.telegramNotifyLeads ?? true,
        telegramNotifySales: user.telegramNotifySales ?? true,
        telegramNotifyPayouts: user.telegramNotifyPayouts ?? true,
        telegramNotifySystem: user.telegramNotifySystem ?? true,
      });
    }
  }, [user]);

  useEffect(() => {
    if (settings) {
      setEmailData({
        emailNotifyLeads: settings.emailNotifyLeads ?? true,
        emailNotifySales: settings.emailNotifySales ?? true,
        emailNotifyPayouts: settings.emailNotifyPayouts ?? true,
        emailNotifySystem: settings.emailNotifySystem ?? true,
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || "",
        smtpPassword: "",
        smtpFromEmail: settings.smtpFromEmail || "",
        smtpFromName: settings.smtpFromName || "",
      });
    }
  }, [settings]);

  const saveTelegramMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user/notifications/telegram", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Telegram уведомления настроены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const saveEmailMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/advertiser/settings/email", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/settings"] });
      toast({ title: "Email уведомления настроены" });
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
    <div className="space-y-6">
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
              <li>Укажите Chat ID ниже</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              По умолчанию используется бот <a href="https://t.me/primetrack_notify_bot" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@primetrack_notify_bot</a> платформы. Если хотите использовать своего бота — укажите его токен.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chatId">Chat ID <span className="text-red-500">*</span></Label>
              <Input
                id="chatId"
                data-testid="input-chat-id"
                value={telegramData.telegramChatId}
                onChange={(e) => setTelegramData({ ...telegramData, telegramChatId: e.target.value })}
                placeholder="123456789"
              />
              <p className="text-xs text-muted-foreground">Узнайте через @userinfobot в Telegram</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="botToken">Bot Token (опционально)</Label>
              <div className="relative">
                <Input
                  id="botToken"
                  type={showBotToken ? "text" : "password"}
                  data-testid="input-bot-token"
                  value={telegramData.telegramBotToken}
                  onChange={(e) => setTelegramData({ ...telegramData, telegramBotToken: e.target.value })}
                  placeholder="Оставьте пустым для использования бота платформы"
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
              <p className="text-xs text-muted-foreground">Укажите только если хотите использовать своего бота</p>
            </div>
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
              disabled={testTelegramMutation.isPending || !telegramData.telegramChatId}
              data-testid="button-test-telegram"
            >
              {testTelegramMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Тест
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email уведомления
          </CardTitle>
          <CardDescription>Настройте SMTP для отправки email уведомлений</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP хост</Label>
              <Input
                id="smtpHost"
                data-testid="input-smtp-host"
                value={emailData.smtpHost}
                onChange={(e) => setEmailData({ ...emailData, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP порт</Label>
              <Input
                id="smtpPort"
                type="number"
                data-testid="input-smtp-port"
                value={emailData.smtpPort}
                onChange={(e) => setEmailData({ ...emailData, smtpPort: parseInt(e.target.value) })}
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpUser">SMTP пользователь</Label>
              <Input
                id="smtpUser"
                data-testid="input-smtp-user"
                value={emailData.smtpUser}
                onChange={(e) => setEmailData({ ...emailData, smtpUser: e.target.value })}
                placeholder="user@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">SMTP пароль</Label>
              <Input
                id="smtpPassword"
                type="password"
                data-testid="input-smtp-password"
                value={emailData.smtpPassword}
                onChange={(e) => setEmailData({ ...emailData, smtpPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpFromEmail">Email отправителя</Label>
              <Input
                id="smtpFromEmail"
                type="email"
                data-testid="input-smtp-from-email"
                value={emailData.smtpFromEmail}
                onChange={(e) => setEmailData({ ...emailData, smtpFromEmail: e.target.value })}
                placeholder="noreply@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpFromName">Имя отправителя</Label>
              <Input
                id="smtpFromName"
                data-testid="input-smtp-from-name"
                value={emailData.smtpFromName}
                onChange={(e) => setEmailData({ ...emailData, smtpFromName: e.target.value })}
                placeholder="Моя компания"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Типы уведомлений</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "emailNotifyLeads", label: "Новые лиды" },
                { key: "emailNotifySales", label: "Продажи" },
                { key: "emailNotifyPayouts", label: "Выплаты" },
                { key: "emailNotifySystem", label: "Системные" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <span>{item.label}</span>
                  <Switch
                    checked={(emailData as any)[item.key]}
                    onCheckedChange={(checked) => setEmailData({ ...emailData, [item.key]: checked })}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => saveEmailMutation.mutate(emailData)} 
            disabled={saveEmailMutation.isPending}
            data-testid="button-save-email"
          >
            {saveEmailMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Сохранить
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MigrationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTracker, setSelectedTracker] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    apiUrl: "",
    apiKey: "",
    apiSecret: "",
    migrateOffers: true,
    migratePublishers: true,
    migrateClicks: false,
    migrateConversions: true,
  });

  const { data: migrations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/advertiser/migrations"],
  });

  const startMigrationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/advertiser/migrations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/migrations"] });
      setSelectedTracker(null);
      setFormData({
        apiUrl: "",
        apiKey: "",
        apiSecret: "",
        migrateOffers: true,
        migratePublishers: true,
        migrateClicks: false,
        migrateConversions: true,
      });
      toast({ title: "Миграция запущена" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const trackers = [
    { id: "scaleo", name: "Scaleo", logo: "📊", description: "Популярный трекер с широкими возможностями" },
    { id: "affilka", name: "Affilka", logo: "🎯", description: "Трекер для iGaming индустрии" },
    { id: "affise", name: "Affise", logo: "📈", description: "Enterprise решение для крупных сетей" },
    { id: "voluum", name: "Voluum", logo: "🚀", description: "Облачный трекер для арбитража" },
    { id: "keitaro", name: "Keitaro", logo: "⚡", description: "Self-hosted трекер с TDS" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Миграция данных
          </CardTitle>
          <CardDescription>Перенесите данные из других трекеров</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedTracker ? (
            <div className="grid grid-cols-2 gap-4">
              {trackers.map((tracker) => (
                <div
                  key={tracker.id}
                  className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                  onClick={() => setSelectedTracker(tracker.id)}
                  data-testid={`button-select-${tracker.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tracker.logo}</span>
                    <div>
                      <h4 className="font-medium">{tracker.name}</h4>
                      <p className="text-sm text-muted-foreground">{tracker.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <span className="text-2xl">{trackers.find(t => t.id === selectedTracker)?.logo}</span>
                <div>
                  <h4 className="font-medium">{trackers.find(t => t.id === selectedTracker)?.name}</h4>
                  <Button variant="link" className="p-0 h-auto" onClick={() => setSelectedTracker(null)}>
                    Выбрать другой трекер
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">API URL</Label>
                  <Input
                    id="apiUrl"
                    data-testid="input-migration-api-url"
                    value={formData.apiUrl}
                    onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                    placeholder="https://your-tracker.com/api"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    data-testid="input-migration-api-key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="your-api-key"
                  />
                </div>
              </div>

              {(selectedTracker === "affise" || selectedTracker === "keitaro") && (
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    data-testid="input-migration-api-secret"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    placeholder="your-api-secret"
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Что мигрировать</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "migrateOffers", label: "Офферы", description: "Названия, описания, GEO, выплаты" },
                    { key: "migratePublishers", label: "Партнёры", description: "Аккаунты и привязки к офферам" },
                    { key: "migrateConversions", label: "Конверсии", description: "Лиды, продажи, статусы" },
                    { key: "migrateClicks", label: "Клики", description: "История кликов (может занять время)" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Switch
                        checked={(formData as any)[item.key]}
                        onCheckedChange={(checked) => setFormData({ ...formData, [item.key]: checked })}
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
                  onClick={() => startMigrationMutation.mutate({ ...formData, sourceTracker: selectedTracker })} 
                  disabled={startMigrationMutation.isPending || !formData.apiUrl || !formData.apiKey}
                  data-testid="button-start-migration"
                >
                  {startMigrationMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                  Начать миграцию
                </Button>
                <Button variant="outline" onClick={() => setSelectedTracker(null)}>
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {migrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>История миграций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {migrations.map((migration: any) => (
                <div key={migration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{trackers.find(t => t.id === migration.sourceTracker)?.logo}</span>
                    <div>
                      <div className="font-medium">{trackers.find(t => t.id === migration.sourceTracker)?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(migration.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-right">
                      <div>{migration.processedRecords}/{migration.totalRecords} записей</div>
                      {migration.failedRecords > 0 && (
                        <div className="text-red-500">{migration.failedRecords} ошибок</div>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      migration.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                      migration.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                      migration.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {migration.status === 'completed' ? 'Завершено' :
                       migration.status === 'in_progress' ? 'В процессе' :
                       migration.status === 'failed' ? 'Ошибка' : 'Ожидание'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubscriptionTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [txHash, setTxHash] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USDT_TRC20");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const { data: subscriptionData, isLoading } = useQuery<any>({
    queryKey: ["/api/subscription/current"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/current", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
  });

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription/plans"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/plans", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: wallets } = useQuery<any>({
    queryKey: ["/api/subscription/wallets"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/wallets", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription/payments"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/payments", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { planId: string; currency: string; billingPeriod: "monthly" | "yearly" }) => {
      const res = await apiRequest("POST", "/api/subscription/pay", {
        planId: data.planId,
        billingCycle: data.billingPeriod,
        cryptoCurrency: data.currency,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/payments"] });
      toast({ title: "Платёж создан", description: "Переведите указанную сумму на кошелёк" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const submitTxMutation = useMutation({
    mutationFn: async (data: { paymentId: string; txHash: string }) => {
      return apiRequest("POST", "/api/subscription/verify", data);
    },
    onSuccess: () => {
      setTxHash("");
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/current"] });
      toast({ title: "Хеш отправлен", description: "Проверка транзакции началась" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const subscription = subscriptionData?.subscription;
  const currentPlan = subscriptionData?.plan;

  const getTimeRemaining = () => {
    if (!subscription) return null;
    let endDate: Date | null = null;
    
    if (subscription.status === "trial" && subscription.trialEndsAt) {
      endDate = new Date(subscription.trialEndsAt);
    } else if (subscription.status === "active" && subscription.currentPeriodEnd) {
      endDate = new Date(subscription.currentPeriodEnd);
    }
    
    if (!endDate) return null;
    
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return { days: 0, hours: 0, expired: true };
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days: diffDays, hours: diffHours, expired: false };
  };

  const time = getTimeRemaining();

  const pendingPayment = payments.find((p: any) => p.status === "pending");

  const currencies = [
    { id: "USDT_TRC20", name: "USDT (TRC-20)", wallet: wallets?.usdtTrc20 },
    { id: "USDT_ERC20", name: "USDT (ERC-20)", wallet: wallets?.usdtErc20 },
    { id: "BTC", name: "Bitcoin", wallet: wallets?.btc },
    { id: "ETH", name: "Ethereum", wallet: wallets?.eth },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Текущая подписка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.status === "trial" && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-500 font-medium mb-2">
                <Clock className="h-5 w-5" />
                Пробный период
              </div>
              <p className="text-sm text-muted-foreground">
                {time && !time.expired ? (
                  <>Осталось: <span className="font-bold text-foreground">{time.days} дней {time.hours} часов</span></>
                ) : (
                  <span className="text-red-500">Пробный период истёк</span>
                )}
              </p>
            </div>
          )}

          {subscription?.status === "active" && currentPlan && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-500 font-medium mb-2">
                <CheckCircle2 className="h-5 w-5" />
                Активная подписка: {currentPlan.name}
              </div>
              <p className="text-sm text-muted-foreground">
                {time && !time.expired ? (
                  <>Действует до: <span className="font-bold text-foreground">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span> ({time.days} дней)</>
                ) : (
                  <span className="text-red-500">Подписка истекла</span>
                )}
              </p>
            </div>
          )}

          {subscription?.status === "expired" && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-500 font-medium mb-2">
                <AlertCircle className="h-5 w-5" />
                Подписка истекла
              </div>
              <p className="text-sm text-muted-foreground">
                Выберите план и оплатите для продления доступа
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingPayment && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-yellow-500">Ожидающий платёж</CardTitle>
            <CardDescription>
              Переведите {pendingPayment.amount} {pendingPayment.currency} и отправьте хеш транзакции
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {pendingPayment.cryptoAddress}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(pendingPayment.cryptoAddress);
                toast({ title: "Адрес скопирован" });
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Скопировать адрес
            </Button>

            <Separator />

            <div className="space-y-2">
              <Label>Хеш транзакции (TxID)</Label>
              <Input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x... или другой формат хеша"
                data-testid="input-tx-hash"
              />
            </div>
            <Button
              onClick={() => submitTxMutation.mutate({ paymentId: pendingPayment.id, txHash })}
              disabled={!txHash || submitTxMutation.isPending}
              data-testid="button-submit-tx"
            >
              {submitTxMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Отправить хеш
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Тарифные планы</CardTitle>
              <CardDescription>Выберите подходящий план для вашего бизнеса</CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <Button
                variant={billingPeriod === "monthly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingPeriod("monthly")}
                data-testid="billing-monthly"
              >
                Месяц
              </Button>
              <Button
                variant={billingPeriod === "yearly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingPeriod("yearly")}
                className="relative"
                data-testid="billing-yearly"
              >
                Год
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  -15%
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan: any) => {
              const monthlyPrice = Number(plan.monthlyPrice) || Number(plan.price) || 0;
              const yearlyPrice = Number(plan.yearlyPrice) || monthlyPrice * 12 * 0.85;
              const displayPrice = billingPeriod === "yearly" 
                ? (yearlyPrice / 12).toFixed(2) 
                : monthlyPrice.toFixed(2);
              const totalYearlyPrice = yearlyPrice.toFixed(2);
              const savings = (monthlyPrice * 12 - yearlyPrice).toFixed(2);
              
              return (
                <div
                  key={plan.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all relative ${
                    selectedPlan === plan.id 
                      ? "border-emerald-500 bg-emerald-500/10" 
                      : "hover:border-muted-foreground"
                  } ${plan.isPopular || plan.is_popular ? "ring-2 ring-emerald-500" : ""}`}
                  onClick={() => setSelectedPlan(plan.id)}
                  data-testid={`plan-${plan.id}`}
                >
                  {(plan.isPopular || plan.is_popular) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                      Популярный
                    </div>
                  )}
                  <div className="font-bold text-lg mb-2">{plan.name}</div>
                  <div className="text-2xl font-bold text-emerald-500 mb-1">
                    ${displayPrice}
                    <span className="text-sm text-muted-foreground">/мес</span>
                  </div>
                  {billingPeriod === "yearly" && (
                    <div className="text-xs text-muted-foreground mb-2">
                      ${totalYearlyPrice} в год (экономия ${savings})
                    </div>
                  )}
                  {billingPeriod === "monthly" && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Оплата ежемесячно
                    </div>
                  )}
                  {plan.features && plan.features.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1 mt-3">
                      {plan.features.map((f: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {selectedPlan && !pendingPayment && (
            <div className="mt-6 p-4 bg-muted rounded-lg space-y-4">
              <div className="space-y-2">
                <Label>Способ оплаты</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {currencies.filter(c => c.wallet).map((c) => (
                    <Button
                      key={c.id}
                      variant={selectedCurrency === c.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCurrency(c.id)}
                      data-testid={`currency-${c.id}`}
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => createPaymentMutation.mutate({ planId: selectedPlan, currency: selectedCurrency, billingPeriod })}
                disabled={createPaymentMutation.isPending}
                className="w-full"
                data-testid="button-create-payment"
              >
                {createPaymentMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Оплатить {billingPeriod === "yearly" ? "за год" : "за месяц"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>История платежей</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{payment.amount} {payment.currency}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    payment.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                    payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    payment.status === 'verifying' ? 'bg-blue-500/20 text-blue-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {payment.status === 'completed' ? 'Оплачено' :
                     payment.status === 'pending' ? 'Ожидает' :
                     payment.status === 'verifying' ? 'Проверка' : 'Ошибка'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WebhooksTab() {
  return <WebhooksSettings />;
}
