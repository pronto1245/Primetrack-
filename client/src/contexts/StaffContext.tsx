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
  staffRole: StaffRole | null;
  staffId: string | null;
  staffAdvertiserId: string | null;
  advertiserName: string | null;
  staffLoading: boolean;
  canWrite: (section: StaffSection) => boolean;
  canAccess: (section: StaffSection) => boolean;
}

const StaffContext = createContext<StaffContextType>({
  isStaff: false,
  staffRole: null,
  staffId: null,
  staffAdvertiserId: null,
  advertiserName: null,
  staffLoading: true,
  canWrite: () => true,
  canAccess: () => true,
});

export function StaffProvider({ children }: { children: ReactNode }) {
  const { data: userData, isLoading } = useQuery<{
    id?: string;
    isStaff?: boolean;
    staffRole?: StaffRole;
    staffAdvertiserId?: string;
    advertiserName?: string;
  }>({
    queryKey: ["/api/user"],
  });

  const staffLoading = isLoading;
  const isStaff = userData?.isStaff || false;
  const staffRole: StaffRole | null = (userData?.staffRole as StaffRole) || null;
  const staffId = isStaff ? (userData?.id || null) : null;
  const staffAdvertiserId = userData?.staffAdvertiserId || null;
  const advertiserName = userData?.advertiserName || null;

  const canAccess = (section: StaffSection): boolean => {
    if (staffLoading) return true;
    if (!isStaff) return true;
    if (!staffRole) return true;
    return canStaffAccess(staffRole, section);
  };

  const canWrite = (section: StaffSection): boolean => {
    if (staffLoading) return true;
    if (!isStaff) return true;
    if (!staffRole) return true;
    return canStaffWrite(staffRole, section);
  };

  return (
    <StaffContext.Provider
      value={{
        isStaff,
        staffRole,
        staffId,
        staffAdvertiserId,
        advertiserName,
        staffLoading,
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
