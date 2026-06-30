import { requireV1Access } from "@/lib/auth/require-access";
import { getDb, isDatabaseEnabled } from "@/lib/db/client";
import { forms, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireV1Access(request);
  if (!access.ok) return access.response;
  if (!isDatabaseEnabled()) {
    return Response.json({
      ok: true,
      storage: "file",
      forms: [],
      hint: "Set DATABASE_URL and run npm run db:push to enable Postgres storage.",
    });
  }

  const db = getDb();
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, access.userId!))
    .limit(1);

  if (!dbUser) {
    return Response.json({ ok: true, storage: "neon", forms: [] });
  }

  const rows = await db
    .select({
      id: forms.id,
      publicId: forms.publicId,
      name: forms.name,
      isGuest: forms.isGuest,
      createdAt: forms.createdAt,
    })
    .from(forms)
    .where(eq(forms.userId, dbUser.id));

  return Response.json({
    ok: true,
    storage: "neon",
    forms: rows.map((row) => ({
      id: row.id,
      publicId: row.publicId,
      name: row.name,
      isGuest: row.isGuest,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
