"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadAllData, saveDayOffs, saveGoals, saveProductivity, saveWeeklyNoteForWeek } from "@/lib/api";
import { storageKey } from "@/lib/branding";
import { demoDayOffs, demoGoals, demoProductivityRatings, demoProfile } from "@/lib/demo-data";
import { createWeeklyGoalsEditorInit } from "@/lib/weekly-goals-editor";

type Theme = "light" | "dark";
type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type ProductivityScaleEntry = {
  value: number;
  label: string;
  color: string;
};

type KeyResultStatus = "on-hold" | "started" | "completed";

type KeyResult = {
  id: string;
  title: string;
  sortOrder?: number;
  status: KeyResultStatus;
};

type Goal = {
  id: string;
  title: string;
  timeframe: string;
  sortOrder?: number;
  description?: string;
  keyResults: KeyResult[];
  statusOverride?: KeyResultStatus;
  archived?: boolean;
};

type WeeklyNoteEntry = {
  content: string;
  dos?: string;
  donts?: string;
};

const TinyEditor = dynamic(
  () => import("@tinymce/tinymce-react").then((mod) => mod.Editor),
  { ssr: false }
);

const TINYMCE_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/tinymce/8.1.2/tinymce.min.js";

const DEFAULT_WEEKLY_TEMPLATE =
  "<p><strong>What I want to accomplish this week:</strong></p><ul><li>Monday</li><li>Tuesday</li><li>Wednesday</li><li>Thursday</li><li>Friday</li><li>Saturday</li><li>Sunday</li></ul>";

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

const getWeekStart = (date: Date, weekStartDay: WeekdayIndex = 1) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const formatWeekKey = (weekStart: Date, weekStartDay: WeekdayIndex) =>
  `week-${weekStartDay}-${formatDayKey(weekStart)}`;

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

const normalizeGoalOrder = (goalList: Goal[]) =>
  goalList.map((goal, index) => ({
    ...goal,
    sortOrder: index,
    keyResults: goal.keyResults.map((kr, krIndex) => ({
      ...kr,
      sortOrder: krIndex,
    })),
  }));

const goalStatusBadge = (status: KeyResultStatus) => {
  switch (status) {
    case "started":
      return "bg-[#bfdbfe] text-[#1e40af]";
    case "on-hold":
      return "bg-[#fde68a] text-[#b45309]";
    case "completed":
      return "bg-[#bbf7d0] text-[#166534]";
    default:
      return "bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)] text-foreground";
  }
};

