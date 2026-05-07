"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMode } from "@/context/ModeContext";
import { OracleSetup } from "./OracleSetup";
import {
  getOracleConfig,
  saveOracleConfig,
  updateComfortMode,
  getOrCreateTodaySession,
  getSessionMessages,
  getPastSessions,
  getSessionMessagesById,
  sendOracleMessage,
  generateDayDiagnosis,
  getTodayDiagnosis,
  generateWeeklyReview,
  getLatestWeeklyReview,
  getPastDiagnoses,
  getPastWeeklyReviews,
  type OracleConfig,
  type ChatMessage,
  type OracleSession,
} from "@/services/ai/oracleService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Lock,
  Brain,
  Send,
  Shield,
  ShieldOff,
  CalendarDays,
  BarChart3,
  Archive,
  Settings2,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Loader2,
  MessageSquare,
} from "lucide-react";

type Tab = "chat" | "dayreview" | "weeklyreview" | "archive";

// ─── Lock Screen ─────────────────────────────────────────────────────────────

function OracleLockScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] space-y-4 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold">Oracle is in Deep Mode</h2>
      <p className="text-muted-foreground max-w-sm">
        The Oracle has access to all your private data — habits, health, journal, mood.
        Enter Deep Mode to unlock it.
      </p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border/40 rounded-lg px-4 py-2">
        <Shield className="h-4 w-4" />
        Use the shield icon in the sidebar to enter Deep Mode
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function OracleSettings({
  config,
  onSave,
  onClose,
}: {
  config: OracleConfig;
  onSave: (c: OracleConfig) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(config.oracle_name);
  const [personalityText, setPersonalityText] = useState(config.personality_text ?? "");
  const [strictness, setStrictness] = useState(config.strictness);
  const [style, setStyle] = useState(config.style);
  const [lengthPref, setLengthPref] = useState(config.length_pref);
  const [languageTone, setLanguageTone] = useState(config.language_tone);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveOracleConfig({
        oracle_name: name.trim() || "Oracle",
        personality_text: personalityText.trim() || undefined,
        strictness,
        style,
        length_pref: lengthPref,
        language_tone: languageTone,
        comfort_mode_enabled: config.comfort_mode_enabled,
      });
      toast.success("Oracle settings saved.");
      onSave(updated);
      onClose();
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-border/40 rounded-xl bg-muted/20">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Oracle Settings</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Oracle Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Personality (custom text)</label>
          <Textarea rows={2} value={personalityText} onChange={(e) => setPersonalityText(e.target.value)} className="mt-1 text-sm" placeholder="e.g. Be like a strict older brother..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Strictness</label>
            <div className="flex gap-1 mt-1">
              {(["gentle", "balanced", "brutal"] as const).map((s) => (
                <button key={s} onClick={() => setStrictness(s)} className={`flex-1 text-xs py-1 rounded border capitalize ${strictness === s ? "border-primary bg-primary/10 text-primary" : "border-border/40"}`}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Length</label>
            <div className="flex gap-1 mt-1">
              {(["brief", "medium", "detailed"] as const).map((l) => (
                <button key={l} onClick={() => setLengthPref(l)} className={`flex-1 text-xs py-1 rounded border capitalize ${lengthPref === l ? "border-primary bg-primary/10 text-primary" : "border-border/40"}`}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Style</label>
            <select value={style} onChange={(e) => setStyle(e.target.value as typeof style)} className="w-full mt-1 text-sm rounded border border-input bg-background px-2 py-1.5">
              <option value="coach">Coach</option>
              <option value="friend">Friend</option>
              <option value="mentor">Mentor</option>
              <option value="therapist">Therapist</option>
              <option value="drill_sergeant">Drill Sergeant</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tone</label>
            <select value={languageTone} onChange={(e) => setLanguageTone(e.target.value as typeof languageTone)} className="w-full mt-1 text-sm rounded border border-input bg-background px-2 py-1.5">
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="motivational">Motivational</option>
              <option value="analytical">Analytical</option>
            </select>
          </div>
        </div>
      </div>
      <Button size="sm" className="w-full" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, oracleName }: { msg: ChatMessage; oracleName: string }) {
  const isOracle = msg.role === "oracle";
  const copy = () => { navigator.clipboard.writeText(msg.content); toast.success("Copied!"); };

  return (
    <div className={`flex ${isOracle ? "justify-start" : "justify-end"} group`}>
      <div className={`max-w-[85%] space-y-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isOracle
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        }`}>
          {msg.content}
        </div>
        <div className={`flex items-center gap-2 px-1 ${isOracle ? "justify-start" : "justify-end"}`}>
          <span className="text-[10px] text-muted-foreground">
            {isOracle ? oracleName : "You"} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Display ───────────────────────────────────────────────────────────

function ReviewDisplay({
  text,
  title,
  onAskFollowup,
}: {
  text: string;
  title: string;
  onAskFollowup: (q: string) => void;
}) {
  const copy = () => { navigator.clipboard.writeText(text); toast.success("Copied!"); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">{title}</h3>
        <button onClick={copy} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <div className="p-4 rounded-xl border border-border/40 bg-muted/20 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
        {text}
      </div>
      <div className="flex gap-2 flex-wrap">
        {["What should I prioritize tomorrow?", "What pattern do you see?", "How does this compare to last week?"].map((q) => (
          <button
            key={q}
            onClick={() => onAskFollowup(q)}
            className="text-xs px-2 py-1 rounded border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Past Sessions ─────────────────────────────────────────────────────────

function PastSessionsPanel({
  sessions,
  onLoadMessages,
}: {
  sessions: OracleSession[];
  onLoadMessages: (id: string, date: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const toggle = async (session: OracleSession) => {
    if (expanded === session.id) { setExpanded(null); return; }
    setExpanded(session.id);
    if (!messages[session.id]) {
      setLoading(session.id);
      const msgs = await getSessionMessagesById(session.id);
      setMessages((m) => ({ ...m, [session.id]: msgs }));
      setLoading(null);
    }
  };

  if (sessions.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-4">No past conversations this week.</p>
  );

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div key={session.id} className="border border-border/40 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(session)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">{new Date(session.session_date + "T12:00:00").toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</p>
              {session.summary && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{session.summary}</p>}
              {session.topics && session.topics.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {session.topics.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {session.primary_mood && (
                <span className="text-xs text-muted-foreground">mood {session.primary_mood}/10</span>
              )}
              {expanded === session.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>
          {expanded === session.id && (
            <div className="border-t border-border/40 p-3 bg-muted/10 space-y-2 max-h-60 overflow-y-auto">
              {loading === session.id ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : (messages[session.id] ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No messages in this session.</p>
              ) : (
                (messages[session.id] ?? []).map((m) => (
                  <div key={m.id} className={`text-xs ${m.role === "user" ? "text-right text-muted-foreground" : "text-left"}`}>
                    <span className={`inline-block px-2 py-1 rounded ${m.role === "oracle" ? "bg-muted" : "bg-primary/10 text-primary"}`}>
                      {m.content.slice(0, 200)}{m.content.length > 200 ? "..." : ""}
                    </span>
                  </div>
                ))
              )}
              <button
                onClick={() => onLoadMessages(session.id, session.session_date)}
                className="w-full text-xs text-primary hover:underline pt-1"
              >
                Load in chat →
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Oracle ──────────────────────────────────────────────────────────────

export function OracleChat() {
  const { isDeepMode } = useMode();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [oracleConfig, setOracleConfig] = useState<OracleConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [comfortMode, setComfortMode] = useState(false);
  const [pastSessions, setPastSessions] = useState<OracleSession[]>([]);
  const [showPastSessions, setShowPastSessions] = useState(false);
  // Day review
  const [dayReview, setDayReview] = useState<string | null>(null);
  const [generatingDay, setGeneratingDay] = useState(false);
  // Weekly review
  const [weeklyReview, setWeeklyReview] = useState<string | null>(null);
  const [weeklyNextAvailable, setWeeklyNextAvailable] = useState<string | null>(null);
  const [generatingWeekly, setGeneratingWeekly] = useState(false);
  // Archive
  const [pastDiagnoses, setPastDiagnoses] = useState<{ id: string; diagnosis_date: string; full_text: string }[]>([]);
  const [pastWeeklyReviews, setPastWeeklyReviews] = useState<{ id: string; week_start_date: string; week_end_date: string; full_text: string }[]>([]);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages]);

  const init = useCallback(async () => {
    if (!isDeepMode) { setLoadingConfig(false); return; }
    setLoadingConfig(true);
    try {
      const config = await getOracleConfig();
      if (!config || !config.setup_completed) {
        setShowSetup(true);
        setLoadingConfig(false);
        return;
      }
      setOracleConfig(config);
      setComfortMode(config.comfort_mode_enabled);

      const [sessionRes, pastSessionsRes] = await Promise.all([
        getOrCreateTodaySession(),
        getPastSessions(),
      ]);
      setSessionId(sessionRes.sessionId);
      setPastSessions(pastSessionsRes);

      if (!sessionRes.isNew) {
        const msgs = await getSessionMessages(sessionRes.sessionId);
        setMessages(msgs);
      }

      // Load today's existing review if any
      const existing = await getTodayDiagnosis();
      if (existing) setDayReview(existing.fullText);

      // Check weekly review status
      const { review, nextAvailable } = await getLatestWeeklyReview();
      if (review) setWeeklyReview(review.full_text);
      setWeeklyNextAvailable(nextAvailable);
    } catch (err) {
      console.error("Oracle init error:", err);
    } finally {
      setLoadingConfig(false);
    }
  }, [isDeepMode]);

  useEffect(() => { init(); }, [init]);

  const loadArchive = useCallback(async () => {
    const [diags, reviews] = await Promise.all([getPastDiagnoses(), getPastWeeklyReviews()]);
    setPastDiagnoses(diags);
    setPastWeeklyReviews(reviews);
  }, []);

  useEffect(() => {
    if (activeTab === "archive" && isDeepMode) loadArchive();
  }, [activeTab, isDeepMode, loadArchive]);

  const handleSetupComplete = (config: OracleConfig) => {
    setOracleConfig(config);
    setComfortMode(config.comfort_mode_enabled);
    setShowSetup(false);
    init();
  };

  const handleSend = async (e?: React.FormEvent, overrideMessage?: string) => {
    e?.preventDefault();
    const msg = (overrideMessage ?? input).trim();
    if (!msg || !sessionId || !oracleConfig || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const result = await sendOracleMessage(sessionId, msg, messages, comfortMode);
      if (result.success && result.text) {
        const oracleMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "oracle",
          content: result.text,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, oracleMsg]);
      } else {
        toast.error(result.error ?? "Oracle failed to respond.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      }
    } catch {
      toast.error("Oracle connection interrupted.");
    } finally {
      setSending(false);
    }
  };

  const handleToggleComfortMode = async () => {
    const next = !comfortMode;
    setComfortMode(next);
    try {
      await updateComfortMode(next);
      toast.success(next ? "Comfort Mode on — Oracle will be gentler" : "Comfort Mode off");
    } catch {
      setComfortMode(!next);
    }
  };

  const handleGenerateDayReview = async () => {
    setGeneratingDay(true);
    try {
      const result = await generateDayDiagnosis(comfortMode);
      if (result.success && result.text) {
        setDayReview(result.text);
        setActiveTab("dayreview");
      } else {
        toast.error(result.error ?? "Failed to generate review.");
      }
    } finally {
      setGeneratingDay(false);
    }
  };

  const handleGenerateWeeklyReview = async () => {
    setGeneratingWeekly(true);
    try {
      const result = await generateWeeklyReview(comfortMode);
      if (result.success && result.text) {
        setWeeklyReview(result.text);
        setWeeklyNextAvailable(null);
        // Reload cooldown
        const { nextAvailable } = await getLatestWeeklyReview();
        setWeeklyNextAvailable(nextAvailable);
      } else {
        toast.error(result.error ?? "Failed to generate weekly review.");
      }
    } finally {
      setGeneratingWeekly(false);
    }
  };

  const handleFollowup = (question: string) => {
    setActiveTab("chat");
    setInput(question);
  };

  // ─ Render: not deep mode
  if (!isDeepMode) return <OracleLockScreen />;

  // ─ Render: loading
  if (loadingConfig) return (
    <div className="flex items-center justify-center h-full min-h-[500px]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Waking the Oracle...</span>
      </div>
    </div>
  );

  // ─ Render: setup
  if (showSetup) return <OracleSetup onComplete={handleSetupComplete} />;

  const oracleName = oracleConfig?.oracle_name ?? "Oracle";

  const TABS = [
    { id: "chat" as Tab, label: "Chat", icon: MessageSquare },
    { id: "dayreview" as Tab, label: "Day Review", icon: CalendarDays },
    { id: "weeklyreview" as Tab, label: "Week Review", icon: BarChart3 },
    { id: "archive" as Tab, label: "Archive", icon: Archive },
  ];

  return (
    <div className="flex flex-col h-full min-h-[600px] space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-bold leading-tight">{oracleName}</h2>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/40 text-red-500">Deep Mode</Badge>
              {comfortMode && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400/40 text-blue-400">Comfort</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleComfortMode}
            title={comfortMode ? "Comfort Mode ON — click to disable" : "Comfort Mode OFF — click to enable"}
            className={`p-1.5 rounded-lg border transition-all ${comfortMode ? "border-blue-400/40 bg-blue-400/10 text-blue-400" : "border-border/40 text-muted-foreground hover:text-foreground"}`}
          >
            {comfortMode ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="p-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && oracleConfig && (
        <div className="p-4 border-b border-border/40">
          <OracleSettings
            config={oracleConfig}
            onSave={(c) => setOracleConfig(c)}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/40">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ─── Chat Tab ─── */}
        {activeTab === "chat" && (
          <>
            {/* Past sessions */}
            <div className="border-b border-border/20">
              <button
                onClick={() => setShowPastSessions((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>📚 Past conversations ({pastSessions.length})</span>
                {showPastSessions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showPastSessions && (
                <div className="px-4 pb-3 max-h-[280px] overflow-y-auto">
                  <PastSessionsPanel
                    sessions={pastSessions}
                    onLoadMessages={(id, date) => {
                      toast.info(`Session from ${date} — ask the Oracle about it`);
                      setShowPastSessions(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <p className="text-muted-foreground text-sm">
                    {oracleName} is ready. Ask anything — or generate a Day Review to start.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "How am I doing this week?",
                      "What habit should I focus on?",
                      "What patterns do you see?",
                      "Rate my discipline honestly.",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(undefined, q)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} oracleName={oracleName} />
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {oracleName} is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick action buttons */}
            <div className="px-4 py-2 flex gap-2 border-t border-border/20">
              <button
                onClick={handleGenerateDayReview}
                disabled={generatingDay}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
              >
                {generatingDay ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarDays className="h-3 w-3" />}
                Day Review
              </button>
              <button
                onClick={() => setActiveTab("weeklyreview")}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
              >
                <BarChart3 className="h-3 w-3" /> Week Review
              </button>
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-border/40 flex gap-2">
              <Input
                placeholder={`Ask ${oracleName}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}

        {/* ─── Day Review Tab ─── */}
        {activeTab === "dayreview" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">Day Review</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {oracleName}&apos;s analysis of today — {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={generatingDay}
                onClick={handleGenerateDayReview}
                className="flex items-center gap-1"
              >
                {generatingDay ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {dayReview ? "Regenerate" : "Generate"}
              </Button>
            </div>

            {generatingDay && !dayReview && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{oracleName} is reviewing your day...</span>
              </div>
            )}

            {dayReview ? (
              <ReviewDisplay
                text={dayReview}
                title={`${oracleName}'s take on today`}
                onAskFollowup={handleFollowup}
              />
            ) : !generatingDay && (
              <div className="text-center py-12 space-y-3">
                <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">No review yet for today.</p>
                <p className="text-xs text-muted-foreground">Generate a Day Review to get {oracleName}&apos;s analysis of your habits, health, mood, and progress.</p>
                <Button onClick={handleGenerateDayReview} disabled={generatingDay} size="sm">
                  Generate Day Review
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Weekly Review Tab ─── */}
        {activeTab === "weeklyreview" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">Weekly Review</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {oracleName}&apos;s full 7-day analysis
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={generatingWeekly || !!weeklyNextAvailable}
                onClick={handleGenerateWeeklyReview}
                className="flex items-center gap-1"
              >
                {generatingWeekly ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
                {weeklyReview ? "Regenerate" : "Generate"}
              </Button>
            </div>

            {weeklyNextAvailable && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600">
                Weekly review already generated. Next available: {weeklyNextAvailable}
              </div>
            )}

            {generatingWeekly && !weeklyReview && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{oracleName} is reviewing your week...</span>
              </div>
            )}

            {weeklyReview ? (
              <ReviewDisplay
                text={weeklyReview}
                title={`${oracleName}'s Weekly Review`}
                onAskFollowup={handleFollowup}
              />
            ) : !generatingWeekly && (
              <div className="text-center py-12 space-y-3">
                <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">No weekly review yet.</p>
                <p className="text-xs text-muted-foreground">
                  Generate a review to get a full 7-day breakdown of your habits, health, mood, and progress.
                </p>
                <Button onClick={handleGenerateWeeklyReview} disabled={generatingWeekly} size="sm">
                  Generate Weekly Review
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Archive Tab ─── */}
        {activeTab === "archive" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Day diagnoses */}
            <div>
              <h3 className="font-bold text-sm mb-3">Day Reviews</h3>
              {pastDiagnoses.length === 0 ? (
                <p className="text-xs text-muted-foreground">No saved day reviews yet.</p>
              ) : (
                <div className="space-y-2">
                  {pastDiagnoses.map((d) => (
                    <div key={d.id} className="border border-border/40 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedArchive(expandedArchive === d.id ? null : d.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30"
                      >
                        <p className="text-sm font-medium">
                          {new Date(d.diagnosis_date + "T12:00:00").toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                        </p>
                        {expandedArchive === d.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {expandedArchive === d.id && (
                        <div className="border-t border-border/20 px-3 py-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/10 max-h-60 overflow-y-auto">
                          {d.full_text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly reviews */}
            <div>
              <h3 className="font-bold text-sm mb-3">Weekly Reviews</h3>
              {pastWeeklyReviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">No saved weekly reviews yet.</p>
              ) : (
                <div className="space-y-2">
                  {pastWeeklyReviews.map((r) => (
                    <div key={r.id} className="border border-border/40 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedArchive(expandedArchive === r.id ? null : r.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30"
                      >
                        <p className="text-sm font-medium">
                          Week of {new Date(r.week_start_date + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })} – {new Date(r.week_end_date + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}
                        </p>
                        {expandedArchive === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {expandedArchive === r.id && (
                        <div className="border-t border-border/20 px-3 py-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/10 max-h-60 overflow-y-auto">
                          {r.full_text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
