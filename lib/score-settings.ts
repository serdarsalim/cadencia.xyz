export type ScoreDisplayMode = "percentage" | "average";

export const DEFAULT_SCORE_LABELS = ["Low", "Partial", "Good", "Excellent"];
export const DEFAULT_SCORE_DISPLAY_MODE: ScoreDisplayMode = "percentage";

export const normalizeScoreLabels = (value: unknown) => {
  let parsed: unknown = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value.split("|");
    }
  }

  const labels = Array.isArray(parsed) ? parsed : [];

  return DEFAULT_SCORE_LABELS.map((fallback, index) => {
    const label = labels[index];
    return typeof label === "string" && label.trim() ? label.trim() : fallback;
  });
};

export const serializeScoreLabels = (labels: string[]) =>
  JSON.stringify(normalizeScoreLabels(labels));

export const normalizeScoreDisplayMode = (value: unknown): ScoreDisplayMode =>
  value === "average" ? "average" : DEFAULT_SCORE_DISPLAY_MODE;
