"use client";

import { useState, useEffect } from "react";
import { useMode } from "@/context/ModeContext";
import { encryptData, decryptData } from "@/lib/utils/encryption";
import { XPDisplay } from "@/components/economy/XPDisplay";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { grantXPServerAction } from "@/app/actions";
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
import { AcademicTracker } from "@/components/planner/AcademicTracker";

export default function DashboardPage() {
  const { isDeepMode } = useMode();
  const [activeTab, setActiveTab] = useState("dashboard");

  const secretMessage = "This is a hidden engineering log.";
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");

  useEffect(() => {
    async function processMessages() {
      const encrypted = await encryptData(secretMessage);
      setEncryptedMessage(encrypted);
      if (isDeepMode) {
        const decrypted = await decryptData(encrypted);
        setDecryptedMessage(decrypted);
      }
    }
    processMessages();
  }, [isDeepMode]);

  return (
    <div className="flex min-h-screen">
      <OnboardingTour />
      <aside className={`w-64 flex-shrink-0 border-r bg-background/95 p-6 ${isDeepMode ? "border-red-500" : "border-border/40"}`}>
        <XPDisplay />
        {isDeepMode && <div className="mb-4 rounded-lg bg-red-500/10 p-2 text-center text-xs font-bold uppercase text-red-500">Deep Mode Active</div>}
        <h2 className="text-lg font-semibold tracking-tight">Navigation</h2>
        <div className="mt-4 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'dashboard' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Dashboard</button>
          <button onClick={() => setActiveTab("habits")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'habits' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Habit Grid</button>
          <button onClick={() => setActiveTab("planner")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'planner' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Planner</button>
          <button onClick={() => setActiveTab("academic")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'academic' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Academic</button>
          <button onClick={() => setActiveTab("history")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'history' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>History & Journal</button>
          <button onClick={() => setActiveTab("journal")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'journal' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Journal & Oracle</button>
          <button onClick={() => setActiveTab("settings")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'settings' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Settings</button>
        </div>
      </aside>
      <main className="flex-1 p-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">LifeOS Control</p>
            <h1 className="text-3xl font-semibold">System Online</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={async () => {
                await grantXPServerAction(50, "Quest Completed");
                window.dispatchEvent(new CustomEvent("xp_updated"));
                toast.success("System Gain: +50 XP - Quest Completed");
              }}
            >
              Log Quest (+50 XP)
            </Button>
            <form action="/auth/signout" method="post">
              <Button variant="outline">Sign out</Button>
            </form>
          </div>
        </div>
        
        {activeTab === "dashboard" && (
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
        )}

        {activeTab === "habits" && (
          <div>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Recurring Quests</p>
              <h1 className="text-3xl font-semibold">Habit Grid</h1>
            </div>
            <HabitGrid />
          </div>
        )}

        {activeTab === "planner" && (
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
          </div>
        )}

        {activeTab === "academic" && (
          <div>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Courses & Attendance</p>
              <h1 className="text-3xl font-semibold">Academic Tracker</h1>
            </div>
            <AcademicTracker />
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Activity Log</p>
              <h1 className="text-3xl font-semibold">History & Journal</h1>
            </div>
            <HistoryCalendar />
          </div>
        )}

        {activeTab === "journal" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <JournalEditor />
            <OracleChat />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/40 bg-muted/40 p-6">
              <h3 className="text-xl font-medium mb-4">Account Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">Manage your Deep Mode PIN and other preferences here.</p>
              
              <div className="max-w-sm mt-6 mb-6">
                <label className="text-sm font-medium mb-2 block">Change Deep Mode PIN</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    id="new-pin-input"
                    placeholder="Enter new PIN"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  }}>Save PIN</Button>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <Button variant="destructive" onClick={() => {
                  localStorage.removeItem("has_completed_onboarding");
                  window.location.reload();
                }}>Restart Onboarding Tour</Button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
