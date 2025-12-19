import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Upload, Globe, DollarSign, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

export function CreateOfferForm({ role }: { role: string }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/${role}/offers`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold font-mono text-white">{t('dashboard.offers.createNew')}</h2>
          <p className="text-slate-400 text-sm font-mono">{t('dashboard.offers.createNewDesc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs font-mono uppercase">{t('dashboard.offers.form.title')}</Label>
                <Input className="bg-[#050505] border-white/10 text-white font-mono focus:border-blue-500" placeholder="e.g. Crypto Wealth Pro - US/CA" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs font-mono uppercase">{t('dashboard.offers.form.description')}</Label>
                <Textarea className="bg-[#050505] border-white/10 text-white font-mono min-h-[100px] focus:border-blue-500" placeholder="Offer description and instructions for publishers..." />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-xs font-mono uppercase">{t('dashboard.offers.form.trackingUrl')}</Label>
                <Input className="bg-[#050505] border-white/10 text-white font-mono focus:border-blue-500" placeholder="https://your-landing-page.com/?ref={click_id}" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono mb-4 border-b border-white/10 pb-2">Targeting & Payouts</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs font-mono uppercase flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Geo
                  </Label>
                  <Input className="bg-[#050505] border-white/10 text-white font-mono focus:border-blue-500" placeholder="US, UK, CA, DE" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs font-mono uppercase flex items-center gap-2">
                    <Tag className="w-3 h-3" /> Category
                  </Label>
                  <select className="w-full h-9 rounded-md bg-[#050505] border border-white/10 text-white px-3 text-sm font-mono focus:border-blue-500 focus:outline-none">
                    <option>Crypto</option>
                    <option>Nutra</option>
                    <option>Gambling</option>
                    <option>Dating</option>
                    <option>Sweepstakes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs font-mono uppercase flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> Payout (CPA)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <Input className="bg-[#050505] border-white/10 text-white font-mono pl-6 focus:border-blue-500" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                   <Label className="text-slate-300 text-xs font-mono uppercase">Currency</Label>
                   <select className="w-full h-9 rounded-md bg-[#050505] border border-white/10 text-white px-3 text-sm font-mono focus:border-blue-500 focus:outline-none">
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>RUB (₽)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Options */}
        <div className="space-y-6">
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardContent className="p-6">
              <Label className="text-slate-300 text-xs font-mono uppercase mb-4 block">Offer Preview Image</Label>
              <div className="border-2 border-dashed border-white/10 rounded-lg aspect-video flex flex-col items-center justify-center text-slate-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors cursor-pointer mb-4">
                 <Upload className="w-8 h-8 mb-2 opacity-50" />
                 <span className="text-xs font-mono">Upload Image</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-mono">
              Save Draft
            </Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-mono">
              <Save className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
