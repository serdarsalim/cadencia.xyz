"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadAllData, saveDayOffs, saveProductivity } from "@/lib/api";
import { storageKey } from "@/lib/branding";
import { demoDayOffs, demoProductivityRatings, demoProfile } from "@/lib/demo-data";

type Theme = "light" | "dark";
type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type ProductivityScaleEntry = {
  value: number;
  label: string;
  color: string;
};

const PRODUCTIVITY_SCALE_THREE: ProductivityScaleEntry[] = [
  { value: 0, label: "<25%", color: "productivity-low" },
  { value: 1, label: "25-50%", color: "productivity-medium" },
  { value: 2, label: ">50%", color: "productivity-high" },
];

const PRODUCTIVITY_SCALE_FOUR: ProductivityScaleEntry[] = [
  { value: 0, label: "<25%", color: "productivity-low" },
  { value: 1, label: "25-50%", color: "productivity-medium" },
  { value: 2, label: "50-75%", color: "productivity-high" },
  { value: 3, label: ">75%", color: "productivity-top" },
];

const formatDayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const getDaysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

const getMonthDays = (year: number, monthIndex: number) =>
  Array.from({ length: getDaysInMonth(year, monthIndex) }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1);
    return {
      date,
      key: formatDayKey(date),
      dayOfMonth: index + 1,
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    };
  });

const isWeekend = (date: Date, workDays: WeekdayIndex[]) =>
  !workDays.includes(date.getDay() as WeekdayIndex);

