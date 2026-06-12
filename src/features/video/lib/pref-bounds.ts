export const PREF_AGE_MIN = 18;
export const PREF_AGE_MAX = 99;
export const PREF_DISTANCE_MIN = 5;
export const PREF_DISTANCE_MAX = 500;
export const PREF_DISTANCE_STEP = 5;

export function clampAge(value: number): number {
  if (!Number.isFinite(value)) return PREF_AGE_MIN;
  return Math.min(PREF_AGE_MAX, Math.max(PREF_AGE_MIN, Math.round(value)));
}

export function clampDistance(value: number): number {
  if (!Number.isFinite(value)) return PREF_DISTANCE_MIN;
  const stepped =
    Math.round(value / PREF_DISTANCE_STEP) * PREF_DISTANCE_STEP;
  return Math.min(
    PREF_DISTANCE_MAX,
    Math.max(PREF_DISTANCE_MIN, stepped),
  );
}

export function normalizeAgeRange(
  minAge: number,
  maxAge: number,
): { minAge: number; maxAge: number } {
  const min = clampAge(minAge);
  const max = clampAge(maxAge);
  if (min > max) return { minAge: max, maxAge: min };
  return { minAge: min, maxAge: max };
}

export function ageTrackPercent(age: number): number {
  const clamped = clampAge(age);
  const span = PREF_AGE_MAX - PREF_AGE_MIN;
  return ((clamped - PREF_AGE_MIN) / span) * 100;
}
