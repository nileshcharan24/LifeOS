"use client";

import { useState } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { useMode } from "@/context/ModeContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ModeToggle() {
  const { isDeepMode, toggleDeepMode } = useMode();
  const [password, setPassword] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (!isDeepMode) {
      setIsOpen(true);
    } else {
      // Emergency exit, no password needed
      toggleDeepMode(""); 
    }
  };

  const handlePasswordSubmit = () => {
    if (toggleDeepMode(password)) {
      setIsOpen(false);
      setPassword("");
    } else {
      alert("Incorrect PIN");
    }
  };

  return (
    <>
      <Button variant="outline" size="icon" onClick={handleToggle}>
        {isDeepMode ? <ShieldOff className="h-[1.2rem] w-[1.2rem]" /> : <Shield className="h-[1.2rem] w-[1.2rem]" />}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Deep Mode</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              type="password"
              placeholder="Enter PIN"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            <Button onClick={handlePasswordSubmit}>Unlock</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
