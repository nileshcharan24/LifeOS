"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Mode = "Normal" | "Deep"; // Normal = light, Deep = dark

interface ModeContextType {
  mode: Mode;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const storageKey = "lifeos-mode";

export const ModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<Mode>("Normal");

  // hydrate from localStorage
  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? window.localStorage.getItem(storageKey)
      : null) as Mode | null;
    if (stored === "Deep" || stored === "Normal") {
      setMode(stored);
      applyMode(stored);
    } else {
      applyMode("Normal");
    }
  }, []);

  const applyMode = (nextMode: Mode) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (nextMode === "Deep") {
      root.classList.add("dark");
      root.dataset.mode = "deep";
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.dataset.mode = "normal";
      root.style.colorScheme = "light";
    }
  };

  const toggleMode = () => {
    setMode((prevMode) => {
      const next = prevMode === "Normal" ? "Deep" : "Normal";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next);
      }
      applyMode(next);
      return next;
    });
  };

  return (
    <ModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
};
