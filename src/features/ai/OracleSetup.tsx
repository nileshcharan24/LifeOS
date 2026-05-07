"use client";

import { useState } from "react";
import { saveOracleConfig, type OracleConfig } from "@/services/ai/oracleService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Brain, ChevronRight, ChevronLeft, Sparkles, Shield } from "lucide-react";

type PersonalityMode = "text" | "sliders" | "both";

type SetupData = {
  oracleName: string;
  personalityText: string;
  personalityMode: PersonalityMode;
  strictness: "gentle" | "balanced" | "brutal";
  style: "coach" | "friend" | "mentor" | "therapist" | "drill_sergeant";
  lengthPref: "brief" | "medium" | "detailed";
  languageTone: "formal" | "casual" | "motivational" | "analytical";
  comfortMode: boolean;
};

const STEP_COUNT = 5;

const STYLE_OPTIONS = [
  { value: "coach", label: "Coach", desc: "Performance-focused, goal-driven" },
  { value: "friend", label: "Friend", desc: "Conversational, empathetic, relatable" },
  { value: "mentor", label: "Mentor", desc: "Wise, thoughtful, long-term perspective" },
  { value: "therapist", label: "Therapist", desc: "Explores feelings, validates emotions" },
  { value: "drill_sergeant", label: "Drill Sergeant", desc: "Direct, intense, no excuses" },
] as const;

const LENGTH_OPTIONS = [
  { value: "brief", label: "Brief", desc: "2–3 sentences max" },
  { value: "medium", label: "Medium", desc: "1–2 paragraphs" },
  { value: "detailed", label: "Detailed", desc: "Full analysis with examples" },
] as const;

const TONE_OPTIONS = [
  { value: "formal", label: "Formal", desc: "Professional, structured" },
  { value: "casual", label: "Casual", desc: "Conversational, relaxed" },
  { value: "motivational", label: "Motivational", desc: "Energetic, hype-driven" },
  { value: "analytical", label: "Analytical", desc: "Data-driven, objective" },
] as const;

function OptionPill<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; desc: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`text-left p-3 rounded-lg border text-sm transition-all ${
            value === opt.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/40 bg-background hover:border-primary/40"
          }`}
        >
          <p className="font-medium">{opt.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}

export function OracleSetup({ onComplete }: { onComplete: (config: OracleConfig) => void }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SetupData>({
    oracleName: "",
    personalityText: "",
    personalityMode: "both",
    strictness: "balanced",
    style: "coach",
    lengthPref: "medium",
    languageTone: "casual",
    comfortMode: true,
  });

  const set = <K extends keyof SetupData>(key: K, val: SetupData[K]) =>
    setData((d) => ({ ...d, [key]: val }));

  const canProceed = () => {
    if (step === 2) return data.oracleName.trim().length > 0;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const config = await saveOracleConfig({
        oracle_name: data.oracleName.trim() || "Oracle",
        personality_text: data.personalityMode !== "sliders" ? data.personalityText.trim() || undefined : undefined,
        strictness: data.strictness,
        style: data.style,
        length_pref: data.lengthPref,
        language_tone: data.languageTone,
        comfort_mode_enabled: data.comfortMode,
      });
      toast.success(`${config.oracle_name} is ready!`);
      onComplete(config);
    } catch {
      toast.error("Failed to save Oracle config.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i + 1 <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Meet Your Oracle</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your Oracle is a personal AI coach. It reads your data — habits, health,
              journal, everything — and gives you honest, personalized feedback.
              It learns your communication style and adjusts to you.
            </p>
            <p className="text-sm text-muted-foreground">
              Let&apos;s set it up in a few quick steps.
            </p>
          </div>
        )}

        {/* Step 2: Name */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Name Your Oracle</h2>
              <p className="text-sm text-muted-foreground">
                Your Oracle will use this name when it speaks to you.
              </p>
            </div>
            <Input
              placeholder="e.g. Sage, Apollo, Mentor, Coach..."
              value={data.oracleName}
              onChange={(e) => set("oracleName", e.target.value)}
              className="text-lg"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              You can change this anytime in Oracle Settings.
            </p>
          </div>
        )}

        {/* Step 3: Personality */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">Personality</h2>
              <p className="text-sm text-muted-foreground">
                How should {data.oracleName || "your Oracle"} talk to you?
              </p>
            </div>

            {/* Mode selector */}
            <div className="flex gap-2">
              {(["text", "sliders", "both"] as PersonalityMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("personalityMode", m)}
                  className={`flex-1 py-1.5 text-xs rounded border transition-all ${
                    data.personalityMode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border"
                  }`}
                >
                  {m === "text" ? "Custom text" : m === "sliders" ? "Parameters" : "Both"}
                </button>
              ))}
            </div>

            {/* Custom text */}
            {(data.personalityMode === "text" || data.personalityMode === "both") && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Describe the personality</label>
                <Textarea
                  rows={3}
                  placeholder="e.g. 'Be like a strict older brother who calls me out but isn't mean' or 'Supportive but honest — no sugar-coating'"
                  value={data.personalityText}
                  onChange={(e) => set("personalityText", e.target.value)}
                />
              </div>
            )}

            {/* Parameter sliders */}
            {(data.personalityMode === "sliders" || data.personalityMode === "both") && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Strictness</p>
                  <div className="flex gap-2">
                    {(["gentle", "balanced", "brutal"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("strictness", s)}
                        className={`flex-1 py-1.5 text-xs rounded border capitalize transition-all ${
                          data.strictness === s
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/40 text-muted-foreground hover:border-border"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Style</p>
                  <OptionPill options={STYLE_OPTIONS} value={data.style} onChange={(v) => set("style", v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Response Length</p>
                    <OptionPill options={LENGTH_OPTIONS} value={data.lengthPref} onChange={(v) => set("lengthPref", v)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Language Tone</p>
                    <OptionPill options={TONE_OPTIONS} value={data.languageTone} onChange={(v) => set("languageTone", v)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Comfort Mode */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">Comfort Mode</h2>
              <p className="text-sm text-muted-foreground">
                On rough days, toggle Comfort Mode to get support instead of criticism.
                {data.oracleName || "Your Oracle"} will be gentler and focus on listening.
              </p>
            </div>
            <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              data.comfortMode ? "border-primary bg-primary/5" : "border-border/40"
            }`} onClick={() => set("comfortMode", !data.comfortMode)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Comfort Mode</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {data.comfortMode ? "Enabled — Oracle will be supportive and gentle" : "Disabled — Oracle will be direct and challenging"}
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-all flex items-center ${
                  data.comfortMode ? "bg-primary justify-end" : "bg-muted justify-start"
                } px-1`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/20">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  You can toggle Comfort Mode anytime during a chat session. It doesn&apos;t affect saved reviews.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              {data.oracleName || "Your Oracle"} is ready
            </h2>
            <p className="text-muted-foreground">
              Start chatting anytime, or generate a Day Review to get personalized feedback
              based on today&apos;s data.
            </p>
            <div className="p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground text-left space-y-1">
              <p>Oracle name: <strong>{data.oracleName || "Oracle"}</strong></p>
              <p>Style: <strong>{data.style} · {data.strictness} · {data.lengthPref}</strong></p>
              <p>Comfort Mode: <strong>{data.comfortMode ? "On" : "Off"}</strong></p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < STEP_COUNT ? (
            <Button
              className="flex-1 flex items-center justify-center gap-1"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
            >
              {step === 1 ? "Let's go" : "Next"} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1" disabled={saving} onClick={handleFinish}>
              {saving ? "Setting up..." : `Meet ${data.oracleName || "Oracle"}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
