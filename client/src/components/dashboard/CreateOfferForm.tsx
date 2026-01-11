import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, Trash2, Globe, DollarSign, Tag, Link as LinkIcon, Smartphone, Megaphone, FileText, Upload, Image, Loader2, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useUpload } from "@/hooks/use-upload";
import { CountrySelector } from "./CountrySelector";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const TRAFFIC_SOURCES = ["Facebook", "Google", "TikTok", "UAC", "PPC", "Push", "Native", "Email", "SEO", "Telegram", "Instagram", "YouTube", "Snapchat", "X (Twitter)", "Pinterest", "LinkedIn", "Reddit", "PopUnder", "ClickUnder", "InApp", "SMS", "Viber", "WhatsApp", "ASO"];
const APP_TYPES = ["PWA", "WebView", "iOS App", "Android App", "APK", "Desktop"];
const PAYOUT_MODELS = ["CPA", "CPL", "CPI", "RevShare", "CPC", "CPM"];
const CATEGORIES = ["Gambling", "Betting", "Crypto", "Nutra", "Dating", "Finance", "Sweepstakes", "Gaming", "Utilities", "eCommerce"];

const TRAFFIC_SOURCE_COLORS: Record<string, string> = {
  "Facebook": "bg-blue-600",
  "Google": "bg-red-500",
  "TikTok": "bg-pink-500",
  "UAC": "bg-green-600",
  "PPC": "bg-orange-500",
  "Push": "bg-yellow-600",
  "Native": "bg-teal-500",
  "Email": "bg-indigo-500",
  "SEO": "bg-lime-600",
  "Telegram": "bg-sky-500",
  "Instagram": "bg-fuchsia-500",
  "YouTube": "bg-red-600",
  "Snapchat": "bg-yellow-400",
  "X (Twitter)": "bg-slate-600",
  "Pinterest": "bg-red-400",
  "LinkedIn": "bg-blue-700",
  "Reddit": "bg-orange-600",
  "PopUnder": "bg-purple-600",
  "ClickUnder": "bg-violet-500",
  "InApp": "bg-cyan-500",
  "SMS": "bg-emerald-500",
  "Viber": "bg-purple-500",
  "WhatsApp": "bg-green-500",
  "ASO": "bg-amber-500",
};

const APP_TYPE_COLORS: Record<string, string> = {
  "PWA": "bg-blue-500",
  "WebView": "bg-orange-500",
  "iOS App": "bg-slate-500",
  "Android App": "bg-green-600",
  "APK": "bg-lime-600",
  "Desktop": "bg-indigo-500",
};

interface Landing {
  id?: string; // ID для обновления существующих
  geo: string;
  landingName: string;
  landingUrl: string;
  partnerPayout: string;
  internalCost: string;
  currency: string;
  clickIdParam: string;
}

