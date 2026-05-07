"use client";

import { useState } from "react";
import { Pin, PinOff, Trash2, Pencil } from "lucide-react";
import { NOTE_COLORS, NoteEditor } from "@/components/notes/NoteEditor";
import type { Note, NoteContent } from "@/services/notes/notesService";

type Props = {
  note: Note;
  onPin: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: {
    title?: string | null;
    content?: NoteContent;
    color?: string;
    isPinned?: boolean;
    labels?: string[];
  }) => void;
};

export function NoteCard({ note, onPin, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);

  const colorHex = NOTE_COLORS.find((c) => c.key === note.color)?.hex ?? "";
  const content = note.content as Record<string, unknown>;

  if (editing) {
    return (
      <div className="mb-3 break-inside-avoid">
        <NoteEditor
          note={note}
          onSave={(data) => {
            onUpdate(note.id, data);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className="mb-3 break-inside-avoid rounded-xl border border-border/40 overflow-hidden group cursor-pointer transition-shadow hover:shadow-md"
      style={{ backgroundColor: colorHex || undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setEditing(true)}
    >
      <div className="p-4">
        {/* Pin button */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {note.title && (
              <p className="text-sm font-semibold leading-snug mb-1 truncate">{note.title}</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onPin(note.id, !note.isPinned); }}
            className={`p-1 rounded-full transition-all flex-shrink-0 ${
              hovered || note.isPinned ? "opacity-100" : "opacity-0"
            } hover:bg-black/10`}
          >
            {note.isPinned
              ? <Pin className="h-3.5 w-3.5 fill-current text-foreground/70" />
              : <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </button>
        </div>

        {/* Content preview */}
        {note.type === "text" && content.text && (
          <p className="text-xs leading-relaxed text-foreground/80 line-clamp-6 whitespace-pre-wrap">
            {content.text as string}
          </p>
        )}

        {note.type === "checklist" && Array.isArray(content.items) && (
          <div className="space-y-1">
            {(content.items as { id: string; text: string; checked: boolean }[])
              .slice(0, 8)
              .map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className={`h-3.5 w-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${item.checked ? "border-foreground/40 bg-foreground/20" : "border-foreground/30"}`}>
                    {item.checked && <span className="text-[8px] text-foreground">✓</span>}
                  </div>
                  <span className={`text-xs leading-tight ${item.checked ? "line-through text-muted-foreground" : "text-foreground/80"}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            {(content.items as unknown[]).length > 8 && (
              <p className="text-[10px] text-muted-foreground pl-5 mt-1">
                +{(content.items as unknown[]).length - 8} more
              </p>
            )}
          </div>
        )}

        {/* Labels */}
        {note.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {note.labels.map((l) => (
              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 text-foreground/60">
                {l}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className={`flex items-center justify-end px-3 py-1.5 border-t border-black/5 gap-1 transition-opacity ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="p-1.5 rounded-full hover:bg-black/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="p-1.5 rounded-full hover:bg-black/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
