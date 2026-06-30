import { DEMO_FORM_SLUG, DEMO_INBOX_SLUG } from "@/lib/mock-data";
import { getDb, isDatabaseEnabled } from "./client";
import { forms, inboxes } from "./schema";

export async function seedGuestDemo(): Promise<void> {
  if (!isDatabaseEnabled()) {
    console.log("DATABASE_URL not set — skip seed");
    return;
  }

  const db = getDb();

  await db
    .insert(inboxes)
    .values({
      publicId: DEMO_INBOX_SLUG,
      name: "Demo (read-only)",
      isGuest: true,
      paused: false,
    })
    .onConflictDoNothing({ target: inboxes.publicId });

  await db
    .insert(forms)
    .values({
      publicId: DEMO_FORM_SLUG,
      name: "Demo (live)",
      isGuest: true,
      settings: { redirectUrl: "/thank-you" },
    })
    .onConflictDoNothing({ target: forms.publicId });

  console.log("Seed complete: guest demo inbox + form");
}
