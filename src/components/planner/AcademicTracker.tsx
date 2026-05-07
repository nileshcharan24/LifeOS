"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createSemester, deleteSemester,
  createSubject, deleteSubject,
  logAttendance,
  createAssignment, toggleAssignment, deleteAssignment,
} from "@/services/planner/academicService";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO,
} from "date-fns";
import {
  GraduationCap, Plus, Trash2, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronRight, Calendar, BookOpen, ClipboardList,
  ChevronLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Semester = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type Subject = {
  id: string;
  name: string;
  target_percentage: number | null;
  semester_id: string | null;
  credits: number | null;
  description: string | null;
};

type AttendanceRecord = {
  id: string;
  subject_id: string;
  date: string;
  status: "present" | "absent" | "late";
};

type Assignment = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  type: "assignment" | "exam" | "quiz";
  due_date: string;
  is_completed: boolean;
};

type SubjectStats = Subject & {
  total: number;
  present: number;
  late: number;
  absent: number;
  percentage: number;
  todayStatus: "present" | "absent" | "late" | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500",
  "bg-pink-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500",
];

const TYPE_STYLES = {
  exam: "bg-red-500/15 text-red-600 dark:text-red-400",
  quiz: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  assignment: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const TYPE_ICONS: Record<string, string> = { exam: "📋", quiz: "❓", assignment: "📝" };

// ─── Component ────────────────────────────────────────────────────────────────

export function AcademicTracker() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemId, setSelectedSemId] = useState<string>("__none__");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"courses" | "calendar">("courses");
  const [calMonth, setCalMonth] = useState(new Date());

  // Form states
  const [showAddSem, setShowAddSem] = useState(false);
  const [newSem, setNewSem] = useState({ name: "", startDate: "", endDate: "" });
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: "", credits: "3", target: "75", description: "" });
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [addDeadlineFor, setAddDeadlineFor] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState({ title: "", type: "assignment" as Assignment["type"], dueDate: "", description: "" });
  const [logging, setLogging] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: semData }, { data: subData }, { data: recData }, { data: assignData }] = await Promise.all([
      supabase.from("semesters").select("*").eq("profile_id", user.id).order("created_at"),
      supabase.from("academic_subjects").select("*").eq("profile_id", user.id).order("created_at"),
      supabase.from("attendance_records").select("*").eq("profile_id", user.id).order("date"),
      supabase.from("course_assignments").select("*").eq("profile_id", user.id).order("due_date"),
    ]);

    if (semData) setSemesters(semData as Semester[]);
    if (subData) setSubjects(subData as Subject[]);
    if (recData) setRecords(recData as AttendanceRecord[]);
    if (assignData) setAssignments(assignData as Assignment[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-select latest semester on first load
  useEffect(() => {
    if (semesters.length > 0 && selectedSemId === "__none__") {
      setSelectedSemId(semesters[semesters.length - 1].id);
    }
  }, [semesters, selectedSemId]);

  const filteredSubjects = useMemo(() =>
    subjects.filter(s =>
      selectedSemId === "__none__" ? !s.semester_id : s.semester_id === selectedSemId
    ),
    [subjects, selectedSemId]
  );

  const computeStats = (subject: Subject): SubjectStats => {
    const subRecords = records.filter(r => r.subject_id === subject.id);
    const total = subRecords.length;
    const present = subRecords.filter(r => r.status === "present").length;
    const late = subRecords.filter(r => r.status === "late").length;
    const absent = subRecords.filter(r => r.status === "absent").length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    const todayRecord = subRecords.find(r => r.date === today);
    return { ...subject, total, present, late, absent, percentage, todayStatus: todayRecord?.status ?? null };
  };

  const statsAll = filteredSubjects.map(computeStats);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  const semSubjectIds = new Set(filteredSubjects.map(s => s.id));
  const calAssignments = assignments.filter(a => semSubjectIds.has(a.subject_id));
  const calRecords = records.filter(r => semSubjectIds.has(r.subject_id));

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAddSemester = async () => {
    if (!newSem.name.trim()) return;
    setSaving(true);
    try {
      await createSemester(newSem.name.trim(), newSem.startDate || undefined, newSem.endDate || undefined);
      toast.success(`Semester "${newSem.name}" created!`);
      setNewSem({ name: "", startDate: "", endDate: "" });
      setShowAddSem(false);
      await fetchData();
    } catch { toast.error("Failed to create semester."); }
    finally { setSaving(false); }
  };

  const handleDeleteSemester = async (id: string, name: string) => {
    await deleteSemester(id);
    toast.success(`"${name}" removed.`);
    const remaining = semesters.filter(s => s.id !== id);
    setSelectedSemId(remaining.length > 0 ? remaining[remaining.length - 1].id : "__none__");
    await fetchData();
  };

  const handleAddCourse = async () => {
    if (!newCourse.name.trim()) return;
    setSaving(true);
    try {
      await createSubject(
        newCourse.name.trim(),
        parseInt(newCourse.target) || 75,
        selectedSemId === "__none__" ? undefined : selectedSemId,
        parseFloat(newCourse.credits) || 3,
        newCourse.description.trim() || undefined,
      );
      toast.success(`"${newCourse.name}" added!`);
      setNewCourse({ name: "", credits: "3", target: "75", description: "" });
      setShowAddCourse(false);
      await fetchData();
    } catch { toast.error("Failed to add course."); }
    finally { setSaving(false); }
  };

  const handleLog = async (subjectId: string, status: "present" | "absent" | "late") => {
    setLogging(subjectId + status);
    try {
      await logAttendance(subjectId, today, status);
      toast.success(`Marked as ${status}.`);
      await fetchData();
    } catch { toast.error("Failed to log attendance."); }
    finally { setLogging(null); }
  };

  const handleDeleteCourse = async (subjectId: string, name: string) => {
    await deleteSubject(subjectId);
    toast.success(`"${name}" removed.`);
    await fetchData();
  };

  const handleAddDeadline = async (subjectId: string) => {
    if (!newDeadline.title.trim() || !newDeadline.dueDate) return;
    setSaving(true);
    try {
      await createAssignment(
        subjectId,
        newDeadline.title.trim(),
        newDeadline.type,
        newDeadline.dueDate,
        newDeadline.description.trim() || undefined,
      );
      toast.success("Deadline added!");
      setNewDeadline({ title: "", type: "assignment", dueDate: "", description: "" });
      setAddDeadlineFor(null);
      await fetchData();
    } catch { toast.error("Failed to add deadline."); }
    finally { setSaving(false); }
  };

  const handleToggleDeadline = async (id: string, current: boolean) => {
    await toggleAssignment(id, !current);
    await fetchData();
  };

  const handleDeleteDeadline = async (id: string) => {
    await deleteAssignment(id);
    toast.success("Deadline removed.");
    await fetchData();
  };

  const toggleExpand = (id: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-xl border border-border/40 bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Academic Tracker</h2>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("courses")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "courses" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Courses
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "calendar" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </button>
        </div>
      </div>

      {/* Semester Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {semesters.map(sem => (
            <div
              key={sem.id}
              onClick={() => setSelectedSemId(sem.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium cursor-pointer transition-all select-none ${selectedSemId === sem.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
            >
              {sem.name}
              {sem.start_date && sem.end_date && (
                <span className={`text-[10px] ${selectedSemId === sem.id ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {format(parseISO(sem.start_date), "MMM yy")}–{format(parseISO(sem.end_date), "MMM yy")}
                </span>
              )}
              <button
                onClick={e => { e.stopPropagation(); handleDeleteSemester(sem.id, sem.name); }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => setShowAddSem(v => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Add Semester
          </Button>
        </div>

        {showAddSem && (
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <p className="text-sm font-semibold">New Semester</p>
            <div className="flex gap-2 flex-wrap items-center">
              <Input
                placeholder="Name (e.g. Fall 2025)"
                value={newSem.name}
                onChange={e => setNewSem(v => ({ ...v, name: e.target.value }))}
                className="w-48"
              />
              <Input
                type="date"
                value={newSem.startDate}
                onChange={e => setNewSem(v => ({ ...v, startDate: e.target.value }))}
                className="w-36 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={newSem.endDate}
                onChange={e => setNewSem(v => ({ ...v, endDate: e.target.value }))}
                className="w-36 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddSemester} disabled={saving || !newSem.name.trim()}>
                {saving ? "Saving..." : "Create"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddSem(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Courses View ─────────────────────────────────────────────────────── */}

      {view === "courses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredSubjects.length} course{filteredSubjects.length !== 1 ? "s" : ""}
              {selectedSemId !== "__none__" && semesters.find(s => s.id === selectedSemId)
                ? ` · ${semesters.find(s => s.id === selectedSemId)!.name}`
                : ""}
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowAddCourse(v => !v)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Course
            </Button>
          </div>

          {/* Add Course Form */}
          {showAddCourse && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <p className="text-sm font-semibold">New Course</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Course name (e.g. Calculus II)"
                  value={newCourse.name}
                  onChange={e => setNewCourse(v => ({ ...v, name: e.target.value }))}
                  className="col-span-2"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={20} step={0.5}
                    placeholder="3"
                    value={newCourse.credits}
                    onChange={e => setNewCourse(v => ({ ...v, credits: e.target.value }))}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">credits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={100}
                    placeholder="75"
                    value={newCourse.target}
                    onChange={e => setNewCourse(v => ({ ...v, target: e.target.value }))}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">% min attendance</span>
                </div>
                <textarea
                  placeholder="Description (optional)"
                  value={newCourse.description}
                  onChange={e => setNewCourse(v => ({ ...v, description: e.target.value }))}
                  rows={2}
                  className="col-span-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCourse} disabled={saving || !newCourse.name.trim()}>
                  {saving ? "Saving..." : "Add Course"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddCourse(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Course Cards */}
          <div className="space-y-3">
            {statsAll.map((stat, idx) => {
              const target = stat.target_percentage ?? 75;
              const isAboveTarget = stat.percentage >= target;
              const isNearTarget = stat.percentage >= target - 5 && !isAboveTarget;
              const progressColor = isAboveTarget
                ? "[&>div]:bg-green-500"
                : isNearTarget
                ? "[&>div]:bg-yellow-500"
                : "[&>div]:bg-red-500";
              const isExpanded = expandedCourses.has(stat.id);
              const courseDeadlines = assignments
                .filter(a => a.subject_id === stat.id)
                .sort((a, b) => a.due_date.localeCompare(b.due_date));
              const pendingCount = courseDeadlines.filter(a => !a.is_completed).length;

              return (
                <div key={stat.id} className="rounded-xl border border-border/40 bg-muted/40 overflow-hidden">
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COURSE_COLORS[idx % COURSE_COLORS.length]}`} />
                          <h3 className="font-semibold text-sm">{stat.name}</h3>
                          {stat.credits && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4">{stat.credits} cr</Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${isAboveTarget ? "bg-green-500/10 text-green-500 border-green-500/30" : isNearTarget ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" : "bg-red-500/10 text-red-500 border-red-500/30"}`}
                          >
                            {stat.percentage}%
                          </Badge>
                          {stat.todayStatus && (
                            <Badge variant="outline" className="text-xs capitalize">
                              Today: {stat.todayStatus}
                            </Badge>
                          )}
                        </div>
                        {stat.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{stat.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.present}P · {stat.late}L · {stat.absent}A · {stat.total} classes · Target: {target}%
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCourse(stat.id, stat.name)}
                        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <Progress value={stat.percentage} className={`h-2 mb-3 ${progressColor}`} />

                    {/* Attendance buttons */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Today:</span>
                      {(["present", "absent", "late"] as const).map(status => {
                        const isActive = stat.todayStatus === status;
                        return (
                          <button
                            key={status}
                            onClick={() => handleLog(stat.id, status)}
                            disabled={!!logging}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                              isActive
                                ? status === "present" ? "bg-green-500 text-white border-green-500"
                                  : status === "absent" ? "bg-red-500 text-white border-red-500"
                                  : "bg-yellow-500 text-white border-yellow-500"
                                : "bg-background border-border/40 hover:border-primary/50 text-muted-foreground"
                            }`}
                          >
                            {status === "present" ? <CheckCircle className="h-3 w-3" />
                              : status === "absent" ? <XCircle className="h-3 w-3" />
                              : <Clock className="h-3 w-3" />}
                            {logging === stat.id + status ? "..." : status}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deadlines toggle */}
                  <button
                    onClick={() => toggleExpand(stat.id)}
                    className="w-full px-4 py-2 flex items-center justify-between bg-muted/60 hover:bg-muted/80 transition-colors border-t border-border/30 text-xs text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Deadlines & Assessments
                      {pendingCount > 0 && (
                        <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px] font-semibold">
                          {pendingCount}
                        </span>
                      )}
                    </span>
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>

                  {/* Deadlines list */}
                  {isExpanded && (
                    <div className="px-4 py-3 space-y-2 border-t border-border/20">
                      {courseDeadlines.length === 0 && addDeadlineFor !== stat.id && (
                        <p className="text-xs text-muted-foreground text-center py-2">No deadlines yet.</p>
                      )}

                      {courseDeadlines.map(a => (
                        <div
                          key={a.id}
                          className={`flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors ${a.is_completed ? "opacity-50" : ""}`}
                        >
                          <button
                            onClick={() => handleToggleDeadline(a.id, a.is_completed)}
                            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${a.is_completed ? "bg-primary border-primary" : "border-border/60 hover:border-primary"}`}
                          >
                            {a.is_completed && <CheckCircle className="h-2.5 w-2.5 text-primary-foreground" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_STYLES[a.type]}`}>
                                {TYPE_ICONS[a.type]} {a.type}
                              </span>
                              <span className={`text-xs font-medium ${a.is_completed ? "line-through" : ""}`}>{a.title}</span>
                              <span className="text-[10px] text-muted-foreground">
                                Due {format(parseISO(a.due_date), "MMM d, yyyy")}
                              </span>
                            </div>
                            {a.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteDeadline(a.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add deadline form */}
                      {addDeadlineFor === stat.id ? (
                        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2 mt-2">
                          <p className="text-xs font-semibold">Add Deadline</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Title"
                              value={newDeadline.title}
                              onChange={e => setNewDeadline(v => ({ ...v, title: e.target.value }))}
                              className="col-span-2 h-8 text-sm"
                            />
                            <select
                              value={newDeadline.type}
                              onChange={e => setNewDeadline(v => ({ ...v, type: e.target.value as Assignment["type"] }))}
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="assignment">📝 Assignment</option>
                              <option value="exam">📋 Exam</option>
                              <option value="quiz">❓ Quiz</option>
                            </select>
                            <Input
                              type="date"
                              value={newDeadline.dueDate}
                              onChange={e => setNewDeadline(v => ({ ...v, dueDate: e.target.value }))}
                              className="h-8 text-sm"
                            />
                            <textarea
                              placeholder="Description (optional)"
                              value={newDeadline.description}
                              onChange={e => setNewDeadline(v => ({ ...v, description: e.target.value }))}
                              rows={2}
                              className="col-span-2 flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm" className="h-7 text-xs"
                              onClick={() => handleAddDeadline(stat.id)}
                              disabled={saving || !newDeadline.title.trim() || !newDeadline.dueDate}
                            >
                              {saving ? "..." : "Add"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddDeadlineFor(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm" variant="ghost" className="w-full h-7 text-xs mt-1"
                          onClick={() => setAddDeadlineFor(stat.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Deadline
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {statsAll.length === 0 && !showAddCourse && (
              <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
                <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {semesters.length === 0
                    ? "Create a semester first, then add your courses."
                    : "No courses in this semester. Add your first one above!"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Calendar View ────────────────────────────────────────────────────── */}

      {view === "calendar" && (
        <div className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCalMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-semibold">{format(calMonth, "MMMM yyyy")}</h3>
            <button
              onClick={() => setCalMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
            ))}

            {calendarDays.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, calMonth);
              const todayFlag = isToday(day);
              const dayDeadlines = calAssignments.filter(a => a.due_date === dateStr);
              const dayRecords = calRecords.filter(r => r.date === dateStr);

              return (
                <div
                  key={dateStr}
                  className={`min-h-[90px] p-1.5 rounded-lg border flex flex-col transition-colors ${
                    inMonth ? "border-border/40 bg-background" : "border-transparent bg-muted/10"
                  } ${todayFlag ? "ring-2 ring-primary border-primary/30" : ""}`}
                >
                  {/* Date number */}
                  <div className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-1 flex-shrink-0 ${
                    todayFlag
                      ? "bg-primary text-primary-foreground"
                      : inMonth ? "text-foreground" : "text-muted-foreground/25"
                  }`}>
                    {format(day, "d")}
                  </div>

                  {/* Deadline pills */}
                  <div className="space-y-0.5 flex-1">
                    {dayDeadlines.slice(0, 3).map(a => (
                      <div
                        key={a.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-medium leading-tight ${
                          a.is_completed ? "opacity-40 line-through" : ""
                        } ${TYPE_STYLES[a.type]}`}
                        title={`${a.title} (${a.type})`}
                      >
                        {TYPE_ICONS[a.type]} {a.title}
                      </div>
                    ))}
                    {dayDeadlines.length > 3 && (
                      <div className="text-[9px] text-muted-foreground pl-0.5">
                        +{dayDeadlines.length - 3} more
                      </div>
                    )}
                  </div>

                  {/* Attendance dots */}
                  {inMonth && dayRecords.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap mt-auto pt-1">
                      {dayRecords.slice(0, 8).map(r => (
                        <div
                          key={r.id}
                          title={`${filteredSubjects.find(s => s.id === r.subject_id)?.name ?? ""}: ${r.status}`}
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            r.status === "present" ? "bg-green-500"
                              : r.status === "late" ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/30 flex-wrap">
            <span className="font-medium text-foreground text-xs">Legend:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Present
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Late
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Absent
            </span>
            <span className={`px-1.5 py-0.5 rounded ${TYPE_STYLES.assignment}`}>📝 Assignment</span>
            <span className={`px-1.5 py-0.5 rounded ${TYPE_STYLES.exam}`}>📋 Exam</span>
            <span className={`px-1.5 py-0.5 rounded ${TYPE_STYLES.quiz}`}>❓ Quiz</span>
          </div>
        </div>
      )}
    </div>
  );
}
