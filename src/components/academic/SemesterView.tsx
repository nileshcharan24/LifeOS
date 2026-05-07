"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getCoursesBySemester,
  getSemesterStats,
  createCourse,
  deleteCourse,
  createClassInstance,
  updateClassInstanceStatus,
  deleteClassInstance,
  createAssessment,
  updateAssessmentStatus,
} from "@/services/academic/academicService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO, isBefore,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, BookOpen, Calendar,
  BarChart3, ArrowLeft, X,
} from "lucide-react";
import { CourseDetail } from "./CourseDetail";

// ─── Types ────────────────────────────────────────────────────────────────────

type Semester = {
  id: string; name: string; start_date: string | null; end_date: string | null;
  status: string; created_at: string | null; updated_at: string | null;
};

type Course = {
  id: string; semester_id: string; profile_id: string;
  name: string; code: string | null; credits: number | null;
  instructor_name: string | null; created_at: string | null; updated_at: string | null;
};

type ClassInstance = {
  id: string; course_id: string; date: string;
  status: "attended" | "missed" | "od";
};

type Assessment = {
  id: string; course_id: string; name: string;
  type: "assignment" | "exam" | "quiz" | "project" | "presentation" | "participation" | "other";
  due_date: string; status: "pending" | "submitted" | "completed";
};

type SemesterStats = {
  totalCourses: number; totalClasses: number; totalAttended: number; totalMissed: number;
  totalOd: number; averageAttendance: number; totalAssessments: number;
  completedAssessments: number; pendingAssessments: number; overdueAssessments: number;
};

type CourseStats = { attended: number; missed: number; od: number; total: number; percentage: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_PILL_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
];

const COURSE_BAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500",
  "bg-pink-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500",
];

const ASSESSMENT_PILL: Record<string, string> = {
  exam:          "bg-red-500/15 text-red-700 dark:text-red-300",
  quiz:          "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  assignment:    "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  project:       "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  presentation:  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  participation: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  other:         "bg-gray-500/15 text-gray-700 dark:text-gray-300",
};

