"use client";

import { useState, useEffect, useRef } from "react";
import { resetAccountAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ShieldAlert, Trash2, X } from "lucide-react";

const CONFIRM_PHRASE = "RESET MY ACCOUNT";
const COUNTDOWN_SECONDS = 4;

// ─── Confirmation Dialog ────────────────────────────────────────────────────────

function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [resetting, setResetting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(intervalRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleConfirm = async () => {
    setResetting(true);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-red-500/40 bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="font-semibold text-red-500">Final Warning</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are about to <strong className="text-foreground">permanently delete</strong> all your LifeOS data.
            This includes every habit, task, journal entry, health log, career log, academic record, XP history, and Oracle conversation.
          </p>

          <div className="rounded-lg bg-muted/50 border border-border/40 px-4 py-3 text-sm space-y-1">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Kept: your email, username, and password</p>
            <p className="text-red-500 font-medium">✗ Deleted: everything else — this cannot be undone</p>
          </div>

          <p className="text-xs text-muted-foreground">
            Your account will remain active. You will be signed out immediately after the reset.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={resetting}
          >
            <X className="h-4 w-4 mr-1.5" /> Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1 relative"
            disabled={seconds > 0 || resetting}
            onClick={handleConfirm}
          >
            {resetting ? (
              "Resetting…"
            ) : seconds > 0 ? (
              <>Wait {seconds}s</>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Everything
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Danger Zone ────────────────────────────────────────────────────────────────

export function DangerZone() {
  const [expanded, setExpanded]         = useState(false);
  const [inputValue, setInputValue]     = useState("");
  const [showDialog, setShowDialog]     = useState(false);
  const [resetError, setResetError]     = useState<string | null>(null);

  const isConfirmationValid = inputValue.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleResetConfirmed = async () => {
    setResetError(null);
    const result = await resetAccountAction();
    // If we reach here, the action returned an error object (redirect() never returns)
    if (result && "error" in result) {
      setResetError(result.error);
      setShowDialog(false);
      toast.error("Reset failed: " + result.error);
    }
  };

  return (
    <>
      {showDialog && (
        <ConfirmDialog
          onConfirm={handleResetConfirmed}
          onCancel={() => setShowDialog(false)}
        />
      )}

      <div className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden">
        {/* Collapsed header */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-red-500/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-500">Danger Zone</p>
              <p className="text-xs text-muted-foreground mt-0.5">Irreversible account actions</p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-red-500/70 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Expanded body */}
        {expanded && (
          <div className="border-t border-red-500/20 px-6 py-5 space-y-5">
            {/* What the reset does */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Reset All Data</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Permanently wipes all user-generated data while keeping your account active.
                You will be signed out immediately after.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-lg bg-background border border-border/40 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1.5">Kept</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>✓ Email address</li>
                    <li>✓ Username</li>
                    <li>✓ Password</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-background border border-border/40 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-red-500 mb-1.5">Deleted</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>✗ All XP &amp; levels</li>
                    <li>✗ Habits &amp; tasks</li>
                    <li>✗ Journal entries</li>
                    <li>✗ Health logs</li>
                    <li>✗ Career logs</li>
                    <li>✗ Academic data</li>
                    <li>✗ Oracle history</li>
                    <li>✗ Goals &amp; quests</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Confirmation input */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">
                Type{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-red-500">
                  {CONFIRM_PHRASE}
                </code>{" "}
                to unlock
              </label>
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                className={`font-mono text-sm transition-colors ${
                  inputValue.length > 0 && !isConfirmationValid
                    ? "border-red-500/50 focus-visible:ring-red-500/30"
                    : isConfirmationValid
                    ? "border-emerald-500/50 focus-visible:ring-emerald-500/30"
                    : ""
                }`}
                autoComplete="off"
                spellCheck={false}
              />
              {inputValue.length > 0 && !isConfirmationValid && (
                <p className="text-xs text-red-500">Phrase must match exactly (all caps).</p>
              )}
            </div>

            {resetError && (
              <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {resetError}
              </p>
            )}

            <Button
              variant="destructive"
              className="w-full"
              disabled={!isConfirmationValid}
              onClick={() => setShowDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset My Account
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
