export function isMaintenanceEnabled(): boolean {
  const v = process.env.HOOKKIT_MAINTENANCE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
