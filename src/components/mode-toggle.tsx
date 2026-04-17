"use client";

import * as React from "react";
import { useMode } from "@/context/ModeContext";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { isDeepMode, toggleDeepMode } = useMode();

  return (
    <Button variant="outline" size="icon" onClick={() => toggleDeepMode("1234")}>
      {!isDeepMode ? "🌞" : "🌜"}
      <span className="sr-only">Toggle mode</span>
    </Button>
  );
}
