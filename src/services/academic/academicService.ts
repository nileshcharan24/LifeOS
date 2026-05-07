"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Semesters ────────────────────────────────────────────────────────────────

export async function createSemester(name: string, startDate?: string, endDate?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("semesters").insert({
    profile_id: user.id,
    name,
    start_date: startDate || null,
    end_date: endDate || null,
    status: "active",
  });
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function getSemesters() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("semesters")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function updateSemesterStatus(semesterId: string, status: "active" | "archived") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("semesters")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", semesterId)
    .eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteSemester(semesterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("semesters").delete().eq("id", semesterId).eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function createCourse(
  semesterId: string,
  name: string,
  code?: string,
  credits?: number,
  instructorName?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("courses").insert({
    semester_id: semesterId,
    profile_id: user.id,
    name,
    code: code || null,
    credits: credits || 3,
    instructor_name: instructorName || null,
  });
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function getCoursesBySemester(semesterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("semester_id", semesterId)
    .eq("profile_id", user.id)
    .order("created_at");
  return data || [];
}

export async function updateCourse(
  courseId: string,
  name: string,
  code?: string,
  credits?: number,
  instructorName?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("courses")
    .update({
      name,
      code: code || null,
      credits: credits || 3,
      instructor_name: instructorName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId)
    .eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("courses").delete().eq("id", courseId).eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

// ─── Class Instances ──────────────────────────────────────────────────────────

export async function createClassInstance(
  courseId: string,
  date: string,
  status: "attended" | "missed" | "od" = "attended"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("class_instances").insert({
    course_id: courseId,
    profile_id: user.id,
    date,
    status,
  });
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function getClassInstancesByCourse(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("class_instances")
    .select("*")
    .eq("course_id", courseId)
    .eq("profile_id", user.id)
    .order("date", { ascending: false });
  return data || [];
}

export async function getClassInstancesByDate(courseId: string, date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("class_instances")
    .select("*")
    .eq("course_id", courseId)
    .eq("profile_id", user.id)
    .eq("date", date)
    .limit(1);
  return data?.[0] || null;
}

export async function updateClassInstanceStatus(
  instanceId: string,
  status: "attended" | "missed" | "od"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("class_instances")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", instanceId)
    .eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteClassInstance(instanceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("class_instances").delete().eq("id", instanceId).eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export async function createAssessment(
  courseId: string,
  name: string,
  type: "assignment" | "exam" | "quiz" | "project" | "presentation" | "participation" | "other",
  dueDate: string,
  tags?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("assessments").insert({
    course_id: courseId,
    profile_id: user.id,
    name,
    type,
    due_date: dueDate,
    status: "pending",
    tags: tags || null,
  });
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function getAssessmentsByCourse(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("course_id", courseId)
    .eq("profile_id", user.id)
    .order("due_date");
  return data || [];
}

export async function getAssessmentsBySemester(semesterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("assessments")
    .select("a:*, c:course_id(*)")
    .eq("a.profile_id", user.id);

  // Filter by semester (join through courses)
  return data?.filter((a: any) => a.c?.semester_id === semesterId) || [];
}

export async function updateAssessmentStatus(
  assessmentId: string,
  status: "pending" | "submitted" | "completed"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const completedDate = status === "completed" ? new Date().toISOString().split("T")[0] : null;

  await supabase
    .from("assessments")
    .update({
      status,
      completed_date: completedDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assessmentId)
    .eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteAssessment(assessmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("assessments").delete().eq("id", assessmentId).eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAttendanceStats(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: instances } = await supabase
    .from("class_instances")
    .select("*")
    .eq("course_id", courseId)
    .eq("profile_id", user.id);

  if (!instances || instances.length === 0) {
    return { total: 0, attended: 0, missed: 0, od: 0, percentage: 0 };
  }

  const attended = instances.filter(i => i.status === "attended").length;
  const missed = instances.filter(i => i.status === "missed").length;
  const od = instances.filter(i => i.status === "od").length;
  const total = instances.length;
  const percentage = Math.round((attended / (attended + missed)) * 100) || 0;

  return { total, attended, missed, od, percentage };
}

export async function getSemesterStats(semesterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: courses } = await supabase
    .from("courses")
    .select("id")
    .eq("semester_id", semesterId)
    .eq("profile_id", user.id);

  if (!courses || courses.length === 0) {
    return {
      totalCourses: 0,
      totalClasses: 0,
      totalAttended: 0,
      totalMissed: 0,
      totalOd: 0,
      averageAttendance: 0,
      totalAssessments: 0,
      completedAssessments: 0,
      pendingAssessments: 0,
      overdueAssessments: 0,
    };
  }

  const courseIds = courses.map(c => c.id);

  const { data: instances } = await supabase
    .from("class_instances")
    .select("*")
    .in("course_id", courseIds);

  const { data: assessments } = await supabase
    .from("assessments")
    .select("*")
    .in("course_id", courseIds);

  const attended = instances?.filter(i => i.status === "attended").length || 0;
  const missed = instances?.filter(i => i.status === "missed").length || 0;
  const od = instances?.filter(i => i.status === "od").length || 0;
  const total = instances?.length || 0;
  const averageAttendance = Math.round((attended / (attended + missed)) * 100) || 0;

  const today = new Date().toISOString().split("T")[0];
  const completed = assessments?.filter(a => a.status === "completed").length || 0;
  const pending = assessments?.filter(a => a.status === "pending").length || 0;
  const overdue = assessments?.filter(a => a.status !== "completed" && a.due_date < today).length || 0;

  return {
    totalCourses: courses.length,
    totalClasses: total,
    totalAttended: attended,
    totalMissed: missed,
    totalOd: od,
    averageAttendance,
    totalAssessments: assessments?.length || 0,
    completedAssessments: completed,
    pendingAssessments: pending,
    overdueAssessments: overdue,
  };
}
