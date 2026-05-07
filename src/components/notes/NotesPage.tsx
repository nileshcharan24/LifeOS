"use client";

import { useState, useEffect, useCallback } from "react";
import { LayoutGrid, List, X } from "lucide-react";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteEditor, NOTE_COLORS } from "@/components/notes/NoteEditor";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  type Note,
  type NoteContent,
} from "@/services/notes/notesService";
import { toast } from "sonner";

// ── Quick Capture bar ────────────────────────────────────────────────────────

function QuickCapture({
  onAdd,
}: {
  onAdd: (note: Omit<Parameters<typeof createNote>[0], never>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<"text" | "checklist">("text");

  if (!open) {
    return (
      <div
        className="rounded-xl border border-border/40 bg-card shadow-sm px-4 py-3 flex items-center justify-between cursor-text"
        onClick={() => { setDefaultType("text"); setOpen(true); }}
      >
        <span className="text-sm text-muted-foreground">Take a note…</span>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setDefaultType("checklist"); setOpen(true); }}
            title="New checklist"
            className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <NoteEditor
      defaultType={defaultType}
      onSave={(data) => { onAdd(data); setOpen(false); }}
      onCancel={() => setOpen(false)}
    />
  );
}

// ── Filter sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({
  allLabels,
  activeLabel,
  activeColor,
  onLabelChange,
  onColorChange,
  onClear,
}: {
  allLabels: string[];
  activeLabel: string | null;
  activeColor: string | null;
  onLabelChange: (l: string | null) => void;
  onColorChange: (c: string | null) => void;
  onClear: () => void;
}) {
  const hasFilter = activeLabel || activeColor;

  return (
    <div className="w-48 flex-shrink-0 space-y-5">
      {hasFilter && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Clear filters
        </button>
      )}

      {allLabels.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Labels</p>
          <div className="space-y-1">
            {allLabels.map((l) => (
              <button
                key={l}
                onClick={() => onLabelChange(activeLabel === l ? null : l)}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  activeLabel === l
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Colors</p>
        <div className="flex flex-wrap gap-1.5">
          {NOTE_COLORS.filter((c) => c.key !== "default").map((c) => (
            <button
              key={c.key}
              title={c.label}
              onClick={() => onColorChange(activeColor === c.key ? null : c.key)}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                activeColor === c.key ? "border-foreground scale-110" : "border-border/40"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main NotesPage ───────────────────────────────────────────────────────────

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await getNotes();
    setNotes(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived
  const allLabels = Array.from(new Set(notes.flatMap((n) => n.labels))).sort();

  const filtered = notes.filter((n) => {
    if (activeLabel && !n.labels.includes(activeLabel)) return false;
    if (activeColor && n.color !== activeColor) return false;
    return true;
  });

  const pinned = filtered.filter((n) => n.isPinned);
  const others = filtered.filter((n) => !n.isPinned);

  // Handlers
  const handleAdd = async (data: Parameters<typeof createNote>[0]) => {
    const result = await createNote(data);
    if (result.error) { toast.error(result.error); return; }
    if (result.data) setNotes((prev) => [result.data!, ...prev]);
  };

  const handleUpdate = async (
    id: string,
    updates: {
      title?: string | null;
      content?: NoteContent;
      color?: string;
      isPinned?: boolean;
      labels?: string[];
    }
  ) => {
    await updateNote(id, updates);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              ...(updates.title !== undefined && { title: updates.title }),
              ...(updates.content && { content: updates.content }),
              ...(updates.color && { color: updates.color }),
              ...(updates.isPinned !== undefined && { isPinned: updates.isPinned }),
              ...(updates.labels && { labels: updates.labels }),
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handlePin = (id: string, val: boolean) => handleUpdate(id, { isPinned: val });

  const gridClass =
    view === "grid"
      ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3"
      : "columns-1 max-w-2xl";

  const renderNotes = (list: Note[]) =>
    list.map((note) => (
      <NoteCard
        key={note.id}
        note={note}
        onPin={handlePin}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    ));

  return (
    <div className="flex gap-6 min-h-0">
      {/* Filter sidebar */}
      <FilterSidebar
        allLabels={allLabels}
        activeLabel={activeLabel}
        activeColor={activeColor}
        onLabelChange={setActiveLabel}
        onColorChange={setActiveColor}
        onClear={() => { setActiveLabel(null); setActiveColor(null); }}
      />

      {/* Main area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <QuickCapture onAdd={handleAdd} />
          </div>
          <div className="flex gap-1 border border-border/40 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">No notes yet.</p>
            <p className="text-xs mt-1">Click "Take a note…" above to get started.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No notes match the current filters.
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Pinned</p>
                <div className={gridClass}>{renderNotes(pinned)}</div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Other</p>
                )}
                <div className={gridClass}>{renderNotes(others)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
