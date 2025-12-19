import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search, Filter, ExternalLink, Globe, Tag, DollarSign, Building } from "lucide-react";
import { useTranslation } from "react-i18next";

const MOCK_PUBLISHER_OFFERS = [
  { id: 301, advertiser: "NutraKing Ltd", name: "Keto Slim Advanced", payout: "$45.00", geo: "US, CA, UK", category: "Nutra", epc: "$1.20", img: "bg-green-500/20" },
  { id: 302, advertiser: "TechCorp Global", name: "VPN Shield Pro", payout: "$25.00", geo: "WW", category: "Utilities", epc: "$0.85", img: "bg-blue-500/20" },
  { id: 303, advertiser: "FinSecure Inc", name: "Crypto Wealth System", payout: "$850.00", geo: "Tier 1", category: "Crypto", epc: "$4.50", img: "bg-yellow-500/20" },
  { id: 304, advertiser: "DatingGiant", name: "LoveMatch 18+", payout: "$3.50", geo: "DE, FR, IT", category: "Dating", epc: "$0.45", img: "bg-pink-500/20" },
  { id: 305, advertiser: "GameStudio X", name: "War of Kingdoms", payout: "$12.00", geo: "US, KR, JP", category: "Gaming", epc: "$0.90", img: "bg-purple-500/20" },
  { id: 306, advertiser: "NutraKing Ltd", name: "Brain Focus Pill", payout: "$55.00", geo: "US", category: "Nutra", epc: "$1.10", img: "bg-green-500/20" },
];

export function PublisherOffers({ role }: { role: string }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white mb-2">{t('dashboard.offers.marketplace')}</h2>
          <p className="text-slate-400 text-sm font-mono">{t('dashboard.offers.marketplaceDesc')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder={t('dashboard.offers.searchPlaceholder')}
            className="w-full bg-[#0A0A0A] border border-white/10 rounded pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-white/10 bg-[#0A0A0A] text-slate-300 font-mono hover:bg-white/5">
             <Filter className="w-4 h-4 mr-2" />
             Category
           </Button>
           <Button variant="outline" className="border-white/10 bg-[#0A0A0A] text-slate-300 font-mono hover:bg-white/5">
             <Globe className="w-4 h-4 mr-2" />
             Geo
           </Button>
           <Button variant="outline" className="border-white/10 bg-[#0A0A0A] text-slate-300 font-mono hover:bg-white/5">
             <Building className="w-4 h-4 mr-2" />
             Advertiser
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_PUBLISHER_OFFERS.map((offer) => (
          <Card key={offer.id} className="bg-[#0A0A0A] border-white/10 hover:border-emerald-500/50 transition-all group cursor-pointer">
            <CardContent className="p-0">
               <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                   <div className={`w-12 h-12 rounded-lg ${offer.img} flex items-center justify-center`}>
                     <Tag className="w-6 h-6 text-white/80" />
                   </div>
                   <div className="text-right">
                     <div className="text-xl font-bold text-white font-mono">{offer.payout}</div>
                     <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">PAYOUT (CPA)</div>
                   </div>
                 </div>
                 
                 <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{offer.name}</h3>
                 
                 <div className="flex items-center gap-2 mb-4">
                   <Building className="w-3 h-3 text-slate-500" />
                   <span className="text-xs text-slate-400">{offer.advertiser}</span>
                 </div>

                 <div className="grid grid-cols-2 gap-2 mb-6">
                   <div className="bg-white/5 rounded px-2 py-1.5">
                     <div className="text-[10px] text-slate-500 uppercase font-mono">GEO</div>
                     <div className="text-xs font-medium text-slate-300 truncate">{offer.geo}</div>
                   </div>
                   <div className="bg-white/5 rounded px-2 py-1.5">
                     <div className="text-[10px] text-slate-500 uppercase font-mono">EPC</div>
                     <div className="text-xs font-medium text-emerald-400">{offer.epc}</div>
                   </div>
                 </div>

                 <Button className="w-full bg-white/5 hover:bg-emerald-600 hover:text-white text-emerald-500 border border-emerald-500/30 transition-all font-mono text-xs font-bold">
                   GET LINK <ExternalLink className="w-3 h-3 ml-2" />
                 </Button>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
