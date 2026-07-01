import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { isClerkEnabled } from "@/lib/auth/config";
import { requireV1Access } from "@/lib/auth/require-access";
import { getDb, isDatabaseEnabled } from "@/lib/db/client";
import { forms, users } from "@/lib/db/schema";
import { DEMO_FORM_SLUG } from "@/lib/mock-data";
import {
  createUserFormFile,
  listUserFormsFile,
} from "@/lib/store/forms-registry";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `frm_${base || "form"}_${suffix}`;
}

async function listFileForms() {
  const userForms = await listUserFormsFile();
  return Response.json({
    ok: true,
    storage: "file",
    forms: [
      {
        id: "demo",
        publicId: DEMO_FORM_SLUG,
        name: "Demo (live)",
        isGuest: true,
        createdAt: null,
      },
      ...userForms.map((row) => ({
        id: row.id,
        publicId: row.publicId,
        name: row.name,
        isGuest: false,
        createdAt: row.createdAt,
      })),
    ],
  });
}

export async function GET(request: Request) {
  if (!isDatabaseEnabled() && !isClerkEnabled()) {
    return listFileForms();
  }

  const access = await requireV1Access(request);
  if (!access.ok) return access.response;

  if (!isDatabaseEnabled()) {
    return listFileForms();
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

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return Response.json({ ok: false, error: "name required" }, { status: 400 });
  }

  if (!isDatabaseEnabled()) {
    if (isClerkEnabled()) {
      const access = await requireV1Access(request);
      if (!access.ok) return access.response;
    }

    const row = await createUserFormFile(name);
    return Response.json({
      ok: true,
      storage: "file",
      form: {
        id: row.id,
        publicId: row.publicId,
        name: row.name,
        url: `/f/${row.publicId}`,
      },
    });
  }

  if (!isClerkEnabled()) {
    return Response.json({ ok: false, error: "clerk not configured" }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
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
    .insert(forms)
    .values({
      userId: dbUser.id,
      publicId,
      name,
      isGuest: false,
      settings: { redirectUrl: "/thank-you" },
    })
    .returning();

  return Response.json({
    ok: true,
    form: {
      id: row.id,
      publicId: row.publicId,
      name: row.name,
      url: `/f/${row.publicId}`,
    },
  });
}
