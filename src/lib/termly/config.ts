/** Termly policy document UUIDs from Dashboard → Policy → Embed → Code snippet (data-id). */
export function getTermlyPrivacyPolicyId(): string | undefined {
  return process.env.NEXT_PUBLIC_TERMLY_PRIVACY_POLICY_ID?.trim() || undefined;
}

export function getTermlyTermsPolicyId(): string | undefined {
  return process.env.NEXT_PUBLIC_TERMLY_TERMS_POLICY_ID?.trim() || undefined;
}

export function getTermlyCookiePolicyId(): string | undefined {
  return process.env.NEXT_PUBLIC_TERMLY_COOKIE_POLICY_ID?.trim() || undefined;
}

/** Termly CMP website UUID for cookie consent banner (optional). */
export function getTermlyWebsiteUuid(): string | undefined {
  return process.env.NEXT_PUBLIC_TERMLY_WEBSITE_UUID?.trim() || undefined;
}

export function isTermlyPrivacyConfigured(): boolean {
  return Boolean(getTermlyPrivacyPolicyId());
}

export function isTermlyTermsConfigured(): boolean {
  return Boolean(getTermlyTermsPolicyId());
}

export function getContactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "shevtzov12@gmail.com";
}
