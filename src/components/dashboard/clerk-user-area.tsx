"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export function ClerkUserArea() {
  const { user } = useUser();
  const name = user?.fullName ?? user?.firstName ?? "Account";
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "HK";

  return (
    <div className="user-chip user-chip--clerk">
      <div className="avatar">{initials}</div>
      <div className="user-chip-label">
        <div className="user-name">{name}</div>
        <div className="user-plan">Signed in</div>
      </div>
      <div className="user-chip-menu">
        <UserButton />
      </div>
    </div>
  );
}
