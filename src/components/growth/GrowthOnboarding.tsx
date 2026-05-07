"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { savePreferences, type ContentSource } from "@/services/growth/preferencesService";

const PRESET_CATEGORIES = [
  "Tech & Programming",
  "Machine Learning & AI",
  "Cybersecurity",
  "Data Structures & Algorithms",
  "Finance & Investing",
  "Business & Startups",
  "Design & UX",
  "Science & Math",
  "Geopolitics & News",
  "Health & Fitness",
  "Philosophy & Psychology",
  "History & Culture",
  "Productivity",
  "Infotainment",
  "Gaming & Esports",
  "Sports",
];

type Props = {
  onComplete: (categories: string[], sources: ContentSource[]) => void;
};

export function GrowthOnboarding({ onComplete }: Props) {
  const [screen, setScreen] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState("");
  const [sources, setSources] = useState<ContentSource[]>([{ label: "", url: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Screen 1 helpers ──────────────────────────────────────────────────────

  const toggleCategory = (cat: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setSelected((prev) => new Set([...prev, trimmed]));
    setCustomInput("");
  };

  // ── Screen 2 helpers ──────────────────────────────────────────────────────

  const updateSource = (index: number, field: keyof ContentSource, value: string) => {
    setSources((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addSource = () => setSources((prev) => [...prev, { label: "", url: "" }]);

  const removeSource = (index: number) => {
    setSources((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Finish ────────────────────────────────────────────────────────────────

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    const cats = Array.from(selected);
    const validSources = sources.filter((s) => s.label.trim());
    const result = await savePreferences(cats, validSources, true);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    onComplete(cats, validSources);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-2xl border border-border/60 bg-background shadow-2xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Growth & Vault Setup — Step {screen} of 2
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-muted mt-2">
            <div
              className="h-1 rounded-full bg-foreground transition-all duration-300"
              style={{ width: screen === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>

        {/* ── Screen 1: Categories ── */}
        {screen === 1 && (
          <div className="px-8 pb-8">
            <h2 className="text-2xl font-semibold mt-4">What topics excite you?</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Pick the categories you want to learn and stay updated on. You can add custom ones too.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition-all ${
                    selected.has(cat)
                      ? "border-foreground bg-foreground text-background font-medium"
                      : "border-border/50 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Custom category input */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="Add a custom topic…"
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button variant="outline" onClick={addCustom} disabled={!customInput.trim()}>
                + Add
              </Button>
            </div>

            {/* Selected chips */}
            {selected.size > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {Array.from(selected).map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-full border border-foreground/30 bg-foreground/5 px-3 py-1 text-xs font-medium"
                  >
                    {cat}
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="ml-1 text-muted-foreground hover:text-foreground leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setScreen(2)}
                disabled={selected.size === 0}
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* ── Screen 2: Content Sources ── */}
        {screen === 2 && (
          <div className="px-8 pb-8">
            <h2 className="text-2xl font-semibold mt-4">Who do you like to watch or read?</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Add your favourite YouTube channels, newsletters, or blogs. The AI uses these to recommend content you'll actually want.
            </p>

            <div className="space-y-3 mb-4">
              {sources.map((source, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={source.label}
                    onChange={(e) => updateSource(index, "label", e.target.value)}
                    placeholder="Name (e.g. Think School)"
                    className="w-40 h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={source.url}
                    onChange={(e) => updateSource(index, "url", e.target.value)}
                    placeholder="Link or handle (optional)"
                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {sources.length > 1 && (
                    <button
                      onClick={() => removeSource(index)}
                      className="text-muted-foreground hover:text-foreground text-lg leading-none px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addSource} className="mb-6">
              + Add another source
            </Button>

            {error && (
              <p className="text-sm text-destructive mb-4">{error}</p>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setScreen(1)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
              <Button onClick={handleFinish} disabled={saving}>
                {saving ? "Saving…" : "Finish Setup"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
