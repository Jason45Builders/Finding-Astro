export const ORG_ROLES = [
  "org_admin",
  "rescue_coordinator",
  "medical_coordinator",
  "adoption_coordinator",
  "finance",
  "volunteer",
  "vet",
  "foster",
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_PERMISSIONS = [
  "campaigns:write",
  "cases:write",
  "events:write",
  "expenses:write",
  "expenses:approve",
  "followups:write",
  "foster:write",
  "members:write",
  "reports:write",
  "settings:write",
  "shelters:write",
  "tasks:write",
  "volunteers:write",
] as const;

export type OrgPermission = (typeof ORG_PERMISSIONS)[number];

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, readonly OrgPermission[]> = {
  org_admin: ORG_PERMISSIONS,
  rescue_coordinator: [
    "cases:write",
    "tasks:write",
    "volunteers:write",
    "followups:write",
  ],
  medical_coordinator: [
    "cases:write",
    "tasks:write",
    "followups:write",
  ],
  adoption_coordinator: [
    "cases:write",
    "tasks:write",
    "followups:write",
    "campaigns:write",
  ],
  finance: [
    "expenses:write",
    "expenses:approve",
    "reports:write",
  ],
  volunteer: [
    "tasks:write",
  ],
  vet: [
    "cases:write",
    "followups:write",
  ],
  foster: [
    "foster:write",
    "followups:write",
  ],
};

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value);
}

export function getOrgRolePermissions(role: OrgRole): Record<string, boolean> {
  if (role === "org_admin") return { "*": true };
  return Object.fromEntries(ORG_ROLE_PERMISSIONS[role].map((permission) => [permission, true]));
}

export function hasOrgPermission(role: OrgRole, permission: string): boolean {
  if (!isOrgRole(role)) return false;
  return role === "org_admin" || ORG_ROLE_PERMISSIONS[role].includes(permission as OrgPermission);
}

export function canManageOrgRole(actorRole: OrgRole, targetRole: OrgRole): boolean {
  if (actorRole === "org_admin") return true;
  return actorRole === targetRole && actorRole !== "org_admin";
}
