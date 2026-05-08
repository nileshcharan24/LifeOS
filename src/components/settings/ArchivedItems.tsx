"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getArchivedItems, restoreItem, permanentlyDeleteItem, ArchivedItem } from "@/services/archiveService";
import { Clock, Trash, Undo } from "lucide-react";

export function ArchivedItems() {
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedItems();
  }, []);

  const fetchArchivedItems = async () => {
    setLoading(true);
    try {
      const items = await getArchivedItems();
      setArchivedItems(items);
    } catch (error) {
      toast.error("Failed to fetch archived items.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: ArchivedItem) => {
    try {
      await restoreItem(item);
      toast.success("Item restored successfully.");
      fetchArchivedItems();
    } catch (error) {
      toast.error("Failed to restore item.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await permanentlyDeleteItem(id);
      toast.success("Item permanently deleted.");
      fetchArchivedItems();
    } catch (error) {
      toast.error("Failed to delete item.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Archived Items</h2>
      {loading ? (
        <p>Loading...</p>
      ) : archivedItems.length === 0 ? (
        <p>No archived items.</p>
      ) : (
        <div className="space-y-4">
          {archivedItems.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold">{item.item_data.name || "Untitled"}</p>
                <p className="text-sm text-muted-foreground">{item.item_type}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires in {new Date(item.expires_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleRestore(item)}>
                  <Undo className="h-4 w-4 mr-2" />
                  Restore
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Permanently
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
