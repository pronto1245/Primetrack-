import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export type StaffRole = "manager" | "analyst" | "support" | "finance";

interface StaffContextType {
  isStaff: boolean;
  staffRole: StaffRole;
  staffAdvertiserId: string | null;
  advertiserName: string | null;
  canWrite: (section: StaffSection) => boolean;
  canAccess: (section: StaffSection) => boolean;
}

export type StaffSection = 
  | "overview"
  | "offers"
  | "partners"
  | "requests"
  | "reports"
  | "finance"
  | "antifraud"
  | "postbacks"
  | "news"
  | "team"
  | "settings";

const ROLE_ACCESS: Record<StaffRole, { view: StaffSection[]; write: StaffSection[] }> = {
  manager: {
    view: ["overview", "offers", "partners", "requests", "reports", "finance", "antifraud", "postbacks", "news", "team", "settings"],
    write: ["overview", "offers", "partners", "requests", "reports", "finance", "antifraud", "postbacks", "news", "team", "settings"],
  },
  analyst: {
    view: ["overview", "offers", "reports", "antifraud", "postbacks", "news"],
    write: [], // Read-only
  },
  support: {
    view: ["overview", "partners", "requests", "postbacks", "news"],
    write: ["partners", "requests"], // Can manage partners and requests
  },
  finance: {
    view: ["overview", "finance", "postbacks", "news"],
    write: ["finance"], // Can manage finance
  },
};

const StaffContext = createContext<StaffContextType>({
  isStaff: false,
  staffRole: "manager",
  staffAdvertiserId: null,
  advertiserName: null,
  canWrite: () => true,
  canAccess: () => true,
});

export function StaffProvider({ children }: { children: ReactNode }) {
  const { data: userData } = useQuery<{
    isStaff?: boolean;
    staffRole?: StaffRole;
    staffAdvertiserId?: string;
    advertiserName?: string;
  }>({
    queryKey: ["/api/user"],
  });

  const isStaff = userData?.isStaff || false;
  const staffRole: StaffRole = (userData?.staffRole as StaffRole) || "manager";
  const staffAdvertiserId = userData?.staffAdvertiserId || null;
  const advertiserName = userData?.advertiserName || null;

  const canAccess = (section: StaffSection): boolean => {
    if (!isStaff) return true; // Non-staff has full access
    return ROLE_ACCESS[staffRole].view.includes(section);
  };

  const canWrite = (section: StaffSection): boolean => {
    if (!isStaff) return true; // Non-staff has full access
    return ROLE_ACCESS[staffRole].write.includes(section);
  };

  return (
    <StaffContext.Provider
      value={{
        isStaff,
        staffRole,
        staffAdvertiserId,
        advertiserName,
        canWrite,
        canAccess,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  return useContext(StaffContext);
}
