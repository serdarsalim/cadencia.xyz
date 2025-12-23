"use client";

import Link from "next/link";
import {
  APP_FEATURES,
  APP_LONG_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
} from "@/lib/branding";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16 text-left">
        <p className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
          {APP_TAGLINE}
        </p>
        <h1 className="text-5xl font-light text-foreground">{APP_NAME}</h1>
        <p className="text-base text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
          {APP_LONG_DESCRIPTION}
        </p>
        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
          {APP_FEATURES.map((feature) => (
            <span key={feature}>{feature}</span>
          ))}
        </div>
        <div className="rounded-3xl border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] p-6 text-sm text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] space-y-4">
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--foreground)_55%,transparent)] mb-2">
              How it works
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Set OKRs:</strong> Create objectives with key results. Track their status (not started, in progress, complete) and archive goals you're no longer pursuing.
              </li>
              <li>
                <strong>Plan weekly:</strong> Each week, write your goals in free text. This is your plan for the week—flexible and judgment-free.
              </li>
              <li>
                <strong>Score daily:</strong> Rate each day against your weekly plan. Click a day to cycle through: not achieved → partly achieved → achieved.
              </li>
              <li>
                <strong>Set behavioral anchors:</strong> Define your Do's and Don'ts—principles that guide your work habits.
              </li>
              <li>
                <strong>Review the year:</strong> The calendar shows your entire year at a glance. Click any day to jump to that week.
              </li>
            </ul>
          </div>
          <p>
            {APP_NAME} is built for personal clarity and accountability. Perfect for New Year's resolutions—the year view runs January to December. It is a personal workspace and does not provide professional advice. By using the product you acknowledge it is provided as-is.
          </p>
        </div>
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] transition hover:text-foreground"
        >
          ← Back to app
        </Link>
      </main>
    </div>
  );
}
