import { Request, Response, NextFunction } from "express";
import { 
  type StaffRole, 
  type StaffSection, 
  canStaffAccess, 
  canStaffWrite 
} from "../shared/staffPermissions";

export function requireStaffAccess(section: StaffSection, requireWrite: boolean = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as any;
    
    if (!session?.isStaff) {
      return next();
    }
    
    const staffRole = session.staffRole as StaffRole;
    
    if (!staffRole) {
      return res.status(403).json({ message: "Staff role not found" });
    }
    
    const hasViewAccess = canStaffAccess(staffRole, section);
    const hasWriteAccess = canStaffWrite(staffRole, section);
    
    if (!hasViewAccess) {
      return res.status(403).json({ 
        message: `Access denied: ${staffRole} role cannot access ${section}` 
      });
    }
    
    if (requireWrite && !hasWriteAccess) {
      return res.status(403).json({ 
        message: `Access denied: ${staffRole} role has read-only access to ${section}` 
      });
    }
    
    next();
  };
}

export function requireStaffViewAccess(section: StaffSection) {
  return requireStaffAccess(section, false);
}

export function requireStaffWriteAccess(section: StaffSection) {
  return requireStaffAccess(section, true);
}
