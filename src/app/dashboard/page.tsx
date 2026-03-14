"use client";

import { useMode } from "@/context/ModeContext";

export default function DashboardPage() {
  const { isDeepMode } = useMode();

  return (
    <div className="flex min-h-screen">
          <aside className={`w-64 flex-shrink-0 border-r bg-background/95 p-6 ${isDeepMode ? "border-red-500" : "border-border/40"}`}>
            {isDeepMode && <div className="mb-4 rounded-lg bg-red-500/10 p-2 text-center text-xs font-bold uppercase text-red-500">Deep Mode Active</div>}
            <h2 className="text-lg font-semibold tracking-tight">Navigation</h2>
            <div className="mt-4 space-y-2">
              <a href="#" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Dashboard</a>
              <a href="#" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Quests</a>
              <a href="#" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Journal</a>
              <a href="#" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Settings</a>
            </div>
          </aside>
          <main className="flex-1 p-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">LifeOS Control</p>
                <h1 className="text-3xl font-semibold">System Online</h1>
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/40 p-6">
              {isDeepMode ? (
                <p className="text-2xl font-medium">Deep Mode Initialized - Sensitive Data Visible</p>
              ) : (
                <p className="text-2xl font-medium">Privacy Filter Active</p>
              )}
            </div>
          </main>
        </div>
  );
}
