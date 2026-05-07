"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import type { ContentSource } from "@/services/growth/preferencesService";

export type VideoRecommendation = {
  channel: string;
  topic: string;
  why: string;
};

export type ReadRecommendation = {
  title: string;
  source: string;
  why: string;
};

export type SideQuest = {
  title: string;
  description: string;
  estimatedTime: string;
};

export type GrowthRecommendations = {
  videos: VideoRecommendation[];
  reads: ReadRecommendation[];
  sideQuests: SideQuest[];
};

const GEMINI_PRIMARY = "gemini-2.5-flash";
const GEMINI_FALLBACK = "gemini-1.5-flash";

function getApiKey(): string {
  return process.env.GEMINI_API_KEY_ORACLE ?? process.env.GEMINI_API_KEY ?? "";
}

function isModelUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("404") ||
    msg.includes("no longer available") ||
    msg.includes("deprecated") ||
    msg.includes("not found")
  );
}

async function generateJSON(systemInstruction: string, prompt: string): Promise<string> {
  const apiKey = getApiKey();
  for (const modelName of [GEMINI_PRIMARY, GEMINI_FALLBACK]) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (isModelUnavailableError(err) && modelName !== GEMINI_FALLBACK) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("No available Gemini model");
}

export async function getGrowthRecommendations(
  categories: string[],
  contentSources: ContentSource[]
): Promise<{ success: boolean; data?: GrowthRecommendations; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username, level")
      .eq("id", user.id)
      .single();

    const { data: goals } = await supabase
      .from("future_goals")
      .select("title, priority")
      .eq("profile_id", user.id)
      .eq("is_completed", false)
      .limit(5);

    const userName = profile?.full_name ?? profile?.username ?? "the user";
    const userLevel = profile?.level ?? 1;

    const sourcesText = contentSources.length > 0
      ? contentSources
          .map((s) => `  - ${s.label}${s.url ? ` (${s.url})` : ""}`)
          .join("\n")
      : "  None specified yet.";

    const goalsText = (goals ?? []).length > 0
      ? (goals ?? []).map((g) => `  - ${g.title}`).join("\n")
      : "  None set.";

    const systemInstruction = `You are a personalized growth and learning advisor for LifeOS, a gamified self-improvement app.
Your job is to recommend specific, actionable content that matches the user's exact interests and preferred content sources.

CRITICAL RULES:
1. For video recommendations, ALWAYS prioritize the user's listed channels and creators first.
   Reference them by name and suggest specific video topics they would cover.
2. For reads, suggest content from the user's listed websites/newsletters, or highly relevant alternatives in the same niche.
3. Every recommendation must have a "why" that explicitly connects it to the user's categories or named sources.
4. Side quests must be concrete, completable learning challenges — not vague suggestions.
5. Calibrate depth to the user's level (Level ${userLevel}/100 — higher = more advanced content).
6. Return ONLY valid JSON matching the exact schema provided. No markdown, no commentary.`;

    const prompt = `Generate personalized growth recommendations for ${userName} (Level ${userLevel}).

USER'S INTEREST CATEGORIES:
${categories.map((c) => `  - ${c}`).join("\n")}

USER'S PREFERRED CONTENT SOURCES (YouTube channels, newsletters, blogs):
${sourcesText}

USER'S LONG-TERM GOALS:
${goalsText}

Return a JSON object with exactly this schema:
{
  "videos": [
    {
      "channel": "exact channel/creator name",
      "topic": "specific video topic or series to watch",
      "why": "1-2 sentences connecting this to their interests or goals"
    }
  ],
  "reads": [
    {
      "title": "article, newsletter issue, or resource title",
      "source": "website or publication name",
      "why": "1-2 sentences explaining relevance"
    }
  ],
  "sideQuests": [
    {
      "title": "short quest title",
      "description": "exactly what to do, step by step",
      "estimatedTime": "e.g. 2 hours, 1 week"
    }
  ]
}

Produce exactly 4 video recommendations, 4 read recommendations, and 3 side quests.
Prioritize the user's listed sources above everything else.`;

    const raw = await generateJSON(systemInstruction, prompt);

    let parsed: GrowthRecommendations;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { success: false, error: "AI returned malformed output. Try again." };
    }

    return { success: true, data: parsed };
  } catch (err) {
    console.error("growthRecommender error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
