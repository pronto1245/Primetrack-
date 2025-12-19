import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash, Copy, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

const MOCK_ADVERTISER_OFFERS = [
  { id: 201, name: "Crypto Pro Elite", status: "active", payout: "$850.00", geo: "Tier 1", category: "Crypto", cr: "2.4%" },
  { id: 202, name: "Dating SmartLink V2", status: "active", payout: "$4.50", geo: "WW", category: "Dating", cr: "12.1%" },
  { id: 203, name: "Keto Diet Master", status: "paused", payout: "$45.00", geo: "US, CA", category: "Nutra", cr: "1.8%" },
  { id: 204, name: "Casino Royale App", status: "active", payout: "$120.00", geo: "DE, AT", category: "Gambling", cr: "5.5%" },
];

export function AdvertiserOffers({ role }: { role: string }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white mb-2">{t('dashboard.offers.title')}</h2>
          <p className="text-slate-400 text-sm font-mono">{t('dashboard.offers.subtitle')}</p>
        </div>
        <Link href={`/dashboard/${role}/offers/new`}>
          <Button className="bg-blue-600 hover:bg-blue-500 text-white font-mono">
            <Plus className="w-4 h-4 mr-2" />
            {t('dashboard.offers.create')}
          </Button>
        </Link>
      </div>

      <Card className="bg-[#0A0A0A] border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder={t('dashboard.offers.searchPlaceholder')}
              className="w-full bg-white/5 border border-white/10 rounded pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <Button variant="outline" size="sm" className="border-white/10 text-slate-300 font-mono">
            <Filter className="w-4 h-4 mr-2" />
            {t('dashboard.offers.filter')}
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">{t('dashboard.offers.name')}</th>
                <th className="px-4 py-3 font-medium">{t('dashboard.offers.category')}</th>
                <th className="px-4 py-3 font-medium">{t('dashboard.offers.geo')}</th>
                <th className="px-4 py-3 font-medium">{t('dashboard.offers.payout')}</th>
                <th className="px-4 py-3 font-medium">{t('dashboard.offers.cr')}</th>
                <th className="px-4 py-3 font-medium">{t('dashboard.offers.status')}</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MOCK_ADVERTISER_OFFERS.map((offer) => (
                <tr key={offer.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-3 text-slate-500">#{offer.id}</td>
                  <td className="px-4 py-3 font-medium text-white group-hover:text-blue-400 transition-colors">{offer.name}</td>
                  <td className="px-4 py-3 text-slate-300">{offer.category}</td>
                  <td className="px-4 py-3 text-slate-300">{offer.geo}</td>
                  <td className="px-4 py-3 text-white font-bold">{offer.payout}</td>
                  <td className="px-4 py-3 text-emerald-500">{offer.cr}</td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {offer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-white"><Eye className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-blue-400"><Edit className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-red-400"><Trash className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
