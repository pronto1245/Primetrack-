import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, User, Lock, Mail, ArrowLeft, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useBranding } from "@/contexts/BrandingContext";

interface PlatformSettings {
  platformName?: string;
  platformLogoUrl?: string;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { branding } = useBranding();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const { data: platformSettings } = useQuery<PlatformSettings>({
    queryKey: ["/api/public/platform-settings"],
    staleTime: 5 * 60 * 1000,
  });

  const displayLogo = branding.isWhiteLabel ? branding.logoUrl : platformSettings?.platformLogoUrl;
  const displayName = branding.isWhiteLabel ? branding.brandName : (platformSettings?.platformName || "Вход в систему");
  const displayDescription = branding.isWhiteLabel ? "Вход в партнёрский кабинет" : "Введите данные для входа";

  const loginMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requires2FA) {
        setRequires2FA(true);
        setError("");
        return;
      }
      // Redirect to 2FA setup if user never configured it
      if (data.needsSetup2FA) {
        setLocation("/setup-2fa");
        return;
      }
      if (data.role === "admin") {
        setLocation("/dashboard/admin");
      } else if (data.role === "advertiser") {
        setLocation("/dashboard/advertiser");
      } else {
        setLocation("/dashboard/publisher");
      }
    },
    onError: (error: Error) => {
      setError(error.message || "Ошибка входа");
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest("POST", "/api/auth/verify-2fa", { token });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.role === "admin") {
        setLocation("/dashboard/admin");
      } else if (data.role === "advertiser") {
        setLocation("/dashboard/advertiser");
      } else {
        setLocation("/dashboard/publisher");
      }
    },
    onError: (error: Error) => {
      setError(error.message || "Неверный код");
      setTotpCode("");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
    },
    onError: (error: Error) => {
      setError(error.message || "Ошибка отправки");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.username || !formData.password) {
      setError("Заполните все поля");
      return;
    }
    loginMutation.mutate(formData);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!resetEmail) {
      setError("Введите email");
      return;
    }
    resetPasswordMutation.mutate(resetEmail);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-10 blur-[100px]" />

      <Card className="w-full max-w-md bg-card border-border relative z-10">
        <CardHeader className="text-center">
          {displayLogo && (
            <img 
              src={displayLogo} 
              alt={displayName} 
              className="h-16 w-auto mx-auto mb-4 object-contain"
              data-testid="img-brand-logo"
            />
          )}
          <CardTitle className="text-2xl font-bold text-foreground" data-testid="text-brand-name">
            {displayName}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {displayDescription}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {requires2FA ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-foreground font-medium mb-2">Двухфакторная аутентификация</p>
                <p className="text-sm text-muted-foreground">
                  Введите код из приложения аутентификатора
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={(value) => setTotpCode(value)}
                  data-testid="input-2fa-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={() => verify2FAMutation.mutate(totpCode)}
                disabled={totpCode.length !== 6 || verify2FAMutation.isPending}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-foreground font-medium"
                data-testid="button-verify-2fa"
              >
                {verify2FAMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  "Подтвердить"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTotpCode("");
                  setError("");
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Назад к входу
              </button>
            </div>
          ) : (
          <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground">Логин</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  placeholder="Введите логин"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="Введите пароль"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-emerald-400 hover:text-emerald-300"
                data-testid="link-forgot-password"
              >
                Забыли пароль?
              </button>
            </div>

            <Button
              type="submit"
              data-testid="button-login"
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-foreground font-medium"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">или</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full border-border hover:bg-muted"
              onClick={() => setLocation("/register/advertiser")}
              data-testid="link-register-advertiser"
            >
              Регистрация рекламодателя
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Для регистрации партнера нужна ссылка от рекламодателя
            </p>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <button
              onClick={() => setLocation("/")}
              className="text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 mx-auto"
              data-testid="link-home"
            >
              <ArrowLeft className="w-4 h-4" />
              На главную
            </button>
          </div>
          </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Восстановление пароля</DialogTitle>
            <DialogDescription>
              Введите email для получения инструкций
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-foreground font-medium mb-2">Письмо отправлено!</p>
              <p className="text-sm text-muted-foreground">
                Проверьте почту и следуйте инструкциям
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSuccess(false);
                  setResetEmail("");
                }}
              >
                Закрыть
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  data-testid="input-reset-email"
                  type="email"
                  placeholder="Введите email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetPasswordMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Отправить"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
