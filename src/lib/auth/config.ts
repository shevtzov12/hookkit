import { DEMO_FORM_SLUG, DEMO_INBOX_SLUG } from "@/lib/mock-data";

export function isClerkEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim(),
  );
}

export function isGuestInboxId(publicId: string): boolean {
  return publicId === DEMO_INBOX_SLUG;
}

export function isGuestFormId(publicId: string): boolean {
  return publicId === DEMO_FORM_SLUG;
}

export function isGuestResourcePublicId(
  publicId: string,
  type: "inbox" | "form",
): boolean {
  return type === "inbox" ? isGuestInboxId(publicId) : isGuestFormId(publicId);
}
