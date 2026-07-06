import Link from "next/link";
import { SiteFooter } from "@/components/legal/site-footer";

export default function MaintenancePage() {
  return (
    <div className="landing">
      <div className="landing-grid" aria-hidden />
      <main className="landing-main" style={{ textAlign: "center", maxWidth: 480 }}>
        <div className="landing-logo" style={{ justifyContent: "center" }}>
          <span className="landing-name">HookKit</span>
        </div>
        <h1 className="landing-title" style={{ fontSize: "1.75rem" }}>
          Staging — скоро откроемся
        </h1>
        <p className="landing-lead" style={{ marginBottom: 24 }}>
          Публичный лендинг временно скрыт. Команда может войти в dashboard.
        </p>
        <div className="landing-actions" style={{ justifyContent: "center" }}>
          <Link href="/dashboard" className="landing-btn landing-btn-primary">
            Dashboard
          </Link>
          <Link href="/sign-in" className="landing-btn landing-btn-ghost">
            Sign in
          </Link>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
