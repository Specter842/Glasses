"use client";

import { useState } from "react";
import type { Note } from "@/lib/types";
import { useData } from "../DataProvider";
import { addNote, deleteNote, getNotes, updateNote } from "@/lib/store";
import { formatDayLabel } from "@/lib/time";
import { btn, cx, SectionTitle } from "../ui";

export function NotesPanel() {
  const { db, mutate } = useData();
  const [text, setText] = useState("");

  const notes = getNotes(db);

  const submit = () => {
    if (!text.trim()) return;
    const payload = { text };
    setText("");
    mutate((d) => addNote(d, payload));
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionTitle>Notes</SectionTitle>
        <span className="font-mono text-xs text-text-secondary">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Write a note…"
          rows={3}
          className="w-full resize-y text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-secondary">
            ⌘/Ctrl + Enter to save
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className={cx(btn.base, btn.primary)}
          >
            Add note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-text-secondary">
          No notes yet. Jot down anything above.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} />
          ))}
        </div>
      )}
    </section>
  );
}

function NoteItem({ note }: { note: Note }) {
  const { mutate } = useData();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);

  const saveEdit = () => {
    if (!text.trim()) return;
    mutate((d) => updateNote(d, { id: note.id, text }));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
            if (e.key === "Escape") {
              setText(note.text);
              setEditing(false);
            }
          }}
          autoFocus
          rows={3}
          className="w-full resize-y text-sm"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveEdit}
            className={cx(btn.base, btn.primary, "px-3 py-1.5")}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setText(note.text);
              setEditing(false);
            }}
            className={cx(btn.base, btn.ghost)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-md border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-sm text-text-primary">
          {note.text}
        </p>
        <span className="mt-1 block font-mono text-[11px] text-text-secondary">
          {formatDayLabel(note.created_at.slice(0, 10))}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cx(btn.base, btn.ghost, "px-2 py-1 text-xs")}
        >
          Edit
        </button>
        <button
          type="button"
          aria-label="Delete note"
          onClick={() => mutate((d) => deleteNote(d, note.id))}
          className="rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
