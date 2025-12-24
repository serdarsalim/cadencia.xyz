"use client";

export default function DesignTestPage() {
  const sampleDate = "DEC 21–27, 2025";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Date Heading Style Options</h1>
          <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
            Pick your favorite design for the week date heading
          </p>
        </div>

        <div className="space-y-8">
          {/* Option 1: Sentence case, normal spacing */}
          <div className="border-2 border-blue-500 rounded-lg p-8 bg-blue-50 dark:bg-blue-950/20">
            <div className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 font-semibold">
              Option 1: Sentence Case, Normal Spacing (Recommended)
            </div>
            <div className="flex items-center justify-center gap-4">
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                ←
              </button>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
                Dec 21–27, 2025
              </h1>
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                →
              </button>
            </div>
            <p className="text-xs text-center mt-3 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
              Clean, modern, readable - like Apple Calendar or Notion
            </p>
          </div>

          {/* Option 2: Bold with accent color */}
          <div className="border-2 border-purple-500 rounded-lg p-8 bg-purple-50 dark:bg-purple-950/20">
            <div className="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 font-semibold">
              Option 2: Bold with Color Accent
            </div>
            <div className="flex items-center justify-center gap-4">
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                ←
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                Dec 21–27, 2025
              </h1>
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                →
              </button>
            </div>
            <p className="text-xs text-center mt-3 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
              More prominent with subtle color accent
            </p>
          </div>

          {/* Option 3: Split format */}
          <div className="border-2 border-emerald-500 rounded-lg p-8 bg-emerald-50 dark:bg-emerald-950/20">
            <div className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 font-semibold">
              Option 3: Split Format with Hierarchy
            </div>
            <div className="flex items-center justify-center gap-4">
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                ←
              </button>
              <div className="text-center">
                <div className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)] mb-1">
                  2025
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                  Dec 21–27
                </h1>
              </div>
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                →
              </button>
            </div>
            <p className="text-xs text-center mt-3 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
              Visual hierarchy, trendy design
            </p>
          </div>

          {/* Option 4: Monospace technical */}
          <div className="border-2 border-amber-500 rounded-lg p-8 bg-amber-50 dark:bg-amber-950/20">
            <div className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 font-semibold">
              Option 4: Monospace Technical Style
            </div>
            <div className="flex items-center justify-center gap-4">
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                ←
              </button>
              <h1 className="text-xl sm:text-2xl font-mono font-semibold uppercase tracking-wider text-foreground">
                DEC 21-27, 2025
              </h1>
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                →
              </button>
            </div>
            <p className="text-xs text-center mt-3 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
              Technical, dashboard feel - keeps uppercase
            </p>
          </div>

          {/* Option 5: Current style */}
          <div className="border-2 border-gray-400 rounded-lg p-8 bg-gray-50 dark:bg-gray-950/20">
            <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 font-semibold">
              Current Style (For Comparison)
            </div>
            <div className="flex items-center justify-center gap-4">
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                ←
              </button>
              <h1 className="text-xl sm:text-2xl font-semibold uppercase tracking-[0.3em] text-foreground">
                {sampleDate}
              </h1>
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                →
              </button>
            </div>
            <p className="text-xs text-center mt-3 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
              Your current styling
            </p>
          </div>

          {/* Option 6: Minimal light */}
          <div className="border-2 border-rose-500 rounded-lg p-8 bg-rose-50 dark:bg-rose-950/20">
            <div className="text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 font-semibold">
              Option 6: Minimal Light Weight
            </div>
            <div className="flex items-center justify-center gap-4">
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                ←
              </button>
              <h1 className="text-2xl sm:text-3xl font-light text-foreground">
                Dec 21–27, 2025
              </h1>
              <button className="rounded-full px-2 py-1 text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-foreground">
                →
              </button>
            </div>
            <p className="text-xs text-center mt-3 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
              Ultra-minimal, elegant, light weight
            </p>
          </div>
        </div>

        <div className="text-center pt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition"
          >
            Back to App
          </a>
        </div>
      </div>
    </div>
  );
}
