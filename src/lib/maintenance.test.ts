import { describe, expect, it, afterEach } from "vitest";
import { isMaintenanceEnabled } from "@/lib/maintenance";

describe("maintenance", () => {
  afterEach(() => {
    delete process.env.HOOKKIT_MAINTENANCE;
  });

  it("is off by default", () => {
    expect(isMaintenanceEnabled()).toBe(false);
  });

  it("is on for 1/true/yes", () => {
    process.env.HOOKKIT_MAINTENANCE = "1";
    expect(isMaintenanceEnabled()).toBe(true);
    process.env.HOOKKIT_MAINTENANCE = "true";
    expect(isMaintenanceEnabled()).toBe(true);
  });
});
