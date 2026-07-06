"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hookkit-cookie-notice-dismissed";

/** Minimal cookie notice when Termly CMP is not configured. */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div className="cookie-notice" role="dialog" aria-label="Cookie notice">
      <p>
        We use essential cookies for sign-in (Clerk) and spam protection (Cloudflare Turnstile).{" "}
        <Link href="/cookies">Cookie Policy</Link>
        {" · "}
        <Link href="/privacy">Privacy Policy</Link>
      </p>
      <button type="button" className="cookie-notice-btn" onClick={dismiss}>
        OK
      </button>
    </div>
  );
}
