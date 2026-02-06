export const STAFF_SECTIONS = [
  "overview",
  "offers", 
  "partners",
  "requests",
  "reports",
  "finance",
  "antifraud",
  "postbacks",
  "news",
  "team",
  "referrals",
  "settings",
] as const;

export type StaffSection = typeof STAFF_SECTIONS[number];

export type StaffRole = "manager" | "analyst" | "support" | "finance";

export interface SectionPermission {
  canView: boolean;
  canWrite: boolean;
}

export const STAFF_PERMISSIONS: Record<StaffRole, Record<StaffSection, SectionPermission>> = {
  manager: {
    overview: { canView: true, canWrite: true },
    offers: { canView: true, canWrite: true },
    partners: { canView: true, canWrite: true },
    requests: { canView: true, canWrite: true },
    reports: { canView: true, canWrite: true },
    finance: { canView: false, canWrite: false },
    antifraud: { canView: true, canWrite: true },
    postbacks: { canView: true, canWrite: true },
    news: { canView: true, canWrite: true },
    team: { canView: false, canWrite: false },
    referrals: { canView: false, canWrite: false },
    settings: { canView: false, canWrite: false },
  },
  analyst: {
    overview: { canView: true, canWrite: false },
    offers: { canView: true, canWrite: false },
    partners: { canView: false, canWrite: false },
    requests: { canView: false, canWrite: false },
    reports: { canView: true, canWrite: false },
    finance: { canView: false, canWrite: false },
    antifraud: { canView: true, canWrite: false },
    postbacks: { canView: true, canWrite: false },
    news: { canView: true, canWrite: false },
    team: { canView: false, canWrite: false },
    referrals: { canView: false, canWrite: false },
    settings: { canView: false, canWrite: false },
  },
  support: {
    overview: { canView: true, canWrite: false },
    offers: { canView: false, canWrite: false },
    partners: { canView: true, canWrite: true },
    requests: { canView: true, canWrite: true },
    reports: { canView: false, canWrite: false },
    finance: { canView: false, canWrite: false },
    antifraud: { canView: false, canWrite: false },
    postbacks: { canView: true, canWrite: false },
    news: { canView: true, canWrite: false },
    team: { canView: false, canWrite: false },
    referrals: { canView: false, canWrite: false },
    settings: { canView: false, canWrite: false },
  },
  finance: {
    overview: { canView: true, canWrite: false },
    offers: { canView: false, canWrite: false },
    partners: { canView: false, canWrite: false },
    requests: { canView: false, canWrite: false },
    reports: { canView: false, canWrite: false },
    finance: { canView: true, canWrite: true },
    antifraud: { canView: false, canWrite: false },
    postbacks: { canView: true, canWrite: false },
    news: { canView: true, canWrite: false },
    team: { canView: false, canWrite: false },
    referrals: { canView: false, canWrite: false },
    settings: { canView: false, canWrite: false },
  },
};

export function getStaffPermission(role: StaffRole, section: StaffSection): SectionPermission {
  return STAFF_PERMISSIONS[role]?.[section] ?? { canView: false, canWrite: false };
}

export function canStaffAccess(role: StaffRole, section: StaffSection): boolean {
  return getStaffPermission(role, section).canView;
}

export function canStaffWrite(role: StaffRole, section: StaffSection): boolean {
  return getStaffPermission(role, section).canWrite;
}

export const PATH_TO_SECTION: Record<string, StaffSection> = {
  "": "overview",
  "offers": "offers",
  "partners": "partners",
  "requests": "requests",
  "reports": "reports",
  "finance": "finance",
  "antifraud": "antifraud",
  "postbacks": "postbacks",
  "news": "news",
  "team": "team",
  "referrals": "referrals",
  "settings": "settings",
};

export function getSectionFromPath(path: string): StaffSection | null {
  const segment = path.split('/').filter(Boolean).pop() || "";
  if (path.match(/\/dashboard\/advertiser\/?$/)) return "overview";
  if (path.includes("/offer/")) return "offers";
  if (path.includes("/partner/")) return "partners";
  return PATH_TO_SECTION[segment] ?? null;
}

export const API_ENDPOINT_SECTIONS: Record<string, StaffSection> = {
  "/api/offers": "offers",
  "/api/partners": "partners",
  "/api/access-requests": "requests",
  "/api/advertiser/balance": "finance",
  "/api/advertiser/transactions": "finance",
  "/api/advertiser/payout": "finance",
  "/api/advertiser/settings": "settings",
  "/api/advertiser/team": "team",
  "/api/antifraud": "antifraud",
  "/api/webhooks": "postbacks",
  "/api/news": "news",
};

export function getSectionFromEndpoint(endpoint: string): StaffSection | null {
  for (const [pattern, section] of Object.entries(API_ENDPOINT_SECTIONS)) {
    if (endpoint.startsWith(pattern)) {
      return section;
    }
  }
  return null;
}