const ASSESSMENT_ICON: Record<string, string> = {
  exam: "📋", quiz: "❓", assignment: "📝",
  project: "🎯", presentation: "🎤", participation: "👥", other: "📌",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function SemesterView({
  semesterId, semester, onBack,
}: {
  semesterId: string; semester: Semester; onBack: () => void;
}) {
  // ── state (all hooks unconditionally at top) ───────────────────────────────
  const [courses, setCourses]           = useState<Course[]>([]);
  const [stats, setStats]               = useState<SemesterStats | null>(null);
  const [allInstances, setAllInstances] = useState<ClassInstance[]>([]);
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [calMonth, setCalMonth]         = useState(new Date());
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse]       = useState({ name: "", code: "", credits: "3", instructor: "" });
  const [saving, setSaving]             = useState(false);

  // day-panel add-assessment form
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: "", type: "assignment" as Assessment["type"], courseId: "",
  });

  // ── memos ─────────────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(calMonth),   { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  // course index → colour mapping (stable by creation order)
  const courseColorIdx = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    courses.forEach((c, i) => { map[c.id] = i; });
    return map;
  }, [courses]);

  // per-course attendance stats derived from shared allInstances
  const courseStatsMap = useMemo<Record<string, CourseStats>>(() => {
    const map: Record<string, CourseStats> = {};
    for (const course of courses) {
      const inst     = allInstances.filter(i => i.course_id === course.id);
      const attended = inst.filter(i => i.status === "attended").length;
      const missed   = inst.filter(i => i.status === "missed").length;
      const od       = inst.filter(i => i.status === "od").length;
      const pct      = (attended + missed) > 0
        ? Math.round((attended / (attended + missed)) * 100) : 0;
      map[course.id] = { attended, missed, od, total: inst.length, percentage: pct };
    }
    return map;
  }, [allInstances, courses]);

  // ── data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [coursesData, statsData] = await Promise.all([
      getCoursesBySemester(semesterId),
      getSemesterStats(semesterId),
    ]);

    const coursesList = (coursesData as Course[]);
    setCourses(coursesList);
    setStats(statsData);

    const ids = coursesList.map(c => c.id);
    if (ids.length > 0) {
      const [{ data: inst }, { data: asmts }] = await Promise.all([
        supabase
          .from("class_instances")
          .select("id, course_id, date, status")
          .in("course_id", ids),
        supabase
          .from("assessments")
          .select("id, course_id, name, type, due_date, status")
          .in("course_id", ids)
          .order("due_date"),
      ]);
      setAllInstances((inst || []) as ClassInstance[]);
      setAllAssessments((asmts || []) as Assessment[]);
    } else {
      setAllInstances([]);
      setAllAssessments([]);
    }

    setLoading(false);
  }, [semesterId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleAddCourse = async () => {
    if (!newCourse.name.trim()) return;
    setSaving(true);
    try {
      await createCourse(semesterId, newCourse.name.trim(),
        newCourse.code.trim() || undefined, parseInt(newCourse.credits) || 3,
        newCourse.instructor.trim() || undefined);
      toast.success(`"${newCourse.name}" added!`);
      setNewCourse({ name: "", code: "", credits: "3", instructor: "" });
      setShowAddCourse(false);
      await fetchData();
    } catch { toast.error("Failed to add course."); }
    finally { setSaving(false); }
  };

  const handleDeleteCourse = async (courseId: string, name: string) => {
    try {
      await deleteCourse(courseId);
      toast.success(`"${name}" removed.`);
      await fetchData();
    } catch { toast.error("Failed to remove course."); }
  };

  // day-panel: create new or update a specific class instance
  const handleLogClass = async (courseId: string, status: "attended" | "missed" | "od", instanceId?: string) => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      if (instanceId) {
        await updateClassInstanceStatus(instanceId, status);
      } else {
        const existing = allInstances.find(i => i.course_id === courseId && i.date === selectedDate);
        if (existing) {
          await updateClassInstanceStatus(existing.id, status);
        } else {
          await createClassInstance(courseId, selectedDate, status);
        }
      }
      await fetchData();
    } catch { toast.error("Failed to save attendance."); }
    finally { setSaving(false); }
  };

  // day-panel: add an additional attended instance for same course+date
  const handleAddExtraClass = async (courseId: string) => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await createClassInstance(courseId, selectedDate, "attended");
      await fetchData();
    } catch { toast.error("Failed to add extra class."); }
    finally { setSaving(false); }
  };

  // day-panel: remove a class instance
  const handleRemoveClass = async (instanceId: string) => {
    try {
      await deleteClassInstance(instanceId);
      await fetchData();
    } catch { toast.error("Failed to remove."); }
  };

  // day-panel: add assessment due on selectedDate
  const handleAddAssessmentOnDay = async () => {
    if (!selectedDate || !newAssessment.name.trim() || !newAssessment.courseId) return;
    setSaving(true);
    try {
      await createAssessment(newAssessment.courseId, newAssessment.name.trim(),
        newAssessment.type, selectedDate);
      toast.success("Assessment added!");
      setNewAssessment({ name: "", type: "assignment", courseId: "" });
      setShowAddAssessment(false);
      await fetchData();
    } catch { toast.error("Failed to add assessment."); }
    finally { setSaving(false); }
  };

  const handleMarkComplete = async (assessmentId: string) => {
    try {
      await updateAssessmentStatus(assessmentId, "completed");
      await fetchData();
    } catch { toast.error("Failed to update."); }
  };

  const handleRevertAssessment = async (assessmentId: string) => {
    try {
      await updateAssessmentStatus(assessmentId, "pending");
      await fetchData();
    } catch { toast.error("Failed to revert."); }
  };

  // ── helpers ───────────────────────────────────────────────────────────────

  const getAttendanceStatus = (pct: number) => {
    if (pct >= 85) return { label: "✓ On Track", color: "bg-green-500/15 text-green-600 dark:text-green-400" };
    if (pct >= 75) return { label: "⚠ At Risk",  color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" };
    return              { label: "🔴 Critical",   color: "bg-red-500/15 text-red-600 dark:text-red-400" };
  };

  const statusBtnClass = (active: boolean, variant: "attended" | "missed" | "od") => {
    if (!active) return "bg-muted hover:bg-muted/80 text-muted-foreground border border-border/40";
    return variant === "attended" ? "bg-green-500 text-white"
         : variant === "missed"   ? "bg-red-500 text-white"
                                  : "bg-blue-500 text-white";
  };

  // ── early returns (all hooks already called above) ────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (selectedCourseId) {
    return (
      <CourseDetail
        courseId={selectedCourseId}
        onBack={() => { setSelectedCourseId(null); fetchData(); }}
      />
    );
  }

  const attendanceStatus = getAttendanceStatus(stats?.averageAttendance || 0);
  const progressColor = stats && stats.averageAttendance >= 85
    ? "[&>div]:bg-green-500"
    : stats && stats.averageAttendance >= 75
    ? "[&>div]:bg-yellow-500"
    : "[&>div]:bg-red-500";

  const today = format(new Date(), "yyyy-MM-dd");

  // Data for selected date (day panel)
  const selectedInstances   = selectedDate ? allInstances.filter(i => i.date === selectedDate) : [];
  const selectedAssessments = selectedDate ? allAssessments.filter(a => a.due_date === selectedDate) : [];
  const coursesWithClass    = new Set(selectedInstances.map(i => i.course_id));
  const coursesWithoutClass = courses.filter(c => !coursesWithClass.has(c.id));

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">{semester.name}</h1>
          {semester.start_date && semester.end_date && (
            <p className="text-sm text-muted-foreground mt-1">
              {format(parseISO(semester.start_date), "MMM d")} –{" "}
              {format(parseISO(semester.end_date), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>

      {/* ── Attendance Overview ── */}
      {stats && (
        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-muted/20 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Semester Attendance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{stats.averageAttendance}%</span>
                <Badge variant="outline" className={attendanceStatus.color}>{attendanceStatus.label}</Badge>
              </div>
            </div>
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <Progress value={stats.averageAttendance} className={`h-3 ${progressColor}`} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Classes</p>
              <p className="text-xl font-bold">{stats.totalClasses}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground">Attended</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.totalAttended}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <p className="text-xs text-muted-foreground">Missed</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.totalMissed}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <p className="text-xs text-muted-foreground">On Duty</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.totalOd}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar + Right Panel ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Calendar (left 2/3) */}
        <div className="col-span-2 space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(calMonth, "MMMM yyyy")}
            </h2>
            <div className="flex gap-1">
              <button type="button" onClick={() => setCalMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setCalMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dateStr   = format(day, "yyyy-MM-dd");
                const inMonth   = isSameMonth(day, calMonth);
                const todayFlag = isToday(day);
                const isSelected = selectedDate === dateStr;

                const dayInst   = allInstances.filter(i => i.date === dateStr);
                const dayAsmts  = allAssessments.filter(a => a.due_date === dateStr);
                const allItems  = [
                  ...dayInst.map(i  => ({ kind: "class"      as const, data: i })),
                  ...dayAsmts.map(a => ({ kind: "assessment"  as const, data: a })),
                ];
                const visible   = allItems.slice(0, 2);
                const overflow  = allItems.length - visible.length;

                return (
                  <div
                    key={dateStr}
                    role="button"
                    tabIndex={inMonth ? 0 : -1}
                    onClick={() => inMonth && setSelectedDate(isSelected ? null : dateStr)}
                    onKeyDown={e => {
                      if (inMonth && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setSelectedDate(isSelected ? null : dateStr);
                      }
                    }}
                    className={[
                      "min-h-[90px] p-1.5 rounded-lg border flex flex-col gap-0.5 text-xs transition-colors",
                      inMonth ? "cursor-pointer" : "cursor-default",
                      inMonth && !isSelected && !todayFlag ? "border-border/40 bg-background hover:bg-muted/30" : "",
                      !inMonth ? "border-transparent bg-muted/10 opacity-40" : "",
                      todayFlag && !isSelected ? "ring-2 ring-primary border-primary/30 bg-background" : "",
                      isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "",
                    ].join(" ")}
                  >
                    {/* Date number */}
                    <div className={[
                      "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0",
                      todayFlag ? "bg-primary text-primary-foreground" : "text-foreground",
                    ].join(" ")}>
                      {format(day, "d")}
                    </div>

                    {/* Visible event pills */}
                    {visible.map((item, i) => {
                      if (item.kind === "class") {
                        const inst    = item.data as ClassInstance;
                        const course  = courses.find(c => c.id === inst.course_id);
                        const idx     = courseColorIdx[inst.course_id] ?? 0;
                        const label   = course ? (course.code || course.name.slice(0, 5)) : "?";
                        const icon    = inst.status === "attended" ? "✓"
                                      : inst.status === "missed"   ? "✗" : "OD";
                        return (
                          <div key={i}
                            className={`text-[9px] px-1 py-px rounded truncate leading-tight font-medium ${COURSE_PILL_COLORS[idx % COURSE_PILL_COLORS.length]}`}
                            title={`${course?.name}: ${inst.status}`}>
                            {icon} {label}
                          </div>
                        );
                      } else {
                        const asmt    = item.data as Assessment;
                        const course  = courses.find(c => c.id === asmt.course_id);
                        return (
                          <div key={i}
                            className={`text-[9px] px-1 py-px rounded truncate leading-tight font-medium ${ASSESSMENT_PILL[asmt.type]}`}
                            title={`${ASSESSMENT_ICON[asmt.type]} ${asmt.name} (${course?.code || course?.name})`}>
                            {ASSESSMENT_ICON[asmt.type]} {asmt.name.slice(0, 7)}
                          </div>
                        );
                      }
                    })}

                    {overflow > 0 && (
                      <span className="text-[9px] text-muted-foreground pl-0.5">+{overflow} more</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">Legend:</span>
            <span>✓ Attended</span><span>✗ Missed</span><span>OD On Duty</span>
            {Object.entries(ASSESSMENT_ICON).map(([type, icon]) => (
              <span key={type}>{icon} {type}</span>
            ))}
          </div>
        </div>

        {/* Right panel: day detail OR courses list */}
        <div className="space-y-4">
          {selectedDate ? (
            /* ── Day Detail Panel ── */
            <DayPanel
              dateStr={selectedDate}
              courses={courses}
              instances={selectedInstances}
              assessments={selectedAssessments}
              courseColorIdx={courseColorIdx}
              saving={saving}
              showAddAssessment={showAddAssessment}
              newAssessment={newAssessment}
              onClose={() => {
                setSelectedDate(null);
                setShowAddAssessment(false);
                setNewAssessment({ name: "", type: "assignment", courseId: "" });
              }}
              onLogClass={handleLogClass}
              onAddExtraClass={handleAddExtraClass}
              onRemoveClass={handleRemoveClass}
              onMarkComplete={handleMarkComplete}
              onRevertAssessment={handleRevertAssessment}
              onToggleAddAssessment={() => setShowAddAssessment(v => !v)}
              onNewAssessmentChange={setNewAssessment}
              onAddAssessment={handleAddAssessmentOnDay}
            />
          ) : (
            /* ── Courses Sidebar ── */
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Courses
                </h2>
                <Button size="sm" variant="outline" onClick={() => setShowAddCourse(v => !v)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {showAddCourse && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                  <Input placeholder="Course name" value={newCourse.name}
                    onChange={e => setNewCourse(v => ({ ...v, name: e.target.value }))} className="text-sm" />
                  <Input placeholder="Code (optional)" value={newCourse.code}
                    onChange={e => setNewCourse(v => ({ ...v, code: e.target.value }))} className="text-sm" />
                  <Input type="number" placeholder="Credits" value={newCourse.credits}
                    onChange={e => setNewCourse(v => ({ ...v, credits: e.target.value }))} className="text-sm" />
                  <Input placeholder="Instructor (optional)" value={newCourse.instructor}
                    onChange={e => setNewCourse(v => ({ ...v, instructor: e.target.value }))} className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCourse} disabled={saving || !newCourse.name.trim()}>
                      {saving ? "..." : "Add"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddCourse(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {courses.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No courses yet. Add your first one.
                  </p>
                ) : (
                  courses.map((course, idx) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      colorBar={COURSE_BAR_COLORS[idx % COURSE_BAR_COLORS.length]}
                      stats={courseStatsMap[course.id] ?? { attended: 0, missed: 0, od: 0, total: 0, percentage: 0 }}
                      onSelect={() => setSelectedCourseId(course.id)}
                      onDelete={() => handleDeleteCourse(course.id, course.name)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

function DayPanel({
  dateStr, courses, instances, assessments, courseColorIdx, saving,
  showAddAssessment, newAssessment,
  onClose, onLogClass, onAddExtraClass, onRemoveClass, onMarkComplete, onRevertAssessment,
  onToggleAddAssessment, onNewAssessmentChange, onAddAssessment,
}: {
  dateStr: string;
  courses: Course[];
  instances: ClassInstance[];
  assessments: Assessment[];
  courseColorIdx: Record<string, number>;
  saving: boolean;
  showAddAssessment: boolean;
  newAssessment: { name: string; type: Assessment["type"]; courseId: string };
  onClose: () => void;
  onLogClass: (courseId: string, status: "attended" | "missed" | "od", instanceId?: string) => void;
  onAddExtraClass: (courseId: string) => void;
  onRemoveClass: (instanceId: string) => void;
  onMarkComplete: (assessmentId: string) => void;
  onRevertAssessment: (assessmentId: string) => void;
  onToggleAddAssessment: () => void;
  onNewAssessmentChange: (v: { name: string; type: Assessment["type"]; courseId: string }) => void;
  onAddAssessment: () => void;
}) {
  const displayDate = format(parseISO(dateStr), "EEEE, MMM d, yyyy");

  // group instances by course so we can handle multiples per course per day
  const instancesByCourse = instances.reduce<Record<string, ClassInstance[]>>((acc, i) => {
    (acc[i.course_id] ??= []).push(i);
    return acc;
  }, {});

  const statusBtn = (currentStatus: string | undefined, targetStatus: "attended" | "missed" | "od") => {
    const isActive = currentStatus === targetStatus;
    const base = "px-2 py-1 rounded text-xs font-medium transition-all flex-shrink-0";
    const active = targetStatus === "attended" ? "bg-green-500 text-white"
                 : targetStatus === "missed"   ? "bg-red-500 text-white"
                                               : "bg-blue-500 text-white";
    const idle = "bg-muted hover:bg-muted/80 text-muted-foreground border border-border/40";
    return `${base} ${isActive ? active : idle}`;
  };

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Selected date</p>
          <p className="font-semibold text-sm">{displayDate}</p>
        </div>
        <button type="button" onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-5 max-h-[560px] overflow-y-auto">

        {/* ── Classes ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Classes
          </p>

          {courses.length === 0 && (
            <p className="text-xs text-muted-foreground">Add courses first to log attendance.</p>
          )}

          <div className="space-y-2">
            {courses.map(course => {
              const courseInsts  = instancesByCourse[course.id] || [];
              const primaryInst  = courseInsts[0];
              const extraInsts   = courseInsts.slice(1);
              const idx          = courseColorIdx[course.id] ?? 0;
              const pillCls      = COURSE_PILL_COLORS[idx % COURSE_PILL_COLORS.length];

              return (
                <div key={course.id} className="rounded-lg bg-background border border-border/40 overflow-hidden">
                  {/* Primary row */}
                  <div className="flex items-center gap-2 p-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${pillCls}`}>
                      {course.code || course.name.slice(0, 6)}
                    </span>
                    <span className="text-xs font-medium truncate flex-1 min-w-0">{course.name}</span>

                    <div className="flex gap-1 flex-shrink-0">
                      {(["attended", "missed", "od"] as const).map(s => (
                        <button key={s} type="button"
                          onClick={() => onLogClass(course.id, s, primaryInst?.id)}
                          disabled={saving}
                          className={statusBtn(primaryInst?.status, s)}
                          title={s}>
                          {s === "attended" ? "✓" : s === "missed" ? "✗" : "OD"}
                        </button>
                      ))}
                      {/* + to add an extra class for same course on same day */}
                      <button type="button"
                        onClick={() => onAddExtraClass(course.id)}
                        disabled={saving}
                        className="px-1.5 py-1 rounded text-xs font-medium transition-all bg-muted hover:bg-muted/80 text-muted-foreground border border-border/40"
                        title="Add extra class">
                        <Plus className="h-3 w-3" />
                      </button>
                      {primaryInst && (
                        <button type="button"
                          onClick={() => onRemoveClass(primaryInst.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Extra instances */}
                  {extraInsts.map((inst, i) => (
                    <div key={inst.id}
                      className="flex items-center gap-2 px-2 pb-1.5 pl-5 border-t border-border/20">
                      <span className="text-[9px] text-muted-foreground flex-shrink-0 w-10">
                        +extra {i + 2}
                      </span>
                      <div className="flex gap-1 flex-shrink-0 ml-auto">
                        {(["attended", "missed", "od"] as const).map(s => (
                          <button key={s} type="button"
                            onClick={() => onLogClass(course.id, s, inst.id)}
                            disabled={saving}
                            className={statusBtn(inst.status, s)}
                            title={s}>
                            {s === "attended" ? "✓" : s === "missed" ? "✗" : "OD"}
                          </button>
                        ))}
                        <button type="button"
                          onClick={() => onRemoveClass(inst.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove extra">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Assessments due this day ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Assessments Due
            </p>
            <button type="button" onClick={onToggleAddAssessment}
              className="text-xs text-primary hover:underline flex items-center gap-0.5">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          {assessments.length === 0 && !showAddAssessment && (
            <p className="text-xs text-muted-foreground">No assessments due on this date.</p>
          )}

          <div className="space-y-2">
            {assessments.map(a => {
              const course  = courses.find(c => c.id === a.course_id);
              const isOver  = a.due_date < format(new Date(), "yyyy-MM-dd") && a.status !== "completed";
              return (
                <div key={a.id}
                  className={`p-2.5 rounded-lg border text-xs ${
                    a.status === "completed" ? "border-green-500/20 bg-green-500/5"
                    : isOver ? "border-red-500/30 bg-red-500/10" : "border-border/40 bg-background"
                  }`}>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`px-1 py-px rounded font-medium text-[10px] ${ASSESSMENT_PILL[a.type]}`}>
                      {ASSESSMENT_ICON[a.type]} {a.type}
                    </span>
                    <span className={`font-medium ${a.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {a.name}
                    </span>
                    {isOver && <span className="text-red-600 dark:text-red-400 font-semibold">Overdue</span>}
                    {a.status === "completed" && (
                      <span className="text-green-600 dark:text-green-400 font-medium">✓ Done</span>
                    )}
                  </div>
                  {course && <p className="text-muted-foreground">{course.name}</p>}
                  {a.status === "completed" ? (
                    <button type="button"
                      onClick={() => onRevertAssessment(a.id)}
                      className="mt-1.5 px-2 py-0.5 bg-muted border border-border/40 text-muted-foreground rounded text-[10px] font-medium hover:bg-muted/80 transition-colors">
                      Revert to Pending
                    </button>
                  ) : (
                    <button type="button"
                      onClick={() => onMarkComplete(a.id)}
                      className="mt-1.5 px-2 py-0.5 bg-primary text-primary-foreground rounded text-[10px] font-medium hover:bg-primary/90 transition-colors">
                      Mark Complete
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add assessment form */}
          {showAddAssessment && (
            <div className="mt-2 p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
              <Input
                placeholder="Assessment name"
                value={newAssessment.name}
                onChange={e => onNewAssessmentChange({ ...newAssessment, name: e.target.value })}
                className="h-8 text-sm"
              />
              <select
                value={newAssessment.type}
                onChange={e => onNewAssessmentChange({ ...newAssessment, type: e.target.value as Assessment["type"] })}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="assignment">📝 Assignment</option>
                <option value="exam">📋 Exam</option>
                <option value="quiz">❓ Quiz</option>
                <option value="project">🎯 Project</option>
                <option value="presentation">🎤 Presentation</option>
                <option value="participation">👥 Participation</option>
                <option value="other">📌 Other</option>
              </select>
              <select
                value={newAssessment.courseId}
                onChange={e => onNewAssessmentChange({ ...newAssessment, courseId: e.target.value })}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select course…</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs"
                  onClick={onAddAssessment}
                  disabled={!newAssessment.name.trim() || !newAssessment.courseId || saving}>
                  {saving ? "..." : "Add"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={onToggleAddAssessment}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({
  course, colorBar, stats, onSelect, onDelete,
}: {
  course: Course;
  colorBar: string;
  stats: CourseStats;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const getStatusColor = (pct: number) =>
    pct >= 85 ? "bg-green-500/10 text-green-600 dark:text-green-400"
    : pct >= 75 ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
               : "bg-red-500/10 text-red-600 dark:text-red-400";

  return (
    <div
      role="button" tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className="w-full p-4 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-12 rounded flex-shrink-0 ${colorBar}`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{course.name}</h3>
          {course.code && <p className="text-xs text-muted-foreground">{course.code}</p>}
          {course.credits && <p className="text-xs text-muted-foreground">{course.credits} credits</p>}
          <div className="flex items-center gap-1.5 mt-2">
            <Badge variant="outline" className={`text-xs ${getStatusColor(stats.percentage)}`}>
              {stats.percentage}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {stats.attended}/{stats.total} attended
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          aria-label={`Remove ${course.name}`}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  );
}
