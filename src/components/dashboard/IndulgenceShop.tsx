"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { spendXP } from "@/services/habitService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingBag, Plus, Coins, Lock } from "lucide-react";
import { useRealtimeXP } from "@/hooks/useRealtimeXP";

type Indulgence = {
  id: string;
  name: string;
  xp_cost: number;
  category: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  entertainment: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  social: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  leisure: "bg-green-500/10 text-green-500 border-green-500/30",
  default: "bg-muted text-muted-foreground border-border/40",
};

function categoryColor(cat: string | null) {
  if (!cat) return CATEGORY_COLORS.default;
  return CATEGORY_COLORS[cat.toLowerCase()] ?? CATEGORY_COLORS.default;
}

export function IndulgenceShop() {
  const { totalXp } = useRealtimeXP();
  const [indulgences, setIndulgences] = useState<Indulgence[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", xp_cost: "", category: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("indulgences")
      .select("*")
      .eq("user_id", user.id)
      .order("xp_cost", { ascending: true });

    if (data) setIndulgences(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener("xp_updated", fetchData);
    return () => window.removeEventListener("xp_updated", fetchData);
  }, [fetchData]);

  const handleBuy = async (item: Indulgence) => {
    if (!userId) return;
    if (totalXp < item.xp_cost) {
      toast.error(`Not enough XP. You need ${item.xp_cost - totalXp} more XP.`);
      return;
    }
    setBuying(item.id);
    try {
      const result = await spendXP(userId, item.xp_cost, item.name);
      if (result.success) {
        toast.success(`Redeemed: ${item.name}! (−${item.xp_cost} XP)`);
        window.dispatchEvent(new CustomEvent("xp_updated"));
      } else {
        toast.error(result.error ?? "Purchase failed.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setBuying(null);
    }
  };

  const handleAddItem = async () => {
    if (!userId || !newItem.name.trim() || !newItem.xp_cost) return;
    const cost = parseInt(newItem.xp_cost);
    if (isNaN(cost) || cost <= 0) {
      toast.error("XP cost must be a positive number.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("indulgences").insert({
        user_id: userId,
        name: newItem.name.trim(),
        xp_cost: cost,
        category: newItem.category.trim() || null,
      });
      if (error) throw error;
      toast.success(`"${newItem.name}" added to shop!`);
      setNewItem({ name: "", xp_cost: "", category: "" });
      setShowAddForm(false);
      await fetchData();
    } catch {
      toast.error("Failed to add item.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/40 rounded animate-pulse w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border/40 bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Indulgence Shop</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500">{totalXp} XP</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm((v) => !v)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Add item form */}
      {showAddForm && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <p className="text-sm font-semibold">New Indulgence</p>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Item name"
              value={newItem.name}
              onChange={(e) => setNewItem((v) => ({ ...v, name: e.target.value }))}
              className="col-span-1"
            />
            <Input
              type="number"
              placeholder="XP cost"
              value={newItem.xp_cost}
              onChange={(e) => setNewItem((v) => ({ ...v, xp_cost: e.target.value }))}
            />
            <Input
              placeholder="Category (optional)"
              value={newItem.category}
              onChange={(e) => setNewItem((v) => ({ ...v, category: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddItem} disabled={saving || !newItem.name.trim() || !newItem.xp_cost}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indulgences.map((item) => {
          const canAfford = totalXp >= item.xp_cost;
          const isBuying = buying === item.id;
          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                canAfford
                  ? "border-border/40 bg-muted/40"
                  : "border-border/20 bg-muted/20 opacity-60"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                  {!canAfford && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                </div>
                {item.category && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${categoryColor(item.category)}`}
                  >
                    {item.category}
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                disabled={!canAfford || isBuying}
                variant={canAfford ? "default" : "secondary"}
                onClick={() => handleBuy(item)}
                className="flex-shrink-0"
              >
                {isBuying ? "..." : (
                  <span className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" />
                    {item.xp_cost}
                  </span>
                )}
              </Button>
            </div>
          );
        })}
        {indulgences.length === 0 && !showAddForm && (
          <div className="col-span-full rounded-xl border border-dashed border-border/40 p-8 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Shop is empty. Add your first reward above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
