"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useMode } from "@/context/ModeContext";
import {
  getRoles, createRole, updateRole, deleteRole,
  getSessionsForDate, clockIn, clockOut,
  getLogsForDate, getLogsForRange, upsertWorkLog, deleteWorkLog,
  type WorkRole, type WorkSession, type WorkLog, type RoleType,
} from "@/services/career/careerService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Briefcase, Plus, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Lock, Pencil, Trash2, X, Check, EyeOff, Tag, Zap, Archive,
  Building2, CalendarDays, Timer,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ─── Constants ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

const ROLE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

const TYPE_LABELS: Record<RoleType, string> = {
  "internship": "Internship",
  "full-time": "Full-time",
  "freelance": "Freelance",
  "side-project": "Side Project",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function roleBadge(type: RoleType) {
  const map: Record<RoleType, string> = {
    "full-time":    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    "internship":   "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    "freelance":    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    "side-project": "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  };
  return map[type] ?? "bg-muted text-muted-foreground";
}

function parseTags(raw: string): string[] {
  return raw.split(",").map(t => t.trim()).filter(Boolean);
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function RoleColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

// ─── Add / Edit Role Form ───────────────────────────────────────────────────────

function RoleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<WorkRole>;
  onSave: (data: { title: string; company: string; type: RoleType; color: string; start_date: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle]         = useState(initial?.title ?? "");
  const [company, setCompany]     = useState(initial?.company ?? "");
  const [type, setType]           = useState<RoleType>(initial?.type ?? "full-time");
  const [color, setColor]         = useState(initial?.color ?? ROLE_COLORS[0]);
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Role title is required."); return; }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), company: company.trim(), type, color, start_date: startDate });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-muted/30 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Role Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. ML Intern, Freelance Dev…" autoFocus />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Company / Project</label>
          <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Type</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as RoleType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                type === t ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/40"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Color</label>
        <div className="flex gap-2">
          {ROLE_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Check className="h-3.5 w-3.5 mr-1" />
          {saving ? "Saving…" : "Save Role"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Roles Tab ──────────────────────────────────────────────────────────────────

function RolesTab({ roles, onRefresh }: { roles: WorkRole[]; onRefresh: () => void }) {
  const [adding, setAdding]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreate = async (data: Parameters<typeof createRole>[0]) => {
    await createRole(data);
    toast.success("Role added.");
    setAdding(false);
    onRefresh();
  };

  const handleUpdate = async (roleId: string, data: { title: string; company: string; type: RoleType; color: string; start_date: string }) => {
    await updateRole(roleId, {
      title: data.title,
      company: data.company || null,
      type: data.type,
      color: data.color,
      start_date: data.start_date || null,
      end_date: null,
    });
    toast.success("Role updated.");
    setEditId(null);
    onRefresh();
  };

  const handleArchive = async (roleId: string, current: boolean) => {
    await updateRole(roleId, { is_active: !current });
    toast.success(current ? "Role archived." : "Role restored.");
    onRefresh();
  };

  const handleDelete = async (roleId: string) => {
    await deleteRole(roleId);
    toast.success("Role deleted.");
    setDeleting(null);
    onRefresh();
  };

  const active   = roles.filter(r => r.is_active);
  const archived = roles.filter(r => !r.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{active.length} active role{active.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setAdding(true); setEditId(null); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Role
        </Button>
      </div>

      {adding && (
        <RoleForm
          onSave={handleCreate}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="space-y-3">
        {active.length === 0 && !adding && (
          <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
            <Briefcase className="h-6 w-6 mx-auto mb-2 opacity-30" />
            No roles yet. Add your first one above.
          </div>
        )}

        {active.map(role => (
          <div key={role.id}>
            {editId === role.id ? (
              <RoleForm
                initial={role}
                onSave={(data) => handleUpdate(role.id, data)}
                onCancel={() => setEditId(null)}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3">
                <RoleColorDot color={role.color} size={12} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{role.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {role.company && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />{role.company}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleBadge(role.type)}`}>
                      {TYPE_LABELS[role.type]}
                    </span>
                    {role.start_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(parseISO(role.start_date), "MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditId(role.id)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleArchive(role.id, true)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Archive"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                  {deleting === role.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(role.id)} className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleting(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleting(role.id)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {archived.length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            {archived.length} archived role{archived.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-3 space-y-2">
            {archived.map(role => (
              <div key={role.id} className="flex items-center gap-3 rounded-xl border border-border/20 bg-muted/20 px-4 py-3 opacity-60">
                <RoleColorDot color={role.color} size={10} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-muted-foreground line-through">{role.title}</p>
                  {role.company && <p className="text-xs text-muted-foreground">{role.company}</p>}
                </div>
                <button
                  onClick={() => handleArchive(role.id, false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Today Tab ──────────────────────────────────────────────────────────────────

function TodayTab({ roles, isDeepMode }: { roles: WorkRole[]; isDeepMode: boolean }) {
  const [sessions, setSessions]   = useState<WorkSession[]>([]);
  const [logs, setLogs]           = useState<WorkLog[]>([]);
  const [selectedRole, setRole]   = useState<WorkRole | null>(null);
  const [content, setContent]     = useState("");
  const [isPrivate, setPrivate]   = useState(false);
  const [rawTags, setRawTags]     = useState("");
  const [clockingIn, setClocking] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [clockedInAt, setClockedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeRoles = roles.filter(r => r.is_active);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      getSessionsForDate(TODAY),
      getLogsForDate(TODAY),
    ]);
    setSessions(s);
    setLogs(l);
    if (!selectedRole && activeRoles.length > 0) {
      setRole(activeRoles[0]);
    }
  }, [activeRoles, selectedRole]);

  useEffect(() => { load(); }, []);

  // When role changes, populate content + tags from existing log
  useEffect(() => {
    if (!selectedRole) return;
    const existing = logs.find(l => l.role_id === selectedRole.id);
    setContent(existing?.content ?? "");
    setPrivate(existing?.is_private ?? false);
    setRawTags(existing?.tags?.join(", ") ?? "");
  }, [selectedRole, logs]);

  const session = selectedRole ? sessions.find(s => s.role_id === selectedRole.id) : null;
  const isClockedIn = session?.clocked_in ?? false;

  const handleClockIn = async () => {
    if (!selectedRole) return;
    setClocking(true);
    try {
      const result = await clockIn(selectedRole.id, selectedRole.title, TODAY);
      setClockedAt(new Date());
      await load();
      if (result.xpGranted) {
        window.dispatchEvent(new CustomEvent("xp_updated"));
        toast.success(`Clocked in! +${result.xp} XP`);
      } else {
        toast.success("Already clocked in for today.");
      }
    } catch {
      toast.error("Clock-in failed.");
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!selectedRole || !clockedInAt) return;
    const duration = Math.round((Date.now() - clockedInAt.getTime()) / 60000);
    await clockOut(selectedRole.id, TODAY, duration);
    toast.success(`Clocked out. Session: ${duration} min.`);
    setClockedAt(null);
    await load();
  };

  // Auto-save log on content/tags/private change with debounce
  const triggerSave = useCallback(() => {
    if (!selectedRole) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSavingLog(true);
      try {
        await upsertWorkLog({
          roleId: selectedRole.id,
          date: TODAY,
          content,
          isPrivate,
          tags: parseTags(rawTags),
        });
        await load();
      } finally {
        setSavingLog(false);
      }
    }, 800);
  }, [selectedRole, content, isPrivate, rawTags, load]);

  useEffect(() => {
    if (content || rawTags) triggerSave();
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [content, rawTags, isPrivate]);

  if (activeRoles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 p-10 text-center text-sm text-muted-foreground">
        <Briefcase className="h-6 w-6 mx-auto mb-2 opacity-30" />
        Add a role in the Roles tab first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role selector */}
      {activeRoles.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {activeRoles.map(role => (
            <button
              key={role.id}
              onClick={() => setRole(role)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedRole?.id === role.id
                  ? "border-2 bg-card"
                  : "border-border/40 text-muted-foreground hover:border-border"
              }`}
              style={selectedRole?.id === role.id ? { borderColor: role.color } : {}}
            >
              <RoleColorDot color={role.color} size={8} />
              {role.title}
            </button>
          ))}
        </div>
      )}

      {selectedRole && (
        <>
          {/* Clock-in card */}
          <div className={`rounded-xl border-2 p-6 transition-all ${
            isClockedIn
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-border/40 bg-card"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RoleColorDot color={selectedRole.color} size={10} />
                  <p className="font-semibold">{selectedRole.title}</p>
                  {selectedRole.company && (
                    <span className="text-xs text-muted-foreground">@ {selectedRole.company}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isClockedIn
                    ? session?.duration_minutes
                      ? `Worked ${session.duration_minutes} min today`
                      : "Currently clocked in"
                    : "Not clocked in yet today"}
                </p>
              </div>

              {isClockedIn ? (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">Clocked In</span>
                  </div>
                  {clockedInAt && (
                    <button
                      onClick={handleClockOut}
                      className="text-xs text-muted-foreground underline hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Timer className="h-3 w-3" /> Log clock-out
                    </button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleClockIn}
                  disabled={clockingIn}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  {clockingIn ? "Clocking in…" : "Clock In · +25 XP"}
                </Button>
              )}
            </div>
          </div>

          {/* Work log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Work Log</p>
              <div className="flex items-center gap-3">
                {savingLog && <span className="text-xs text-muted-foreground">Saving…</span>}
                <button
                  onClick={() => setPrivate(p => !p)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                    isPrivate
                      ? "border-red-500/40 bg-red-500/10 text-red-500"
                      : "border-border/40 text-muted-foreground hover:border-border"
                  }`}
                >
                  {isPrivate ? <EyeOff className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {isPrivate ? "Private" : "Make Private"}
                </button>
              </div>
            </div>

            {isPrivate && !isDeepMode && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-500 flex items-center gap-2">
                <EyeOff className="h-3.5 w-3.5" />
                This log is marked private. Switch to Deep Mode to read it.
              </div>
            )}

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`What did you work on today?\n\nBe specific — models trained, features shipped, bugs fixed, meetings had…`}
              rows={6}
              className="w-full rounded-xl border border-border/40 bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />

            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                value={rawTags}
                onChange={e => setRawTags(e.target.value)}
                placeholder="Tags: ml, debugging, meetings… (comma-separated)"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────────────

function HistoryTab({ roles, isDeepMode }: { roles: WorkRole[]; isDeepMode: boolean }) {
  const [date, setDate]     = useState(TODAY);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [logs, setLogs]         = useState<WorkLog[]>([]);
  const [loading, setLoading]   = useState(false);

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r]));

  const load = useCallback(async (d: string) => {
    setLoading(true);
    const [s, l] = await Promise.all([getSessionsForDate(d), getLogsForDate(d)]);
    setSessions(s);
    setLogs(l);
    setLoading(false);
  }, []);

  useEffect(() => { load(date); }, [date]);

  const prevDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().split("T")[0];
    if (next <= TODAY) setDate(next);
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteWorkLog(logId);
    toast.success("Log deleted.");
    load(date);
  };

  const dateLabel = date === TODAY ? "Today" : format(parseISO(date), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-5">
      {/* Date navigator */}
      <div className="flex items-center justify-between">
        <button onClick={prevDay} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{dateLabel}</p>
        </div>
        <button onClick={nextDay} disabled={date === TODAY} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : sessions.length === 0 && logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/30 p-8 text-center text-sm text-muted-foreground">
          No work logged for this day.
        </div>
      ) : (
        <div className="space-y-4">
          {roles.filter(r => {
            const hasSession = sessions.some(s => s.role_id === r.id);
            const hasLog     = logs.some(l => l.role_id === r.id);
            return hasSession || hasLog;
          }).map(role => {
            const session = sessions.find(s => s.role_id === role.id);
            const log     = logs.find(l => l.role_id === role.id);
            const showContent = log && (!log.is_private || isDeepMode);

            return (
              <div
                key={role.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  log?.is_private && isDeepMode
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-border/40 bg-card"
                }`}
              >
                {/* Role header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RoleColorDot color={role.color} size={10} />
                    <span className="font-medium text-sm">{role.title}</span>
                    {role.company && (
                      <span className="text-xs text-muted-foreground">@ {role.company}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {session?.clocked_in && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Clocked In
                        {session.duration_minutes ? ` · ${session.duration_minutes} min` : ""}
                      </span>
                    )}
                    {log?.is_private && (
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        isDeepMode ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground"
                      }`}>
                        <EyeOff className="h-3 w-3" />
                        {isDeepMode ? "Private" : "Hidden"}
                      </span>
                    )}
                    {log && (
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Log content */}
                {log && !showContent && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
                    <EyeOff className="h-3.5 w-3.5" />
                    Private entry — switch to Deep Mode to view.
                  </div>
                )}

                {showContent && log.content && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {log.content}
                  </p>
                )}

                {showContent && log.tags && log.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {log.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        <Tag className="h-2.5 w-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main WorkTracker ───────────────────────────────────────────────────────────

export function WorkTracker() {
  const { isDeepMode }            = useMode();
  const [tab, setTab]             = useState<"roles" | "today" | "history">("today");
  const [roles, setRoles]         = useState<WorkRole[]>([]);
  const [loadingRoles, setLoading] = useState(true);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try { setRoles(await getRoles()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  // Streak badge — count days in last 30 with any clocked-in session
  // (lightweight: just show active role count for now)
  const activeCount = roles.filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border/40 pb-2">
        {([
          { key: "today",   label: "Today",   icon: Zap },
          { key: "roles",   label: "Roles",   icon: Briefcase },
          { key: "history", label: "History", icon: CalendarDays },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === "roles" && activeCount > 0 && (
              <span className="ml-1 text-[10px] font-bold bg-background/20 px-1.5 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loadingRoles ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {tab === "roles"   && <RolesTab roles={roles} onRefresh={loadRoles} />}
          {tab === "today"   && <TodayTab roles={roles} isDeepMode={isDeepMode} />}
          {tab === "history" && <HistoryTab roles={roles} isDeepMode={isDeepMode} />}
        </>
      )}
    </div>
  );
}
