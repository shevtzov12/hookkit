"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

export function ClerkAuthNav() {
  if (!clerkEnabled) {
    return (
      <Link href="/dashboard" className="landing-btn landing-btn-primary">
        Open dashboard
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
          <button type="button" className="landing-btn landing-btn-ghost">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="redirect" forceRedirectUrl="/dashboard">
          <button type="button" className="landing-btn landing-btn-primary">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className="landing-btn landing-btn-primary">
          Dashboard
        </Link>
        <UserButton />
      </Show>
    </>
  );
}
