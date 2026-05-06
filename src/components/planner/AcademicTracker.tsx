"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { createSubject, logAttendance, deleteSubject } from "@/services/planner/academicService";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { GraduationCap, Plus, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";

type Subject = {
  id: string;
  name: string;
  target_percentage: number | null;
};

type AttendanceRecord = {
  id: string;
  subject_id: string;
  date: string;
  status: "present" | "absent" | "late";
};

type SubjectStats = Subject & {
  total: number;
  present: number;
  late: number;
  absent: number;
  percentage: number;
  todayStatus: "present" | "absent" | "late" | null;
};

export function AcademicTracker() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", target: "75" });
  const [saving, setSaving] = useState(false);
  const [logging, setLogging] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: subData }, { data: recData }] = await Promise.all([
      supabase.from("academic_subjects").select("*").eq("profile_id", user.id).order("created_at"),
      supabase.from("attendance_records").select("*").eq("profile_id", user.id).order("date"),
    ]);

    if (subData) setSubjects(subData as Subject[]);
    if (recData) setRecords(recData as AttendanceRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const computeStats = (subject: Subject): SubjectStats => {
    const subRecords = records.filter((r) => r.subject_id === subject.id);
    const total = subRecords.length;
    const present = subRecords.filter((r) => r.status === "present").length;
    const late = subRecords.filter((r) => r.status === "late").length;
    const absent = subRecords.filter((r) => r.status === "absent").length;
    // present + late both count toward attendance
    const attended = present + late;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    const todayRecord = subRecords.find((r) => r.date === today);
    return {
      ...subject,
      total,
      present,
      late,
      absent,
      percentage,
      todayStatus: todayRecord?.status ?? null,
    };
  };

  const statsAll = subjects.map(computeStats);

  const handleAddSubject = async () => {
    if (!newSubject.name.trim()) return;
    const target = parseInt(newSubject.target) || 75;
    setSaving(true);
    try {
      await createSubject(newSubject.name.trim(), target);
      toast.success(`Subject "${newSubject.name}" added!`);
      setNewSubject({ name: "", target: "75" });
      setShowAddForm(false);
      await fetchData();
    } catch {
      toast.error("Failed to add subject.");
    } finally {
      setSaving(false);
    }
  };

  const handleLog = async (subjectId: string, status: "present" | "absent" | "late") => {
    setLogging(subjectId + status);
    try {
      await logAttendance(subjectId, today, status);
      toast.success(`Logged as ${status} for today.`);
      await fetchData();
    } catch {
      toast.error("Failed to log attendance.");
    } finally {
      setLogging(null);
    }
  };

  const handleDelete = async (subjectId: string, name: string) => {
    await deleteSubject(subjectId);
    toast.success(`Removed "${name}"`);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border/40 bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Academic Tracker</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAddForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Subject
        </Button>
      </div>

      {/* Add subject form */}
      {showAddForm && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <p className="text-sm font-semibold">New Subject</p>
          <div className="flex gap-2">
            <Input
              placeholder="Subject name"
              value={newSubject.name}
              onChange={(e) => setNewSubject((v) => ({ ...v, name: e.target.value }))}
              className="flex-1"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Input
                type="number"
                min={0}
                max={100}
                value={newSubject.target}
                onChange={(e) => setNewSubject((v) => ({ ...v, target: e.target.value }))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">% target</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddSubject} disabled={saving || !newSubject.name.trim()}>
              {saving ? "Saving..." : "Add"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Subject cards */}
      <div className="space-y-3">
        {statsAll.map((stat) => {
          const target = stat.target_percentage ?? 75;
          const isAboveTarget = stat.percentage >= target;
          const isNearTarget = stat.percentage >= target - 5 && !isAboveTarget;
          const progressColor = isAboveTarget
            ? "[&>div]:bg-green-500"
            : isNearTarget
            ? "[&>div]:bg-yellow-500"
            : "[&>div]:bg-red-500";

          return (
            <div
              key={stat.id}
              className="p-4 rounded-xl border border-border/40 bg-muted/40"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{stat.name}</h3>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        isAboveTarget
                          ? "bg-green-500/10 text-green-500 border-green-500/30"
                          : isNearTarget
                          ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                          : "bg-red-500/10 text-red-500 border-red-500/30"
                      }`}
                    >
                      {stat.percentage}%
                    </Badge>
                    {stat.todayStatus && (
                      <Badge variant="outline" className="text-xs capitalize">
                        Today: {stat.todayStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stat.present}P · {stat.late}L · {stat.absent}A · {stat.total} classes
                    {" "}· Target: {target}%
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(stat.id, stat.name)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Progress bar */}
              <Progress value={stat.percentage} className={`h-2 mb-3 ${progressColor}`} />

              {/* Today's attendance buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Today:</span>
                {(["present", "absent", "late"] as const).map((status) => {
                  const isActive = stat.todayStatus === status;
                  const isLoading = logging === stat.id + status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleLog(stat.id, status)}
                      disabled={!!logging}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                        isActive
                          ? status === "present"
                            ? "bg-green-500 text-white border-green-500"
                            : status === "absent"
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-yellow-500 text-white border-yellow-500"
                          : "bg-background border-border/40 hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      {status === "present" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : status === "absent" ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {isLoading ? "..." : status}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {statsAll.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No subjects yet. Add your first course above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
