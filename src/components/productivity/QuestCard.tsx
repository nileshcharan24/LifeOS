import { Database } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { completeQuest } from "@/services/productivity/questService";

type Quest = Database["public"]["Tables"]["quests"]["Row"];

export function QuestCard({ quest }: { quest: Quest }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/40">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{quest.name}</h3>
        <Badge
          className={
            quest.frequency === "daily"
              ? "bg-green-500"
              : quest.frequency === "weekly"
              ? "bg-yellow-500"
              : "bg-purple-500"
          }
        >
          {quest.frequency}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{quest.description}</p>
      <Button
        onClick={async () => {
          await completeQuest(quest.id, quest.xp_reward, quest.name);
          window.dispatchEvent(new CustomEvent("xp_updated"));
        }}
        disabled={!quest.is_active}
      >
        {!quest.is_active ? "Completed" : "Complete Quest"}
      </Button>
    </div>
  );
}