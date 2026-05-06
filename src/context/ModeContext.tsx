"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface ModeContextType {
  isDeepMode: boolean;
  toggleDeepMode: (password: string) => boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const storageKey = "lifeos-mode";

export const ModeProvider = ({ children }: { children: ReactNode }) => {
  const [isDeepMode, setIsDeepMode] = useState(false);
  
    const toggleDeepMode = (password: string) => {
      if (isDeepMode) {
        setIsDeepMode(false);
        return true;
      }
      const savedPin = typeof window !== "undefined" ? localStorage.getItem("deep_mode_pin") || "1234" : "1234";
      if (password === savedPin) {
        setIsDeepMode(true);
        return true;
      }
      return false;
    };
  
    return (
      <ModeContext.Provider value={{ isDeepMode, toggleDeepMode }}>
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
