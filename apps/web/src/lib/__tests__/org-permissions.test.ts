import { describe, expect, it } from "vitest";
import { getOrgRolePermissions, hasOrgPermission, isOrgRole, canManageOrgRole } from "@/lib/org-permissions";

describe("NGO role permission profiles", () => {
  it("recognizes the supported roles", () => {
    expect(isOrgRole("org_admin")).toBe(true);
    expect(isOrgRole("foster")).toBe(true);
    expect(isOrgRole("not_a_role")).toBe(false);
  });

  it("derives capabilities server-side", () => {
    expect(getOrgRolePermissions("org_admin")["*"]).toBe(true);
    expect(hasOrgPermission("rescue_coordinator", "cases:write")).toBe(true);
    expect(hasOrgPermission("medical_coordinator", "medical:write")).toBe(true);
    expect(hasOrgPermission("adoption_coordinator", "adoptions:write")).toBe(true);
    expect(hasOrgPermission("finance", "expenses:approve")).toBe(true);
    expect(hasOrgPermission("volunteer", "members:write")).toBe(false);
    expect(getOrgRolePermissions("volunteer")["expenses:approve"]).toBeUndefined();
  });

  it("allows only org_admin to manage organization roles", () => {
    expect(canManageOrgRole("org_admin", "finance")).toBe(true);
    expect(canManageOrgRole("volunteer", "volunteer")).toBe(false);
    expect(canManageOrgRole("org_admin", "org_admin")).toBe(false);
  });
});
