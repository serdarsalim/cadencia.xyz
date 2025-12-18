export const APP_NAME = "SLMTRACK";

export const APP_DESCRIPTION =
  "SLMTRACK is a minimalist app for setting personal OKRs with Key Results and tracking weekly productivity goals.";

export const APP_LONG_DESCRIPTION = `A focused personal OKR system with weekly planning and daily self-scoring. Set long-term objectives with measurable key results, plan what you want to achieve each week, and score yourself daily (not achieved, partly achieved, or achieved). View your year at a glance with a visual calendar showing your productivity patterns.`;

export const APP_TAGLINE = "Personal goal setting & tracking app";

export const APP_FEATURES = [
  "Personal OKRs with Key Results",
  "Weekly goal planning",
  "Daily self-scoring",
  "Year-at-a-glance calendar",
  "Behavioral do's & don'ts",
  "Minimal design",
];

const createStorageKey = (prefix: string, suffix: string) => `${prefix}-${suffix}`;

export const APP_STORAGE_PREFIX = "slmtrack";
export const LEGACY_STORAGE_PREFIX = "timespent";

export const storageKey = (suffix: string) =>
  createStorageKey(APP_STORAGE_PREFIX, suffix);

export const legacyStorageKey = (suffix: string) =>
  createStorageKey(LEGACY_STORAGE_PREFIX, suffix);
