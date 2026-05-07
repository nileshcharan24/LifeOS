"use client";

import { useState, useEffect, useCallback } from "react";
import { useMode } from "@/context/ModeContext";
import { encryptData, decryptData } from "@/lib/utils/encryption";
import { XPDisplay } from "@/components/economy/XPDisplay";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { JournalEditor } from "@/features/journal/JournalEditor";
import { OracleChat } from "@/features/ai/OracleChat";
import { OnboardingTour } from "@/components/layout/OnboardingTour";
import { QuestBoard } from "@/components/dashboard/QuestBoard";
import { IndulgenceShop } from "@/components/dashboard/IndulgenceShop";
import { DailyTasks } from "@/components/dashboard/DailyTasks";
import { HistoryCalendar } from "@/components/dashboard/HistoryCalendar";
import { HabitGrid } from "@/components/dashboard/HabitGrid";
import { PersonalPlanner } from "@/components/planner/PersonalPlanner";
import { TaskTable } from "@/components/planner/TaskTable";
import { AcademicTracker } from "@/components/academic/AcademicTracker";
import { DailyTracker } from "@/components/tasks/DailyTracker";
import { GoalsPanel } from "@/components/planner/GoalsPanel";
import { NegativeHabits } from "@/components/habits/NegativeHabits";
import { HealthTracker } from "@/components/health/HealthTracker";
import { XPConfigPanel } from "@/components/economy/XPConfigPanel";
import { WorkTracker } from "@/components/career/WorkTracker";
import { DangerZone } from "@/components/settings/DangerZone";
import { AboutMe } from "@/components/settings/AboutMe";
import { GrowthVault } from "@/components/growth/GrowthVault";
import { NotesPage } from "@/components/notes/NotesPage";

type Tab =
  | "dashboard" | "daily" | "habits" | "planner" | "academic"
  | "history" | "journal" | "oracle" | "health" | "career" | "settings" | "about" | "growth" | "notes";

// Helper: renders children once on first mount, keeps them alive with display:none
function TabPanel({ id, active }: { id: Tab; active: Tab; children?: React.ReactNode }) {
  return null; // replaced by LazyPanel below — keep for reference
}

