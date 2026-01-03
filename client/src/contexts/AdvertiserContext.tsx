import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface AdvertiserInfo {
  id: string;
  username: string;
  email: string;
  offersCount: number;
  status: "active" | "pending" | "inactive" | "rejected";
  logoUrl: string | null;
  telegram: string | null;
  phone: string | null;
  companyName: string | null;
  // White-label
  brandName: string | null;
  primaryColor: string | null;
  customDomain: string | null;
  hidePlatformBranding: boolean;
}

interface AdvertiserContextType {
  advertisers: AdvertiserInfo[];
  selectedAdvertiserId: string;
  selectedAdvertiser: AdvertiserInfo | null;
  setSelectedAdvertiserId: (id: string) => void;
  isLoading: boolean;
  isPendingPartnership: boolean;
}

const AdvertiserContext = createContext<AdvertiserContextType | undefined>(undefined);

const STORAGE_KEY = "primetrack_selected_advertiser";

export function AdvertiserProvider({ children, role }: { children: ReactNode; role: string }) {
  const [selectedAdvertiserId, setSelectedAdvertiserIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  const setSelectedAdvertiserId = (id: string) => {
    setSelectedAdvertiserIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  const { data: advertisers = [], isLoading } = useQuery<AdvertiserInfo[]>({
    queryKey: ["/api/publisher/advertisers-extended"],
    queryFn: async () => {
      const res = await fetch("/api/publisher/advertisers-extended", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: role === "publisher",
  });

  useEffect(() => {
    if (advertisers.length > 0) {
      const savedId = selectedAdvertiserId;
      const savedExists = advertisers.some(a => a.id === savedId);
      if (!savedId || !savedExists) {
        setSelectedAdvertiserId(advertisers[0].id);
      }
    }
  }, [advertisers]);

  const selectedAdvertiser = advertisers.find(a => a.id === selectedAdvertiserId) || null;
  const isPendingPartnership = selectedAdvertiser?.status === "pending";

  if (role !== "publisher") {
    return <>{children}</>;
  }

  return (
    <AdvertiserContext.Provider
      value={{
        advertisers,
        selectedAdvertiserId,
        selectedAdvertiser,
        setSelectedAdvertiserId,
        isLoading,
        isPendingPartnership,
      }}
    >
      {children}
    </AdvertiserContext.Provider>
  );
}

export function useAdvertiserContext() {
  const context = useContext(AdvertiserContext);
  if (!context) {
    return {
      advertisers: [],
      selectedAdvertiserId: "",
      selectedAdvertiser: null,
      setSelectedAdvertiserId: () => {},
      isLoading: false,
      isPendingPartnership: false,
    };
  }
  return context;
}
