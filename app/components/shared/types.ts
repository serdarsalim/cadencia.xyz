// Shared types used across productivity components

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type KeyResultStatus = "on-hold" | "started" | "completed";

export type KeyResult = {
  id: string;
  title: string;
  status: KeyResultStatus;
};

export type Goal = {
  id: string;
  title: string;
  timeframe: string;
  description?: string;
  keyResults: KeyResult[];
  statusOverride?: KeyResultStatus;
  archived?: boolean;
};

export type WeeklyNoteEntry = {
  content: string;
  dos: string;
  donts: string;
};

export type ProductivityScaleEntry = {
  value: number;
  label: string;
  color: string;
};

export type WeekMeta = {
  weekNumber: number;
  months: number[];
  dayKeys: string[];
  primaryMonth: number;
  rangeLabel: string;
  weekKey: string;
  weekStart: Date;
};

export type Theme = "light" | "dark";

export type ProductivityViewMode = "day" | "week";

export type ShareVisibility = {
  showSelfRating: boolean;
  showDosDonts: boolean;
  showWeeklyGoals: boolean;
  showOkrs: boolean;
};

export type ProfileSettings = {
  weekStartDay: WeekdayIndex;
  goalsSectionTitle?: string;
  productivityViewMode?: ProductivityViewMode;
  productivityScaleMode?: "3" | "4";
  showLegend?: boolean;
};

// Constants
export const PRODUCTIVITY_SCALE_THREE: ProductivityScaleEntry[] = [
  { value: 0, label: "<25%", color: "productivity-low" },
  { value: 1, label: "25-50%", color: "productivity-medium" },
  { value: 2, label: ">50%", color: "productivity-high" },
];

export const PRODUCTIVITY_SCALE_FOUR: ProductivityScaleEntry[] = [
  { value: 0, label: "<25%", color: "productivity-low" },
  { value: 1, label: "25-50%", color: "productivity-medium" },
  { value: 2, label: "50-75%", color: "productivity-high" },
  { value: 3, label: ">75%", color: "productivity-top" },
];
