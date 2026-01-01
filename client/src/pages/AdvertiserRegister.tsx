import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Mail, Lock, Building, Phone, MessageCircle, ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const CONTACT_TYPES = [
  { value: "telegram", label: "Telegram", icon: "💬" },
  { value: "whatsapp", label: "WhatsApp", icon: "📱" },
  { value: "viber", label: "Viber", icon: "📞" },
];

export default function AdvertiserRegister() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    companyName: "",
    phone: "",
    contactType: "",
    contactValue: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/auth/register/advertiser", {
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        companyName: data.companyName,
        phone: data.phone,
        contactType: data.contactType,
        contactValue: data.contactValue,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowSuccess(true);
    },
    onError: (error: Error) => {
      setError(error.message || "Ошибка регистрации");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const requiredFields = [
      { key: "fullName", label: "Имя" },
      { key: "username", label: "Логин" },
      { key: "email", label: "Email" },
      { key: "companyName", label: "Компания" },
      { key: "phone", label: "Телефон" },
      { key: "contactType", label: "Тип контакта" },
      { key: "contactValue", label: "Контакт" },
      { key: "password", label: "Пароль" },
      { key: "confirmPassword", label: "Подтверждение пароля" },
    ];

    for (const field of requiredFields) {
      if (!formData[field.key as keyof typeof formData]) {
        setError(`Поле "${field.label}" обязательно для заполнения`);
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (formData.password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }

    registerMutation.mutate(formData);
  };

  const getContactPlaceholder = () => {
    switch (formData.contactType) {
      case "telegram": return "@username или номер";
      case "whatsapp": return "+7 999 123-45-67";
      case "viber": return "+7 999 123-45-67";
      default: return "Введите контакт";
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-emerald-500 opacity-20 blur-[120px]" />

        <Card className="w-full max-w-md bg-card border-border relative z-10 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />
          <CardHeader className="text-center pt-8">
            <div className="relative mx-auto mb-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto animate-pulse">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Заявка отправлена!
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base mt-2">
              Спасибо за регистрацию
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 text-center pb-8">
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/20">
              <p className="text-lg text-foreground">
                Спасибо за регистрацию!
              </p>
              <p className="text-muted-foreground mt-2">
                С вами свяжется менеджер в течение <span className="text-emerald-500 font-semibold">24 часов</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Заявка на рассмотрении</span>
            </div>

            <Button
              onClick={() => setLocation("/login")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
              data-testid="button-go-to-login"
            >
              Перейти ко входу
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-10 blur-[100px]" />

      <Card className="w-full max-w-lg bg-card border-border relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">Регистрация рекламодателя</CardTitle>
          <CardDescription className="text-muted-foreground">
            Создайте аккаунт для управления офферами
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-muted-foreground">Имя *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    data-testid="input-fullname"
                    type="text"
                    placeholder="Ваше имя"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-muted-foreground">Логин *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    data-testid="input-username"
                    type="text"
                    placeholder="Логин для входа"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-muted-foreground">Компания *</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="companyName"
                  data-testid="input-company"
                  type="text"
                  placeholder="Название компании"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-muted-foreground">Телефон *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  data-testid="input-phone"
                  type="tel"
                  placeholder="+7 999 123-45-67"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Мессенджер *</Label>
                <Select
                  value={formData.contactType}
                  onValueChange={(value) => setFormData({ ...formData, contactType: value })}
                >
                  <SelectTrigger data-testid="select-contact-type" className="bg-muted border-border">
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactValue" className="text-muted-foreground">Контакт *</Label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contactValue"
                    data-testid="input-contact-value"
                    type="text"
                    placeholder={getContactPlaceholder()}
                    value={formData.contactValue}
                    onChange={(e) => setFormData({ ...formData, contactValue: e.target.value })}
                    className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground">Пароль *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    data-testid="input-password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground">Подтверждение *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    data-testid="input-confirm-password"
                    type="password"
                    placeholder="Повторите пароль"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-register"
              disabled={registerMutation.isPending}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-foreground font-medium"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Регистрация...
                </>
              ) : (
                "Зарегистрироваться"
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <button
              onClick={() => setLocation("/login")}
              className="text-emerald-400 hover:text-emerald-300"
              data-testid="link-login"
            >
              Войти
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto"
              data-testid="link-home"
            >
              <ArrowLeft className="w-4 h-4" />
              На главную
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
