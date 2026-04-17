"use client";

import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { useRealtimeXP } from "@/hooks/useRealtimeXP";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function XPDisplay() {
  const { totalXp, level } = useRealtimeXP();
  const [isLevelUp, setIsLevelUp] = useState(false);

  useEffect(() => {
    if (level > 1) {
      setIsLevelUp(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [level]);

  const xpForCurrentLevel = 100 * Math.pow(level - 1, 2);
  const xpForNextLevel = 100 * Math.pow(level, 2);
  const progress = ((totalXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  return (
    <>
      <div className="p-4 rounded-lg border border-border/40 bg-muted/40">
        <div className="flex items-center justify-between mb-2">
          <motion.div
            animate={{ scale: isLevelUp ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5 }}
          >
            <Badge>Level {level}</Badge>
          </motion.div>
          <p className="text-sm text-muted-foreground">{totalXp} XP</p>
        </div>
        <Progress value={progress} className="transition-all duration-500" />
      </div>
      <Dialog open={isLevelUp} onOpenChange={setIsLevelUp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>LEVEL UP: SYSTEM EVOLVED</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}