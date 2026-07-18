export const clampSettingNumber = (
  value: number,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};
