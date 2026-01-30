import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface BrandingInfo {
  isWhiteLabel: boolean;
  brandName: string;
  logoUrl: string | null;
  hidePlatformBranding: boolean;
  advertiserId?: string;
}

interface BrandingContextType {
  branding: BrandingInfo;
  isLoading: boolean;
}

const defaultBranding: BrandingInfo = {
  isWhiteLabel: false,
  brandName: "Primetrack",
  logoUrl: null,
  hidePlatformBranding: false,
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  isLoading: true,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data: branding = defaultBranding, isLoading } = useQuery<BrandingInfo>({
    queryKey: ["/api/public/branding", window.location.hostname],
    queryFn: async () => {
      const res = await fetch(`/api/public/branding?domain=${window.location.hostname}`);
      if (!res.ok) return defaultBranding;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <BrandingContext.Provider value={{ branding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
