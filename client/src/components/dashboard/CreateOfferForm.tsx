import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, Trash2, Globe, DollarSign, Tag, Link as LinkIcon, Smartphone, Megaphone, FileText, Upload, Image } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useUpload } from "@/hooks/use-upload";

const TRAFFIC_SOURCES = ["Facebook", "Google", "TikTok", "UAC", "PPC", "Push", "Native", "Email", "SEO", "Telegram", "Instagram", "YouTube"];
const APP_TYPES = ["PWA", "WebView", "iOS App", "Android App", "APK", "Desktop"];
const PAYOUT_MODELS = ["CPA", "CPL", "CPI", "RevShare", "CPC", "CPM"];
const CATEGORIES = ["Gambling", "Betting", "Crypto", "Nutra", "Dating", "Finance", "Sweepstakes", "Gaming", "Utilities", "eCommerce"];

interface Landing {
  geo: string;
  landingName: string;
  landingUrl: string;
  partnerPayout: string;
  internalCost: string;
  currency: string;
}

export function CreateOfferForm({ role }: { role: string }) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
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
  });

  const [landings, setLandings] = useState<Landing[]>([
    { geo: "", landingName: "", landingUrl: "", partnerPayout: "", internalCost: "", currency: "USD" }
  ]);

  const toggleArrayItem = (field: "trafficSources" | "appTypes", item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const addLanding = () => {
    setLandings([...landings, { geo: "", landingName: "", landingUrl: "", partnerPayout: "", internalCost: "", currency: "USD" }]);
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
    const hasDescription = formData.description && formData.description.trim().length > 0;
    
    // RevShare требует rev_share_percent, остальные требуют partner_payout в лендингах
    const validLandings = landings.filter(l => {
      const hasGeo = l.geo && l.geo.trim();
      const hasUrl = l.landingUrl && l.landingUrl.trim();
      
      if (formData.payoutModel === "RevShare") {
        return hasGeo && hasUrl && formData.revSharePercent;
      }
      return hasGeo && hasUrl && l.partnerPayout && l.partnerPayout.toString().trim();
    });
    
    return hasName && hasDescription && validLandings.length > 0;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    
    try {
      const geos = landings.map(l => l.geo).filter(g => g);
      
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          geo: geos,
          creativeLinks: formData.creativeLinks.filter(l => l),
          landings: landings.filter(l => l.geo && l.landingUrl && l.partnerPayout),
        }),
      });

      if (response.ok) {
        setLocation(`/dashboard/${role}/offers`);
      } else {
        const data = await response.json();
        setError(data.message || "Failed to create offer");
      }
    } catch {
      setError("Failed to create offer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/${role}/offers`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold font-mono text-white">Создать оффер</h2>
          <p className="text-slate-400 text-sm font-mono">Заполните все необходимые данные</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-mono"
          disabled={loading}
        >
          Черновик
        </Button>
        <Button 
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-mono disabled:opacity-50"
          onClick={handleSubmit}
          disabled={loading || !isFormValid()}
          data-testid="button-publish-offer"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? "..." : "Опубликовать"}
        </Button>
      </div>

      <div className="space-y-6">
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Основная информация
              </h3>
              
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs font-mono uppercase">Название оффера *</Label>
                <Input 
                  data-testid="input-offer-name"
                  className="bg-[#050505] border-white/10 text-white font-mono focus:border-blue-500" 
                  placeholder="например: Casino Royale - Tier1 GEO"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs font-mono uppercase">Описание оффера *</Label>
                <Textarea 
                  data-testid="input-offer-description"
                  className="bg-[#050505] border-white/10 text-white font-mono min-h-[100px] focus:border-blue-500" 
                  placeholder="Подробное описание оффера, условия, особенности..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-xs font-mono uppercase">Логотип</Label>
                <div className="flex items-center gap-4">
                  {formData.logoUrl ? (
                    <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                      <Image className="w-6 h-6 text-slate-500" />
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
                        className="border-white/10 text-slate-300 cursor-pointer hover:bg-white/5"
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
                      className="bg-[#050505] border-white/10 text-white font-mono focus:border-blue-500 text-xs h-8" 
                      placeholder="или вставьте URL"
                      value={formData.logoUrl}
                      onChange={e => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs font-mono uppercase flex items-center gap-2">
                    <Tag className="w-3 h-3" /> Категория
                  </Label>
                  <select 
                    data-testid="select-category"
                    className="w-full h-9 rounded-md bg-[#050505] border border-white/10 text-white px-3 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs font-mono uppercase flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> Модель оплаты
                  </Label>
                  <select 
                    data-testid="select-payout-model"
                    className="w-full h-9 rounded-md bg-[#050505] border border-white/10 text-white px-3 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    value={formData.payoutModel}
                    onChange={e => setFormData(prev => ({ ...prev, payoutModel: e.target.value }))}
                  >
                    {PAYOUT_MODELS.map(model => <option key={model}>{model}</option>)}
                  </select>
                </div>
              </div>

              {(formData.payoutModel === "RevShare" || formData.payoutModel === "Hybrid") && (
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs font-mono uppercase flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> RevShare %
                  </Label>
                  <div className="relative">
                    <Input
                      data-testid="input-rev-share-percent"
                      className="bg-[#050505] border-white/10 text-white font-mono focus:border-blue-500"
                      placeholder="10.5"
                      type="number"
                      step="0.01"
                      value={formData.revSharePercent}
                      onChange={e => setFormData(prev => ({ ...prev, revSharePercent: e.target.value }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                  <Globe className="w-4 h-4" /> ГЕО и Лендинги
                </h3>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={addLanding}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs"
                  data-testid="button-add-landing"
                >
                  <Plus className="w-3 h-3 mr-1" /> Добавить
                </Button>
              </div>

              <div className="space-y-4">
                {landings.map((landing, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Лендинг #{index + 1}</span>
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
                        <Label className="text-slate-400 text-[10px] font-mono uppercase">ГЕО (код страны) *</Label>
                        <Input
                          data-testid={`input-landing-geo-${index}`}
                          className="bg-[#0A0A0A] border-white/10 text-white font-mono h-8 text-sm"
                          placeholder="US, DE, FR..."
                          value={landing.geo}
                          onChange={e => updateLanding(index, "geo", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[10px] font-mono uppercase">Название лендинга</Label>
                        <Input
                          data-testid={`input-landing-name-${index}`}
                          className="bg-[#0A0A0A] border-white/10 text-white font-mono h-8 text-sm"
                          placeholder="Landing v1"
                          value={landing.landingName}
                          onChange={e => updateLanding(index, "landingName", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[10px] font-mono uppercase">URL лендинга *</Label>
                      <Input
                        data-testid={`input-landing-url-${index}`}
                        className="bg-[#0A0A0A] border-white/10 text-white font-mono h-8 text-sm"
                        placeholder="https://landing.com/?sub1={click_id}"
                        value={landing.landingUrl}
                        onChange={e => updateLanding(index, "landingUrl", e.target.value)}
                      />
                    </div>

                    <div className={`grid gap-3 ${formData.payoutModel === "RevShare" ? "grid-cols-1" : "grid-cols-3"}`}>
                      {formData.payoutModel !== "RevShare" && (
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-[10px] font-mono uppercase">Цена партнеру *</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                            <Input
                              data-testid={`input-landing-partner-payout-${index}`}
                              className="bg-[#0A0A0A] border-white/10 text-white font-mono h-8 text-sm pl-5"
                              placeholder="0.00"
                              value={landing.partnerPayout}
                              onChange={e => updateLanding(index, "partnerPayout", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      {formData.payoutModel !== "RevShare" && (
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-[10px] font-mono uppercase">Цена для себя</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                            <Input
                              data-testid={`input-landing-internal-cost-${index}`}
                              className="bg-[#0A0A0A] border-white/10 text-white font-mono h-8 text-sm pl-5"
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
                          <Label className="text-slate-400 text-[10px] font-mono uppercase">Цена для себя</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                            <Input
                              data-testid={`input-landing-internal-cost-${index}`}
                              className="bg-[#0A0A0A] border-white/10 text-white font-mono h-8 text-sm pl-5"
                              placeholder="0.00"
                              value={landing.internalCost}
                              onChange={e => updateLanding(index, "internalCost", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[10px] font-mono uppercase">Валюта</Label>
                        <select
                          data-testid={`select-landing-currency-${index}`}
                          className="w-full h-8 rounded-md bg-[#0A0A0A] border border-white/10 text-white px-2 text-sm font-mono"
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

          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
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
                        ? "bg-blue-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
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
                        ? "bg-emerald-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {appType}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono mb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Креативы
              </h3>
              <p className="text-xs text-slate-500 mb-4">Ссылки на Google/Yandex диск с креативами</p>

              {formData.creativeLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    data-testid={`input-creative-link-${index}`}
                    className="bg-[#050505] border-white/10 text-white font-mono text-sm flex-1"
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
                className="w-full border-white/10 text-slate-300"
                data-testid="button-add-creative"
              >
                <Plus className="w-3 h-3 mr-2" /> Добавить ссылку
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button 
              className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-mono"
              disabled={loading}
            >
              Черновик
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-mono disabled:opacity-50"
              onClick={handleSubmit}
              disabled={loading || !isFormValid()}
              data-testid="button-publish-offer"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "..." : "Опубликовать"}
            </Button>
          </div>
      </div>
    </div>
  );
}
