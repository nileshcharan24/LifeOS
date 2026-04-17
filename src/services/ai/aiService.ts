"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export async function askOracle(message: string) {
  const supabase = await createClient();

  // Get user session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized access to Oracle");

  // Fetch User Context
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, level, ai_custom_instructions, daily_streak")
    .eq("id", user.id)
    .single();

  const { data: quests } = await supabase
    .from("quests")
    .select("title, status")
    .eq("profile_id", user.id);

  const { data: latestJournal } = await supabase
    .from("journal_entries")
    .select("mood_score")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Compile context
  const customInstructions = profile?.ai_custom_instructions || "You are a firm but constructive AI Oracle.";
  const activeQuests = quests?.filter(q => q.status === "active").map(q => q.title).join(", ") || "None";
  const completedQuests = quests?.filter(q => q.status === "completed").map(q => q.title).join(", ") || "None";
  
  const systemPrompt = `
    You are the LifeOS AI Oracle.
    User Profile:
    - Total XP: ${profile?.total_xp || 0}
    - Level: ${profile?.level || 1}
    - Daily Streak: ${profile?.daily_streak || 0}
    - Active Quests: ${activeQuests}
    - Completed Quests: ${completedQuests}
    - Latest Mood Score: ${latestJournal?.mood_score ? latestJournal.mood_score + "/10" : "Unknown"}

    Custom Instructions from User:
    ${customInstructions}

    Respond to the user's message in a way that respects their custom instructions, acknowledging their current stats, quests, and mood. Keep it concise, actionable, firm but constructive.
  `;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "SYSTEM INSTRUCTIONS: " + systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am the LifeOS Oracle. How can I guide you today?" }],
        },
      ]
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    // Log chat to DB
    await supabase.from("ai_chat_history").insert([
      { profile_id: user.id, message, role: "user" },
      { profile_id: user.id, message: responseText, role: "oracle" }
    ]);

    return { success: true, text: responseText };
  } catch (error: any) {
    console.error("Oracle Error:", error);
    return { success: false, error: "The Oracle is currently unavailable. Please check API keys." };
  }
}