export default function PitchPage() {
  const initialDate = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [ratings, setRatings] = useState<Record<string, number | null>>({});
  const [dayOffs, setDayOffs] = useState<Record<string, boolean>>({});
  const [isDayOffMode, setIsDayOffMode] = useState(false);
  const [scaleMode, setScaleMode] = useState<"3" | "4">("3");
  const [autoMarkWeekendsOff, setAutoMarkWeekendsOff] = useState(false);
  const [workDays, setWorkDays] = useState<WeekdayIndex[]>([0, 1, 2, 3, 4, 5, 6]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const saveRatingsTimeout = useRef<number | null>(null);
  const saveDayOffsTimeout = useRef<number | null>(null);

  const scale = scaleMode === "4" ? PRODUCTIVITY_SCALE_FOUR : PRODUCTIVITY_SCALE_THREE;
  const monthDays = useMemo(
    () => getMonthDays(monthCursor.getFullYear(), monthCursor.getMonth()),
    [monthCursor]
  );
  const todayKey = formatDayKey(initialDate);
  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    async function loadPitchData() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = sessionRes.headers
          .get("content-type")
          ?.includes("application/json")
          ? await sessionRes.json()
          : null;
        const email = session?.user?.email ?? null;
        setUserEmail(email);

        if (email) {
          setIsDemoMode(false);
          const data = await loadAllData();
          const profile = data?.profile;
          setRatings(data?.productivityRatings ?? {});
          setDayOffs(data?.dayOffs ?? {});
          if (profile?.theme === "light" || profile?.theme === "dark") {
            setTheme(profile.theme);
          }
          if (profile?.productivityScaleMode === "3" || profile?.productivityScaleMode === "4") {
            setScaleMode(profile.productivityScaleMode);
          }
          if (profile?.autoMarkWeekendsOff !== undefined) {
            setAutoMarkWeekendsOff(Boolean(profile.autoMarkWeekendsOff));
          }
          if (profile?.workDays) {
            const parsed = String(profile.workDays)
              .split(",")
              .map(Number)
              .filter((day) => day >= 0 && day <= 6) as WeekdayIndex[];
            setWorkDays(parsed.length > 0 ? parsed : [0, 1, 2, 3, 4, 5, 6]);
          }
        } else {
          setIsDemoMode(true);
          const cachedRatings = window.localStorage.getItem(storageKey("productivity-ratings"));
          const cachedDayOffs = window.localStorage.getItem(storageKey("day-offs"));
          setRatings(cachedRatings ? JSON.parse(cachedRatings) : demoProductivityRatings);
          setDayOffs(cachedDayOffs ? JSON.parse(cachedDayOffs) : demoDayOffs);
          setScaleMode((demoProfile.productivityScaleMode as "3" | "4") ?? "3");
          setAutoMarkWeekendsOff(demoProfile.autoMarkWeekendsOff ?? false);
          setWorkDays(
            demoProfile.workDays
              ? (demoProfile.workDays.split(",").map(Number) as WeekdayIndex[])
              : [0, 1, 2, 3, 4, 5, 6]
          );
        }
      } catch (error) {
        console.error("Failed to load pitch data", error);
      } finally {
        setIsHydrated(true);
      }
    }

    loadPitchData();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!userEmail || isDemoMode) {
      window.localStorage.setItem(storageKey("productivity-ratings"), JSON.stringify(ratings));
      return;
    }

    if (saveRatingsTimeout.current) {
      window.clearTimeout(saveRatingsTimeout.current);
    }
    saveRatingsTimeout.current = window.setTimeout(() => {
      void saveProductivity(ratings);
    }, 500);

    return () => {
      if (saveRatingsTimeout.current) {
        window.clearTimeout(saveRatingsTimeout.current);
      }
    };
  }, [ratings, isHydrated, userEmail, isDemoMode]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!userEmail || isDemoMode) {
      window.localStorage.setItem(storageKey("day-offs"), JSON.stringify(dayOffs));
      return;
    }

    if (saveDayOffsTimeout.current) {
      window.clearTimeout(saveDayOffsTimeout.current);
    }
    saveDayOffsTimeout.current = window.setTimeout(() => {
      void saveDayOffs(dayOffs);
    }, 500);

    return () => {
      if (saveDayOffsTimeout.current) {
        window.clearTimeout(saveDayOffsTimeout.current);
      }
    };
  }, [dayOffs, isHydrated, userEmail, isDemoMode]);

  const shiftMonth = (direction: -1 | 1) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const resetToCurrentMonth = () => {
    setMonthCursor(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  };

  const isDayOffComputed = (date: Date, key: string) => {
    if (dayOffs[key] !== undefined) {
      return dayOffs[key];
    }
    return autoMarkWeekendsOff && isWeekend(date, workDays);
  };

  const handleDayClick = (date: Date, key: string) => {
    if (isDayOffMode) {
      setDayOffs((previous) => {
        const next = { ...previous };
        const hasRating = ratings[key] !== null && ratings[key] !== undefined;
        const manuallyStored = next[key];
        const computedDayOff = isDayOffComputed(date, key);

        if (computedDayOff) {
          if (manuallyStored === true || manuallyStored === false) {
            delete next[key];
          } else {
            next[key] = false;
          }
        } else if (!hasRating) {
          next[key] = true;
        }

        return next;
      });
      return;
    }

    setRatings((previous) => {
      const current = previous[key];
      const nextValue =
        current === undefined || current === null
          ? 0
          : current >= scale.length - 1
            ? null
            : current + 1;
      return { ...previous, [key]: nextValue };
    });
  };

  const monthStats = monthDays.reduce(
    (stats, day) => {
      const value = ratings[day.key];
      if (value !== null && value !== undefined) {
        stats.logged += 1;
        stats.total += Math.min(value, scale.length - 1);
      }
      if (isDayOffComputed(day.date, day.key)) {
        stats.daysOff += 1;
      }
      return stats;
    },
    { logged: 0, total: 0, daysOff: 0 }
  );
  const maxScore = Math.max(1, scale.length - 1);
  const averageScore =
    monthStats.logged > 0 ? Math.round((monthStats.total / (monthStats.logged * maxScore)) * 100) : 0;

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-foreground border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen text-foreground">
      {!userEmail ? (
        <div className="w-full bg-[#d8c06c] px-4 py-3 text-center text-sm font-semibold text-[#2c2410]">
          Demo data.{" "}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/pitch" })}
            className="font-bold underline underline-offset-2"
          >
            Sign in
          </button>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 w-full bg-slate-900 text-white">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/cadencia-app-logo.png" alt="Cadencia" className="h-5 sm:h-6" />
            <span className="hidden text-[20px] font-semibold sm:inline">Cadencia</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-full px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Year
            </Link>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              className="rounded-full px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Toggle theme"
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-md border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--background)_96%,var(--foreground)_4%)] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="rounded-full px-2 py-1 text-lg text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={resetToCurrentMonth}
                  className="rounded-md px-2 py-1 text-2xl font-bold tracking-normal transition hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] sm:text-3xl"
                  aria-label="Return to current month"
                >
                  {monthLabel}
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="rounded-full px-2 py-1 text-lg text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
              <span className="font-semibold text-[color-mix(in_srgb,var(--foreground)_75%,transparent)]">
                Score {averageScore}%
              </span>
              {scale.map((item) => (
                <span key={item.value} className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded ${item.color} border border-[color-mix(in_srgb,var(--foreground)_15%,transparent)]`}
                  />
                  {item.label}
                </span>
              ))}
              <button
                type="button"
                onClick={() => setIsDayOffMode((current) => !current)}
                className={`flex items-center gap-1.5 rounded-full border px-2 py-1 font-semibold transition ${
                  isDayOffMode
                    ? "border-[#8dc8e6] bg-[#eef7fc] text-[#3f6f88]"
                    : "border-transparent hover:border-[color-mix(in_srgb,var(--foreground)_20%,transparent)]"
                }`}
                aria-pressed={isDayOffMode}
              >
                <span className="h-2.5 w-2.5 rounded day-off-bg border border-[color-mix(in_srgb,var(--foreground)_15%,transparent)]" />
                Day off
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto pb-2">
            <div
              className="grid min-w-[980px] gap-1"
              style={{ gridTemplateColumns: `repeat(${monthDays.length}, minmax(28px, 1fr))` }}
            >
              {monthDays.map((day) => {
                const storedValue = ratings[day.key];
                const hasValue = storedValue !== null && storedValue !== undefined;
                const currentValue = hasValue ? Math.min(storedValue!, scale.length - 1) : 0;
                const scaleEntry = scale[currentValue];
                const dayOff = isDayOffComputed(day.date, day.key);
                const isToday = day.key === todayKey;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => handleDayClick(day.date, day.key)}
                    className={`group relative flex h-14 flex-col items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-center transition hover:border-orange-500 ${
                      hasValue
                        ? `${scaleEntry.color} border-[color-mix(in_srgb,var(--foreground)_18%,transparent)]`
                        : dayOff
                          ? "day-off-bg border-[color-mix(in_srgb,var(--foreground)_14%,transparent)]"
                          : "border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]"
                    } ${isToday ? "ring-2 ring-inset ring-red-500" : ""}`}
                    aria-label={`${day.weekday}, ${monthLabel} ${day.dayOfMonth}`}
                    title={`${day.weekday}, ${day.dayOfMonth}`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-[color-mix(in_srgb,var(--foreground)_58%,transparent)]">
                      {day.weekday}
                    </span>
                    <span className="text-lg font-bold leading-none text-foreground">{day.dayOfMonth}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