const StatusIcon = ({ status }: { status: KeyResultStatus }) => {
  if (status === "started") {
    return (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  }

  if (status === "on-hold") {
    return (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
};

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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [weeklyNotes, setWeeklyNotes] = useState<Record<string, WeeklyNoteEntry>>({});
  const [isDayOffMode, setIsDayOffMode] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [scaleMode, setScaleMode] = useState<"3" | "4">("3");
  const [weeklyGoalsTemplate, setWeeklyGoalsTemplate] = useState(DEFAULT_WEEKLY_TEMPLATE);
  const [isTemplateEditorVisible, setIsTemplateEditorVisible] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [krDrafts, setKrDrafts] = useState<Record<string, string>>({});
  const [activeGoalCardId, setActiveGoalCardId] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const [weekStartDay, setWeekStartDay] = useState<WeekdayIndex>(1);
  const [autoMarkWeekendsOff, setAutoMarkWeekendsOff] = useState(false);
  const [workDays, setWorkDays] = useState<WeekdayIndex[]>([0, 1, 2, 3, 4, 5, 6]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const saveRatingsTimeout = useRef<number | null>(null);
  const saveDayOffsTimeout = useRef<number | null>(null);
  const saveGoalsTimeout = useRef<number | null>(null);
  const saveWeeklyNoteTimeout = useRef<number | null>(null);
  const goalsSectionRef = useRef<HTMLElement | null>(null);

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
  const currentWeekKey = useMemo(
    () => formatWeekKey(getWeekStart(initialDate, weekStartDay), weekStartDay),
    [initialDate, weekStartDay]
  );
  const activeWeekKey = selectedWeekKey ?? currentWeekKey;
  const activeWeekEntry = useMemo(
    () => weeklyNotes[activeWeekKey] ?? { content: "", dos: "", donts: "" },
    [weeklyNotes, activeWeekKey]
  );
  const activeWeekContentText = activeWeekEntry.content.replace(/<[^>]*>/g, "").trim();
  const templateContentText = weeklyGoalsTemplate.replace(/<[^>]*>/g, "").trim();
  const showTemplateActions = !activeWeekContentText && templateContentText;
  const editorInit = useMemo(
    () => ({
      ...createWeeklyGoalsEditorInit(theme, {
        height: 360,
        minHeight: 240,
        placeholder: "What matters this week?",
      }),
      content_style: `
        html, body {
          background-color: ${theme === "dark" ? "rgba(37, 99, 235, 0.14)" : "rgba(238, 245, 255, 0.66)"} !important;
        }
        body {
          color: ${theme === "dark" ? "#d1d5db" : "#0f172a"} !important;
          font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 14px;
          line-height: 1.55;
          padding: 18px 30px;
          margin: 0;
          outline: none !important;
          box-shadow: none !important;
        }
        .mce-content-body,
        .mce-content-body:focus,
        [contenteditable="true"],
        [contenteditable="true"]:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .mce-content-body {
          box-sizing: border-box !important;
          padding-left: 30px !important;
          padding-right: 30px !important;
        }
        .mce-content-body:before {
          left: 30px !important;
        }
        * { background-color: transparent !important; }
        input.task-checkbox {
          width: 14px;
          height: 14px;
          margin-right: 8px;
          vertical-align: -1px;
          accent-color: ${theme === "dark" ? "#93c5fd" : "#1d4ed8"};
        }
      `,
    }),
    [theme]
  );

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
          setGoals(normalizeGoalOrder((data?.goals ?? []).filter((goal: Goal) => !goal.archived)));
          setWeeklyNotes(data?.weeklyNotes ?? {});
          if (profile?.theme === "light" || profile?.theme === "dark") {
            setTheme(profile.theme);
          }
          if (profile?.weekStartDay !== undefined) {
            setWeekStartDay(profile.weekStartDay as WeekdayIndex);
          }
          if (profile?.showLegend !== undefined) {
            setShowLegend(Boolean(profile.showLegend));
          }
          if (profile?.weeklyGoalsTemplate) {
            setWeeklyGoalsTemplate(profile.weeklyGoalsTemplate);
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
          const cachedGoals = window.localStorage.getItem(storageKey("goals"));
          const cachedWeeklyNotes = window.localStorage.getItem(storageKey("weekly-notes"));
          const cachedWeeklyTemplate = window.localStorage.getItem(storageKey("weekly-goals-template"));
          setGoals(
            normalizeGoalOrder(
              cachedGoals
                ? (JSON.parse(cachedGoals) as Goal[]).filter((goal) => !goal.archived)
                : (demoGoals as Goal[]).filter((goal) => !goal.archived)
            )
          );
          setWeeklyNotes(cachedWeeklyNotes ? JSON.parse(cachedWeeklyNotes) : {});
          setWeeklyGoalsTemplate(cachedWeeklyTemplate || demoProfile.weeklyGoalsTemplate || DEFAULT_WEEKLY_TEMPLATE);
          const cachedShowLegend = window.localStorage.getItem(storageKey("show-legend"));
          if (cachedShowLegend === "true" || cachedShowLegend === "false") {
            setShowLegend(cachedShowLegend === "true");
          } else {
            setShowLegend(demoProfile.showLegend ?? true);
          }
          setScaleMode((demoProfile.productivityScaleMode as "3" | "4") ?? "3");
          setWeekStartDay(demoProfile.weekStartDay as WeekdayIndex);
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

  useEffect(() => {
    if (!isHydrated) return;

    if (!userEmail || isDemoMode) {
      window.localStorage.setItem(storageKey("goals"), JSON.stringify(goals));
      return;
    }

    if (saveGoalsTimeout.current) {
      window.clearTimeout(saveGoalsTimeout.current);
    }
    saveGoalsTimeout.current = window.setTimeout(() => {
      void saveGoals(goals);
    }, 500);

    return () => {
      if (saveGoalsTimeout.current) {
        window.clearTimeout(saveGoalsTimeout.current);
      }
    };
  }, [goals, isHydrated, userEmail, isDemoMode]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!userEmail || isDemoMode) {
      window.localStorage.setItem(storageKey("weekly-notes"), JSON.stringify(weeklyNotes));
      return;
    }

    if (saveWeeklyNoteTimeout.current) {
      window.clearTimeout(saveWeeklyNoteTimeout.current);
    }

    saveWeeklyNoteTimeout.current = window.setTimeout(() => {
      void saveWeeklyNoteForWeek(activeWeekKey, activeWeekEntry);
    }, 600);

    return () => {
      if (saveWeeklyNoteTimeout.current) {
        window.clearTimeout(saveWeeklyNoteTimeout.current);
      }
    };
  }, [weeklyNotes, activeWeekKey, activeWeekEntry, isHydrated, userEmail, isDemoMode]);

  useEffect(() => {
    if (!activeGoalCardId) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        goalsSectionRef.current &&
        event.target instanceof Node &&
        !goalsSectionRef.current.contains(event.target)
      ) {
        setActiveGoalCardId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeGoalCardId]);

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
    const targetWeekKey = formatWeekKey(getWeekStart(date, weekStartDay), weekStartDay);
    const isAlreadySelected = selectedDayKey === key;

    setSelectedDayKey(key);
    setSelectedWeekKey(targetWeekKey);

    if (!isAlreadySelected) {
      return;
    }

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

  const cycleKeyResultStatus = (goalId: string, krId: string) => {
    const order: KeyResultStatus[] = ["on-hold", "started", "completed"];
    setGoals((previous) =>
      normalizeGoalOrder(
        previous.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                keyResults: goal.keyResults.map((kr) => {
                  if (kr.id !== krId) return kr;
                  const currentIndex = order.indexOf(kr.status);
                  return { ...kr, status: order[(currentIndex + 1) % order.length]! };
                }),
              }
            : goal
        )
      )
    );
  };

  const updateGoalTitle = (goalId: string, title: string) => {
    setGoals((previous) =>
      normalizeGoalOrder(
        previous.map((goal) => (goal.id === goalId ? { ...goal, title } : goal))
      )
    );
  };

  const removeGoal = (goalId: string) => {
    setGoals((previous) => normalizeGoalOrder(previous.filter((goal) => goal.id !== goalId)));
  };

  const addGoal = () => {
    const title = newGoalTitle.trim();
    if (!title) return;
    setGoals((previous) =>
      normalizeGoalOrder([
        ...previous,
        {
          id: `goal-${Date.now()}`,
          title,
          timeframe: "",
          archived: false,
          keyResults: [],
        },
      ])
    );
    setNewGoalTitle("");
  };

  const updateKeyResultTitle = (goalId: string, krId: string, title: string) => {
    setGoals((previous) =>
      normalizeGoalOrder(
        previous.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                keyResults: goal.keyResults.map((kr) =>
                  kr.id === krId ? { ...kr, title } : kr
                ),
              }
            : goal
        )
      )
    );
  };

  const removeKeyResult = (goalId: string, krId: string) => {
    setGoals((previous) =>
      normalizeGoalOrder(
        previous.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                keyResults: goal.keyResults.filter((kr) => kr.id !== krId),
              }
            : goal
        )
      )
    );
  };

  const addKeyResult = (goalId: string) => {
    const title = krDrafts[goalId]?.trim();
    if (!title) return;
    setGoals((previous) =>
      normalizeGoalOrder(
        previous.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                keyResults: [
                  ...goal.keyResults,
                  {
                    id: `kr-${Date.now()}`,
                    title,
                    status: "started",
                  },
                ],
              }
            : goal
        )
      )
    );
    setKrDrafts((previous) => ({ ...previous, [goalId]: "" }));
  };

  const updateCurrentWeekContent = (content: string) => {
    setWeeklyNotes((previous) => ({
      ...previous,
      [activeWeekKey]: {
        ...activeWeekEntry,
        content,
      },
    }));
  };

  const applyWeeklyTemplate = () => {
    updateCurrentWeekContent(weeklyGoalsTemplate);
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
              className="flex items-center rounded-full px-2 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white sm:px-3 sm:py-2 sm:text-sm"
              aria-label="Open sharing in main app"
            >
              🔗
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center rounded-full px-2 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white sm:px-3 sm:py-2 sm:text-sm"
              aria-label="Print"
            >
              <span role="img" aria-hidden="true">
                🖨️
              </span>
            </button>
            <Link
              href="/"
              className="flex items-center rounded-full px-2 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white sm:px-3 sm:py-2 sm:text-sm"
              aria-label="Open profile settings in main app"
            >
              ⚙️
            </Link>
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
        <section className="okr-card border-none px-4 py-3 sm:px-5 sm:py-4">
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
                  className="rounded-md px-2 py-1 text-xl font-bold tracking-normal transition hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] sm:text-2xl"
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
              {showLegend ? (
                <>
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
                </>
              ) : null}
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
                const isSelectedDay = day.key === selectedDayKey;

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
                    } ${isToday ? "ring-2 ring-inset ring-red-500" : isSelectedDay ? "ring-2 ring-inset ring-slate-700" : ""}`}
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

        <section className="mt-5 grid w-full gap-5 text-left lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)]">
          <div ref={goalsSectionRef} className="w-full">
          <div className="okr-card border-none px-5 py-5">
            <div>
              {goals.map((goal) => {
                const isActiveGoal = activeGoalCardId === goal.id;
                return (
                  <div
                    key={goal.id}
                    className="relative py-4 first:pt-1 last:pb-2 after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-1/2 after:-translate-x-1/2 after:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] last:after:hidden"
                    onClick={() => setActiveGoalCardId(goal.id)}
                    onFocusCapture={() => setActiveGoalCardId(goal.id)}
                  >
                    <div className="flex items-start gap-3">
                      {isActiveGoal ? (
                        <input
                          type="text"
                          value={goal.title}
                          onChange={(event) => updateGoalTitle(goal.id, event.target.value)}
                          className="kr-apple-font min-w-0 flex-1 border-b border-transparent bg-transparent text-left text-base font-light text-foreground outline-none transition focus:border-foreground sm:text-2xl"
                          aria-label="Goal title"
                        />
                      ) : (
                        <h2 className="kr-apple-font min-w-0 flex-1 text-left text-base font-light text-foreground sm:text-2xl">
                          {goal.title}
                        </h2>
                      )}
                      {isActiveGoal ? (
                        <button
                          type="button"
                          onClick={() => removeGoal(goal.id)}
                          className="text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)] transition hover:text-foreground"
                          aria-label="Remove goal"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-0">
                      {goal.keyResults.map((kr) => (
                        <div key={kr.id} className="rounded-2xl px-3 py-0.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {isActiveGoal ? (
                              <input
                                type="text"
                                value={kr.title}
                                onChange={(event) =>
                                  updateKeyResultTitle(goal.id, kr.id, event.target.value)
                                }
                                className="kr-apple-font min-w-50 flex-1 border-b border-transparent bg-transparent text-left text-[15px] font-medium text-foreground outline-none transition focus:border-foreground"
                                aria-label="Key result title"
                              />
                            ) : (
                              <span className="kr-apple-font min-w-50 flex-1 text-left text-[15px] font-medium text-foreground">
                                {kr.title || "Untitled key result"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => cycleKeyResultStatus(goal.id, kr.id)}
                              className={`rounded-full px-2.5 py-0 text-lg ${goalStatusBadge(kr.status)}`}
                              title={
                                kr.status === "started"
                                  ? "Started"
                                  : kr.status === "on-hold"
                                    ? "On hold"
                                    : "Completed"
                              }
                            >
                              <StatusIcon status={kr.status} />
                            </button>
                            {isActiveGoal ? (
                              <button
                                type="button"
                                onClick={() => removeKeyResult(goal.id, kr.id)}
                                className="text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)] transition hover:text-foreground"
                                aria-label="Remove key result"
                              >
                                ✕
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {isActiveGoal ? (
                        <div className="mt-2 flex flex-wrap items-center gap-3 px-3">
                          <input
                            type="text"
                            value={krDrafts[goal.id] ?? ""}
                            onChange={(event) =>
                              setKrDrafts((previous) => ({ ...previous, [goal.id]: event.target.value }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") addKeyResult(goal.id);
                            }}
                            placeholder="Add a key result"
                            className="min-w-55 flex-1 border-b border-[color-mix(in_srgb,var(--foreground)_20%,transparent)] bg-transparent pb-1 text-sm text-foreground outline-none focus:border-foreground"
                          />
                          <button
                            type="button"
                            onClick={() => addKeyResult(goal.id)}
                            className="rounded-full border border-[color-mix(in_srgb,var(--foreground)_25%,transparent)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--foreground)_75%,transparent)] transition hover:border-foreground"
                          >
                            Add KR
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {activeGoalCardId ? (
              <div className="mt-4 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={newGoalTitle}
                    onChange={(event) => setNewGoalTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addGoal();
                    }}
                    placeholder="Add an objective"
                    className="min-w-60 flex-1 border-b border-[color-mix(in_srgb,var(--foreground)_20%,transparent)] bg-transparent pb-1 text-sm text-foreground outline-none focus:border-foreground"
                  />
                  <button
                    type="button"
                    onClick={addGoal}
                    className="rounded-full border border-[color-mix(in_srgb,var(--foreground)_25%,transparent)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--foreground)_75%,transparent)] transition hover:border-foreground"
                  >
                    Add OKR
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          </div>
          <div className="okr-card border-none overflow-hidden px-0 py-0">
            {showTemplateActions ? (
              <div className="flex justify-end gap-3 px-5 pt-4 text-[10px] uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
                <button
                  type="button"
                  onClick={applyWeeklyTemplate}
                  className="transition hover:text-foreground"
                >
                  Use template
                </button>
                <button
                  type="button"
                  onClick={() => setIsTemplateEditorVisible((current) => !current)}
                  className="transition hover:text-foreground"
                >
                  Edit
                </button>
              </div>
            ) : null}
            {isTemplateEditorVisible ? (
              <div className="px-5 pb-3 pt-3">
                <textarea
                  value={weeklyGoalsTemplate}
                  onChange={(event) => setWeeklyGoalsTemplate(event.target.value)}
                  onBlur={() => {
                    window.localStorage.setItem(storageKey("weekly-goals-template"), weeklyGoalsTemplate);
                  }}
                  className="min-h-28 w-full resize-y rounded-md border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-transparent p-3 text-sm text-foreground outline-none focus:border-[color-mix(in_srgb,var(--foreground)_35%,transparent)]"
                  aria-label="Weekly goals template"
                />
              </div>
            ) : null}
            <div className="[&_.tox-tinymce]:!border-0 [&_.tox-tinymce]:!bg-transparent [&_.tox-tinymce]:!outline-none [&_.tox-tinymce]:!shadow-none [&_.tox-editor-container]:!bg-transparent [&_.tox-edit-area]:!bg-transparent [&_.tox-edit-area::before]:!border-0 [&_.tox-edit-area::before]:!shadow-none [&_.tox-edit-area__iframe]:!outline-none">
              <TinyEditor
                key={`pitch-week-editor-${activeWeekKey}-${theme}`}
                tinymceScriptSrc={TINYMCE_CDN}
                value={activeWeekEntry.content}
                init={editorInit}
                onEditorChange={updateCurrentWeekContent}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
