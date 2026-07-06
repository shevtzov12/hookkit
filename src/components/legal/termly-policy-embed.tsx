"use client";

import { useEffect } from "react";

const EMBED_SCRIPT_SRC = "https://app.termly.io/embed-policy.min.js";
const EMBED_SCRIPT_ID = "termly-embed-policy-js";

type TermlyPolicyEmbedProps = {
  policyId: string;
};

export function TermlyPolicyEmbed({ policyId }: TermlyPolicyEmbedProps) {
  useEffect(() => {
    if (document.getElementById(EMBED_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = EMBED_SCRIPT_ID;
    script.src = EMBED_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div
      // Termly reads this attribute from the embed target element.
      // @ts-expect-error Termly uses a non-standard `name` attribute on div.
      name="termly-embed"
      data-id={policyId}
      data-type="iframe"
      className="termly-embed"
    />
  );
}
