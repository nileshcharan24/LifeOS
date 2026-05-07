"use client";

import { useEffect, useState } from "react";
import { createSemester, getSemesters, deleteSemester, getSemesterStats } from "@/services/academic/academicService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { GraduationCap, Plus, Trash2, ChevronRight, BookOpen, BarChart3 } from "lucide-react";

type Semester = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type SemesterStats = {
  totalCourses: number;
  totalClasses: number;
  totalAttended: number;
  totalMissed: number;
  totalOd: number;
  averageAttendance: number;
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  overdueAssessments: number;
};

type AttendanceStatus = "good" | "warning" | "critical";

export function SemesterHub({ onSelectSemester }: { onSelectSemester: (id: string) => void }) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [stats, setStats] = useState<Record<string, SemesterStats>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSem, setNewSem] = useState({ name: "", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    const data = await getSemesters();
    setSemesters(data.filter(s => s.status === "active") as Semester[]);
    setLoading(false);

    const statsMap: Record<string, SemesterStats> = {};
    for (const sem of data) {
      const semStats = await getSemesterStats(sem.id);
      if (semStats) statsMap[sem.id] = semStats;
    }
    setStats(statsMap);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSemester = async () => {
    if (!newSem.name.trim()) return;
    setSaving(true);
    try {
      await createSemester(newSem.name.trim(), newSem.startDate || undefined, newSem.endDate || undefined);
      toast.success(`Semester "${newSem.name}" created!`);
      setNewSem({ name: "", startDate: "", endDate: "" });
      setShowAddForm(false);
      await fetchData();
    } catch {
      toast.error("Failed to create semester.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSemester = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      await deleteSemester(id);
      toast.success(`"${name}" archived.`);
      await fetchData();
    } catch {
      toast.error("Failed to archive semester.");
    } finally {
      setDeletingId(null);
    }
  };

  const getAttendanceStatus = (percentage: number): AttendanceStatus => {
    if (percentage >= 85) return "good";
    if (percentage >= 75) return "warning";
    return "critical";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Academic Tracker</h1>
        </div>
        <Button onClick={() => setShowAddForm(v => !v)} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          New Semester
        </Button>
      </div>

      {/* Add Semester Form */}
      {showAddForm && (
        <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
          <p className="text-sm font-semibold">Create Semester</p>
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Semester name (e.g. Spring 2025)"
              value={newSem.name}
              onChange={e => setNewSem(v => ({ ...v, name: e.target.value }))}
              className="col-span-1"
            />
            <Input
              type="date"
              value={newSem.startDate}
              onChange={e => setNewSem(v => ({ ...v, startDate: e.target.value }))}
            />
            <Input
              type="date"
              value={newSem.endDate}
              onChange={e => setNewSem(v => ({ ...v, endDate: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddSemester} disabled={saving || !newSem.name.trim()}>
              {saving ? "Creating..." : "Create"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Semester Cards Grid */}
      {semesters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 p-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No semesters yet. Create your first one to get started!</p>
          <Button onClick={() => setShowAddForm(true)}>Create First Semester</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {semesters.map(sem => {
            const semStats = stats[sem.id];
            if (!semStats) return null;

            const attendanceStatus = getAttendanceStatus(semStats.averageAttendance);
            const dateRange = sem.start_date && sem.end_date
              ? `${format(parseISO(sem.start_date), "MMM d")} – ${format(parseISO(sem.end_date), "MMM d, yyyy")}`
              : sem.start_date ? `From ${format(parseISO(sem.start_date), "MMM d, yyyy")}`
              : "No dates set";

            return (
              // ── FIX: div instead of button to avoid nested <button> hydration error ──
              // The entire card is clickable via onClick + keyboard handlers.
              // The delete <button> inside is now a valid descendant of a div.
              <div
                key={sem.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSemester(sem.id)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSemester(sem.id);
                  }
                }}
                className="group relative p-6 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/50 transition-colors text-left overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Accent bar */}
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  attendanceStatus === "good" ? "bg-green-500"
                    : attendanceStatus === "warning" ? "bg-yellow-500"
                    : "bg-red-500"
                }`} />

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{sem.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{dateRange}</p>
                  </div>
                  {/* ── valid <button> inside a div — no nesting violation ── */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteSemester(sem.id, sem.name);
                    }}
                    disabled={deletingId === sem.id}
                    aria-label={`Delete ${sem.name}`}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-border/20">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      Courses
                    </div>
                    <p className="text-2xl font-bold">{semStats.totalCourses}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Attendance
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold">{semStats.averageAttendance}%</p>
                      <Badge
                        className={`text-xs ${
                          attendanceStatus === "good"
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : attendanceStatus === "warning"
                            ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        }`}
                        variant="outline"
                      >
                        {attendanceStatus === "good" ? "On Track" : attendanceStatus === "warning" ? "At Risk" : "Critical"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Classes: {semStats.totalAttended + semStats.totalMissed + semStats.totalOd}</span>
                    <span>
                      <span className="text-green-600 dark:text-green-400 font-medium">{semStats.totalAttended} ✓</span>
                      <span className="text-muted-foreground mx-1">·</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">{semStats.totalMissed} ✗</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Assessments: {semStats.totalAssessments}</span>
                    <span>
                      <span className="text-green-600 dark:text-green-400 font-medium">{semStats.completedAssessments}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span>{semStats.totalAssessments}</span>
                    </span>
                  </div>
                  {semStats.overdueAssessments > 0 && (
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium pt-1">
                      <span className="text-lg">🔴</span>
                      {semStats.overdueAssessments} overdue
                    </div>
                  )}
                </div>

                {/* Hover indicator */}
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
