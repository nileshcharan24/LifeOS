"use client";

import * as React from "react";
import { useMode } from "@/context/ModeContext";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { mode, toggleMode } = useMode();

  return (
    <Button variant="outline" size="icon" onClick={toggleMode}>
      {mode === "Normal" ? "🌞" : "🌜"}
      <span className="sr-only">Toggle mode</span>
    </Button>
  );
}
