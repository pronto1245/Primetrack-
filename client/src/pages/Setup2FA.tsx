import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, CheckCircle, Smartphone, Copy, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Setup2FA() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"intro" | "setup" | "verify">("intro");
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: user, isLoading, error: queryError } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  // Handle auth error - redirect to login
  useEffect(() => {
    if (queryError) {
      setLocation("/login");
    }
  }, [queryError, setLocation]);

  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/2fa/setup", {});
      return response.json();
    },
    onSuccess: (data) => {
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setStep("verify");
    },
    onError: (err: Error) => {
      setFormError(err.message || "Ошибка настройки 2FA");
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: async (data: { secret: string; token: string }) => {
      const response = await apiRequest("POST", "/api/user/2fa/enable", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Redirect to dashboard based on role
      if (user?.role === "admin") {
        setLocation("/dashboard/admin");
      } else if (user?.role === "advertiser") {
        setLocation("/dashboard/advertiser");
      } else {
        setLocation("/dashboard/publisher");
      }
    },
    onError: (err: Error) => {
      setFormError(err.message || "Неверный код подтверждения");
    },
  });

  const handleStartSetup = () => {
    setFormError("");
    setup2FAMutation.mutate();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!verificationCode || verificationCode.length !== 6) {
      setFormError("Введите 6-значный код");
      return;
    }
    enable2FAMutation.mutate({ secret, token: verificationCode });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // If 2FA already enabled, redirect
  if (user?.twoFactorEnabled) {
    if (user.role === "admin") {
      setLocation("/dashboard/admin");
    } else if (user.role === "advertiser") {
      setLocation("/dashboard/advertiser");
    } else {
      setLocation("/dashboard/publisher");
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-10 blur-[100px]" />

      <Card className="w-full max-w-md bg-card border-border relative z-10">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Настройка двухфакторной аутентификации
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Для безопасности вашего аккаунта необходимо настроить 2FA
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {step === "intro" && (
            <div className="space-y-6">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-500 font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Установите приложение</p>
                    <p className="text-sm text-muted-foreground">
                      Скачайте Google Authenticator, Authy или другое приложение для 2FA
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-500 font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Отсканируйте QR-код</p>
                    <p className="text-sm text-muted-foreground">
                      Откройте приложение и отсканируйте QR-код
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-500 font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Введите код</p>
                    <p className="text-sm text-muted-foreground">
                      Введите 6-значный код из приложения для подтверждения
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open("https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2", "_blank")}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Android
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open("https://apps.apple.com/app/google-authenticator/id388497605", "_blank")}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  iOS
                </Button>
              </div>

              <Button
                onClick={handleStartSetup}
                disabled={setup2FAMutation.isPending}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500"
                data-testid="button-start-2fa"
              >
                {setup2FAMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Настройка...
                  </>
                ) : (
                  "Начать настройку"
                )}
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Отсканируйте QR-код в приложении Google Authenticator
                </p>
                {qrCode && (
                  <div className="inline-block p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Или введите ключ вручную:</Label>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-sm bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                    data-testid="button-copy-secret"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-muted-foreground">
                    Введите 6-значный код из приложения
                  </Label>
                  <Input
                    id="code"
                    data-testid="input-2fa-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl font-mono tracking-widest bg-muted border-border"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={enable2FAMutation.isPending || verificationCode.length !== 6}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500"
                  data-testid="button-verify-2fa"
                >
                  {enable2FAMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Проверка...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Подтвердить и включить 2FA
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
