"use client";

import { useState, useCallback } from "react";
import { useMode } from "@/context/ModeContext";
import { Sidebar, type Tab } from "@/components/layout/Sidebar";
import { OnboardingTour } from "@/components/layout/OnboardingTour";
import { DashboardHub } from "@/components/dashboard/DashboardHub";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { JournalEditor } from "@/features/journal/JournalEditor";
import { OracleChat } from "@/features/ai/OracleChat";
import { IndulgenceShop } from "@/components/dashboard/IndulgenceShop";
import { HistoryCalendar } from "@/components/dashboard/HistoryCalendar";
import { ManageHabits } from "@/components/tasks/ManageHabits";
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
import { ArchivedItems } from "@/components/settings/ArchivedItems";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DashboardPage() {
  const { isDeepMode } = useMode();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [mounted, setMounted] = useState<Set<Tab>>(new Set(["dashboard"]));

  const switchTab = useCallback((tab: Tab) => {
    setMounted(prev => new Set([...prev, tab]));
    setActiveTab(tab);
    // Scroll to top on tab change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const show = (tab: Tab) => (activeTab === tab ? "" : "hidden");
  const has  = (tab: Tab) => mounted.has(tab);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <OnboardingTour />

      <Sidebar
        activeTab={activeTab}
        onTabChange={switchTab}
        isDeepMode={isDeepMode}
      />

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">

        {/* Dashboard */}
        <div className={show("dashboard")}>
          <DashboardHub onNav={(tab) => switchTab(tab as Tab)} />
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
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Daily Habits</p>
                  <h1 className="text-3xl font-semibold">Manage Habits</h1>
                </div>
                <ManageHabits />
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
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Planning & Tasks</p>
              <h1 className="text-3xl font-semibold">Planner</h1>
            </div>
            <div className="space-y-10">
              <PersonalPlanner />
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

        {/* History & Insights */}
        {has("history") && (
          <div className={show("history")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Activity Log & Analytics</p>
              <h1 className="text-3xl font-semibold">History & Insights</h1>
            </div>
            <HistoryCalendar />
          </div>
        )}

        {/* Profile (NEW) */}
        {has("profile") && (
          <div className={show("profile")}>
            <ProfilePage onNav={(tab) => switchTab(tab as Tab)} />
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

        {/* Oracle — Deep Mode only */}
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

        {/* About Me — Deep Mode only */}
        {has("about") && (
          <div className={show("about")}>
            <AboutMe />
          </div>
        )}

        {/* Settings */}
        {has("settings") && (
          <div className={show("settings")}>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Configuration</p>
              <h1 className="text-3xl font-semibold">Settings</h1>
            </div>
            <div className="space-y-4 max-w-2xl">
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

        {/* Archived Items */}
        {has("archived") && (
           <div className={show("archived")}>
               <div className="mb-6">
                   <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Archive</p>
                   <h1 className="text-3xl font-semibold">Archived Items</h1>
               </div>
               <ArchivedItems />
           </div>
        )}
      </main>
    </div>
  );
}
