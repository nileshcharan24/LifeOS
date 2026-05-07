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
  });
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function deleteSemester(semesterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("semesters").delete().eq("id", semesterId).eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export async function createSubject(
  name: string,
  targetPercentage: number = 75,
  semesterId?: string,
  credits: number = 3,
  description?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("academic_subjects").insert({
    profile_id: user.id,
    name,
    target_percentage: targetPercentage,
    semester_id: semesterId || null,
    credits,
    description: description || null,
  });
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function deleteSubject(subjectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("academic_subjects")
    .delete()
    .eq("id", subjectId)
    .eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function logAttendance(
  subjectId: string,
  date: string,
  status: "present" | "absent" | "late"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("profile_id", user.id)
    .eq("date", date)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase
      .from("attendance_records")
      .update({ status })
      .eq("id", existing[0].id);
  } else {
    await supabase.from("attendance_records").insert({
      subject_id: subjectId,
      profile_id: user.id,
      date,
      status,
    });
  }
  revalidatePath("/dashboard");
}

// ─── Assignments / Exams / Quizzes ────────────────────────────────────────────

export async function createAssignment(
  subjectId: string,
  title: string,
  type: "assignment" | "exam" | "quiz",
  dueDate: string,
  description?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("course_assignments").insert({
    subject_id: subjectId,
    profile_id: user.id,
    title,
    type,
    due_date: dueDate,
    description: description || null,
  });
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function toggleAssignment(assignmentId: string, isCompleted: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("course_assignments")
    .update({ is_completed: isCompleted })
    .eq("id", assignmentId)
    .eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteAssignment(assignmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("course_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("profile_id", user.id);
  revalidatePath("/dashboard");
}
