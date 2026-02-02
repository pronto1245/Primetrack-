import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Globe, DollarSign, Tag, ExternalLink, Copy, 
  Smartphone, Monitor, Share2, FileText, Link2, CheckCircle,
  Lock, Clock, Send, AlertCircle, ChevronDown, ChevronRight, Plus
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { getCurrencySymbol, getOfferCurrency } from "@/lib/utils";

function getCountryFlag(code: string): string {
  const codeMap: Record<string, string> = {
    'UK': 'GB',
    'EN': 'GB',
  };
  const mappedCode = codeMap[code.toUpperCase()] || code.toUpperCase();
  const codePoints = mappedCode
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

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

interface OfferLandingType {
  id: string;
  offerId?: string;
  geo: string;
  landingName: string | null;
  landingUrl: string;
  trackingUrl?: string | null;
  partnerPayout: string;
  internalCost?: string | null;
  currency: string;
  isApproved?: boolean;
}

function LandingsGroupedByGeo({ 
  landings, 
  copiedUrl, 
  copyToClipboard,
  buildUrlWithSubs
}: { 
  landings: OfferLandingType[]; 
  copiedUrl: string | null; 
  copyToClipboard: (url: string, id: string) => void;
  buildUrlWithSubs: (url: string) => string;
}) {
  const groupedByGeo = useMemo(() => {
    const groups: Record<string, OfferLandingType[]> = {};
    landings.forEach(landing => {
      if (!groups[landing.geo]) {
        groups[landing.geo] = [];
      }
      groups[landing.geo].push(landing);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [landings]);

  const [openGeos, setOpenGeos] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOpenGeos(new Set(groupedByGeo.map(([geo]) => geo)));
  }, [landings]);

  const toggleGeo = (geo: string) => {
    setOpenGeos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(geo)) {
        newSet.delete(geo);
      } else {
        newSet.add(geo);
      }
      return newSet;
    });
  };

  const getPayoutRange = (geoLandings: OfferLandingType[]) => {
    const payouts = geoLandings.map(l => parseFloat(l.partnerPayout));
    const min = Math.min(...payouts);
    const max = Math.max(...payouts);
    const currency = getCurrencySymbol(geoLandings[0]?.currency || 'USD');
    if (min === max) {
      return `${currency}${min}`;
    }
    return `${currency}${min} - ${currency}${max}`;
  };

  const totalGeos = groupedByGeo.length;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          ГЕО / Лендинги ({landings.length} лендингов в {totalGeos} GEO)
        </h3>
        <div className="space-y-2">
          {groupedByGeo.map(([geo, geoLandings]) => (
            <Collapsible 
              key={geo} 
              open={openGeos.has(geo)}
              onOpenChange={() => toggleGeo(geo)}
            >
              <CollapsibleTrigger asChild>
                <div 
                  className="w-full bg-muted hover:bg-white/10 rounded-xl p-4 flex items-center justify-between border border-white/5 hover:border-border transition-all cursor-pointer"
                  data-testid={`geo-group-${geo}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{getCountryFlag(geo)}</span>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {geo} <span className="text-muted-foreground font-normal">({geoLandings.length} {geoLandings.length === 1 ? 'лендинг' : 'лендингов'})</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-medium">
                        {getPayoutRange(geoLandings)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {openGeos.has(geo) ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-blue-500/20 pl-4">
                  {geoLandings.map((landing, index) => (
                    <div 
                      key={landing.id} 
                      className="bg-white/[0.03] rounded-lg p-3 flex items-center justify-between hover:bg-muted transition-colors"
                      data-testid={`landing-row-${geo}-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                          {landing.landingName || `Landing ${index + 1}`}
                          {landing.isApproved === false && (
                            <Badge variant="outline" className="text-xs text-orange-400 border-orange-400/50">
                              <Lock className="w-3 h-3 mr-1" />
                              Недоступен
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {landing.isApproved === false 
                            ? "Ссылка скрыта — ожидает одобрения рекламодателя"
                            : (landing.trackingUrl || landing.landingUrl)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <div className={`text-sm font-bold ${landing.isApproved === false ? 'text-muted-foreground' : 'text-emerald-400'}`}>
                            {getCurrencySymbol(landing.currency || 'USD')}{landing.partnerPayout}
                          </div>
                        </div>
                        {landing.isApproved !== false && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const baseUrl = landing.trackingUrl || landing.landingUrl;
                              copyToClipboard(buildUrlWithSubs(baseUrl), landing.id);
                            }}
                            data-testid={`button-copy-landing-${geo}-${index}`}
                          >
                            {copiedUrl === landing.id ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AccessRequestCard({ offerId, accessStatus, onSuccess }: { offerId: string; accessStatus?: string | null; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const requestAccessMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/offers/${offerId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: message || undefined })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to request access");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers", offerId] });
      onSuccess();
    }
  });

  if (accessStatus === "pending") {
    return (
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-yellow-400">Заявка на рассмотрении</h3>
              <p className="text-xs text-yellow-400/70">Ожидайте ответа рекламодателя</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (accessStatus === "rejected") {
    return (
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-400">Заявка отклонена</h3>
              <p className="text-xs text-red-400/70">Вы можете отправить новую заявку</p>
            </div>
          </div>
          <Button
            className="w-full bg-red-600 hover:bg-red-500 text-foreground mt-3"
            onClick={() => requestAccessMutation.mutate()}
            disabled={requestAccessMutation.isPending}
            data-testid="button-request-access-again"
          >
            <Send className="w-4 h-4 mr-2" />
            Запросить снова
          </Button>
        </CardContent>
      </Card>
    );
  }

  // При revoked показываем стандартную форму запроса доступа
  return (
    <Card className="bg-blue-500/10 border-blue-500/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-400">Требуется доступ</h3>
            <p className="text-xs text-blue-400/70">Запросите доступ к офферу</p>
          </div>
        </div>
        
        <div className="mb-4">
          <Label className="text-xs text-muted-foreground mb-1">Сообщение (необязательно)</Label>
          <Input
            placeholder="Опишите ваш опыт и источники трафика..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-muted border-border text-foreground text-sm"
            data-testid="input-access-message"
          />
        </div>
        
        <Button
          className="w-full bg-blue-600 hover:bg-blue-500 text-foreground font-bold"
          onClick={() => requestAccessMutation.mutate()}
          disabled={requestAccessMutation.isPending}
          data-testid="button-request-access"
        >
          {requestAccessMutation.isPending ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Запросить доступ
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function RequestLandingsCard({ offerId, landings, requestedLandings, onSuccess }: { 
  offerId: string; 
  landings: OfferLandingType[]; 
  requestedLandings?: string[] | null;
  onSuccess: () => void 
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLandings, setSelectedLandings] = useState<string[]>([]);
  
  const unavailableLandings = landings.filter(l => l.isApproved === false);
  const hasPendingRequest = requestedLandings && requestedLandings.length > 0;
  
  const requestLandingsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/offers/${offerId}/request-landings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ landingIds: selectedLandings })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to request landings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers", offerId] });
      setIsOpen(false);
      setSelectedLandings([]);
      onSuccess();
      toast({
        title: "Запрос отправлен",
        description: "Ожидайте подтверждения от рекламодателя"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить запрос",
        variant: "destructive"
      });
    }
  });

  if (unavailableLandings.length === 0) {
    return null;
  }
  
  if (hasPendingRequest) {
    return (
      <Card className="bg-yellow-500/10 border-yellow-500/30 mt-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-400">
                Запрос на рассмотрении
              </p>
              <p className="text-xs text-yellow-400/70">
                Ожидайте решения рекламодателя по {requestedLandings.length} лендинг{requestedLandings.length === 1 ? 'у' : requestedLandings.length < 5 ? 'ам' : 'ам'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleLanding = (id: string) => {
    setSelectedLandings(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedLandings(unavailableLandings.map(l => l.id));
  };

  return (
    <Card className="bg-orange-500/10 border-orange-500/30 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Lock className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-400">
                {unavailableLandings.length} лендинг{unavailableLandings.length === 1 ? '' : unavailableLandings.length < 5 ? 'а' : 'ов'} недоступно
              </p>
              <p className="text-xs text-orange-400/70">Запросите доступ у рекламодателя</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white" data-testid="button-request-landings">
                <Plus className="w-4 h-4 mr-1" />
                Запросить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Запросить доступ к лендингам</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Выберите лендинги для запроса
                  </p>
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                    Выбрать все
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {unavailableLandings.map((landing) => (
                    <div 
                      key={landing.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer"
                      onClick={() => toggleLanding(landing.id)}
                    >
                      <Checkbox 
                        checked={selectedLandings.includes(landing.id)}
                        onCheckedChange={() => toggleLanding(landing.id)}
                        data-testid={`checkbox-landing-${landing.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {landing.landingName || 'Landing'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getCountryFlag(landing.geo)} {landing.geo} — {getCurrencySymbol(landing.currency)}{landing.partnerPayout}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={() => requestLandingsMutation.mutate()}
                  disabled={selectedLandings.length === 0 || requestLandingsMutation.isPending}
                  data-testid="button-submit-request-landings"
                >
                  {requestLandingsMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Запросить доступ ({selectedLandings.length})
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface Offer {
  id: string;
  advertiserId: string;
  name: string;
  description: string;
  logoUrl: string | null;
  partnerPayout: string;
  internalCost?: string;
  payoutModel: string;
  currency: string;
  holdPeriodDays?: number;
  geo: string[];
  category: string;
  trafficSources: string[];
  appTypes: string[];
  kpi: string | null;
  rules: string | null;
  conditions: string | null;
  creativeLinks: string[];
  trackingUrl: string;
  status: string;
  landings: OfferLandingType[];
  hasAccess?: boolean;
  accessStatus?: string | null;
  requestedLandings?: string[] | null;
  extensionRequestedAt?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  "nutra": "bg-green-500/20 text-green-400",
  "gambling": "bg-red-500/20 text-red-400",
  "betting": "bg-orange-500/20 text-orange-400",
  "crypto": "bg-yellow-500/20 text-yellow-400",
  "dating": "bg-pink-500/20 text-pink-400",
  "finance": "bg-blue-500/20 text-blue-400",
  "ecommerce": "bg-purple-500/20 text-purple-400",
  "gaming": "bg-indigo-500/20 text-indigo-400",
  "utilities": "bg-cyan-500/20 text-cyan-400",
  "sweepstakes": "bg-amber-500/20 text-amber-400",
};

function getOfferPayoutPrice(offer: Offer): string {
  // Если есть лендинги - показываем диапазон цен
  if (offer.landings && offer.landings.length > 0) {
    const payouts = offer.landings.map(l => parseFloat(l.partnerPayout)).filter(p => !isNaN(p));
    if (payouts.length === 0) return offer.partnerPayout || '';
    const min = Math.min(...payouts);
    const max = Math.max(...payouts);
    if (min === max) {
      return min.toString();
    }
    return `${min} - ${max}`;
  }
  if (offer.partnerPayout) return offer.partnerPayout;
  return '';
}

function getOfferCostPrice(offer: Offer): string | null {
  // Если есть лендинги - показываем диапазон цен
  if (offer.landings && offer.landings.length > 0) {
    const costs = offer.landings
      .map(l => l.internalCost ? parseFloat(l.internalCost) : NaN)
      .filter(c => !isNaN(c));
    if (costs.length === 0) return offer.internalCost || null;
    const min = Math.min(...costs);
    const max = Math.max(...costs);
    if (min === max) {
      return min.toString();
    }
    return `${min} - ${max}`;
  }
  if (offer.internalCost) return offer.internalCost;
  return null;
}

export function OfferDetail({ offerId, role }: { offerId: string; role: string }) {
  const { t } = useTranslation();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [accessRequested, setAccessRequested] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [subParams, setSubParams] = useState<Record<string, string>>({});
  const [selectedLandingIndex, setSelectedLandingIndex] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    setSelectedLandingIndex(0);
    setSubParams({});
  }, [offerId]);

  const updateSubParam = (key: string, value: string) => {
    setSubParams(prev => {
      if (value === '') {
        const newParams = { ...prev };
        delete newParams[key];
        return newParams;
      }
      return { ...prev, [key]: value };
    });
  };

  const buildUrlWithSubs = (baseUrl: string): string => {
    if (Object.keys(subParams).length === 0) return baseUrl;
    try {
      const url = new URL(baseUrl, window.location.origin);
      for (let i = 1; i <= 10; i++) {
        const key = `sub${i}`;
        if (subParams[key]) {
          url.searchParams.set(key, subParams[key]);
        }
      }
      return url.toString();
    } catch {
      const separator = baseUrl.includes('?') ? '&' : '?';
      const params = Object.entries(subParams)
        .filter(([, v]) => v)
        .sort(([a], [b]) => parseInt(a.replace('sub', '')) - parseInt(b.replace('sub', '')))
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      return params ? `${baseUrl}${separator}${params}` : baseUrl;
    }
  };

  const { data: offer, isLoading, error } = useQuery<Offer>({
    queryKey: ["/api/offers", offerId],
    queryFn: async () => {
      const res = await fetch(`/api/offers/${offerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch offer");
      return res.json();
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Failed to load offer</p>
        <Link href={`/dashboard/${role}/offers`}>
          <Button variant="outline" className="border-border">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Offers
          </Button>
        </Link>
      </div>
    );
  }

  const categoryColor = CATEGORY_COLORS[offer.category.toLowerCase()] || "bg-slate-500/20 text-muted-foreground";
  const isPublisher = role === 'publisher';
  const hasAccess = offer.hasAccess === true;
  const canSeeLinks = !isPublisher || hasAccess;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/${role}/${role === 'publisher' ? 'links' : 'offers'}`}>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </Link>
        
        {isPublisher && hasAccess && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Доступ получен
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border overflow-hidden">
            <div className={`h-2 ${offer.status === 'active' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-yellow-500 to-yellow-400'}`} />
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-20 h-20 rounded-xl ${categoryColor.split(' ')[0]} flex items-center justify-center flex-shrink-0 border border-border overflow-hidden`}>
                  {offer.logoUrl ? (
                    <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover" />
                  ) : (
                    <Tag className="w-10 h-10 text-white/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground" data-testid="text-offer-name">{offer.name}</h1>
                    <Badge className={`${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {offer.status === 'active' ? 'Активен' : 'Приостановлен'}
                    </Badge>
                    {canSeeLinks && offer.creativeLinks && offer.creativeLinks.length > 0 && (
                      offer.creativeLinks.length === 1 ? (
                        <a
                          href={offer.creativeLinks[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
                          data-testid="button-creatives"
                        >
                          <Monitor className="w-4 h-4" />
                          Креативы
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
                              data-testid="button-creatives"
                            >
                              <Monitor className="w-4 h-4" />
                              Креативы ({offer.creativeLinks.length})
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {offer.creativeLinks.map((link, i) => (
                              <DropdownMenuItem key={i} asChild>
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 cursor-pointer"
                                  data-testid={`link-creative-${i}`}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Креатив {i + 1}
                                </a>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${categoryColor}`}>
                      {offer.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {offer.geo.slice(0, 5).join(", ")}{offer.geo.length > 5 ? ` +${offer.geo.length - 5}` : ""}
                    </span>
                    <span className="text-muted-foreground">ID: {offer.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Описание</h3>
                {offer.description ? (
                  <div>
                    <div 
                      className={`text-muted-foreground text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-ul:text-muted-foreground prose-ol:text-muted-foreground [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ${!isDescriptionExpanded ? 'line-clamp-4' : ''}`} 
                      data-testid="text-offer-description"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(offer.description) }}
                    />
                    {offer.description.length > 200 && (
                      <button
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-xs font-medium transition-all border border-blue-500/20"
                        data-testid="button-toggle-description"
                      >
                        {isDescriptionExpanded ? (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                            Свернуть
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Развернуть
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm" data-testid="text-offer-description">Описание не указано</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                  <div className="text-[10px] uppercase text-emerald-400/70 mb-1 font-medium">Выплата</div>
                  <div className="text-xl font-bold text-emerald-400" data-testid="text-offer-payout">
                    {getOfferPayoutPrice(offer) ? `${getCurrencySymbol(getOfferCurrency(offer))}${getOfferPayoutPrice(offer)}` : 'N/A'}
                  </div>
                </div>
                <div className="bg-muted rounded-xl p-4 border border-border">
                  <div className="text-[10px] uppercase text-muted-foreground mb-1 font-medium">Модель</div>
                  <div className="text-xl font-bold text-foreground" data-testid="text-payout-model">{offer.payoutModel}</div>
                </div>
                {role === 'advertiser' && (
                  <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl p-4 border border-red-500/20">
                    <div className="text-[10px] uppercase text-red-400/70 mb-1 font-medium">Internal Cost</div>
                    <div className="text-xl font-bold text-red-400" data-testid="text-internal-cost">
                      {getOfferCostPrice(offer) ? `${getCurrencySymbol(getOfferCurrency(offer))}${getOfferCostPrice(offer)}` : 'N/A'}
                    </div>
                  </div>
                )}
                <div className="bg-muted rounded-xl p-4 border border-border">
                  <div className="text-[10px] uppercase text-muted-foreground mb-1 font-medium">Валюта</div>
                  <div className="text-xl font-bold text-foreground">{getOfferCurrency(offer)}</div>
                </div>
                <div className={`rounded-xl p-4 border ${offer.holdPeriodDays && offer.holdPeriodDays > 0 ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20' : 'bg-muted border-border'}`}>
                  <div className={`text-[10px] uppercase mb-1 font-medium ${offer.holdPeriodDays && offer.holdPeriodDays > 0 ? 'text-yellow-400/70' : 'text-muted-foreground'}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    Холд
                  </div>
                  <div className={`text-xl font-bold ${offer.holdPeriodDays && offer.holdPeriodDays > 0 ? 'text-yellow-400' : 'text-foreground'}`} data-testid="text-hold-period">
                    {offer.holdPeriodDays && offer.holdPeriodDays > 0 ? `${offer.holdPeriodDays} дн.` : 'Нет'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isPublisher && hasAccess && offer.landings && offer.landings.length > 0 && (
            <RequestLandingsCard 
              offerId={offer.id} 
              landings={offer.landings}
              requestedLandings={offer.requestedLandings}
              onSuccess={() => {}}
            />
          )}

          {canSeeLinks && offer.landings && offer.landings.length > 0 && (
            <LandingsGroupedByGeo landings={offer.landings} copiedUrl={copiedUrl} copyToClipboard={copyToClipboard} buildUrlWithSubs={buildUrlWithSubs} />
          )}

          {!canSeeLinks && (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Лендинги скрыты</h3>
                <p className="text-muted-foreground text-sm">Получите доступ к офферу, чтобы увидеть лендинги и ссылки</p>
              </CardContent>
            </Card>
          )}

          {(offer.kpi || offer.rules || offer.conditions) && (
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-6">
                {offer.kpi && (
                  <div>
                    <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      KPI
                    </h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap bg-muted rounded-lg p-4">{offer.kpi}</p>
                  </div>
                )}
                {offer.rules && (
                  <div>
                    <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Правила
                    </h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap bg-muted rounded-lg p-4">{offer.rules}</p>
                  </div>
                )}
                {offer.conditions && (
                  <div>
                    <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Условия
                    </h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap bg-muted rounded-lg p-4">{offer.conditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {isPublisher && !hasAccess && !accessRequested && (
            <AccessRequestCard 
              offerId={offer.id} 
              accessStatus={offer.accessStatus}
              onSuccess={() => setAccessRequested(true)} 
            />
          )}

          {isPublisher && accessRequested && (
            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400">Заявка отправлена!</h3>
                    <p className="text-xs text-emerald-400/70">Ожидайте ответа рекламодателя</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Источники трафика
              </h3>
              <div className="flex flex-wrap gap-2">
                {offer.trafficSources.length > 0 ? offer.trafficSources.map((source, i) => (
                  <Badge key={i} className={`${TRAFFIC_SOURCE_COLORS[source] || "bg-blue-600"} text-white text-xs border-0`}>
                    {source}
                  </Badge>
                )) : (
                  <span className="text-muted-foreground text-sm">Все источники разрешены</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Типы приложений
              </h3>
              <div className="flex flex-wrap gap-2">
                {offer.appTypes.length > 0 ? offer.appTypes.map((type, i) => (
                  <Badge key={i} className={`${APP_TYPE_COLORS[type] || "bg-emerald-600"} text-white text-xs border-0`}>
                    {type}
                  </Badge>
                )) : (
                  <span className="text-muted-foreground text-sm">Все типы разрешены</span>
                )}
              </div>
            </CardContent>
          </Card>

          {canSeeLinks && (
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Sub-параметры
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Заполните нужные поля — они добавятся к ссылке
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                    <div key={i} className="flex items-center gap-1">
                      <Label className="text-[10px] text-muted-foreground w-7 flex-shrink-0">sub{i}</Label>
                      <Input
                        placeholder={`sub${i}`}
                        value={subParams[`sub${i}`] || ''}
                        onChange={(e) => updateSubParam(`sub${i}`, e.target.value)}
                        className="bg-muted border-border text-foreground text-xs h-7 px-2"
                        data-testid={`input-sub${i}`}
                      />
                    </div>
                  ))}
                </div>
                {offer.landings && offer.landings.length > 0 && (() => {
                  const selectedLanding = offer.landings[selectedLandingIndex] || offer.landings[0];
                  return (
                    <div className="mt-4 p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                      {offer.landings.length > 1 && (
                        <div className="mb-3">
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Выберите лендинг</Label>
                          <select
                            value={selectedLandingIndex}
                            onChange={(e) => setSelectedLandingIndex(parseInt(e.target.value))}
                            className="w-full bg-muted border border-border rounded-md text-xs h-8 px-2 text-foreground"
                            data-testid="select-landing"
                          >
                            {offer.landings.map((landing, idx) => (
                              <option key={landing.id} value={idx}>
                                {landing.geo} — {landing.landingName || `Landing ${idx + 1}`}{landing.isApproved === false ? ' (недоступен)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[10px] text-blue-400 uppercase font-bold">
                            Лендинг — {selectedLanding.landingName || selectedLanding.geo}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {selectedLanding.isApproved === false 
                              ? "Ссылка недоступна — ожидает одобрения"
                              : "Ссылка с вашими sub-параметрами"}
                          </p>
                        </div>
                        {selectedLanding.isApproved !== false && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                            onClick={() => copyToClipboard(buildUrlWithSubs(selectedLanding.trackingUrl || selectedLanding.landingUrl), 'preview')}
                            data-testid="button-copy-preview"
                          >
                            {copiedUrl === 'preview' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </div>
                      {selectedLanding.isApproved === false ? (
                        <p className="text-[11px] text-orange-400 font-medium">
                          Ссылка скрыта — ожидает одобрения рекламодателя
                        </p>
                      ) : (
                        <p className="text-[11px] text-foreground font-mono break-all leading-relaxed">
                          {buildUrlWithSubs(selectedLanding.trackingUrl || selectedLanding.landingUrl)}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}


        </div>
      </div>
    </div>
  );
}
