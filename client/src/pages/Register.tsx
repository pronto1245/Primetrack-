import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, User, Mail, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Register() {
  const [, setLocation] = useLocation();
  const params = useParams<{ ref?: string }>();
  const searchParams = new URLSearchParams(window.location.search);
  const referralCode = params.ref || searchParams.get("ref") || "";
  const advertiserId = searchParams.get("adv") || "";

  // Redirect to full publisher registration form when referral code is present
  useEffect(() => {
    if (referralCode) {
      // Redirect to /register/:ref with adv param if present
      const redirectUrl = advertiserId 
        ? `/register/${referralCode}?adv=${advertiserId}`
        : `/register/${referralCode}`;
      setLocation(redirectUrl);
    }
  }, [referralCode, advertiserId, setLocation]);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const { data: referralData, isLoading: isValidating } = useQuery({
    queryKey: ["validate-referral", referralCode, advertiserId],
    queryFn: async () => {
      if (!referralCode) return null;
      const url = advertiserId 
        ? `/api/auth/validate-referral/${referralCode}?adv=${advertiserId}`
        : `/api/auth/validate-referral/${referralCode}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!referralCode,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData & { referralCode?: string; advertiserId?: string; referrerId?: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", {
        username: data.username,
        email: data.email,
        password: data.password,
        referralCode: data.referralCode,
        advertiserId: data.advertiserId,
        referrerId: data.referrerId,
      });
      return response.json();
    },
    onSuccess: () => {
      setLocation("/dashboard/publisher");
    },
    onError: (error: Error) => {
      setError(error.message || "Registration failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.email || !formData.password) {
      setError("All fields are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    registerMutation.mutate({
      ...formData,
      referralCode: referralCode || undefined,
      advertiserId: referralData?.advertiserId || undefined,
      referrerId: referralData?.referrerId || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-10 blur-[100px]" />

      <Card className="w-full max-w-md bg-card border-border relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">Create Account</CardTitle>
          <CardDescription className="text-muted-foreground">
            Register as a publisher to start earning
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {referralCode && (
            <div className="p-4 rounded-lg border border-border bg-muted">
              {isValidating ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Проверка реферальной ссылки...</span>
                </div>
              ) : referralData?.valid ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Рекламодатель: <strong>{referralData.advertiserName}</strong></span>
                  </div>
                  {referralData.type === "publisher" && referralData.referrerName && (
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <User className="w-3 h-3" />
                      <span>Приглашает: <strong>{referralData.referrerName}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span>Недействительная реферальная ссылка</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  data-testid="input-confirm-password"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-register"
              disabled={registerMutation.isPending || (!!referralCode && !referralData?.valid)}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-foreground font-medium"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => setLocation("/")}
              className="text-emerald-400 hover:text-emerald-300"
              data-testid="link-login"
            >
              Sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
