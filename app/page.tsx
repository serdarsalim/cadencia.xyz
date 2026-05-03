"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  percent: number;
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
  { value: 0, label: "<25%", color: "productivity-low", percent: 12.5 },
  { value: 1, label: "25-50%", color: "productivity-medium", percent: 37.5 },
  { value: 2, label: ">50%", color: "productivity-high", percent: 75 },
];

const PRODUCTIVITY_SCALE_FOUR: ProductivityScaleEntry[] = [
  { value: 0, label: "<25%", color: "productivity-low", percent: 12.5 },
  { value: 1, label: "25-50%", color: "productivity-medium", percent: 37.5 },
  { value: 2, label: "50-75%", color: "productivity-high", percent: 62.5 },
  { value: 3, label: ">75%", color: "productivity-top", percent: 87.5 },
];

const readCachedJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.error(`Failed to parse cached value for ${key}`, error);
    return fallback;
  }
};

const readCachedText = (key: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read cached text for ${key}`, error);
    return null;
  }
};

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

const parseWeekKey = (weekKey: string) => {
  const parts = weekKey.split("-");
  const year = Number(parts[2]);
  const month = Number(parts[3]);
  const day = Number(parts[4]);
  return new Date(year, month - 1, day);
};

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

const getWeekDays = (weekStart: Date) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      date,
      key: formatDayKey(date),
      dayOfMonth: date.getDate(),
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    };
  });

const formatWeekRangeLabel = (weekStart: Date) => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startLabel = weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = weekEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
};

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
  const [isHydrated] = useState(true);
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
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
  const [isRulesMenuOpen, setIsRulesMenuOpen] = useState(false);
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
  const rulesMenuRef = useRef<HTMLDivElement | null>(null);
  const ratingsDirtyRef = useRef(false);
  const dayOffsDirtyRef = useRef(false);
  const goalsDirtyRef = useRef(false);
  const weeklyNotesDirtyRef = useRef(false);

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
  const activeWeekStart = useMemo(() => parseWeekKey(activeWeekKey), [activeWeekKey]);
  const mobileWeekDays = useMemo(() => getWeekDays(activeWeekStart), [activeWeekStart]);
  const mobileWeekLabel = useMemo(() => formatWeekRangeLabel(activeWeekStart), [activeWeekStart]);
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
        backgroundColor: theme === "dark" ? "#0b1328" : "rgba(238, 245, 255, 0.66)",
        fontFamily:
          '"Inter", "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        bodyPadding: "18px 30px",
        desktopBodyPadding: "18px 30px",
      }),
    }),
    [theme]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(storageKey("theme"), theme);
  }, [theme]);

  useEffect(() => {
    async function loadPitchData() {
      try {
        const cachedTheme = readCachedText(storageKey("theme"));
        const cachedRatings = readCachedJson<Record<string, number | null>>(storageKey("productivity-ratings"), {});
        const cachedDayOffs = readCachedJson<Record<string, boolean>>(storageKey("day-offs"), {});
        const cachedGoals = readCachedJson<Goal[]>(storageKey("goals"), []);
        const cachedWeeklyNotes = readCachedJson<Record<string, WeeklyNoteEntry>>(storageKey("weekly-notes"), {});
        const cachedWeeklyTemplate = readCachedText(storageKey("weekly-goals-template"));
        const cachedShowLegend = readCachedText(storageKey("show-legend"));
        const hasCachedTheme = cachedTheme === "dark" || cachedTheme === "light";

        if (hasCachedTheme) {
          setTheme(cachedTheme);
        }
        if (!ratingsDirtyRef.current) {
          setRatings(cachedRatings);
        }
        if (!dayOffsDirtyRef.current) {
          setDayOffs(cachedDayOffs);
        }
        if (!goalsDirtyRef.current) {
          setGoals(normalizeGoalOrder(cachedGoals.filter((goal) => !goal.archived)));
        }
        if (!weeklyNotesDirtyRef.current) {
          setWeeklyNotes(cachedWeeklyNotes);
        }
        if (cachedWeeklyTemplate) {
          setWeeklyGoalsTemplate(cachedWeeklyTemplate);
        }
        if (cachedShowLegend === "true" || cachedShowLegend === "false") {
          setShowLegend(cachedShowLegend === "true");
        }

        const data = await loadAllData();

        if (data?.authenticated) {
          setUserEmail(data.userEmail ?? null);
          setIsDemoMode(false);
          const profile = data?.profile;
          if (!ratingsDirtyRef.current) {
            setRatings(data?.productivityRatings ?? {});
          }
          if (!dayOffsDirtyRef.current) {
            setDayOffs(data?.dayOffs ?? {});
          }
          if (!goalsDirtyRef.current) {
            setGoals(normalizeGoalOrder((data?.goals ?? []).filter((goal: Goal) => !goal.archived)));
          }
          if (!weeklyNotesDirtyRef.current) {
            setWeeklyNotes(data?.weeklyNotes ?? {});
          }
          if (!hasCachedTheme && (profile?.theme === "light" || profile?.theme === "dark")) {
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
          setUserEmail(null);
          setIsDemoMode(true);
          if (Object.keys(cachedRatings).length === 0) {
            setRatings(demoProductivityRatings);
          }
          if (Object.keys(cachedDayOffs).length === 0) {
            setDayOffs(demoDayOffs);
          }
          if (cachedGoals.length === 0) {
            setGoals(normalizeGoalOrder((demoGoals as Goal[]).filter((goal) => !goal.archived)));
          }
          if (Object.keys(cachedWeeklyNotes).length === 0) {
            setWeeklyNotes({});
          }
          if (!cachedWeeklyTemplate) {
            setWeeklyGoalsTemplate(
              demoProfile.weeklyGoalsTemplate || DEFAULT_WEEKLY_TEMPLATE
            );
          }
          if (cachedShowLegend !== "true" && cachedShowLegend !== "false") {
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
      }
    }

    loadPitchData();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    window.localStorage.setItem(storageKey("productivity-ratings"), JSON.stringify(ratings));

    if (!userEmail || isDemoMode) {
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

    window.localStorage.setItem(storageKey("day-offs"), JSON.stringify(dayOffs));

    if (!userEmail || isDemoMode) {
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

    window.localStorage.setItem(storageKey("goals"), JSON.stringify(goals));

    if (!userEmail || isDemoMode) {
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

    window.localStorage.setItem(storageKey("weekly-notes"), JSON.stringify(weeklyNotes));

    if (!userEmail || isDemoMode) {
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

  useEffect(() => {
    if (!isRulesMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        rulesMenuRef.current &&
        event.target instanceof Node &&
        !rulesMenuRef.current.contains(event.target)
      ) {
        setIsRulesMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRulesMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRulesMenuOpen]);

  const shiftMonth = (direction: -1 | 1) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const resetToCurrentMonth = () => {
    setMonthCursor(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  };

  const shiftWeek = (direction: -1 | 1) => {
    const nextWeekStart = new Date(activeWeekStart);
    nextWeekStart.setDate(activeWeekStart.getDate() + direction * 7);
    setSelectedWeekKey(formatWeekKey(nextWeekStart, weekStartDay));
    setSelectedDayKey(null);
  };

  const resetToCurrentWeek = () => {
    setSelectedWeekKey(currentWeekKey);
    setSelectedDayKey(todayKey);
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
      dayOffsDirtyRef.current = true;
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

    ratingsDirtyRef.current = true;
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
    goalsDirtyRef.current = true;
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
    goalsDirtyRef.current = true;
    setGoals((previous) =>
      normalizeGoalOrder(
        previous.map((goal) => (goal.id === goalId ? { ...goal, title } : goal))
      )
    );
  };

  const removeGoal = (goalId: string) => {
    goalsDirtyRef.current = true;
    setGoals((previous) => normalizeGoalOrder(previous.filter((goal) => goal.id !== goalId)));
  };

  const addGoal = () => {
    const title = newGoalTitle.trim();
    if (!title) return;
    goalsDirtyRef.current = true;
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
    goalsDirtyRef.current = true;
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
    goalsDirtyRef.current = true;
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
    goalsDirtyRef.current = true;
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
    weeklyNotesDirtyRef.current = true;
    setWeeklyNotes((previous) => ({
      ...previous,
      [activeWeekKey]: {
        ...activeWeekEntry,
        content,
      },
    }));
  };

  const updateCurrentWeekField = (field: "dos" | "donts", value: string) => {
    weeklyNotesDirtyRef.current = true;
    setWeeklyNotes((previous) => ({
      ...previous,
      [activeWeekKey]: {
        ...activeWeekEntry,
        [field]: value,
      },
    }));
  };

  const applyWeeklyTemplate = () => {
    updateCurrentWeekContent(weeklyGoalsTemplate);
  };

  const clearDayScore = (key: string) => {
    ratingsDirtyRef.current = true;
    setRatings((previous) => ({ ...previous, [key]: null }));
  };

  const monthStats = monthDays.reduce(
    (stats, day) => {
      const storedValue = ratings[day.key];
      const hasValue = storedValue !== null && storedValue !== undefined;
      const isDayOff = isDayOffComputed(day.date, day.key);
      const isEligibleDay = !isDayOff || hasValue;

      if (isDayOff) {
        stats.daysOff += 1;
      }

      if (!isEligibleDay) {
        return stats;
      }

      stats.eligible += 1;

      if (hasValue) {
        const scaleEntry = scale[Math.min(storedValue!, scale.length - 1)];
        stats.logged += 1;
        stats.totalPercent += scaleEntry?.percent ?? 0;
      }

      return stats;
    },
    { logged: 0, eligible: 0, totalPercent: 0, daysOff: 0 }
  );
  const averageScore = monthStats.eligible > 0 ? Math.round(monthStats.totalPercent / monthStats.eligible) : 0;

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-foreground border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen text-foreground">
      {isDemoMode ? (
        <div className="w-full bg-[#d8c06c] px-4 py-3 text-center text-sm font-semibold text-[#2c2410]">
          Demo data.{" "}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="font-bold underline underline-offset-2"
          >
            Sign in
          </button>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/72 text-slate-900 backdrop-blur-xl">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/cadencia-app-logo.png" alt="Cadencia" className="h-5 sm:h-6" />
            <span className="hidden text-[20px] font-semibold text-slate-900 sm:inline">Cadencia</span>
          </Link>
          <div className="flex items-center gap-1">
            <div ref={rulesMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsRulesMenuOpen((current) => !current)}
                className={`rounded-full px-3 py-2 text-sm transition ${
                  isRulesMenuOpen
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-900/6 hover:text-slate-900"
                }`}
                aria-haspopup="dialog"
                aria-expanded={isRulesMenuOpen}
              >
                Rules
              </button>

              {isRulesMenuOpen ? (
                <>
                  <div className="fixed inset-x-0 bottom-0 top-14 z-40 bg-slate-950/18 backdrop-blur-[2px]" aria-hidden="true" />
                  <div
                    className="fixed inset-x-3 top-[4.25rem] z-50 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:max-h-[min(80vh,42rem)] sm:w-[min(92vw,42rem)]"
                    role="dialog"
                    aria-label="Weekly rules"
                  >
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="min-w-0">
                      <div className="dos-label-color text-[11px] font-semibold uppercase tracking-[0.24em]">
                        Do
                      </div>
                      <textarea
                        value={activeWeekEntry.dos ?? ""}
                        onChange={(event) => updateCurrentWeekField("dos", event.target.value)}
                        placeholder={"- Front-load the week\n- Protect focus blocks\n- Ship one real output"}
                        className="mt-3 min-h-40 w-full resize-none overflow-hidden border-none bg-transparent px-0 py-0 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-400 sm:min-h-36"
                        aria-label="Weekly dos"
                      />
                    </div>

                    <div className="min-w-0 border-t border-slate-200/80 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                      <div className="donts-label-color text-[11px] font-semibold uppercase tracking-[0.24em]">
                        Don&apos;t
                      </div>
                      <textarea
                        value={activeWeekEntry.donts ?? ""}
                        onChange={(event) => updateCurrentWeekField("donts", event.target.value)}
                        placeholder={"- No low-impact tasks\n- No unscheduled work\n- No context switching for dopamine"}
                        className="mt-3 min-h-40 w-full resize-none overflow-hidden border-none bg-transparent px-0 py-0 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-400 sm:min-h-36"
                        aria-label="Weekly donts"
                      />
                    </div>
                  </div>
                  </div>
                </>
              ) : null}
            </div>
            <Link
              href="/365"
              className="flex items-center rounded-full px-2 py-1.5 text-xs text-slate-600 transition hover:bg-slate-900/6 hover:text-slate-900 sm:px-3 sm:py-2 sm:text-sm"
              aria-label="Open sharing in main app"
            >
              🔗
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center rounded-full px-2 py-1.5 text-xs text-slate-600 transition hover:bg-slate-900/6 hover:text-slate-900 sm:px-3 sm:py-2 sm:text-sm"
              aria-label="Print"
            >
              <span role="img" aria-hidden="true">
                🖨️
              </span>
            </button>
            <Link
              href="/365"
              className="flex items-center rounded-full px-2 py-1.5 text-xs text-slate-600 transition hover:bg-slate-900/6 hover:text-slate-900 sm:px-3 sm:py-2 sm:text-sm"
              aria-label="Open profile settings in main app"
            >
              ⚙️
            </Link>
            <Link
              href="/365"
              className="rounded-full px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-900/6 hover:text-slate-900"
            >
              365
            </Link>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              className="flex items-center rounded-full px-2 py-1.5 text-xs text-slate-600 transition hover:bg-slate-900/6 hover:text-slate-900 sm:px-3 sm:py-2 sm:text-sm"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="okr-card border-none px-4 py-3 sm:px-5 sm:py-4">
          <div className="hidden flex-col gap-4 sm:flex lg:flex-row lg:items-center lg:justify-between">
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
              <span
                suppressHydrationWarning
                className="font-semibold text-[color-mix(in_srgb,var(--foreground)_75%,transparent)]"
              >
                Score {averageScore}%
              </span>
              {hasMounted && showLegend ? (
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

          <div className="flex flex-col gap-4 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => shiftWeek(-1)}
                  className="rounded-full px-2 py-1 text-lg text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                  aria-label="Previous week"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={resetToCurrentWeek}
                  className="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-lg font-bold tracking-normal transition hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]"
                  aria-label="Return to current week"
                >
                  {mobileWeekLabel}
                </button>
                <button
                  type="button"
                  onClick={() => shiftWeek(1)}
                  className="rounded-full px-2 py-1 text-lg text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                  aria-label="Next week"
                >
                  ›
                </button>
              </div>

              <span
                suppressHydrationWarning
                className="ml-auto shrink-0 whitespace-nowrap text-xs font-semibold text-[color-mix(in_srgb,var(--foreground)_75%,transparent)]"
              >
                Score {averageScore}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
              {hasMounted && showLegend ? (
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

          <div className="mt-5 hidden overflow-x-auto pb-2 sm:block">
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
                    onKeyDown={(event) => {
                      if (event.key === "Delete" || event.key === "Backspace") {
                        event.preventDefault();
                        clearDayScore(day.key);
                      }
                    }}
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

          <div className="mt-5 sm:hidden">
            <div className="grid grid-cols-7 gap-1">
              {mobileWeekDays.map((day) => {
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
                    onKeyDown={(event) => {
                      if (event.key === "Delete" || event.key === "Backspace") {
                        event.preventDefault();
                        clearDayScore(day.key);
                      }
                    }}
                    className={`group relative flex h-14 flex-col items-center justify-center gap-1 rounded-md border px-1 py-1 text-center transition hover:border-orange-500 ${
                      hasValue
                        ? `${scaleEntry.color} border-[color-mix(in_srgb,var(--foreground)_18%,transparent)]`
                        : dayOff
                          ? "day-off-bg border-[color-mix(in_srgb,var(--foreground)_14%,transparent)]"
                          : "border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]"
                    } ${isToday ? "ring-2 ring-inset ring-red-500" : isSelectedDay ? "ring-2 ring-inset ring-slate-700" : ""}`}
                    aria-label={day.date.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
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

        <section className="mt-5 grid w-full gap-5 text-left lg:grid-cols-2">
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
                          className="kr-apple-font min-w-0 flex-1 border-b border-transparent bg-transparent text-left text-base font-light text-foreground outline-none transition focus:border-foreground sm:text-xl"
                          aria-label="Goal title"
                        />
                      ) : (
                        <h2 className="kr-apple-font min-w-0 flex-1 text-left text-base font-light text-foreground sm:text-xl">
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
