"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAboutMe, saveAboutMe } from "@/app/actions";

const PLACEHOLDER = `Write anything the Oracle should know about you as a person.

Examples:
- Your values, beliefs, or philosophy
- Background: where you grew up, your culture, your family situation
- Personality traits you've noticed in yourself
- Current struggles or recurring patterns
- Things that motivate or drain you
- Health conditions, dietary restrictions, or other constraints
- Career aspirations or life goals beyond what's in the planner
- Anything you wish a coach knew before advising you

This is private to Deep Mode. The Oracle reads it at the start of every conversation.`;

export function AboutMe() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [charCount, setCharCount] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    getAboutMe().then((val) => {
      setText(val);
      lastSaved.current = val;
      setCharCount(val.length);
    });
  }, []);

  const save = useCallback(async (value: string) => {
    if (value === lastSaved.current) return;
    setStatus("saving");
    const result = await saveAboutMe(value);
    if (result.error) {
      setStatus("error");
    } else {
      lastSaved.current = value;
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setCharCount(val.length);
    setStatus("idle");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(val), 1200);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    save(text);
  };

  const statusLabel = {
    idle: "",
    saving: "Saving…",
    saved: "Saved",
    error: "Failed to save",
  }[status];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">About Me</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personal context injected into every Oracle conversation. Only you can see this — it lives in Deep Mode.
        </p>
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={PLACEHOLDER}
          rows={22}
          className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40 placeholder:text-muted-foreground/50"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{charCount.toLocaleString()} chars</span>
          {status !== "idle" && (
            <span className={status === "error" ? "text-destructive" : status === "saved" ? "text-green-500" : ""}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Auto-saves as you type. The Oracle will use this as background context in its system prompt.
      </p>
    </div>
  );
}
