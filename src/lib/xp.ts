// Single source of truth for all XP math. Never store derived values — always compute.

export const XP_PER_LEVEL = 1000;

export const MILESTONE_LEVELS = [5, 10, 25, 50, 100, 200, 500];

/** 1-indexed level. Level 1 starts at 0 XP. */
export function calcLevel(totalXP: number): number {
  return Math.floor(Math.max(0, totalXP) / XP_PER_LEVEL) + 1;
}

/** XP value at the bottom of the current level (the "floor"). */
export function calcLevelFloor(totalXP: number): number {
  const level = calcLevel(totalXP);
  return (level - 1) * XP_PER_LEVEL;
}

/** XP available to spend (above the current level floor). */
export function calcSpendingPool(totalXP: number): number {
  return Math.max(0, totalXP) - calcLevelFloor(totalXP);
}

/** XP needed to reach the next level. */
export function calcXPToNext(totalXP: number): number {
  return XP_PER_LEVEL - calcSpendingPool(totalXP);
}

/** Progress through the current level as a 0–100 percentage. */
export function calcProgressPct(totalXP: number): number {
  return Math.min(100, (calcSpendingPool(totalXP) / XP_PER_LEVEL) * 100);
}

/** True if the user is exactly at or above a milestone level. */
export function isMilestone(totalXP: number): boolean {
  return MILESTONE_LEVELS.includes(calcLevel(totalXP));
}

/** Summary object — use this where multiple values are needed together. */
export function calcXPSummary(totalXP: number) {
  const level = calcLevel(totalXP);
  const levelFloor = calcLevelFloor(totalXP);
  const spendingPool = calcSpendingPool(totalXP);
  const xpToNext = calcXPToNext(totalXP);
  const progressPct = calcProgressPct(totalXP);
  return { level, levelFloor, spendingPool, xpToNext, progressPct };
}
