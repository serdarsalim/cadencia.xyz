"use client";

import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    // If we're in a popup, close it and refresh the parent
    if (window.opener) {
      window.opener.location.reload();
      window.close();
    } else {
      // Otherwise just redirect to home
      window.location.href = "/";
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-foreground border-r-transparent"></div>
        <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
          Signing you in...
        </p>
      </div>
    </div>
  );
}
