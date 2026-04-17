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
      <aside className={`w-64 flex-shrink-0 border-r bg-background/95 p-6 ${isDeepMode ? "border-red-500" : "border-border/40"}`}>
        <XPDisplay />
        {isDeepMode && <div className="mb-4 rounded-lg bg-red-500/10 p-2 text-center text-xs font-bold uppercase text-red-500">Deep Mode Active</div>}
        <h2 className="text-lg font-semibold tracking-tight">Navigation</h2>
        <div className="mt-4 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'dashboard' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Dashboard</button>
          <button onClick={() => setActiveTab("journal")} className={`w-full text-left rounded-lg px-3 py-2 text-sm ${activeTab === 'journal' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>Journal & Oracle</button>
          <button className="w-full text-left rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">Settings</button>
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
          <div className="space-y-4">
            <div className="rounded-xl border border-border/40 bg-muted/40 p-6">
              <p className="text-lg font-medium">Encrypted Message Example:</p>
              <p className="text-sm text-muted-foreground break-all">{encryptedMessage}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/40 p-6">
              <p className="text-lg font-medium">Decrypted Message Example:</p>
              {isDeepMode ? (
                <p className="text-sm text-green-500">{decryptedMessage}</p>
              ) : (
                <p className="text-sm text-red-500">******** (Encrypted)</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "journal" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <JournalEditor />
            <OracleChat />
          </div>
        )}

      </main>
    </div>
  );
}
