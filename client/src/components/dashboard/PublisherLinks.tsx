import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Link as LinkIcon, Loader2, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { useAdvertiserContext } from "@/contexts/AdvertiserContext";
import { PendingPartnershipOverlay } from "./PendingPartnershipOverlay";
import { toast } from "sonner";

interface OfferLanding {
  id: string;
  offerId: string;
  geo: string;
  landingName: string | null;
  landingUrl: string;
  partnerPayout: string;
  currency: string;
}

interface ApprovedOffer {
  id: string;
  name: string;
  category: string;
  payoutModel: string;
  landings: OfferLanding[];
}

interface MacroConfig {
  sub1: string;
  sub2: string;
  sub3: string;
  sub4: string;
  sub5: string;
}

const SUPPORTED_MACROS = [
  { key: "click_id", label: "Click ID", description: "Уникальный ID клика (авто)", placeholder: "{click_id}" },
  { key: "sub1", label: "Sub1", description: "Дополнительный параметр 1", placeholder: "" },
  { key: "sub2", label: "Sub2", description: "Дополнительный параметр 2", placeholder: "" },
  { key: "sub3", label: "Sub3", description: "Дополнительный параметр 3", placeholder: "" },
  { key: "sub4", label: "Sub4", description: "Дополнительный параметр 4", placeholder: "" },
  { key: "sub5", label: "Sub5", description: "Дополнительный параметр 5", placeholder: "" },
];

function OfferLinkGenerator({ offer, publisherId }: { offer: ApprovedOffer; publisherId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedLandingId, setSelectedLandingId] = useState<string>(offer.landings[0]?.id || "");
  const [macros, setMacros] = useState<MacroConfig>({ sub1: "", sub2: "", sub3: "", sub4: "", sub5: "" });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const selectedLanding = offer.landings.find(l => l.id === selectedLandingId);

  const generateTrackingLink = (landing: OfferLanding) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    params.set("offer_id", offer.id);
    params.set("partner_id", publisherId);
    params.set("landing_id", landing.id);
    
    if (macros.sub1) params.set("sub1", macros.sub1);
    if (macros.sub2) params.set("sub2", macros.sub2);
    if (macros.sub3) params.set("sub3", macros.sub3);
    if (macros.sub4) params.set("sub4", macros.sub4);
    if (macros.sub5) params.set("sub5", macros.sub5);

    return `${baseUrl}/api/click?${params.toString()}`;
  };

  const copyToClipboard = async (link: string, landingId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(landingId);
      toast.success("Ссылка скопирована!");
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <Card className="bg-[#0A0A0A] border-white/10 overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`link-generator-${offer.id}`}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          <div>
            <h3 className="font-mono font-semibold text-white">{offer.name}</h3>
            <p className="text-xs text-slate-500">{offer.category} • {offer.payoutModel} • {offer.landings.length} лендингов</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
            {offer.landings.length} ссылок
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-400 font-mono mb-2 block">Лендинг</Label>
              <Select value={selectedLandingId} onValueChange={setSelectedLandingId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white font-mono text-sm" data-testid={`select-landing-${offer.id}`}>
                  <SelectValue placeholder="Выберите лендинг" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10">
                  {offer.landings.map((landing) => (
                    <SelectItem key={landing.id} value={landing.id} className="font-mono text-sm">
                      {landing.landingName || landing.geo} — ${landing.partnerPayout}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-slate-400 font-mono">Макросы (опционально)</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {["sub1", "sub2", "sub3", "sub4", "sub5"].map((sub) => (
                <div key={sub}>
                  <Input
                    placeholder={sub.toUpperCase()}
                    value={macros[sub as keyof MacroConfig]}
                    onChange={(e) => setMacros(prev => ({ ...prev, [sub]: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white font-mono text-xs h-8"
                    data-testid={`input-${sub}-${offer.id}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {selectedLanding && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-mono">Трекинг-ссылка</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded p-3 overflow-x-auto">
                  <code className="text-xs text-emerald-400 font-mono whitespace-nowrap" data-testid={`tracking-link-${offer.id}`}>
                    {generateTrackingLink(selectedLanding)}
                  </code>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-10 px-3 ${copiedLink === selectedLanding.id ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-white/10 text-white hover:bg-white/10'}`}
                  onClick={() => copyToClipboard(generateTrackingLink(selectedLanding), selectedLanding.id)}
                  data-testid={`button-copy-${offer.id}`}
                >
                  {copiedLink === selectedLanding.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-slate-800/30 rounded p-3 border border-white/5">
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
              <strong>Поддерживаемые макросы:</strong> {"{click_id}"} — авто-генерируется при клике • 
              sub1-sub5 — передаются в постбек рекламодателю
            </p>
          </div>

          <div className="pt-2 border-t border-white/5">
            <h4 className="text-xs text-slate-400 font-mono mb-2">Все лендинги</h4>
            <div className="space-y-2">
              {offer.landings.map((landing) => {
                const link = generateTrackingLink(landing);
                return (
                  <div key={landing.id} className="flex items-center justify-between bg-white/[0.02] rounded p-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-xs font-mono text-white truncate">
                        {landing.landingName || `Landing ${landing.geo}`}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{landing.geo} • ${landing.partnerPayout}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 px-2 ${copiedLink === landing.id ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                      onClick={() => copyToClipboard(link, landing.id)}
                      data-testid={`button-copy-landing-${landing.id}`}
                    >
                      {copiedLink === landing.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function PublisherLinks() {
  const { t } = useTranslation();
  const { selectedAdvertiserId, isPendingPartnership } = useAdvertiserContext();

  const { data: user } = useQuery<{ id: string }>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const { data: approvedOffers, isLoading } = useQuery<ApprovedOffer[]>({
    queryKey: ["/api/publisher/offers-approved", selectedAdvertiserId],
    queryFn: async () => {
      const url = selectedAdvertiserId 
        ? `/api/publisher/offers-approved?advertiser_id=${selectedAdvertiserId}`
        : "/api/publisher/offers-approved";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch approved offers");
      return res.json();
    },
  });

  if (isPendingPartnership) {
    return <PendingPartnershipOverlay />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const offersWithLandings = approvedOffers?.filter(o => o.landings && o.landings.length > 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white mb-2" data-testid="text-links-title">
            Генератор ссылок
          </h2>
          <p className="text-slate-400 text-sm font-mono">
            Генерация трекинг-ссылок с макросами для ваших офферов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-mono text-slate-400">{offersWithLandings.length} офферов</span>
        </div>
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <LinkIcon className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Как работают ссылки</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Трекинг-ссылки автоматически генерируют уникальный <code className="text-blue-400">click_id</code> при каждом клике.
              Вы можете добавить дополнительные параметры (sub1-sub5) для отслеживания источников трафика.
              Все клики записываются в статистику и передаются рекламодателю.
            </p>
          </div>
        </div>
      </Card>

      {offersWithLandings.length === 0 ? (
        <Card className="bg-[#0A0A0A] border-white/10 p-12 text-center">
          <LinkIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Нет доступных офферов</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Чтобы генерировать ссылки, сначала получите доступ к офферам в разделе "Офферы"
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {offersWithLandings.map((offer) => (
            <OfferLinkGenerator 
              key={offer.id} 
              offer={offer} 
              publisherId={user?.id || ""} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
