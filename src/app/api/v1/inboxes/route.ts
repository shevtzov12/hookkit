import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseEnabled } from "@/lib/db/client";
import { inboxes, users } from "@/lib/db/schema";
import { isClerkEnabled } from "@/lib/auth/config";
import { requireV1Access } from "@/lib/auth/require-access";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `wh_${base || "inbox"}_${suffix}`;
}

export async function GET(request: Request) {
  const access = await requireV1Access(request);
  if (!access.ok) return access.response;

  if (!isDatabaseEnabled()) {
    return Response.json({
      ok: true,
      storage: "file",
      inboxes: [],
      hint: "Set DATABASE_URL for inbox CRUD.",
    });
  }

  const db = getDb();
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, access.userId!))
    .limit(1);

  if (!dbUser) {
    return Response.json({ ok: true, inboxes: [] });
  }

  const rows = await db.select().from(inboxes).where(eq(inboxes.userId, dbUser.id));

  return Response.json({
    ok: true,
    storage: "neon",
    inboxes: rows.map((row) => ({
      id: row.id,
      publicId: row.publicId,
      name: row.name,
      paused: row.paused,
      isGuest: row.isGuest,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  if (!isClerkEnabled()) {
    return Response.json({ ok: false, error: "clerk not configured" }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isDatabaseEnabled()) {
    return Response.json(
      { ok: false, error: "DATABASE_URL required for inbox CRUD" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return Response.json({ ok: false, error: "name required" }, { status: 400 });
  }

  const publicId = slugify(name);
  if (!PUBLIC_ID_PATTERN.test(publicId)) {
    return Response.json({ ok: false, error: "invalid generated id" }, { status: 400 });
  }

  const db = getDb();
  let [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  if (!dbUser) {
    [dbUser] = await db
      .insert(users)
      .values({ clerkId: userId, email: `${userId}@users.hookkit.local` })
      .returning({ id: users.id });
  }

  const [row] = await db
    .insert(inboxes)
    .values({
      userId: dbUser.id,
      publicId,
      name,
      isGuest: false,
    })
    .returning();

  return Response.json({
    ok: true,
    inbox: {
      id: row.id,
      publicId: row.publicId,
      name: row.name,
      url: `/h/${row.publicId}`,
    },
  });
}