export function CreateOfferForm({ role }: { role: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Получить edit параметр из URL
  const searchParams = new URLSearchParams(window.location.search);
  const editOfferId = searchParams.get("edit");
  const isEditMode = !!editOfferId;

  // Загрузить данные оффера для редактирования
  const { data: offerData, isLoading: isLoadingOffer } = useQuery({
    queryKey: ["/api/offers", editOfferId],
    queryFn: async () => {
      const res = await fetch(`/api/offers/${editOfferId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch offer");
      return res.json();
    },
    enabled: isEditMode,
  });

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setFormData(prev => ({ ...prev, logoUrl: response.objectPath }));
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
    payoutModel: "CPA",
    category: "Gambling",
    currency: "USD",
    trafficSources: [] as string[],
    appTypes: [] as string[],
    creativeLinks: [""],
    geo: [] as string[],
    revSharePercent: "",
    holdPeriodDays: "0",
    isTop: false,
    isExclusive: false,
    isPrivate: false,
    dailyCap: "",
    monthlyCap: "",
    totalCap: "",
    capReachedAction: "block" as "block" | "redirect",
    capRedirectUrl: "",
  });

  const [landings, setLandings] = useState<Landing[]>([
    { geo: "", landingName: "", landingUrl: "", partnerPayout: "", internalCost: "", currency: "USD", clickIdParam: "click_id" }
  ]);

  // Сбросить isDataLoaded при смене editOfferId
  useEffect(() => {
    setIsDataLoaded(false);
  }, [editOfferId]);

  // Заполнить форму данными оффера при редактировании
  useEffect(() => {
    if (offerData && !isDataLoaded && isEditMode) {
      setFormData({
        name: offerData.name || "",
        description: offerData.description || "",
        logoUrl: offerData.logoUrl || "",
        payoutModel: offerData.payoutModel || "CPA",
        category: offerData.category || "Gambling",
        currency: offerData.currency || "USD",
        trafficSources: offerData.trafficSources || [],
        appTypes: offerData.appTypes || [],
        creativeLinks: offerData.creativeLinks?.length ? offerData.creativeLinks : [""],
        geo: offerData.geo || [],
        revSharePercent: offerData.revSharePercent?.toString() || "",
        holdPeriodDays: offerData.holdPeriodDays?.toString() || "0",
        isTop: offerData.isTop || false,
        isExclusive: offerData.isExclusive || false,
        isPrivate: offerData.isPrivate || false,
        dailyCap: offerData.dailyCap?.toString() || "",
        monthlyCap: offerData.monthlyCap?.toString() || "",
        totalCap: offerData.totalCap?.toString() || "",
        capReachedAction: offerData.capReachedAction || "block",
        capRedirectUrl: offerData.capRedirectUrl || "",
      });
      
      if (offerData.landings && offerData.landings.length > 0) {
        setLandings(offerData.landings.map((l: any) => ({
          id: l.id, // Сохраняем id для обновления
          geo: l.geo || "",
          landingName: l.landingName || "",
          landingUrl: l.landingUrl || "",
          partnerPayout: l.partnerPayout || "",
          internalCost: l.internalCost || "",
          currency: l.currency || "USD",
          clickIdParam: l.clickIdParam || "click_id",
        })));
      }
      setIsDataLoaded(true);
    }
  }, [offerData, isDataLoaded, isEditMode]);

  const toggleArrayItem = (field: "trafficSources" | "appTypes", item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const addLanding = () => {
    setLandings([...landings, { geo: "", landingName: "", landingUrl: "", partnerPayout: "", internalCost: "", currency: "USD", clickIdParam: "click_id" }]);
  };

  const removeLanding = (index: number) => {
    if (landings.length > 1) {
      setLandings(landings.filter((_, i) => i !== index));
    }
  };

  const updateLanding = (index: number, field: keyof Landing, value: string) => {
    const updated = [...landings];
    updated[index][field] = value;
    setLandings(updated);
  };

  const addCreativeLink = () => {
    setFormData(prev => ({ ...prev, creativeLinks: [...prev.creativeLinks, ""] }));
  };

  const removeCreativeLink = (index: number) => {
    if (formData.creativeLinks.length > 1) {
      setFormData(prev => ({
        ...prev,
        creativeLinks: prev.creativeLinks.filter((_, i) => i !== index)
      }));
    }
  };

  const updateCreativeLink = (index: number, value: string) => {
    const updated = [...formData.creativeLinks];
    updated[index] = value;
    setFormData(prev => ({ ...prev, creativeLinks: updated }));
  };

  const isFormValid = () => {
    const hasName = formData.name && formData.name.trim().length > 0;
    
    // Валидные лендинги - требуют только geo и url, payout опционален (будет "0")
    const validLandings = landings.filter(l => {
      const hasGeo = l.geo && l.geo.trim();
      const hasUrl = l.landingUrl && l.landingUrl.trim();
      return hasGeo && hasUrl;
    });
    
    return hasName && validLandings.length > 0;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    
    try {
      const geos = landings.map(l => l.geo).filter(g => g);
      
      const url = isEditMode ? `/api/offers/${editOfferId}` : "/api/offers";
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          geo: geos,
          creativeLinks: formData.creativeLinks.filter(l => l),
          landings: landings.filter(l => l.geo && l.landingUrl).map(l => ({
            ...l,
            partnerPayout: l.partnerPayout || "0",
          })),
        }),
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
        setLocation(`/dashboard/${role}/offers`);
      } else {
        const data = await response.json();
        setError(data.message || (isEditMode ? "Не удалось обновить оффер" : "Не удалось создать оффер"));
      }
    } catch {
      setError(isEditMode ? "Не удалось обновить оффер" : "Не удалось создать оффер");
    } finally {
      setLoading(false);
    }
  };

  // Показать loader при загрузке данных оффера
  if (isEditMode && isLoadingOffer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-muted-foreground">Загрузка данных оффера...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/${role}/offers`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground">
            {isEditMode ? "Редактировать оффер" : "Создать оффер"}
          </h2>
          <p className="text-muted-foreground text-sm font-mono">
            {isEditMode ? "Измените данные оффера" : "Заполните все необходимые данные"}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          className="flex-1 bg-muted hover:bg-white/10 text-muted-foreground font-mono"
          disabled={loading}
        >
          Черновик
        </Button>
        <Button 
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-foreground font-mono disabled:opacity-50"
          onClick={handleSubmit}
          disabled={loading || !isFormValid()}
          data-testid="button-publish-offer"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? "..." : (isEditMode ? "Сохранить" : "Опубликовать")}
        </Button>
      </div>

      <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase font-mono mb-4 border-b border-border pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Основная информация
              </h3>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-mono uppercase">Название оффера *</Label>
                <Input 
                  data-testid="input-offer-name"
                  className="bg-background border-border text-foreground font-mono focus:border-blue-500" 
                  placeholder="например: Casino Royale - Tier1 GEO"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-mono uppercase">Описание оффера *</Label>
                <Textarea 
                  data-testid="input-offer-description"
                  className="bg-background border-border text-foreground font-mono min-h-[100px] focus:border-blue-500" 
                  placeholder="Подробное описание оффера, условия, особенности..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-mono uppercase">Логотип</Label>
                <div className="flex items-center gap-4">
                  {formData.logoUrl ? (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden border border-border">
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border border-border">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={isUploading}
                      data-testid="input-logo-file"
                    />
                    <label htmlFor="logo-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-border text-muted-foreground cursor-pointer hover:bg-muted"
                        disabled={isUploading}
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploading ? `Загрузка ${progress}%` : 'Загрузить с компьютера'}
                        </span>
                      </Button>
                    </label>
                    <Input 
                      data-testid="input-logo-url"
                      className="bg-background border-border text-foreground font-mono focus:border-blue-500 text-xs h-8" 
                      placeholder="или вставьте URL"
                      value={formData.logoUrl}
                      onChange={e => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-mono uppercase flex items-center gap-2">
                    <Tag className="w-3 h-3" /> Категория
                  </Label>
                  <select 
                    data-testid="select-category"
                    className="w-full h-9 rounded-md bg-background border border-border text-foreground px-3 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-mono uppercase flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> Модель оплаты
                  </Label>
                  <select 
                    data-testid="select-payout-model"
                    className="w-full h-9 rounded-md bg-background border border-border text-foreground px-3 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    value={formData.payoutModel}
                    onChange={e => setFormData(prev => ({ ...prev, payoutModel: e.target.value }))}
                  >
                    {PAYOUT_MODELS.map(model => <option key={model}>{model}</option>)}
                  </select>
                </div>
              </div>

              {(formData.payoutModel === "RevShare" || formData.payoutModel === "Hybrid") && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-mono uppercase flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> RevShare %
                  </Label>
                  <div className="relative">
                    <Input
                      data-testid="input-rev-share-percent"
                      className="bg-background border-border text-foreground font-mono focus:border-blue-500"
                      placeholder="10.5"
                      type="number"
                      step="0.01"
                      value={formData.revSharePercent}
                      onChange={e => setFormData(prev => ({ ...prev, revSharePercent: e.target.value }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-mono uppercase flex items-center gap-2">
                  Период холда (дней)
                </Label>
                <div className="flex gap-2">
                  {[0, 7, 14, 30].map(days => (
                    <Button
                      key={days}
                      type="button"
                      variant={formData.holdPeriodDays === String(days) ? "default" : "outline"}
                      size="sm"
                      className={formData.holdPeriodDays === String(days) 
                        ? "bg-blue-600 text-foreground" 
                        : "bg-muted border-border text-muted-foreground hover:bg-white/10"}
                      onClick={() => setFormData(prev => ({ ...prev, holdPeriodDays: String(days) }))}
                      data-testid={`button-hold-${days}`}
                    >
                      {days === 0 ? "Без холда" : `${days} дней`}
                    </Button>
                  ))}
                  <Input
                    data-testid="input-hold-period"
                    type="number"
                    min="0"
                    className="w-20 bg-background border-border text-foreground font-mono text-center"
                    placeholder="Др."
                    value={![0, 7, 14, 30].includes(Number(formData.holdPeriodDays)) ? formData.holdPeriodDays : ""}
                    onChange={e => setFormData(prev => ({ ...prev, holdPeriodDays: e.target.value || "0" }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Деньги партнёра будут заморожены на указанный срок после конверсии</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-mono uppercase flex items-center gap-2">
                  Специальные статусы
                </Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isTop}
                      onChange={e => setFormData(prev => ({ ...prev, isTop: e.target.checked }))}
                      className="w-4 h-4 rounded border-border"
                      data-testid="checkbox-is-top"
                    />
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400">TOP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isExclusive}
                      onChange={e => setFormData(prev => ({ ...prev, isExclusive: e.target.checked }))}
                      className="w-4 h-4 rounded border-border"
                      data-testid="checkbox-is-exclusive"
                    />
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400">EXCLUSIVE</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPrivate}
                      onChange={e => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                      className="w-4 h-4 rounded border-border"
                      data-testid="checkbox-is-private"
                    />
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">PRIVATE</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Выберите статусы для выделения оффера в списке</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase font-mono mb-4 border-b border-border pb-2 flex items-center gap-2">
                Лимиты (Caps)
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-mono uppercase">Дневной лимит</Label>
                  <Input 
                    data-testid="input-daily-cap"
                    type="number"
                    min="0"
                    className="bg-background border-border text-foreground font-mono focus:border-blue-500" 
                    placeholder="Без лимита"
                    value={formData.dailyCap}
                    onChange={e => setFormData(prev => ({ ...prev, dailyCap: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Конверсий в день</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-mono uppercase">Месячный лимит</Label>
                  <Input 
                    data-testid="input-monthly-cap"
                    type="number"
                    min="0"
                    className="bg-background border-border text-foreground font-mono focus:border-blue-500" 
                    placeholder="Без лимита"
                    value={formData.monthlyCap}
                    onChange={e => setFormData(prev => ({ ...prev, monthlyCap: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Конверсий в месяц</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-mono uppercase">Общий лимит</Label>
                  <Input 
                    data-testid="input-total-cap"
                    type="number"
                    min="0"
                    className="bg-background border-border text-foreground font-mono focus:border-blue-500" 
                    placeholder="Без лимита"
                    value={formData.totalCap}
                    onChange={e => setFormData(prev => ({ ...prev, totalCap: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Всего конверсий</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-mono uppercase">Действие при достижении лимита</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="capAction"
                      checked={formData.capReachedAction === "block"}
                      onChange={() => setFormData(prev => ({ ...prev, capReachedAction: "block" }))}
                      className="w-4 h-4"
                      data-testid="radio-cap-block"
                    />
                    <span className="text-sm text-foreground">Блокировать клики</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="capAction"
                      checked={formData.capReachedAction === "redirect"}
                      onChange={() => setFormData(prev => ({ ...prev, capReachedAction: "redirect" }))}
                      className="w-4 h-4"
                      data-testid="radio-cap-redirect"
                    />
                    <span className="text-sm text-foreground">Редирект на fallback URL</span>
                  </label>
                </div>
              </div>

              {formData.capReachedAction === "redirect" && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-mono uppercase">Fallback URL</Label>
                  <Input 
                    data-testid="input-cap-redirect-url"
                    className="bg-background border-border text-foreground font-mono focus:border-blue-500" 
                    placeholder="https://fallback-offer.com"
                    value={formData.capRedirectUrl}
                    onChange={e => setFormData(prev => ({ ...prev, capRedirectUrl: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Куда перенаправлять трафик при достижении лимита</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <h3 className="text-sm font-bold text-foreground uppercase font-mono flex items-center gap-2">
                  <Globe className="w-4 h-4" /> ГЕО и Лендинги
                </h3>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={addLanding}
                  className="bg-blue-600 hover:bg-blue-500 text-foreground font-mono text-xs"
                  data-testid="button-add-landing"
                >
                  <Plus className="w-3 h-3 mr-1" /> Добавить
                </Button>
              </div>

              <div className="space-y-4">
                {landings.map((landing, index) => (
                  <div key={index} className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">Лендинг #{index + 1}</span>
                      {landings.length > 1 && (
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => removeLanding(index)}
                          className="h-6 w-6 text-red-400 hover:text-red-300"
                          data-testid={`button-remove-landing-${index}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px] font-mono uppercase">ГЕО (код страны) *</Label>
                        <CountrySelector
                          value={landing.geo}
                          onChange={e => updateLanding(index, "geo", e)}
                          testId={`input-landing-geo-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px] font-mono uppercase">Название лендинга</Label>
                        <Input
                          data-testid={`input-landing-name-${index}`}
                          className="bg-card border-border text-foreground font-mono h-8 text-sm"
                          placeholder="Landing v1"
                          value={landing.landingName}
                          onChange={e => updateLanding(index, "landingName", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-[10px] font-mono uppercase">URL лендинга *</Label>
                      <Input
                        data-testid={`input-landing-url-${index}`}
                        className="bg-card border-border text-foreground font-mono h-8 text-sm"
                        placeholder="https://landing.com/?sub1={click_id}"
                        value={landing.landingUrl}
                        onChange={e => updateLanding(index, "landingUrl", e.target.value)}
                      />
                      {landing.landingUrl && (
                        <div className="mt-1 p-2 bg-green-500/10 border border-green-500/20 rounded">
                          <p className="text-[10px] text-green-400 font-mono">
                            Итоговая ссылка редиректа: {(() => {
                              try {
                                const url = new URL(landing.landingUrl);
                                url.searchParams.set(landing.clickIdParam || "click_id", "<uuid>");
                                return url.toString();
                              } catch {
                                return landing.landingUrl + (landing.landingUrl.includes("?") ? "&" : "?") + (landing.clickIdParam || "click_id") + "=<uuid>";
                              }
                            })()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-[10px] font-mono uppercase">Параметр для передачи click_id</Label>
                      <Input
                        data-testid={`input-landing-clickIdParam-${index}`}
                        className="bg-card border-border text-foreground font-mono h-8 text-sm"
                        placeholder="click_id"
                        value={landing.clickIdParam}
                        onChange={e => updateLanding(index, "clickIdParam", e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Название параметра в трекере (click_id, aff_click_id, subid, clickid, cid, s2sclick_id)
                      </p>
                    </div>

                    {landing.landingUrl && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border">
                        <Label className="text-muted-foreground text-[10px] font-mono uppercase flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Postback URL — вставьте в настройки трекера
                        </Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-16 shrink-0">Lead:</span>
                            <code className="flex-1 text-[11px] bg-background p-1.5 rounded border border-border font-mono text-foreground truncate">
                              {`${window.location.origin}/api/postback?click_id={${landing.clickIdParam || "click_id"}}&status=lead`}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              data-testid={`button-copy-postback-lead-${index}`}
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/api/postback?click_id={${landing.clickIdParam || "click_id"}}&status=lead`);
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-16 shrink-0">Sale/FTD:</span>
                            <code className="flex-1 text-[11px] bg-background p-1.5 rounded border border-border font-mono text-foreground truncate">
                              {`${window.location.origin}/api/postback?click_id={${landing.clickIdParam || "click_id"}}&status=sale&payout={payout}`}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              data-testid={`button-copy-postback-sale-${index}`}
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/api/postback?click_id={${landing.clickIdParam || "click_id"}}&status=sale&payout={payout}`);
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`grid gap-3 ${formData.payoutModel === "RevShare" ? "grid-cols-1" : "grid-cols-3"}`}>
                      {formData.payoutModel !== "RevShare" && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px] font-mono uppercase">Цена партнеру *</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                            <Input
                              data-testid={`input-landing-partner-payout-${index}`}
                              className="bg-card border-border text-foreground font-mono h-8 text-sm pl-5"
                              placeholder="0.00"
                              value={landing.partnerPayout}
                              onChange={e => updateLanding(index, "partnerPayout", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      {formData.payoutModel !== "RevShare" && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px] font-mono uppercase">Цена для себя</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                            <Input
                              data-testid={`input-landing-internal-cost-${index}`}
                              className="bg-card border-border text-foreground font-mono h-8 text-sm pl-5"
                              placeholder="0.00"
                              value={landing.internalCost}
                              onChange={e => updateLanding(index, "internalCost", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      {formData.payoutModel === "RevShare" && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                          <p className="text-xs text-blue-400">RevShare рассчитывается по проценту: сумма × {formData.revSharePercent || "?"}%</p>
                        </div>
                      )}
                      {formData.payoutModel === "Hybrid" && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px] font-mono uppercase">Цена для себя</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                            <Input
                              data-testid={`input-landing-internal-cost-${index}`}
                              className="bg-card border-border text-foreground font-mono h-8 text-sm pl-5"
                              placeholder="0.00"
                              value={landing.internalCost}
                              onChange={e => updateLanding(index, "internalCost", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-[10px] font-mono uppercase">Валюта</Label>
                        <select
                          data-testid={`select-landing-currency-${index}`}
                          className="w-full h-8 rounded-md bg-card border border-border text-foreground px-2 text-sm font-mono"
                          value={landing.currency}
                          onChange={e => updateLanding(index, "currency", e.target.value)}
                        >
                          <option>USD</option>
                          <option>EUR</option>
                          <option>RUB</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase font-mono mb-4 border-b border-border pb-2 flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Источники трафика
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {TRAFFIC_SOURCES.map(source => (
                  <button
                    key={source}
                    type="button"
                    data-testid={`toggle-traffic-${source}`}
                    onClick={() => toggleArrayItem("trafficSources", source)}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                      formData.trafficSources.includes(source)
                        ? `${TRAFFIC_SOURCE_COLORS[source] || "bg-blue-600"} text-white`
                        : "bg-muted text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase font-mono mb-4 border-b border-border pb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Типы приложений
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {APP_TYPES.map(appType => (
                  <button
                    key={appType}
                    type="button"
                    data-testid={`toggle-app-${appType}`}
                    onClick={() => toggleArrayItem("appTypes", appType)}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                      formData.appTypes.includes(appType)
                        ? `${APP_TYPE_COLORS[appType] || "bg-emerald-600"} text-white`
                        : "bg-muted text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {appType}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase font-mono mb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Креативы
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Ссылки на Google/Yandex диск с креативами</p>

              {formData.creativeLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    data-testid={`input-creative-link-${index}`}
                    className="bg-background border-border text-foreground font-mono text-sm flex-1"
                    placeholder="https://drive.google.com/..."
                    value={link}
                    onChange={e => updateCreativeLink(index, e.target.value)}
                  />
                  {formData.creativeLinks.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCreativeLink(index)}
                      className="h-9 w-9 text-red-400"
                      data-testid={`button-remove-creative-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCreativeLink}
                className="w-full border-border text-muted-foreground"
                data-testid="button-add-creative"
              >
                <Plus className="w-3 h-3 mr-2" /> Добавить ссылку
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button 
              className="flex-1 bg-muted hover:bg-white/10 text-muted-foreground font-mono"
              disabled={loading}
            >
              Черновик
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-foreground font-mono disabled:opacity-50"
              onClick={handleSubmit}
              disabled={loading || !isFormValid()}
              data-testid="button-publish-offer"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "..." : (isEditMode ? "Сохранить" : "Опубликовать")}
            </Button>
          </div>
      </div>
    </div>
  );
}
