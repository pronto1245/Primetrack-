import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Globe, DollarSign, Tag, ExternalLink, Copy, 
  Smartphone, Monitor, Share2, FileText, Link2, CheckCircle,
  Lock, Clock, Send, AlertCircle, ChevronDown, ChevronRight
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useState, useMemo } from "react";

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

interface OfferLanding {
  id: string;
  geo: string;
  landingName: string | null;
  landingUrl: string;
  partnerPayout: string;
  currency: string;
}

function LandingsGroupedByGeo({ 
  landings, 
  copiedUrl, 
  copyToClipboard 
}: { 
  landings: OfferLanding[]; 
  copiedUrl: string | null; 
  copyToClipboard: (url: string, id: string) => void;
}) {
  const [openGeos, setOpenGeos] = useState<Set<string>>(new Set());

  const groupedByGeo = useMemo(() => {
    const groups: Record<string, OfferLanding[]> = {};
    landings.forEach(landing => {
      if (!groups[landing.geo]) {
        groups[landing.geo] = [];
      }
      groups[landing.geo].push(landing);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
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

  const getPayoutRange = (geoLandings: OfferLanding[]) => {
    const payouts = geoLandings.map(l => parseFloat(l.partnerPayout));
    const min = Math.min(...payouts);
    const max = Math.max(...payouts);
    const currency = geoLandings[0]?.currency === 'USD' ? '$' : geoLandings[0]?.currency || '';
    if (min === max) {
      return `${currency}${min}`;
    }
    return `${currency}${min} - ${currency}${max}`;
  };

  const totalGeos = groupedByGeo.length;

  return (
    <Card className="bg-[#0A0A0A] border-white/10">
      <CardContent className="p-6">
        <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
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
                  className="w-full bg-white/5 hover:bg-white/10 rounded-xl p-4 flex items-center justify-between border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                  data-testid={`geo-group-${geo}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{getCountryFlag(geo)}</span>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {geo} <span className="text-slate-300 font-normal">({geoLandings.length} {geoLandings.length === 1 ? 'лендинг' : 'лендингов'})</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-medium">
                        {getPayoutRange(geoLandings)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {openGeos.has(geo) ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-blue-500/20 pl-4">
                  {geoLandings.map((landing, index) => (
                    <div 
                      key={landing.id} 
                      className="bg-white/[0.03] rounded-lg p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                      data-testid={`landing-row-${geo}-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {landing.landingName || `Landing ${index + 1}`}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{landing.landingUrl}</div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-400">
                            {landing.currency === 'USD' ? '$' : landing.currency}{landing.partnerPayout}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-white h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(landing.landingUrl, landing.id);
                          }}
                          data-testid={`button-copy-landing-${geo}-${index}`}
                        >
                          {copiedUrl === landing.id ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
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
            className="w-full bg-red-600 hover:bg-red-500 text-white mt-3"
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

  if (accessStatus === "revoked") {
    return (
      <Card className="bg-orange-500/10 border-orange-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-orange-400">Доступ отозван</h3>
              <p className="text-xs text-orange-400/70">Рекламодатель отозвал ваш доступ к офферу</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <Label className="text-xs text-slate-400 mb-1">Сообщение (необязательно)</Label>
          <Input
            placeholder="Опишите ваш опыт и источники трафика..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-white/5 border-white/10 text-white text-sm"
            data-testid="input-access-message"
          />
        </div>
        
        <Button
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold"
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

interface OfferLanding {
  id: string;
  offerId: string;
  geo: string;
  landingName: string | null;
  landingUrl: string;
  partnerPayout: string;
  internalCost: string | null;
  currency: string;
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
  landings: OfferLanding[];
  hasAccess?: boolean;
  accessStatus?: string | null;
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
  if (offer.partnerPayout) return offer.partnerPayout;
  if (offer.landings && offer.landings.length > 0) {
    return offer.landings[0].partnerPayout;
  }
  return '';
}

function getOfferCostPrice(offer: Offer): string | null {
  if (offer.internalCost) return offer.internalCost;
  if (offer.landings && offer.landings.length > 0) {
    return offer.landings[0].internalCost || null;
  }
  return null;
}

export function OfferDetail({ offerId, role }: { offerId: string; role: string }) {
  const { t } = useTranslation();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [accessRequested, setAccessRequested] = useState(false);
  const queryClient = useQueryClient();

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
          <Button variant="outline" className="border-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Offers
          </Button>
        </Link>
      </div>
    );
  }

  const categoryColor = CATEGORY_COLORS[offer.category.toLowerCase()] || "bg-slate-500/20 text-slate-400";
  const isPublisher = role === 'publisher';
  const hasAccess = offer.hasAccess === true;
  const canSeeLinks = !isPublisher || hasAccess;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/${role}/${role === 'publisher' ? 'links' : 'offers'}`}>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
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
          <Card className="bg-[#0A0A0A] border-white/10 overflow-hidden">
            <div className={`h-2 ${offer.status === 'active' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-yellow-500 to-yellow-400'}`} />
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-20 h-20 rounded-xl ${categoryColor.split(' ')[0]} flex items-center justify-center flex-shrink-0 border border-white/10 overflow-hidden`}>
                  {offer.logoUrl ? (
                    <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover" />
                  ) : (
                    <Tag className="w-10 h-10 text-white/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-white" data-testid="text-offer-name">{offer.name}</h1>
                    <Badge className={`${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {offer.status === 'active' ? 'Активен' : 'Приостановлен'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${categoryColor}`}>
                      {offer.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {offer.geo.slice(0, 5).join(", ")}{offer.geo.length > 5 ? ` +${offer.geo.length - 5}` : ""}
                    </span>
                    <span className="text-slate-500">ID: {offer.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Описание</h3>
                <p className="text-slate-300 text-sm leading-relaxed" data-testid="text-offer-description">{offer.description || "Описание не указано"}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                  <div className="text-[10px] uppercase text-emerald-400/70 mb-1 font-medium">Выплата</div>
                  <div className="text-xl font-bold text-emerald-400" data-testid="text-offer-payout">
                    {getOfferPayoutPrice(offer) ? `${offer.currency === 'USD' ? '$' : offer.currency}${getOfferPayoutPrice(offer)}` : 'N/A'}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-[10px] uppercase text-slate-500 mb-1 font-medium">Модель</div>
                  <div className="text-xl font-bold text-white" data-testid="text-payout-model">{offer.payoutModel}</div>
                </div>
                {role === 'advertiser' && (
                  <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl p-4 border border-red-500/20">
                    <div className="text-[10px] uppercase text-red-400/70 mb-1 font-medium">Internal Cost</div>
                    <div className="text-xl font-bold text-red-400" data-testid="text-internal-cost">
                      {getOfferCostPrice(offer) ? `${offer.currency === 'USD' ? '$' : offer.currency}${getOfferCostPrice(offer)}` : 'N/A'}
                    </div>
                  </div>
                )}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-[10px] uppercase text-slate-500 mb-1 font-medium">Валюта</div>
                  <div className="text-xl font-bold text-white">{offer.currency}</div>
                </div>
                <div className={`rounded-xl p-4 border ${offer.holdPeriodDays && offer.holdPeriodDays > 0 ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20' : 'bg-white/5 border-white/10'}`}>
                  <div className={`text-[10px] uppercase mb-1 font-medium ${offer.holdPeriodDays && offer.holdPeriodDays > 0 ? 'text-yellow-400/70' : 'text-slate-500'}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    Холд
                  </div>
                  <div className={`text-xl font-bold ${offer.holdPeriodDays && offer.holdPeriodDays > 0 ? 'text-yellow-400' : 'text-white'}`} data-testid="text-hold-period">
                    {offer.holdPeriodDays && offer.holdPeriodDays > 0 ? `${offer.holdPeriodDays} дн.` : 'Нет'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {canSeeLinks && offer.landings && offer.landings.length > 0 && (
            <LandingsGroupedByGeo landings={offer.landings} copiedUrl={copiedUrl} copyToClipboard={copyToClipboard} />
          )}

          {!canSeeLinks && (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Лендинги скрыты</h3>
                <p className="text-slate-400 text-sm">Получите доступ к офферу, чтобы увидеть лендинги и ссылки</p>
              </CardContent>
            </Card>
          )}

          {(offer.kpi || offer.rules || offer.conditions) && (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="p-6 space-y-6">
                {offer.kpi && (
                  <div>
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      KPI
                    </h3>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap bg-white/5 rounded-lg p-4">{offer.kpi}</p>
                  </div>
                )}
                {offer.rules && (
                  <div>
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Правила
                    </h3>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap bg-white/5 rounded-lg p-4">{offer.rules}</p>
                  </div>
                )}
                {offer.conditions && (
                  <div>
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Условия
                    </h3>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap bg-white/5 rounded-lg p-4">{offer.conditions}</p>
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

          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Источники трафика
              </h3>
              <div className="flex flex-wrap gap-2">
                {offer.trafficSources.length > 0 ? offer.trafficSources.map((source, i) => (
                  <Badge key={i} variant="outline" className="border-white/10 text-slate-300 text-xs">
                    {source}
                  </Badge>
                )) : (
                  <span className="text-slate-500 text-sm">Все источники разрешены</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Типы приложений
              </h3>
              <div className="flex flex-wrap gap-2">
                {offer.appTypes.length > 0 ? offer.appTypes.map((type, i) => (
                  <Badge key={i} variant="outline" className="border-white/10 text-slate-300 text-xs">
                    {type}
                  </Badge>
                )) : (
                  <span className="text-slate-500 text-sm">Все типы разрешены</span>
                )}
              </div>
            </CardContent>
          </Card>

          {canSeeLinks && offer.creativeLinks && offer.creativeLinks.length > 0 && (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Креативы
                </h3>
                <div className="space-y-2">
                  {offer.creativeLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors bg-white/5 rounded-lg p-3"
                      data-testid={`link-creative-${i}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Креативы {i + 1}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