export default function DashboardPage() {
  const { isDeepMode } = useMode();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Tracks which tabs have ever been visited. A tab is only mounted after its
  // first visit; after that it stays in the DOM hidden rather than unmounting.
  const [mounted, setMounted] = useState<Set<Tab>>(new Set(["dashboard"]));

  const switchTab = useCallback((tab: Tab) => {
    setMounted(prev => new Set([...prev, tab]));
    setActiveTab(tab);
  }, []);

  // Deep Mode system log (demo encryption showcase)
  const secretMessage = "This is a hidden engineering log.";
  const [decryptedMessage, setDecryptedMessage] = useState("");
  useEffect(() => {
    if (!isDeepMode) return;
    encryptData(secretMessage).then(enc => decryptData(enc)).then(setDecryptedMessage);
  }, [isDeepMode]);

  // Convenience: hide = mounted but not active
  const show = (tab: Tab) => (activeTab === tab ? "" : "hidden");
  const has  = (tab: Tab) => mounted.has(tab);

  const NAV: { id: Tab; label: string; deepOnly?: boolean }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "daily",     label: "Daily Tracker" },
    { id: "habits",    label: "Habit Grid" },
    { id: "planner",   label: "Planner" },
    { id: "academic",  label: "Academic" },
    { id: "history",   label: "History & Journal" },
    { id: "journal",   label: "Journal" },
    { id: "oracle",    label: "Oracle" },
    { id: "health",    label: "Health" },
    { id: "growth",    label: "Growth & Vault" },
    { id: "notes",     label: "Notes" },
    { id: "career",    label: "Career / Work" },
    { id: "settings",  label: "Settings" },
    { id: "about",     label: "About Me", deepOnly: true },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <OnboardingTour />

      {/* ── Sidebar ── */}
      <aside className={`w-56 lg:w-64 flex-shrink-0 border-r bg-background/95 p-4 lg:p-6 flex flex-col overflow-y-auto ${isDeepMode ? "border-red-500" : "border-border/40"}`}>
        <XPDisplay />
        {isDeepMode && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-2 text-center text-xs font-bold uppercase text-red-500">
            Deep Mode Active
          </div>
        )}
        <h2 className="text-lg font-semibold tracking-tight">Navigation</h2>
        <div className="mt-4 space-y-2">
          {NAV.filter(({ deepOnly }) => !deepOnly || isDeepMode).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm flex items-center justify-between ${
                activeTab === id ? "bg-muted/80 text-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <span>{label}</span>
              {id === "oracle" && (
                isDeepMode
                  ? <span className="text-[10px] text-red-500 font-bold">ACTIVE</span>
                  : <span className="text-[10px] text-muted-foreground">🔒</span>
              )}
              {id === "about" && (
                <span className="text-[10px] text-red-500 font-bold">DEEP</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-border/40">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full text-left rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 min-w-0">
        {/* Page header */}
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">LifeOS Control</p>
          <h1 className="text-3xl font-semibold">System Online</h1>
        </div>

        {/* ── Tab panels — lazy-mount, keep-alive ── */}

        {/* Dashboard */}
        <div className={show("dashboard")}>
          <div className="space-y-6">
            <QuestBoard />
            <DailyTasks />
            <IndulgenceShop />
            {isDeepMode && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 mt-8">
                <p className="text-lg font-medium text-red-500">Deep Mode Active: System Log</p>
                <p className="text-sm text-red-400 mt-2">{decryptedMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Tracker */}
        {has("daily") && (
          <div className={show("daily")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Habits · Tasks · Deadlines</p>
              <h1 className="text-3xl font-semibold">Daily Tracker</h1>
            </div>
            <DailyTracker />
          </div>
        )}

        {/* Habit Grid */}
        {has("habits") && (
          <div className={show("habits")}>
            <div className="space-y-10">
              <div>
                <div className="mb-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Recurring Quests</p>
                  <h1 className="text-3xl font-semibold">Habit Grid</h1>
                </div>
                <HabitGrid />
              </div>
              {isDeepMode ? (
                <div className="pt-2 border-t border-border/40">
                  <NegativeHabits />
                </div>
              ) : (
                <div className="pt-2 border-t border-border/40">
                  <div className="rounded-xl border border-border/40 bg-muted/30 p-6 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Negative Habits</p>
                    <p className="text-xs text-muted-foreground mt-1">🔒 Enable Deep Mode to access this section.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Planner */}
        {has("planner") && (
          <div className={show("planner")}>
            <div className="space-y-10">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Planning & Tasks</p>
                <h1 className="text-3xl font-semibold mb-6">Planner</h1>
                <PersonalPlanner />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">All Tasks — Sort by Urgency</h2>
                <TaskTable />
              </div>
              <div className="pt-2 border-t border-border/40">
                <GoalsPanel />
              </div>
            </div>
          </div>
        )}

        {/* Academic */}
        {has("academic") && (
          <div className={show("academic")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Courses & Attendance</p>
              <h1 className="text-3xl font-semibold">Academic Tracker</h1>
            </div>
            <AcademicTracker />
          </div>
        )}

        {/* History */}
        {has("history") && (
          <div className={show("history")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Activity Log</p>
              <h1 className="text-3xl font-semibold">History & Journal</h1>
            </div>
            <HistoryCalendar />
          </div>
        )}

        {/* Journal */}
        {has("journal") && (
          <div className={show("journal")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Reflection & Mood</p>
              <h1 className="text-3xl font-semibold">Journal</h1>
            </div>
            <JournalEditor />
          </div>
        )}

        {/* Oracle */}
        {has("oracle") && (
          <div className={show("oracle")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">AI Life Coach</p>
              <h1 className="text-3xl font-semibold">Oracle</h1>
            </div>
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden h-[720px]">
              <OracleChat />
            </div>
          </div>
        )}

        {/* Health */}
        {has("health") && (
          <div className={show("health")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Exercise · Food · Sleep</p>
              <h1 className="text-3xl font-semibold">Health Tracker</h1>
            </div>
            <HealthTracker />
          </div>
        )}

        {/* Notes */}
        {has("notes") && (
          <div className={show("notes")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Ideas · Checklists · Thoughts</p>
              <h1 className="text-3xl font-semibold">Notes</h1>
            </div>
            <NotesPage />
          </div>
        )}

        {/* Growth & Vault */}
        {has("growth") && (
          <div className={show("growth")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">AI-Powered Learning</p>
              <h1 className="text-3xl font-semibold">Growth & Vault</h1>
            </div>
            <GrowthVault />
          </div>
        )}

        {/* Career */}
        {has("career") && (
          <div className={show("career")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Roles · Clock-In · Work Log</p>
              <h1 className="text-3xl font-semibold">Career / Work</h1>
            </div>
            <WorkTracker />
          </div>
        )}

        {/* About Me — Deep Mode only */}
        {has("about") && (
          <div className={show("about")}>
            <AboutMe />
          </div>
        )}

        {/* Settings */}
        {has("settings") && (
          <div className={show("settings")}>
            <div className="space-y-4">
              <XPConfigPanel />
              <div className="rounded-xl border border-border/40 bg-muted/40 p-6">
                <h3 className="text-xl font-medium mb-4">Account Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your Deep Mode PIN and other preferences here.
                </p>
                <div className="max-w-sm mt-6 mb-6">
                  <label className="text-sm font-medium mb-2 block">Change Deep Mode PIN</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      id="new-pin-input"
                      placeholder="Enter new PIN"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <Button onClick={() => {
                      const input = document.getElementById("new-pin-input") as HTMLInputElement;
                      if (input && input.value.length >= 4) {
                        localStorage.setItem("deep_mode_pin", input.value);
                        toast.success("Deep Mode PIN successfully updated!");
                        input.value = "";
                      } else {
                        toast.error("PIN must be at least 4 characters.");
                      }
                    }}>
                      Save PIN
                    </Button>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/40">
                  <Button variant="destructive" onClick={() => {
                    localStorage.removeItem("has_completed_onboarding");
                    window.location.reload();
                  }}>
                    Restart Onboarding Tour
                  </Button>
                </div>
              </div>
              <DangerZone />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
