import { Database } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { completeQuest } from "@/services/productivity/questService";

type Quest = Database["public"]["Tables"]["quests"]["Row"];

export function QuestCard({ quest }: { quest: Quest }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/40">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{quest.title}</h3>
        <Badge
          className={
            quest.difficulty === "Easy"
              ? "bg-green-500"
              : quest.difficulty === "Medium"
              ? "bg-yellow-500"
              : quest.difficulty === "Hard"
              ? "bg-red-500"
              : "bg-purple-500"
          }
        >
          {quest.difficulty}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{quest.description}</p>
      <Button
        onClick={async () => {
          await completeQuest(quest.id, quest.xp_reward);
        }}
        disabled={quest.status === "completed"}
      >
        {quest.status === "completed" ? "Completed" : "Complete Quest"}
      </Button>
    </div>
  );
}