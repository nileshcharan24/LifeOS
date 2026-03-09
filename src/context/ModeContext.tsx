"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';

type Mode = 'Normal' | 'Deep';

interface ModeContextType {
  mode: Mode;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<Mode>('Normal');

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'Normal' ? 'Deep' : 'Normal'));
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
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};
