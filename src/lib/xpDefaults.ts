// Shared XP defaults — plain module, no "use server"
export const DEFAULT_XP_CONFIG = {
  xp_task_default: 10,
  xp_habit_streak1: 5,
  xp_habit_streak7: 10,
  xp_habit_streak30: 25,
  xp_journal: 0,
  xp_food_meal: 5,
  xp_sleep_log: 10,
  xp_exercise_min: 5,
  xp_neg_mild: 10,
  xp_neg_moderate: 25,
  xp_neg_severe: 50,
} as const;
