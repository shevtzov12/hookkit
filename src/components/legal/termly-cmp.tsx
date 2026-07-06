"use client";

import { useEffect, useMemo, useRef } from "react";
import { getTermlyWebsiteUuid } from "@/lib/termly/config";

const SCRIPT_SRC_BASE = "https://app.termly.io";

/** Termly Consent Management Platform (cookie banner). No-op without NEXT_PUBLIC_TERMLY_WEBSITE_UUID. */
export function TermlyCMP() {
  const websiteUuid = getTermlyWebsiteUuid();
  const isScriptAdded = useRef(false);

  const scriptSrc = useMemo(() => {
    if (!websiteUuid) return null;
    const src = new URL(`${SCRIPT_SRC_BASE}/resource-blocker/${websiteUuid}`);
    src.searchParams.set("autoBlock", "on");
    return src.toString();
  }, [websiteUuid]);

  useEffect(() => {
    if (!scriptSrc || isScriptAdded.current) return;

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    document.head.appendChild(script);
    isScriptAdded.current = true;
  }, [scriptSrc]);

  return null;
}
