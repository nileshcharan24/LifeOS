"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Palette, List, Type, X, Plus, Trash2 } from "lucide-react";
import type { Note, ChecklistItem, NoteContent } from "@/services/notes/notesService";

export const NOTE_COLORS: { key: string; label: string; hex: string }[] = [
  { key: "default", label: "Default", hex: "" },
  { key: "red",    label: "Red",    hex: "#fee2e2" },
  { key: "orange", label: "Orange", hex: "#ffedd5" },
  { key: "yellow", label: "Yellow", hex: "#fef9c3" },
  { key: "green",  label: "Green",  hex: "#dcfce7" },
  { key: "teal",   label: "Teal",   hex: "#ccfbf1" },
  { key: "blue",   label: "Blue",   hex: "#dbeafe" },
  { key: "purple", label: "Purple", hex: "#f3e8ff" },
  { key: "pink",   label: "Pink",   hex: "#fce7f3" },
  { key: "gray",   label: "Gray",   hex: "#f3f4f6" },
];

type EditorState = {
  title: string;
  text: string;
  items: ChecklistItem[];
  color: string;
  type: "text" | "checklist";
  isPinned: boolean;
  labels: string[];
};

function fromNote(note: Note): EditorState {
  const content = note.content as Record<string, unknown>;
  return {
    title: note.title ?? "",
    text: (content.text as string) ?? "",
    items: (content.items as ChecklistItem[]) ?? [],
    color: note.color,
    type: note.type,
    isPinned: note.isPinned,
    labels: note.labels,
  };
}

function toContent(state: EditorState): NoteContent {
  if (state.type === "checklist") {
    return { items: state.items };
  }
  return { text: state.text };
}

type Props = {
  note?: Note;
  defaultType?: "text" | "checklist";
  onSave: (data: {
    title: string;
    content: NoteContent;
    color: string;
    type: "text" | "checklist";
    isPinned: boolean;
    labels: string[];
  }) => void;
  onCancel: () => void;
};

export function NoteEditor({ note, defaultType = "text", onSave, onCancel }: Props) {
  const [state, setState] = useState<EditorState>(() =>
    note
      ? fromNote(note)
      : {
          title: "",
          text: "",
          items: [{ id: crypto.randomUUID(), text: "", checked: false }],
          color: "default",
          type: defaultType,
          isPinned: false,
          labels: [],
        }
  );

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.type === "text" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [state.text, state.type]);

  useEffect(() => {
    if (state.type === "text" && textareaRef.current) {
      // Focus on mount or type change, but don't steal focus on every text change
      if (document.activeElement !== textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [state.type]);

  const colorHex = NOTE_COLORS.find((c) => c.key === state.color)?.hex ?? "";

  const set = <K extends keyof EditorState>(key: K, val: EditorState[K]) =>
    setState((s) => ({ ...s, [key]: val }));

  // Checklist helpers
  const updateItem = (id: string, field: keyof ChecklistItem, val: string | boolean) =>
    set("items", state.items.map((it) => (it.id === id ? { ...it, [field]: val } : it)));

  const addItem = () =>
    set("items", [...state.items, { id: crypto.randomUUID(), text: "", checked: false }]);

  const removeItem = (id: string) =>
    set("items", state.items.filter((it) => it.id !== id));

  const addLabel = () => {
    const t = labelInput.trim();
    if (t && !state.labels.includes(t)) set("labels", [...state.labels, t]);
    setLabelInput("");
  };

  const removeLabel = (l: string) => set("labels", state.labels.filter((x) => x !== l));

  const handleSave = () => {
    const hasContent =
      state.title.trim() ||
      (state.type === "text" ? state.text.trim() : state.items.some((it) => it.text.trim()));
    if (!hasContent) { onCancel(); return; }
    onSave({
      title: state.title || undefined as never,
      content: toContent(state),
      color: state.color,
      type: state.type,
      isPinned: state.isPinned,
      labels: state.labels,
    });
  };

  return (
    <div
      className="rounded-2xl border border-border/50 shadow-xl overflow-hidden"
      style={{ backgroundColor: colorHex || undefined }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <input
          type="text"
          value={state.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Title"
          className="flex-1 bg-transparent text-base font-semibold placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <button
          onClick={() => set("isPinned", !state.isPinned)}
          className="p-1.5 rounded-lg hover:bg-black/5 transition-colors text-muted-foreground hover:text-foreground"
        >
          {state.isPinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 min-h-[80px]">
        {state.type === "text" ? (
          <textarea
            ref={textareaRef}
            value={state.text}
            onChange={(e) => set("text", e.target.value)}
            placeholder="Take a note…"
            className="w-full bg-transparent text-sm leading-relaxed min-h-[150px] resize-none focus:outline-none placeholder:text-muted-foreground/60 overflow-hidden"
          />
        ) : (
          <div className="space-y-1.5 py-1">
            {state.items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => updateItem(item.id, "checked", e.target.checked)}
                  className="h-4 w-4 rounded accent-current flex-shrink-0"
                />
                <input
                  type="text"
                  value={item.text}
                  autoFocus={idx === state.items.length - 1}
                  onChange={(e) => updateItem(item.id, "text", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addItem(); }
                    if (e.key === "Backspace" && !item.text && state.items.length > 1) {
                      e.preventDefault();
                      removeItem(item.id);
                    }
                  }}
                  placeholder="List item…"
                  className={`flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60 ${item.checked ? "line-through text-muted-foreground" : ""}`}
                />
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 pl-6"
            >
              <Plus className="h-3.5 w-3.5" /> Add item
            </button>
          </div>
        )}
      </div>

      {/* Labels */}
      {(state.labels.length > 0 || true) && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {state.labels.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-black/10 text-foreground/70">
                {l}
                <button onClick={() => removeLabel(l)} className="hover:text-destructive leading-none">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLabel()}
              placeholder="Add label…"
              className="h-7 flex-1 rounded bg-black/5 px-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={addLabel} className="text-xs px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-muted-foreground hover:text-foreground">Add</button>
          </div>
        </div>
      )}

      {/* Color picker */}
      {showColorPicker && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.key}
              title={c.label}
              onClick={() => { set("color", c.key); setShowColorPicker(false); }}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${state.color === c.key ? "border-foreground scale-110" : "border-border/40"}`}
              style={{ backgroundColor: c.hex || "transparent" }}
            />
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-black/10">
        <div className="flex items-center gap-1">
          {/* Type toggle */}
          <button
            onClick={() => set("type", state.type === "text" ? "checklist" : "text")}
            title={state.type === "text" ? "Switch to checklist" : "Switch to text"}
            className="p-1.5 rounded hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {state.type === "text" ? <List className="h-4 w-4" /> : <Type className="h-4 w-4" />}
          </button>
          {/* Color */}
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            className="p-1.5 rounded hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Palette className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
            Cancel
          </button>
          <Button size="sm" onClick={handleSave} className="text-xs h-7">
            {note ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
