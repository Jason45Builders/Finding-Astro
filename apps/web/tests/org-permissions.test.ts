import { describe, expect, it } from "vitest";
import { getOrgRolePermissions, hasOrgPermission, isOrgRole } from "@/lib/org-permissions";

describe("NGO role permission profiles", () => {
  it("recognizes all supported organization roles", () => {
    expect(isOrgRole("org_admin")).toBe(true);
    expect(isOrgRole("rescue_coordinator")).toBe(true);
    expect(isOrgRole("not_a_role")).toBe(false);
  });

  it("gives org admins wildcard access", () => {
    expect(getOrgRolePermissions("org_admin")["*"]).toBe(true);
    expect(hasOrgPermission("org_admin", "members:write")).toBe(true);
  });

  it("gives each operational role its intended capabilities", () => {
    expect(hasOrgPermission("rescue_coordinator", "cases:write")).toBe(true);
    expect(hasOrgPermission("rescue_coordinator", "expenses:approve")).toBe(false);
    expect(hasOrgPermission("medical_coordinator", "followups:write")).toBe(true);
    expect(hasOrgPermission("finance", "expenses:approve")).toBe(true);
    expect(hasOrgPermission("volunteer", "members:write")).toBe(false);
    expect(hasOrgPermission("vet", "cases:write")).toBe(true);
    expect(hasOrgPermission("foster", "foster:write")).toBe(true);
  });

  it("does not honor arbitrary client permission keys", () => {
    const permissions = getOrgRolePermissions("volunteer");
    expect(permissions["*"]).toBeUndefined();
    expect(permissions["expenses:approve"]).toBeUndefined();
  });
});
