"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getCoursesBySemester,
  getSemesterStats,
  createCourse,
  deleteCourse,
  getAttendanceStats,
} from "@/services/academic/academicService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, BookOpen, Calendar,
  BarChart3, AlertCircle, CheckCircle2, Clock, ArrowLeft,
} from "lucide-react";
import { CourseDetail } from "./CourseDetail";

type Semester = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type Course = {
  id: string;
  semester_id: string;
  profile_id: string;
  name: string;
  code: string | null;
  credits: number | null;
  instructor_name: string | null;
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

const COURSE_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500",
  "bg-pink-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500",
];

export function SemesterView({ semesterId, semester, onBack }: { semesterId: string; semester: Semester; onBack: () => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<SemesterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date());
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ name: "", code: "", credits: "3", instructor: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const coursesData = await getCoursesBySemester(semesterId);
    setCourses(coursesData as Course[]);

    const statsData = await getSemesterStats(semesterId);
    setStats(statsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [semesterId]);

  const handleAddCourse = async () => {
    if (!newCourse.name.trim()) return;
    setSaving(true);
    try {
      await createCourse(
        semesterId,
        newCourse.name.trim(),
        newCourse.code.trim() || undefined,
        parseInt(newCourse.credits) || 3,
        newCourse.instructor.trim() || undefined
      );
      toast.success(`"${newCourse.name}" added!`);
      setNewCourse({ name: "", code: "", credits: "3", instructor: "" });
      setShowAddCourse(false);
      await fetchData();
    } catch {
      toast.error("Failed to add course.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    try {
      await deleteCourse(courseId);
      toast.success(`"${courseName}" removed.`);
      await fetchData();
    } catch {
      toast.error("Failed to remove course.");
    }
  };

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 85) return { label: "✓ On Track", color: "bg-green-500/15 text-green-600 dark:text-green-400" };
    if (percentage >= 75) return { label: "⚠ At Risk", color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" };
    return { label: "🔴 Critical", color: "bg-red-500/15 text-red-600 dark:text-red-400" };
  };

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
        onBack={() => {
          setSelectedCourseId(null);
          fetchData();
        }}
      />
    );
  }

  const attendanceStatus = getAttendanceStatus(stats?.averageAttendance || 0);
  const progressColor = stats && stats.averageAttendance >= 85
    ? "[&>div]:bg-green-500"
    : stats && stats.averageAttendance >= 75
    ? "[&>div]:bg-yellow-500"
    : "[&>div]:bg-red-500";

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">{semester.name}</h1>
          {semester.start_date && semester.end_date && (
            <p className="text-sm text-muted-foreground mt-1">
              {format(parseISO(semester.start_date), "MMM d")} – {format(parseISO(semester.end_date), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>

      {/* Attendance Overview Card */}
      {stats && (
        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-muted/20 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Semester Attendance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{stats.averageAttendance}%</span>
                <Badge variant="outline" className={attendanceStatus.color}>
                  {attendanceStatus.label}
                </Badge>
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

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(calMonth, "MMMM yyyy")}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setCalMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCalMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayClasses = courses.flatMap(c => [c.id]).length; // Placeholder
                const inMonth = isSameMonth(day, calMonth);
                const todayFlag = isToday(day);

                return (
                  <div
                    key={dateStr}
                    className={`min-h-[80px] p-2 rounded-lg border text-xs transition-colors ${
                      inMonth ? "border-border/40 bg-background" : "border-transparent bg-muted/10"
                    } ${todayFlag ? "ring-2 ring-primary border-primary/30" : ""}`}
                  >
                    <div className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold mb-1 ${
                      todayFlag ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/25"
                    }`}>
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Courses Sidebar */}
        <div className="space-y-4">
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
              <Input
                placeholder="Course name"
                value={newCourse.name}
                onChange={e => setNewCourse(v => ({ ...v, name: e.target.value }))}
                className="text-sm"
              />
              <Input
                placeholder="Code (optional)"
                value={newCourse.code}
                onChange={e => setNewCourse(v => ({ ...v, code: e.target.value }))}
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Credits"
                value={newCourse.credits}
                onChange={e => setNewCourse(v => ({ ...v, credits: e.target.value }))}
                className="text-sm"
              />
              <Input
                placeholder="Instructor (optional)"
                value={newCourse.instructor}
                onChange={e => setNewCourse(v => ({ ...v, instructor: e.target.value }))}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCourse} disabled={saving || !newCourse.name.trim()}>
                  {saving ? "..." : "Add"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddCourse(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {courses.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                No courses yet. Add your first one.
              </div>
            ) : (
              courses.map((course, idx) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  color={COURSE_COLORS[idx % COURSE_COLORS.length]}
                  onSelect={() => setSelectedCourseId(course.id)}
                  onDelete={() => handleDeleteCourse(course.id, course.name)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseCard({
  course,
  color,
  onSelect,
  onDelete,
}: {
  course: Course;
  color: string;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Fetch stats
    const fetchStats = async () => {
      const supabase = createClient();
      const { data: instances } = await supabase
        .from("class_instances")
        .select("*")
        .eq("course_id", course.id);

      if (instances) {
        const attended = instances.filter(i => i.status === "attended").length;
        const missed = instances.filter(i => i.status === "missed").length;
        const percentage = (attended + missed) > 0 ? Math.round((attended / (attended + missed)) * 100) : 0;
        setStats({ attended, missed, total: instances.length, percentage });
      }
    };
    fetchStats();
  }, [course.id]);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 85) return "bg-green-500/10 text-green-600 dark:text-green-400";
    if (percentage >= 75) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  };

  return (
    <button
      onClick={onSelect}
      className="w-full p-4 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-12 rounded flex-shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{course.name}</h3>
          {course.code && <p className="text-xs text-muted-foreground">{course.code}</p>}
          {course.credits && <p className="text-xs text-muted-foreground">{course.credits} credits</p>}
          {stats && (
            <div className="flex items-center gap-1.5 mt-2">
              <Badge variant="outline" className={`text-xs ${getStatusColor(stats.percentage)}`}>
                {stats.percentage}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                {stats.attended}/{stats.total} attended
              </span>
            </div>
          )}
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </button>
  );
}
