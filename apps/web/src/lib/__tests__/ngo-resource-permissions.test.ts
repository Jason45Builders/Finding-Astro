import { describe, expect, it } from "vitest";
import { getOrgRolePermissions, hasOrgPermission } from "@/lib/org-permissions";

describe("NGO hardening resource permissions", () => {
  it("grants medical authority only to medical-capable roles", () => {
    expect(hasOrgPermission("medical_coordinator", "medical:write")).toBe(true);
    expect(hasOrgPermission("vet", "medical:write")).toBe(true);
    expect(hasOrgPermission("volunteer", "medical:write")).toBe(false);
    expect(hasOrgPermission("finance", "medical:write")).toBe(false);
  });

  it("keeps adoption and foster scopes separate", () => {
    expect(hasOrgPermission("adoption_coordinator", "adoptions:write")).toBe(true);
    expect(hasOrgPermission("adoption_coordinator", "foster:write")).toBe(false);
    expect(hasOrgPermission("foster", "foster:write")).toBe(true);
    expect(hasOrgPermission("foster", "adoptions:write")).toBe(false);
  });

  it("never exposes client-editable permissions from the role profile", () => {
    const permissions = getOrgRolePermissions("volunteer");
    expect(permissions["*"]).not.toBe(true);
    expect(permissions["members:write"]).not.toBe(true);
    expect(permissions["expenses:approve"]).not.toBe(true);
  });
});
