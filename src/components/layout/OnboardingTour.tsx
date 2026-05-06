"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState("");

  useEffect(() => {
    // Check if the user has completed the onboarding tour
    const hasCompleted = localStorage.getItem("has_completed_onboarding");
    if (!hasCompleted) {
      setIsOpen(true);
    }
  }, []);

  const handleComplete = () => {
    if (pin.length < 4) {
      toast.error("Please enter a PIN of at least 4 characters.");
      return;
    }
    
    // Save PIN and mark onboarding as complete
    localStorage.setItem("deep_mode_pin", pin);
    localStorage.setItem("has_completed_onboarding", "true");
    setIsOpen(false);
    toast.success("Welcome to LifeOS! Your Deep Mode PIN is set.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Welcome to LifeOS! 🚀</DialogTitle>
              <DialogDescription>
                Your new gamified Second Brain and digital accountability partner.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-sm text-muted-foreground space-y-3">
              <p>Here is what you can do:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Complete **Quests** to earn XP and level up.</li>
                <li>Chat with the **AI Oracle** for personalized growth coaching.</li>
                <li>Write in your **Journal** to track your mood and thoughts.</li>
                <li>Activate **Deep Mode** for sensitive, encrypted tracking.</li>
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Set your Deep Mode PIN 🔒</DialogTitle>
              <DialogDescription>
                Deep Mode hides your sensitive data (like journals) from casual view. You need a PIN to unlock it.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                type="password"
                placeholder="Enter a 4+ digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleComplete}>Complete Setup</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
