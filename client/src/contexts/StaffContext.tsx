import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  type StaffRole, 
  type StaffSection,
  canStaffAccess,
  canStaffWrite,
  getSectionFromPath,
} from "@shared/staffPermissions";

export type { StaffRole, StaffSection };
export { getSectionFromPath };

interface StaffContextType {
  isStaff: boolean;
  staffRole: StaffRole;
  staffAdvertiserId: string | null;
  advertiserName: string | null;
  canWrite: (section: StaffSection) => boolean;
  canAccess: (section: StaffSection) => boolean;
}

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
    if (!isStaff) return true;
    return canStaffAccess(staffRole, section);
  };

  const canWrite = (section: StaffSection): boolean => {
    if (!isStaff) return true;
    return canStaffWrite(staffRole, section);
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
