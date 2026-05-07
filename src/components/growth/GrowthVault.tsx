"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GrowthOnboarding } from "@/components/growth/GrowthOnboarding";
import { QuestDeck } from "@/components/growth/QuestDeck";
import { getPreferences, savePreferences, type ContentSource } from "@/services/growth/preferencesService";
import { getGrowthRecommendations, type GrowthRecommendations } from "@/services/ai/growthRecommenderService";
import { saveAiSideQuests } from "@/services/growth/sideQuestsService";
import { toast } from "sonner";

type LoadState = "loading" | "onboarding" | "ready";

export function GrowthVault() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [categories, setCategories] = useState<string[]>([]);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [editingPrefs, setEditingPrefs] = useState(false);

  const [recs, setRecs] = useState<GrowthRecommendations | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (!prefs || !prefs.setupCompleted) {
        setLoadState("onboarding");
      } else {
        setCategories(prefs.categories);
        setSources(prefs.contentSources);
        setLoadState("ready");
      }
    });
  }, []);

  const handleOnboardingComplete = (cats: string[], srcs: ContentSource[]) => {
    setCategories(cats);
    setSources(srcs);
    setLoadState("ready");
    setEditingPrefs(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setRecs(null);
    const result = await getGrowthRecommendations(categories, sources);
    if (!result.success || !result.data) {
      setGenError(result.error ?? "Something went wrong. Try again.");
    } else {
      setRecs(result.data);
      // Persist AI-generated side quests to DB
      if (result.data.sideQuests.length > 0) {
        const saveResult = await saveAiSideQuests(result.data.sideQuests);
        if (!saveResult.error) {
          toast.success(`${result.data.sideQuests.length} quests added to your Quest Deck`);
        }
      }
    }
    setGenerating(false);
  };

  const handleResetSetup = async () => {
    await savePreferences([], [], false);
    setCategories([]);
    setSources([]);
    setRecs(null);
    setLoadState("onboarding");
  };

  if (loadState === "loading") {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading your vault…
      </div>
    );
  }

  return (
    <>
      {(loadState === "onboarding" || editingPrefs) && (
        <GrowthOnboarding
          onComplete={(cats, srcs) => handleOnboardingComplete(cats, srcs)}
        />
      )}

      <div className="space-y-10">
        {/* ── Preferences summary ── */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Your Interests</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                The AI uses these to personalise every recommendation.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditingPrefs(true)}>Edit</Button>
              <Button variant="outline" size="sm" onClick={handleResetSetup}>Reset</Button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.length > 0 ? categories.map((cat) => (
                <span key={cat} className="rounded-full border border-border/50 bg-background px-3 py-1 text-xs font-medium">{cat}</span>
              )) : <span className="text-xs text-muted-foreground">None selected.</span>}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Content Sources</p>
            {sources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {sources.map((s, i) => (
                  <span key={i} className="rounded-full border border-border/50 bg-background px-3 py-1 text-xs font-medium" title={s.url || undefined}>{s.label}</span>
                ))}
              </div>
            ) : <span className="text-xs text-muted-foreground">No sources added.</span>}
          </div>
        </div>

        {/* ── Quest Deck ── */}
        <div>
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Track Your Learning</p>
            <h2 className="text-xl font-semibold">Quest Deck</h2>
          </div>
          <QuestDeck />
        </div>

        {/* ── AI Recommendations ── */}
        <div>
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Powered by Gemini</p>
            <h2 className="text-xl font-semibold">Get Recommendations</h2>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={handleGenerate}
              disabled={generating || categories.length === 0}
              className="min-w-52"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating…
                </span>
              ) : "Generate Recommendations"}
            </Button>
            {recs && <span className="text-xs text-muted-foreground">Side quests were added to your Quest Deck.</span>}
          </div>

          {genError && <p className="text-sm text-destructive mb-4">{genError}</p>}

          {recs && (
            <div className="space-y-8">
              {recs.videos.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <span>▶</span> Watch
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recs.videos.map((v, i) => (
                      <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{v.channel}</p>
                        <p className="text-sm font-medium leading-snug">{v.topic}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{v.why}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {recs.reads.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <span>📖</span> Read
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recs.reads.map((r, i) => (
                      <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{r.source}</p>
                        <p className="text-sm font-medium leading-snug">{r.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{r.why}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {recs.sideQuests.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <span>⚡</span> Side Quests Generated
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">These have been saved to your Quest Deck above.</p>
                  <div className="space-y-2">
                    {recs.sideQuests.map((q, i) => (
                      <div key={i} className="rounded-xl border border-border/40 bg-card p-4 flex gap-4">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-sm font-semibold">{q.title}</p>
                            <span className="text-[10px] font-medium text-muted-foreground border border-border/50 rounded-full px-2 py-0.5">{q.estimatedTime}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{q.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {!recs && !generating && (
            <div className="rounded-xl border border-dashed border-border/40 p-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Generate recommendations to get video picks, reads, and side quests added directly to your Quest Deck.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
