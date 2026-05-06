"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSubject(name: string, targetPercentage: number = 75) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("academic_subjects").insert({
    profile_id: user.id,
    name,
    target_percentage: targetPercentage,
  });

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function logAttendance(
  subjectId: string,
  date: string,
  status: "present" | "absent" | "late"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Upsert: one record per subject per day
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
