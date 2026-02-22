// Demo data for guest users to explore the app

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();

type WeeklyStoryEntry = {
  title: string;
  weeklyNote: string;
  dos: string[];
  donts: string[];
  carryForward: string;
};

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const parseYmd = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const formatWeekTag = (week: number) => `W${String(week).padStart(2, "0")}`;

const clampScore = (score: number) => Math.max(0, Math.min(3, score));

const weekFromDate = (date: Date) => {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const diffMs = date.getTime() - yearStart.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return Math.floor(diffDays / 7) + 1;
};

const pickFour = (pool: string[], offset: number) => [
  pool[offset % pool.length]!,
  pool[(offset + 1) % pool.length]!,
  pool[(offset + 2) % pool.length]!,
  pool[(offset + 3) % pool.length]!,
];

const demoSickDateStrings = [
  `${CURRENT_YEAR}-1-22`,
  `${CURRENT_YEAR}-2-18`,
  `${CURRENT_YEAR}-3-19`,
  `${CURRENT_YEAR}-5-13`,
  `${CURRENT_YEAR}-7-16`,
  `${CURRENT_YEAR}-9-17`,
  `${CURRENT_YEAR}-11-19`,
];

const generateDemoSickDays = () => {
  const sickDays: Record<string, boolean> = {};
  demoSickDateStrings.forEach((ymd) => {
    const date = parseYmd(ymd);
    const weekday = date.getDay();
    if (date <= TODAY && weekday !== 0 && weekday !== 6) {
      sickDays[dayKey(date)] = true;
    }
  });
  return sickDays;
};

export const demoSickDays = generateDemoSickDays();

export const demoScheduleEntries = {
  // Today's schedule
  [dayKey(new Date())]: [
    {
      time: "07:00",
      endTime: "08:00",
      title: "Morning reset",
      color: "#60A5FA",
    },
    {
      time: "09:00",
      endTime: "10:30",
      title: "Deep work block A",
      color: "#F59E0B",
    },
    {
      time: "10:45",
      endTime: "12:15",
      title: "Deep work block B",
      color: "#F97316",
    },
    {
      time: "13:00",
      endTime: "15:00",
      title: "Client delivery timebox",
      color: "#8B5CF6",
    },
    {
      time: "15:30",
      endTime: "16:30",
      title: "Admin and invoices",
      color: "#34D399",
    },
  ],
};

const generateDemoDayOffs = () => {
  const dayOffs: Record<string, boolean> = {};
  const publicAndPersonalDays = [
    `${CURRENT_YEAR}-1-1`,
    `${CURRENT_YEAR}-2-14`,
    `${CURRENT_YEAR}-5-25`,
    `${CURRENT_YEAR}-7-3`,
    `${CURRENT_YEAR}-9-7`,
    `${CURRENT_YEAR}-11-26`,
    `${CURRENT_YEAR}-12-25`,
  ];

  publicAndPersonalDays.forEach((ymd) => {
    dayOffs[dayKey(parseYmd(ymd))] = true;
  });

  // one short vacation block (if those dates exist in current year)
  const vacationStart = new Date(CURRENT_YEAR, 7, 10);
  for (let i = 0; i < 5; i += 1) {
    const d = new Date(vacationStart);
    d.setDate(vacationStart.getDate() + i);
    dayOffs[dayKey(d)] = true;
  }

  return dayOffs;
};

export const demoDayOffs = generateDemoDayOffs();

