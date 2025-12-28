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

export function AdvertiserProvider({ children, role }: { children: ReactNode; role: string }) {
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string>("");

  const { data: advertisers = [], isLoading } = useQuery<AdvertiserInfo[]>({
    queryKey: ["/api/publisher/advertisers-extended"],
    enabled: role === "publisher",
  });

  useEffect(() => {
    if (advertisers.length > 0 && !selectedAdvertiserId) {
      setSelectedAdvertiserId(advertisers[0].id);
    }
  }, [advertisers, selectedAdvertiserId]);

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
