import { z } from "zod";

export const reflectionSchema = z.object({
  mood: z.string().min(1),
  notes: z.string().optional(),
  isPrivate: z.boolean().default(false),
});

export const healthLogSchema = z.object({
  sleepHours: z.number().min(0).max(24),
  workouts: z.number().min(0),
  isPrivate: z.boolean().default(false),
});