const generateDemoProductivityRatings = () => {
  const ratings: Record<string, number> = {};
  const startDate = new Date(CURRENT_YEAR, 0, 1);
  const currentDate = new Date(startDate);

  const relapseWeeks = new Set([6, 11, 19, 27, 34, 46]);
  const pushWeeks = new Set([4, 8, 14, 22, 30, 38, 50]);

  while (currentDate <= TODAY) {
    const weekday = currentDate.getDay();
    const key = dayKey(currentDate);

    if (weekday !== 0 && weekday !== 6 && !demoDayOffs[key] && !demoSickDays[key]) {
      const week = weekFromDate(currentDate);
      let base = 2;

      if (week >= 9 && week <= 18) base = 3;
      if (week >= 19 && week <= 30) base = 2;
      if (week >= 31 && week <= 43) base = 3;
      if (week >= 44) base = 2;

      if (relapseWeeks.has(week)) base -= 1;
      if (pushWeeks.has(week)) base += 1;

      const dayNoise = ((currentDate.getDate() + currentDate.getMonth()) % 3) - 1;
      const score = clampScore(base + (dayNoise === 0 ? 0 : dayNoise > 0 ? 1 : 0));

      // occasionally miss logging a day to keep it realistic
      if ((currentDate.getDate() + week) % 13 !== 0) {
        ratings[key] = score;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return ratings;
};

export const demoProductivityRatings = generateDemoProductivityRatings();

export const demoGoals = [
  {
    id: "1",
    title: "Ship Reliable Freelance Work Without Burnout",
    timeframe: "Deadline: October 2026",
    description:
      "Protect deep work time, ship weekly, and keep quality high enough that clients stop sending 11:58 PM panic messages.",
    archived: false,
    keyResults: [
      {
        id: "kr1",
        title:
          "Run two protected deep-work blocks per weekday before noon by March 2026",
        status: "started" as const,
      },
      {
        id: "kr2",
        title:
          "Ship one client-facing deliverable every week and log what shipped by June 2026",
        status: "started" as const,
      },
      {
        id: "kr3",
        title: "Keep average weekly productivity at 2.4+ by October 2026",
        status: "started" as const,
      },
    ],
  },
  {
    id: "2",
    title: "Raise Solo Revenue and Clean Up Client Operations",
    timeframe: "Deadline: November 2026",
    description:
      "Less chaos, cleaner pricing, fewer context switches, and money that arrives before emotional collapse.",
    archived: false,
    keyResults: [
      {
        id: "kr4",
        title: "Standardize three service packages by April 2026",
        status: "started" as const,
      },
      {
        id: "kr5",
        title: "Reduce unpaid admin time to under 4 hours per week by July 2026",
        status: "started" as const,
      },
      {
        id: "kr6",
        title: "Maintain a 3-month cash runway by November 2026",
        status: "on-hold" as const,
      },
    ],
  },
  {
    id: "3",
    title: "Stay Human While Working Like a Pro",
    timeframe: "Deadline: December 2026",
    description:
      "Keep health and relationships intact so success is not just better invoices and a worse personality.",
    archived: false,
    keyResults: [
      {
        id: "kr7",
        title: "Exercise or long-walk at least 4 times per week by May 2026",
        status: "started" as const,
      },
      {
        id: "kr8",
        title: "Protect one no-work evening each week by August 2026",
        status: "started" as const,
      },
      {
        id: "kr9",
        title: "Take and log at least 8 genuine sick/rest days by December 2026",
        status: "started" as const,
      },
    ],
  },
];

export const demoWeeklyNoteTemplate = {
  content:
    "<p><strong>Active week settings</strong></p><p>[] Run two deep-work blocks daily</p><p>[] Ship one client deliverable</p><p>[] Complete Friday review and planning</p><p><strong>Status check</strong></p><p>[] Goal 1 met last week</p><p>[] Goal 2 met last week</p><p>[] Goal 3 met last week</p>",
  dos: "Start with deep work\nTimebox every client task\nLog shipped work today\nSet tomorrow before shutdown",
  donts:
    "Don't open chat too early\nDon't accept scope without schedule\nDon't fill mornings with meetings\nDon't skip weekly review",
};

const weekTitles = [
  "Boot Sequence",
  "Calendar Before Chaos",
  "Deep Work, Shallow Panic",
  "Timebox or Be Timeboxed",
  "Scope Is Not Infinite",
  "Sick Day, Not System Failure",
  "Small Wins Compound",
  "Client Calls, Fewer Fire Drills",
  "Shipping Beats Polishing",
  "Debugging My Own Workflow",
  "The Week Email Tried to Eat",
  "Reset with Receipts",
  "Quarter Review, No Drama",
  "Refactor Week",
  "Meetings on a Diet",
  "The Invoice Arc",
  "Focus Blocks and Coffee Physics",
  "Delivery Rhythm",
  "Second Sick-Day Reality Check",
  "Back to Baseline",
  "Less Tabs, Better Brain",
  "Ship Week",
  "Midyear Money Check",
  "One Bad Tuesday",
  "Recovery with Boundaries",
  "Client Trust Sprint",
  "Context-Switch Tax",
  "Walks Are Debugging",
  "Deep Work Summer",
  "No Heroics, Just Cadence",
  "Q3 Starts Clean",
  "Architecture and Sleep",
  "Humor as Risk Mitigation",
  "Sick but Documented",
  "Return to Throughput",
  "Tiny Process Upgrade",
  "Half-Day Slump, Full-Day Recovery",
  "September Stabilizer",
  "Quiet Week, Good Week",
  "Less Noise, Better Code",
  "Fourth Quarter Energy Budget",
  "Client Expansion Without Chaos",
  "Saying No Professionally",
  "Holiday Pre-Planning",
  "Keep the Streak Honest",
  "Cold, Cough, and Commit History",
  "Bounce Back Week",
  "Deadline Season",
  "Protect the Evenings",
  "Final Push, No Burnout",
  "Year-End Review",
  "Closeout and Gratitude",
];

const dosPool = [
  "Protect two deep work blocks",
  "Timebox all client tasks",
  "Set tomorrow's first task",
  "Log shipped work daily",
  "Batch inbox once after lunch",
  "Run Friday review ritual",
  "Take walk after coding block",
  "Confirm scope in writing",
];

const dontsPool = [
  "Don't check chat before focus",
  "Don't accept scope without timeboxes",
  "Don't book morning meetings",
  "Don't hide context switching",
  "Don't skip sleep for output",
  "Don't carry client ambiguity overnight",
  "Don't postpone Friday review",
  "Don't guilt-trip sick days",
];

const monthThemes = [
  "Foundation",
  "Momentum",
  "Execution",
  "Stability",
  "Cash Flow",
  "Consistency",
  "Sustainability",
  "Focus",
  "Quality",
  "Boundaries",
  "Resilience",
  "Closeout",
];

const buildStoryForWeek = (week: number): WeeklyStoryEntry => {
  const monthTheme = monthThemes[Math.min(11, Math.floor((week - 1) / 4.4))] ?? "Execution";
  const weekTag = formatWeekTag(week);
  const hitSickDay = [6, 19, 34, 46].includes(week);
  const roughPatch = [11, 24, 37].includes(week);
  const goal1Met = !roughPatch;
  const goal2Met = week % 4 !== 0;
  const goal3Met = ![6, 19, 34, 46, 24].includes(week);
  const goal1Status = goal1Met ? "met" : "not met";
  const goal2Status = goal2Met ? "met" : "not met";
  const goal3Status = goal3Met ? "met" : "not met";
  const goal1Mark = goal1Met ? "[x]" : "[]";
  const goal2Mark = goal2Met ? "[x]" : "[]";
  const goal3Mark = goal3Met ? "[x]" : "[]";

  const noteLines = [
    `${weekTag} active settings: this week runs on deep work plus hard timeboxes.`,
    `Theme: ${monthTheme.toLowerCase()}. Objective is boring consistency and billable output.`,
    "[] Goal 1 setting: protect focus blocks.",
    "[] Goal 2 setting: keep scope clean.",
    hitSickDay
      ? "[] Goal 3 setting: recovery mode active."
      : "[] Goal 3 setting: protect sleep and evenings.",
    `${goal1Mark} Last week Goal 1 ${goal1Status}.`,
    `${goal2Mark} Last week Goal 2 ${goal2Status}.`,
    `${goal3Mark} Last week Goal 3 ${goal3Status}.`,
    roughPatch
      ? "Humor check: calendar looked like modern art; still, the system stays in charge."
      : "Humor check: caffeine remains legal, so the sprint continues responsibly.",
  ];

  return {
    title: weekTitles[week - 1] ?? `Week ${week}`,
    weeklyNote: noteLines.join("\n"),
    dos: pickFour(dosPool, week % dosPool.length),
    donts: pickFour(dontsPool, week % dontsPool.length),
    carryForward:
      "Read this before Monday work: protect deep work, cap scope, and end each day with one clear next step.",
  };
};

const buildDemoWeeklyStory = () => {
  const story: Record<number, WeeklyStoryEntry> = {};
  for (let week = 1; week <= 52; week += 1) {
    story[week] = buildStoryForWeek(week);
  }
  return story;
};

export const demoWeeklyStoryByWeekNumber = buildDemoWeeklyStory();

export const demoProfile = {
  personName: "Demo User",
  dateOfBirth: "1990-01-01",
  goalsSectionTitle: "2026 Goals",
  weekStartDay: 1, // Monday
  recentYears: "2",
  showLegend: true,
  dayOffAllowance: 15,
  productivityScaleMode: "4", // 4-point scale
  autoMarkWeekendsOff: true, // Auto-mark weekends as day-off
  workDays: "1,2,3,4,5", // Monday-Friday (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
  weeklyGoalsTemplate:
    "<p><strong>What I want to accomplish this week:</strong></p><ul><li>Monday</li><li>Tuesday</li><li>Wednesday</li><li>Thursday</li><li>Friday</li><li>Saturday</li><li>Sunday</li></ul>",
};
