import Link from "next/link";
import { getContactEmail } from "@/lib/termly/config";

export function SiteFooter() {
  const contact = getContactEmail();

  return (
    <footer className="landing-footer">
      <Link href="/docs">Docs</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/cookies">Cookies</Link>
      <a href={`mailto:${contact}`}>Contact</a>
      <span>HookKit · static-first backend</span>
    </footer>
  );
}
