import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getFormSubmissions } from "@/app/api/forms/[id]/submissions/route";
import { POST as postForm } from "@/app/f/[id]/route";
import { createApiKey } from "@/lib/auth/api-keys";

describe("resource ownership (file store)", () => {
  const userA = "user_owner_a";
  const userB = "user_owner_b";
  const formId = "frm_sec_owner_test";

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it("blocks cross-user read with API keys", async () => {
    const postReq = new NextRequest(`http://localhost:3000/f/${formId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "secret@corp.io", message: "confidential" }),
    });
    await postForm(postReq, { params: Promise.resolve({ id: formId }) });

    const { secret: keyA } = await createApiKey(userA, { label: "a" });
    const { secret: keyB } = await createApiKey(userB, { label: "b" });

    const claimReq = new Request(`http://localhost:3000/api/forms/${formId}/submissions`, {
      headers: { authorization: `Bearer ${keyA}` },
    });
    const claimRes = await getFormSubmissions(claimReq, {
      params: Promise.resolve({ id: formId }),
    });
    expect(claimRes.status).toBe(200);

    const crossReq = new Request(`http://localhost:3000/api/forms/${formId}/submissions`, {
      headers: { authorization: `Bearer ${keyB}` },
    });
    const crossRes = await getFormSubmissions(crossReq, {
      params: Promise.resolve({ id: formId }),
    });
    expect(crossRes.status).toBe(403);
  });
});
