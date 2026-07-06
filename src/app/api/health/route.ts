import { isMaintenanceEnabled } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "hookkit",
    maintenance: isMaintenanceEnabled(),
  });
}
