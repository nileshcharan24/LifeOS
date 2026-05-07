"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { buildContextPackage, type ContextPackage } from "./oracleContextService";

export type OracleConfig = {
  id: string;
  profile_id: string;
  oracle_name: string;
  personality_text: string | null;
  strictness: "gentle" | "balanced" | "brutal";
  style: "coach" | "friend" | "mentor" | "therapist" | "drill_sergeant";
  length_pref: "brief" | "medium" | "detailed";
  language_tone: "formal" | "casual" | "motivational" | "analytical";
  comfort_mode_enabled: boolean;
  setup_completed: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "oracle";
  content: string;
  created_at: string;
};

export type OracleSession = {
  id: string;
  session_date: string;
  summary: string | null;
  topics: string[] | null;
  primary_mood: number | null;
};

// ─── Config ────────────────────────────────────────────────────────────────

export async function getOracleConfig(): Promise<OracleConfig | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("oracle_config")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  return data as OracleConfig | null;
}

export async function saveOracleConfig(config: {
  oracle_name: string;
  personality_text?: string;
  strictness: string;
  style: string;
  length_pref: string;
  language_tone: string;
  comfort_mode_enabled: boolean;
}): Promise<OracleConfig> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("oracle_config")
    .upsert({
      profile_id: user.id,
      oracle_name: config.oracle_name,
      personality_text: config.personality_text ?? null,
      strictness: config.strictness as "gentle" | "balanced" | "brutal",
      style: config.style as "coach" | "friend" | "mentor" | "therapist" | "drill_sergeant",
      length_pref: config.length_pref as "brief" | "medium" | "detailed",
      language_tone: config.language_tone as "formal" | "casual" | "motivational" | "analytical",
      comfort_mode_enabled: config.comfort_mode_enabled,
      setup_completed: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "profile_id" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OracleConfig;
}

export async function updateComfortMode(enabled: boolean): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("oracle_config")
    .update({ comfort_mode_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("profile_id", user.id);
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export async function getOrCreateTodaySession(): Promise<{ sessionId: string; isNew: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("oracle_chat_sessions")
    .select("id")
    .eq("profile_id", user.id)
    .eq("session_date", today)
    .maybeSingle();

  if (existing) return { sessionId: existing.id, isNew: false };

  const { data: created, error } = await supabase
    .from("oracle_chat_sessions")
    .insert({ profile_id: user.id, session_date: today })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { sessionId: created.id, isNew: true };
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("oracle_chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  return (data as ChatMessage[]) ?? [];
}

export async function getPastSessions(): Promise<OracleSession[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("oracle_chat_sessions")
    .select("id, session_date, summary, topics, primary_mood")
    .eq("profile_id", user.id)
    .neq("session_date", today)
    .gte("session_date", weekAgo.toISOString().split("T")[0])
    .order("session_date", { ascending: false });

  return (data as OracleSession[]) ?? [];
}

export async function getSessionMessagesById(sessionId: string): Promise<ChatMessage[]> {
  return getSessionMessages(sessionId);
}

// ─── System Prompt Builder ──────────────────────────────────────────────────

function buildSystemPrompt(config: OracleConfig, ctx: ContextPackage, comfortMode: boolean): string {
  const styleDesc: Record<string, string> = {
    coach: "a performance-focused coach who is goal-driven and metric-oriented",
    friend: "a supportive friend who is conversational, empathetic, and relatable",
    mentor: "a wise mentor who takes a long-term perspective and shares thoughtful insights",
    therapist: "a therapist who explores feelings, validates emotions, and asks reflective questions",
    drill_sergeant: "a drill sergeant who is direct, intense, and has zero tolerance for excuses",
  };

  const lengthDesc: Record<string, string> = {
    brief: "Keep responses to 2-3 sentences maximum.",
    medium: "Keep responses to 1-2 paragraphs.",
    detailed: "Give full, detailed analysis with specific examples from the data.",
  };

  const toneDesc: Record<string, string> = {
    formal: "Use professional, structured language.",
    casual: "Be conversational and relatable.",
    motivational: "Be energetic, celebratory, and hype-driven.",
    analytical: "Be data-driven, objective, and metric-focused.",
  };

  const personalitySection = config.personality_text
    ? `\nCUSTOM PERSONALITY INSTRUCTIONS:\n${config.personality_text}\n`
    : "";

  const strictnessNote =
    config.strictness === "brutal"
      ? "Call out mistakes directly. Give hard truths without softening."
      : config.strictness === "gentle"
      ? "Be supportive and assume good intent. Focus on encouragement."
      : "Be honest and constructive. Mix encouragement with accountability.";

  const comfortNote = comfortMode
    ? "\nCOMFORT MODE ACTIVE: User is having a rough time. Be gentler, more empathetic. Focus on listening and positives. Skip harsh criticism."
    : "";

  const habitsText = ctx.habitsThisWeek
    .map((h) => `  - ${h.name}: ${h.completed}/${h.outOf} days`)
    .join("\n");

  const journalText = ctx.journalThisWeek
    .slice(0, 5)
    .map((j) => `  - ${j.date}: mood ${j.moodScore ?? "?"}/10, energy ${j.energyLevel ?? "?"}/10. Tags: [${[...j.moodTags, ...j.categoryTags].join(", ")}]. "${j.contentSummary}"`)
    .join("\n");

  const negHabitsText = ctx.negativeHabitsThisWeek
    .map((n) => `  - ${n.habit}: ${n.count}x (${n.intensities.join(", ")})`)
    .join("\n");

  const goalsText = ctx.longTermGoals
    .slice(0, 5)
    .map((g) => `  - ${g.title}${g.targetDate ? ` (target: ${g.targetDate})` : ""}`)
    .join("\n");

  const pastConvoText = ctx.pastSessionSummaries
    .slice(0, 5)
    .map((s) => `  - ${s.date} (mood: ${s.primaryMood ?? "?"}): ${s.summary ?? "No summary"}`)
    .join("\n");

  const aboutMeSection = ctx.aboutMe?.trim()
    ? `\nABOUT THE USER (written by them — treat as ground truth):\n${ctx.aboutMe.trim()}\n`
    : "";

  return `You are ${config.oracle_name}, a personal AI life coach embedded in LifeOS.
${aboutMeSection}
USER PROFILE:
- Name: ${ctx.user.name ?? "User"}
- Level: ${ctx.user.level} | Total XP: ${ctx.user.totalXP} | Streak: ${ctx.user.dailyStreak} days
- Today: ${ctx.todayDate}

PERSONALITY:
- You act like ${styleDesc[config.style] ?? styleDesc.coach}.
- Strictness: ${strictnessNote}
- ${lengthDesc[config.length_pref] ?? lengthDesc.medium}
- ${toneDesc[config.language_tone] ?? toneDesc.casual}${personalitySection}${comfortNote}

HABIT DATA (this week):
${habitsText || "  No habits tracked yet."}

TASKS:
- Pending: ${ctx.tasksThisWeek.pending} | Overdue: ${ctx.tasksThisWeek.overdue}
- Upcoming: ${ctx.tasksThisWeek.upcomingTitles.join(", ") || "None"}

HEALTH (7-day averages):
- Sleep: ${ctx.healthThisWeek.avgSleepHours ?? "not logged"} hrs avg
- Exercise: ${ctx.healthThisWeek.totalExerciseMinutes} min total across ${ctx.healthThisWeek.exerciseDays} days
- Avg mood: ${ctx.healthThisWeek.avgMoodScore ?? "not logged"}/10
- Junk food: ${ctx.healthThisWeek.junkMealCount} occurrences

TODAY'S HEALTH:
- Sleep: ${ctx.todayHealth.sleep ? `${ctx.todayHealth.sleep.durationHours}h, quality ${ctx.todayHealth.sleep.quality}/10` : "not logged"}
- Exercise: ${ctx.todayHealth.exercise.length > 0 ? ctx.todayHealth.exercise.map((e) => `${e.activityType} (${e.durationMinutes}min)`).join(", ") : "none logged"}
- Meals: ${ctx.todayHealth.meals.length > 0 ? ctx.todayHealth.meals.map((m) => `${m.mealType}: ${m.description}${m.isJunk ? " [JUNK]" : ""}`).join("; ") : "none logged"}

JOURNAL (this week):
${journalText || "  No journal entries this week."}

NEGATIVE HABITS (this week):
${negHabitsText || "  None logged."}

LONG-TERM GOALS:
${goalsText || "  No goals set yet."}

PAST CONVERSATIONS (recent):
${pastConvoText || "  No past conversations."}

RULES:
1. Every claim must be grounded in the DATA above. No generic advice.
2. Reference specific numbers, dates, and patterns from the data.
3. When referencing past conversations, acknowledge the mood context.
4. Never say "I don't have data" for things clearly shown above — use what you have.
5. Respond naturally, like a coach who has been watching this person for weeks.
6. If the user asks about something not in the data (e.g., diet details not logged), say clearly what you do and don't know.`;
}

// ─── Gemini Helpers ─────────────────────────────────────────────────────────

const GEMINI_PRIMARY = "gemini-2.5-flash";
const GEMINI_FALLBACK = "gemini-1.5-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY_ORACLE ?? process.env.GEMINI_API_KEY ?? "";
  if (!key) console.error("Oracle: No Gemini API key found in environment.");
  return key;
}

function isModelUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("404") || msg.includes("no longer available") || msg.includes("deprecated") || msg.includes("not found");
}

async function chatWithFallback(
  systemInstruction: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userMessage: string
): Promise<string> {
  const apiKey = getApiKey();
  for (const modelName of [GEMINI_PRIMARY, GEMINI_FALLBACK]) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userMessage);
      return result.response.text();
    } catch (err) {
      if (isModelUnavailableError(err) && modelName !== GEMINI_FALLBACK) {
        console.warn(`Oracle: ${modelName} unavailable, falling back to ${GEMINI_FALLBACK}`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("No available Gemini model");
}

async function generateWithFallback(
  systemInstruction: string,
  prompt: string
): Promise<string> {
  const apiKey = getApiKey();
  for (const modelName of [GEMINI_PRIMARY, GEMINI_FALLBACK]) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (isModelUnavailableError(err) && modelName !== GEMINI_FALLBACK) {
        console.warn(`Oracle: ${modelName} unavailable, falling back to ${GEMINI_FALLBACK}`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("No available Gemini model");
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function sendOracleMessage(
  sessionId: string,
  userMessage: string,
  conversationHistory: ChatMessage[],
  comfortMode: boolean
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const [config, ctx] = await Promise.all([getOracleConfig(), buildContextPackage()]);
    if (!config) return { success: false, error: "Oracle not configured" };

    const systemPrompt = buildSystemPrompt(config, ctx, comfortMode);

    const history = conversationHistory.map((msg) => ({
      role: msg.role === "oracle" ? ("model" as const) : ("user" as const),
      parts: [{ text: msg.content }],
    }));

    const responseText = await chatWithFallback(systemPrompt, history, userMessage);

    // Save both messages to DB
    await supabase.from("oracle_chat_messages").insert([
      { session_id: sessionId, profile_id: user.id, role: "user", content: userMessage },
      { session_id: sessionId, profile_id: user.id, role: "oracle", content: responseText },
    ]);

    // Also log to legacy ai_chat_history for backward compat
    await supabase.from("ai_chat_history").insert([
      { profile_id: user.id, message: userMessage, role: "user" },
      { profile_id: user.id, message: responseText, role: "oracle" },
    ]).then(() => {}, () => {});

    return { success: true, text: responseText };
  } catch (err: unknown) {
    console.error("Oracle chat error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("429")) return { success: false, error: "Oracle is thinking. Try again in a moment." };
    if (msg.includes("API_KEY") || msg.includes("403")) return { success: false, error: "Oracle configuration error. Contact support." };
    return { success: false, error: "Oracle is offline. Check your connection." };
  }
}

// ─── Day Diagnosis ──────────────────────────────────────────────────────────

export async function getTodayDiagnosis(): Promise<{ fullText: string; comfortModeOn: boolean } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("day_diagnoses")
    .select("full_text, comfort_mode_on")
    .eq("profile_id", user.id)
    .eq("diagnosis_date", today)
    .maybeSingle();

  if (!data) return null;
  return { fullText: data.full_text, comfortModeOn: data.comfort_mode_on };
}

export async function generateDayDiagnosis(
  comfortMode: boolean
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const [config, ctx] = await Promise.all([getOracleConfig(), buildContextPackage()]);
    if (!config) return { success: false, error: "Oracle not configured" };

    const systemPrompt = buildSystemPrompt(config, ctx, comfortMode);
    const today = ctx.todayDate;

    const diagnosisPrompt = `Generate my Day Review for ${today}.

Analyze ONLY today's actual data from the context above. Structure your response naturally (not with rigid headers) covering:
1. Opening: Quick take on how the day went overall
2. Performance: Habits completed/missed today, tasks done
3. Health: Today's sleep, exercise, and meals (or note if not logged)
4. Mood & Journal: What the journal entry says (if any), mood rating, notable feelings
5. Negative habits: Any logged today (non-judgmental)
6. Key insight: One pattern you noticed from the past week connecting to today
7. One action: The single most important thing to focus on tomorrow
8. Closing: Match the personality setting.

If some data (sleep, food, exercise, journal) is not logged today, briefly acknowledge it rather than skipping it. Keep it conversational and grounded in the actual data.`;

    const text = await generateWithFallback(systemPrompt, diagnosisPrompt);

    // Upsert (one per day)
    await supabase.from("day_diagnoses").upsert({
      profile_id: user.id,
      diagnosis_date: today,
      full_text: text,
      comfort_mode_on: comfortMode,
    }, { onConflict: "profile_id,diagnosis_date" });

    return { success: true, text };
  } catch (err: unknown) {
    console.error("Day diagnosis error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429")) return { success: false, error: "Oracle is thinking. Try again in a moment." };
    return { success: false, error: "Failed to generate review. Try again." };
  }
}

export async function getPastDiagnoses(): Promise<{ id: string; diagnosis_date: string; full_text: string }[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("day_diagnoses")
    .select("id, diagnosis_date, full_text")
    .eq("profile_id", user.id)
    .order("diagnosis_date", { ascending: false })
    .limit(30);

  return data ?? [];
}

// ─── Weekly Review ──────────────────────────────────────────────────────────

export async function getLatestWeeklyReview(): Promise<{
  review: { id: string; week_start_date: string; week_end_date: string; full_text: string } | null;
  nextAvailable: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { review: null, nextAvailable: null };

  const { data } = await supabase
    .from("weekly_reviews")
    .select("id, week_start_date, week_end_date, full_text, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { review: null, nextAvailable: null };

  const createdAt = new Date(data.created_at);
  const nextAvailableDate = new Date(createdAt);
  nextAvailableDate.setDate(createdAt.getDate() + 7);
  const canGenerate = new Date() >= nextAvailableDate;

  return {
    review: data,
    nextAvailable: canGenerate ? null : nextAvailableDate.toLocaleDateString(),
  };
}

export async function generateWeeklyReview(
  comfortMode: boolean
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    // Check cooldown
    const { nextAvailable } = await getLatestWeeklyReview();
    if (nextAvailable) {
      return { success: false, error: `Already generated this week. Next available: ${nextAvailable}` };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const [config, ctx] = await Promise.all([getOracleConfig(), buildContextPackage()]);
    if (!config) return { success: false, error: "Oracle not configured" };

    const systemPrompt = buildSystemPrompt(config, ctx, comfortMode);

    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekEnd.getDate() - 6);

    const weeklyPrompt = `Generate my Weekly Review for the week of ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}.

Analyze the full 7 days of data in the context. Write a flowing narrative (not bullet points, not rigid headers) that covers:
1. Overall framing of the week — how was it in one sentence?
2. Best and worst day — name specific days and explain why with data
3. Habit consistency — which habits I crushed, which I dropped, overall percentage
4. XP and level progress — total earned, spending, level trajectory
5. Health trends — sleep average, exercise frequency, food quality, any correlations
6. Negative habits — patterns, frequencies, what context they appear in
7. Mood arc — how mood moved across the week, what drove highs/lows
8. Three things I crushed this week — specific, data-backed wins
9. Three focus areas for next week — specific, actionable, grounded in the gaps
10. Closing message — match personality setting

Make it feel like a real review from a coach who has been watching me all week, not a report.`;

    const text = await generateWithFallback(systemPrompt, weeklyPrompt);

    await supabase.from("weekly_reviews").insert({
      profile_id: user.id,
      week_start_date: weekStart.toISOString().split("T")[0],
      week_end_date: weekEnd.toISOString().split("T")[0],
      full_text: text,
    });

    return { success: true, text };
  } catch (err: unknown) {
    console.error("Weekly review error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429")) return { success: false, error: "Oracle is thinking. Try again in a moment." };
    return { success: false, error: "Failed to generate weekly review. Try again." };
  }
}

export async function getPastWeeklyReviews(): Promise<{ id: string; week_start_date: string; week_end_date: string; full_text: string }[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("weekly_reviews")
    .select("id, week_start_date, week_end_date, full_text")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  return data ?? [];
}
