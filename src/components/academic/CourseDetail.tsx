"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getClassInstancesByCourse,
  getAssessmentsByCourse,
  createClassInstance,
  updateClassInstanceStatus,
  deleteClassInstance,
  createAssessment,
  updateAssessmentStatus,
  deleteAssessment,
  getAttendanceStats,
} from "@/services/academic/academicService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, parseISO, isBefore } from "date-fns";
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, Clock, AlertCircle,
  Calendar, BookOpen, BarChart3, ChevronDown, ChevronUp,
} from "lucide-react";

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

type ClassInstance = {
  id: string;
  course_id: string;
  profile_id: string;
  date: string;
  status: "attended" | "missed" | "od";
  created_at: string | null;
  updated_at: string | null;
};

type Assessment = {
  id: string;
  course_id: string;
  profile_id: string;
  name: string;
  type: "assignment" | "exam" | "quiz" | "project" | "presentation" | "participation" | "other";
  due_date: string;
  status: "pending" | "submitted" | "completed";
  completed_date: string | null;
  tags: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AttendanceStats = {
  total: number;
  attended: number;
  missed: number;
  od: number;
  percentage: number;
};

const ASSESSMENT_ICONS: Record<string, string> = {
  exam: "📋",
  quiz: "❓",
  assignment: "📝",
  project: "🎯",
  presentation: "🎤",
  participation: "👥",
  other: "📌",
};

const ASSESSMENT_COLORS: Record<string, string> = {
  exam: "bg-red-500/15 text-red-600 dark:text-red-400",
  quiz: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  assignment: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  project: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  presentation: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  participation: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  other: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

export function CourseDetail({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [instances, setInstances] = useState<ClassInstance[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["classes"]));
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [newClass, setNewClass] = useState({ date: "" });
  const [newAssessment, setNewAssessment] = useState({
    name: "",
    type: "assignment" as const,
    dueDate: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: courseData } = await supabase.from("courses").select("*").eq("id", courseId).limit(1);
    if (courseData?.[0]) setCourse(courseData[0] as Course);

    const classesData = await getClassInstancesByCourse(courseId);
    setInstances((classesData as ClassInstance[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    const assessmentsData = await getAssessmentsByCourse(courseId);
    setAssessments((assessmentsData as Assessment[]).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));

    const statsData = await getAttendanceStats(courseId);
    setStats(statsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const handleAddClass = async () => {
    if (!newClass.date) return;
    setSaving(true);
    try {
      await createClassInstance(courseId, newClass.date, "attended");
      toast.success("Class added!");
      setNewClass({ date: "" });
      setShowAddClass(false);
      await fetchData();
    } catch {
      toast.error("Failed to add class.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateClassStatus = async (instanceId: string, status: "attended" | "missed" | "od") => {
    try {
      await updateClassInstanceStatus(instanceId, status);
      await fetchData();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteClass = async (instanceId: string) => {
    try {
      await deleteClassInstance(instanceId);
      toast.success("Class removed.");
      await fetchData();
    } catch {
      toast.error("Failed to remove class.");
    }
  };

  const handleAddAssessment = async () => {
    if (!newAssessment.name.trim() || !newAssessment.dueDate) return;
    setSaving(true);
    try {
      await createAssessment(
        courseId,
        newAssessment.name.trim(),
        newAssessment.type,
        newAssessment.dueDate
      );
      toast.success("Assessment added!");
      setNewAssessment({ name: "", type: "assignment", dueDate: "" });
      setShowAddAssessment(false);
      await fetchData();
    } catch {
      toast.error("Failed to add assessment.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAssessmentComplete = async (assessmentId: string) => {
    try {
      await updateAssessmentStatus(assessmentId, "completed");
      toast.success("Assessment marked complete!");
      await fetchData();
    } catch {
      toast.error("Failed to update assessment.");
    }
  };

  const handleRevertAssessment = async (assessmentId: string) => {
    try {
      await updateAssessmentStatus(assessmentId, "pending");
      toast.success("Reverted to pending.");
      await fetchData();
    } catch {
      toast.error("Failed to revert assessment.");
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      await deleteAssessment(assessmentId);
      toast.success("Assessment removed.");
      await fetchData();
    } catch {
      toast.error("Failed to remove assessment.");
    }
  };

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  if (loading || !course) {
    return <div className="h-48 bg-muted/40 rounded-xl animate-pulse" />;
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const overdueAssessments = assessments.filter(
    a => a.status !== "completed" && isBefore(parseISO(a.due_date), parseISO(today))
  );
  const progressColor = stats && stats.percentage >= 85
    ? "[&>div]:bg-green-500"
    : stats && stats.percentage >= 75
    ? "[&>div]:bg-yellow-500"
    : "[&>div]:bg-red-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{course.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {course.code && <Badge variant="outline">{course.code}</Badge>}
            {course.credits && <Badge variant="outline">{course.credits} credits</Badge>}
            {course.instructor_name && (
              <p className="text-sm text-muted-foreground">Prof. {course.instructor_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Stats */}
      {stats && (
        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-muted/20 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Course Attendance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{stats.percentage}%</span>
                <Badge
                  variant="outline"
                  className={
                    stats.percentage >= 85
                      ? "bg-green-500/15 text-green-600 dark:text-green-400"
                      : stats.percentage >= 75
                      ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                      : "bg-red-500/15 text-red-600 dark:text-red-400"
                  }
                >
                  {stats.percentage >= 85 ? "✓ On Track" : stats.percentage >= 75 ? "⚠ At Risk" : "🔴 Critical"}
                </Badge>
              </div>
            </div>
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>

          <Progress value={stats.percentage} className={`h-3 ${progressColor}`} />

          <div className="grid grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground">Attended</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.attended}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <p className="text-xs text-muted-foreground">Missed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.missed}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <p className="text-xs text-muted-foreground">On Duty</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.od}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Warning */}
      {overdueAssessments.length > 0 && (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-600 dark:text-red-400">
              {overdueAssessments.length} overdue {overdueAssessments.length === 1 ? "assessment" : "assessments"}
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">
              {overdueAssessments.map(a => a.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Classes Section */}
      <div className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
        <button
          onClick={() => toggleSection("classes")}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Class Instances ({instances.length})</h2>
          </div>
          {expandedSections.has("classes") ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        {expandedSections.has("classes") && (
          <div className="p-4 space-y-3 border-t border-border/20">
            {showAddClass ? (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                <Input
                  type="date"
                  value={newClass.date}
                  onChange={e => setNewClass(v => ({ ...v, date: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddClass} disabled={saving || !newClass.date}>
                    {saving ? "..." : "Add Class"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddClass(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowAddClass(true)} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Class Instance
              </Button>
            )}

            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No classes tracked yet.</p>
            ) : (
              <div className="space-y-2">
                {instances.map(instance => (
                  <div key={instance.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-background">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{format(parseISO(instance.date), "MMM d, yyyy (EEEE)")}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(["attended", "missed", "od"] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => handleUpdateClassStatus(instance.id, status)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            instance.status === status
                              ? status === "attended"
                                ? "bg-green-500 text-white"
                                : status === "missed"
                                ? "bg-red-500 text-white"
                                : "bg-blue-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {status === "attended" ? "✓" : status === "missed" ? "✗" : "OD"}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleDeleteClass(instance.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assessments Section */}
      <div className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
        <button
          onClick={() => toggleSection("assessments")}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Assessments ({assessments.length})</h2>
          </div>
          {expandedSections.has("assessments") ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        {expandedSections.has("assessments") && (
          <div className="p-4 space-y-3 border-t border-border/20">
            {showAddAssessment ? (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                <Input
                  placeholder="Assessment name"
                  value={newAssessment.name}
                  onChange={e => setNewAssessment(v => ({ ...v, name: e.target.value }))}
                />
                <select
                  value={newAssessment.type}
                  onChange={e => setNewAssessment(v => ({ ...v, type: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="assignment">📝 Assignment</option>
                  <option value="exam">📋 Exam</option>
                  <option value="quiz">❓ Quiz</option>
                  <option value="project">🎯 Project</option>
                  <option value="presentation">🎤 Presentation</option>
                  <option value="participation">👥 Participation</option>
                  <option value="other">📌 Other</option>
                </select>
                <Input
                  type="date"
                  value={newAssessment.dueDate}
                  onChange={e => setNewAssessment(v => ({ ...v, dueDate: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddAssessment} disabled={saving || !newAssessment.name.trim()}>
                    {saving ? "..." : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddAssessment(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowAddAssessment(true)} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Assessment
              </Button>
            )}

            {assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No assessments added yet.</p>
            ) : (
              <div className="space-y-2">
                {assessments.map(assessment => {
                  const isOverdue = !isBefore(parseISO(today), parseISO(assessment.due_date)) && assessment.status !== "completed";
                  return (
                    <div
                      key={assessment.id}
                      className={`p-4 rounded-lg border ${
                        assessment.status === "completed"
                          ? "border-green-500/20 bg-green-500/5"
                          : isOverdue
                          ? "border-red-500/30 bg-red-500/10"
                          : "border-border/40 bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={`text-xs ${ASSESSMENT_COLORS[assessment.type]}`}>
                              {ASSESSMENT_ICONS[assessment.type]} {assessment.type}
                            </Badge>
                            <span className={`text-sm font-medium ${assessment.status === "completed" ? "line-through" : ""}`}>
                              {assessment.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Calendar className="h-3.5 w-3.5" />
                            Due {format(parseISO(assessment.due_date), "MMM d, yyyy")}
                            {isOverdue && (
                              <span className="text-red-600 dark:text-red-400 font-medium">🔴 Overdue</span>
                            )}
                            {assessment.status === "completed" && (
                              <span className="text-green-600 dark:text-green-400 font-medium">✓ Completed</span>
                            )}
                          </div>
                        </div>

                        {assessment.status === "completed" ? (
                          <button
                            onClick={() => handleRevertAssessment(assessment.id)}
                            className="ml-2 px-3 py-1.5 text-xs font-medium rounded-md bg-muted border border-border/40 text-muted-foreground hover:bg-muted/80 transition-colors flex-shrink-0"
                          >
                            Revert
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkAssessmentComplete(assessment.id)}
                            className="ml-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleDeleteAssessment(assessment.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
