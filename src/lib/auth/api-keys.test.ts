import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  verifyApiKey,
} from "@/lib/auth/api-keys";

describe("api-keys (file store)", () => {
  const userId = "user_test_clerk_1";

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it("creates, lists, verifies, and revokes keys", async () => {
    const { record, secret } = await createApiKey(userId, {
      label: "ci",
      environment: "test",
    });

    expect(secret).toMatch(/^sk_test_/);
    expect(record.keyPrefix).toContain("…");

    const listed = await listApiKeys(userId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(record.id);

    const verified = await verifyApiKey(secret);
    expect(verified).toEqual({ userId, keyId: record.id });

    const revoked = await revokeApiKey(userId, record.id);
    expect(revoked).toBe(true);

    const afterRevoke = await verifyApiKey(secret);
    expect(afterRevoke).toBeNull();
  });

  it("rejects invalid key format", async () => {
    expect(await verifyApiKey("not-a-key")).toBeNull();
  });
});
