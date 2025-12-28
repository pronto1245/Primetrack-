import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";

interface PublisherAdvertiser {
  id: string;
  advertiserId: string;
  advertiserName: string;
  advertiserEmail: string;
  status: string;
}

interface AdvertiserSwitcherProps {
  selectedAdvertiserId: string | null;
  onSelect: (advertiserId: string | null) => void;
}

export function AdvertiserSwitcher({ selectedAdvertiserId, onSelect }: AdvertiserSwitcherProps) {
  const { t } = useTranslation();
  const [advertisers, setAdvertisers] = useState<PublisherAdvertiser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdvertisers = async () => {
      try {
        const res = await fetch("/api/publisher/advertisers", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setAdvertisers(data);
          
          const savedId = localStorage.getItem("selectedAdvertiserId");
          if (savedId && data.some((a: PublisherAdvertiser) => a.advertiserId === savedId)) {
            if (selectedAdvertiserId !== savedId) {
              onSelect(savedId);
            }
          } else if (data.length > 0 && !selectedAdvertiserId) {
            onSelect(data[0].advertiserId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch advertisers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdvertisers();
  }, [selectedAdvertiserId]);

  const handleSelect = (value: string) => {
    const advId = value === "all" ? null : value;
    localStorage.setItem("selectedAdvertiserId", advId || "");
    onSelect(advId);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("loading", "Loading...")}</span>
      </div>
    );
  }

  if (advertisers.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>{t("noAdvertisers", "No advertisers")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" data-testid="advertiser-switcher">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={selectedAdvertiserId || "all"} 
        onValueChange={handleSelect}
      >
        <SelectTrigger className="w-[200px] h-9" data-testid="select-advertiser">
          <SelectValue placeholder={t("selectAdvertiser", "Select advertiser")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="option-all-advertisers">
            {t("allAdvertisers", "All Advertisers")}
          </SelectItem>
          {advertisers.map((adv) => (
            <SelectItem 
              key={adv.advertiserId} 
              value={adv.advertiserId}
              data-testid={`option-advertiser-${adv.advertiserId}`}
            >
              {adv.advertiserName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
