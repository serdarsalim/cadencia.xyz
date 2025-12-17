"use client";

import { useEffect, useState } from "react";

type Session = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
} | null;

export function UserInfo() {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!session?.user) {
    return (
      <a
        href="/api/auth/signin"
        className="text-sm text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] hover:text-foreground"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
        {session.user.email}
      </span>
      <a
        href="/api/auth/signout"
        className="text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] hover:text-foreground"
      >
        Sign out
      </a>
    </div>
  );
}
