import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Globe, DollarSign, Tag, ExternalLink, Copy, 
  Smartphone, Monitor, Share2, FileText, Link2, CheckCircle,
  Lock, Clock, Send, AlertCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useState, useMemo } from "react";

function TrackingLinkGenerator({ offerId, baseUrl }: { offerId: string; baseUrl: string }) {
  const { t } = useTranslation();
  const [subs, setSubs] = useState({ sub1: '', sub2: '', sub3: '', sub4: '', sub5: '' });
  const [copied, setCopied] = useState(false);

  const generatedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (subs.sub1) params.set('sub1', subs.sub1);
    if (subs.sub2) params.set('sub2', subs.sub2);
    if (subs.sub3) params.set('sub3', subs.sub3);
    if (subs.sub4) params.set('sub4', subs.sub4);
    if (subs.sub5) params.set('sub5', subs.sub5);
    const paramStr = params.toString();
    return paramStr ? `${baseUrl}&${paramStr}` : baseUrl;
  }, [baseUrl, subs]);

  const copyLink = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-[#0A0A0A] border-white/10">
      <CardContent className="p-6">
        <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          {t('tracking.generator') || 'Link Generator'}
        </h3>
        
        <div className="space-y-3 mb-4">
          {(['sub1', 'sub2', 'sub3', 'sub4', 'sub5'] as const).map((key) => (
            <div key={key}>
              <Label className="text-xs text-slate-500 uppercase">{key}</Label>
              <Input
                placeholder={`{${key}}`}
                value={subs[key]}
                onChange={(e) => setSubs(prev => ({ ...prev, [key]: e.target.value }))}
                className="bg-white/5 border-white/10 text-white text-sm h-8"
                data-testid={`input-${key}`}
              />
            </div>
          ))}
        </div>

        <div className="bg-white/5 rounded p-3 mb-3">
          <code className="text-xs text-emerald-400 break-all" data-testid="text-generated-url">{generatedUrl}</code>
        </div>

        <Button
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold"
          onClick={copyLink}
          data-testid="button-copy-generated"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('common.copied') || 'Copied!'}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              {t('tracking.copyLink') || 'Copy Affiliate Link'}
            </>
          )}
        </Button>
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
                <div className={`w-20 h-20 rounded-xl ${categoryColor.split(' ')[0]} flex items-center justify-center flex-shrink-0 border border-white/10`}>
                  {offer.logoUrl ? (
                    <img src={offer.logoUrl} alt={offer.name} className="w-14 h-14 object-contain rounded" />
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
                    {offer.currency === 'USD' ? '$' : offer.currency}{offer.partnerPayout}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-[10px] uppercase text-slate-500 mb-1 font-medium">Модель</div>
                  <div className="text-xl font-bold text-white" data-testid="text-payout-model">{offer.payoutModel}</div>
                </div>
                {role === 'advertiser' && offer.internalCost && (
                  <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl p-4 border border-red-500/20">
                    <div className="text-[10px] uppercase text-red-400/70 mb-1 font-medium">Internal Cost</div>
                    <div className="text-xl font-bold text-red-400" data-testid="text-internal-cost">
                      {offer.currency === 'USD' ? '$' : offer.currency}{offer.internalCost}
                    </div>
                  </div>
                )}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-[10px] uppercase text-slate-500 mb-1 font-medium">Валюта</div>
                  <div className="text-xl font-bold text-white">{offer.currency}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {canSeeLinks && offer.landings && offer.landings.length > 0 && (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  ГЕО / Лендинги ({offer.landings.length})
                </h3>
                <div className="space-y-3">
                  {offer.landings.map((landing, index) => (
                    <div key={landing.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors" data-testid={`landing-row-${index}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/20">
                          <span className="text-sm font-bold text-blue-400">{landing.geo}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white mb-1">
                            {landing.landingName || `Landing ${landing.geo}`}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[300px]">{landing.landingUrl}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-400">
                            {landing.currency === 'USD' ? '$' : landing.currency}{landing.partnerPayout}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase">Выплата</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-white h-8 w-8 p-0"
                          onClick={() => copyToClipboard(landing.landingUrl, landing.id)}
                          data-testid={`button-copy-landing-${index}`}
                        >
                          {copiedUrl === landing.id ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

          {canSeeLinks && (
            <Card className="bg-[#0A0A0A] border-white/10">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Tracking URL
                </h3>
                <div className="bg-white/5 rounded-lg p-3 mb-3 border border-white/10">
                  <code className="text-xs text-emerald-400 break-all" data-testid="text-tracking-url">{offer.trackingUrl}</code>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  onClick={() => copyToClipboard(offer.trackingUrl, 'tracking')}
                  data-testid="button-copy-tracking"
                >
                  {copiedUrl === 'tracking' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Скопировано!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Копировать URL
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {isPublisher && hasAccess && (
            <TrackingLinkGenerator offerId={offer.id} baseUrl={offer.trackingUrl} />
          )}
        </div>
      </div>
    </div>
  );
}
