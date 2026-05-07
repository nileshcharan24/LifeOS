"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SemesterHub } from "./SemesterHub";
import { SemesterView } from "./SemesterView";

type Semester = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export function AcademicTracker() {
  const [view, setView] = useState<"hub" | "semester">("hub");
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);

  const handleSelectSemester = async (semesterId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("semesters")
      .select("*")
      .eq("id", semesterId)
      .limit(1);
    if (data?.[0]) {
      setSelectedSemester(data[0] as Semester);
      setView("semester");
    }
  };

  const handleBack = () => {
    setView("hub");
    setSelectedSemester(null);
  };

  return (
    <div>
      {view === "hub" ? (
        <SemesterHub onSelectSemester={handleSelectSemester} />
      ) : selectedSemester ? (
        <SemesterView semesterId={selectedSemester.id} semester={selectedSemester} onBack={handleBack} />
      ) : null}
    </div>
  );
}
