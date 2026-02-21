import Link from "next/link";
import type { Metadata } from "next";
import {
  APP_NAME,
  APP_TAGLINE,
} from "@/lib/branding";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn what Cadencia is for, how people use it, and why it is built around a GitHub-inspired productivity heatmap.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16 text-left">
        <p className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
          {APP_TAGLINE}
        </p>
        <h1 className="text-5xl font-light text-foreground">{APP_NAME}</h1>
        <p className="text-lg leading-relaxed text-[color-mix(in_srgb,var(--foreground)_75%,transparent)]">
          Cadencia started as a simple question: how do you keep promises to yourself when life gets noisy?
          The answer was a calm weekly rhythm and a visual year-at-a-glance heatmap.
          Inspired by GitHub&apos;s productivity heatmap.
        </p>
        <div className="rounded-3xl border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] p-6 text-sm text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] space-y-4">
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--foreground)_55%,transparent)] mb-2">
              How People Use It
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Run your week on purpose:</strong> Set weekly goals, then score each day against what you said matters.
              </li>
              <li>
                <strong>Keep behavioral guardrails:</strong> Use Do&apos;s and Don&apos;ts to stay honest about habits, not just outcomes.
              </li>
              <li>
                <strong>Track meaningful progress:</strong> Use OKRs when you need deeper structure and long-term direction.
              </li>
              <li>
                <strong>Work with other people:</strong> Share progress with mentors, accountability partners, or lightweight team check-ins.
              </li>
              <li>
                <strong>Review patterns, not moods:</strong> The calendar gives you a full-year view so trends are obvious.
              </li>
            </ul>
          </div>
          <p>
            Cadencia is built for clarity and accountability. It&apos;s free to use, open source, and designed to stay simple.
            It helps you decide what to do next, instead of drifting.
          </p>
          <p>
            Built by{" "}
            <a
              href="https://serdarsalim.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Serdar Salim
            </a>
            .
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
