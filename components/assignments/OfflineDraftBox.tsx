"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";

interface OfflineDraftBoxProps {
  slug: string;
  assignmentId: string;
  initialResponseText: string;
  inputId: string;
}

const DRAFT_CHANGE_EVENT = "dd-oodle:assignment-draft-change";

function subscribeDraftStore(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(DRAFT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DRAFT_CHANGE_EVENT, callback);
  };
}

function readLocalDraftSnapshot(storageKey: string): string {
  try {
    return window.localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

export function OfflineDraftBox({
  slug,
  assignmentId,
  initialResponseText,
  inputId,
}: OfflineDraftBoxProps) {
  const storageKey = `dd-oodle:assignment-draft:${slug}:${assignmentId}`;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [editedValue, setEditedValue] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const savedLocalDraft = useSyncExternalStore(
    subscribeDraftStore,
    () => readLocalDraftSnapshot(storageKey),
    () => "",
  );

  const value =
    editedValue !== null
      ? editedValue
      : initialResponseText || savedLocalDraft;

  useEffect(() => {
    const form = textareaRef.current?.form;
    if (!form) return;
    const onSubmit = () => {
      try {
        window.localStorage.removeItem(storageKey);
        window.dispatchEvent(new Event(DRAFT_CHANGE_EVENT));
      } catch {
        // Ignore storage errors on submit
      }
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [storageKey]);

  const handleSaveDraft = () => {
    try {
      if (!value.trim()) {
        window.localStorage.removeItem(storageKey);
        window.dispatchEvent(new Event(DRAFT_CHANGE_EVENT));
        setStatusMessage("Empty draft cleared.");
        return;
      }
      window.localStorage.setItem(storageKey, value);
      window.dispatchEvent(new Event(DRAFT_CHANGE_EVENT));
      setStatusMessage("Draft saved locally on this device.");
    } catch {
      setStatusMessage("Unable to access local browser storage.");
    }
  };

  const handleClearDraft = () => {
    setEditedValue("");
    try {
      window.localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event(DRAFT_CHANGE_EVENT));
      setStatusMessage("Local draft cleared.");
    } catch {
      setStatusMessage("Draft input cleared.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="block text-xs font-medium text-fg">
          Written Response (Online Submission)
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
          >
            Save Local Draft
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearDraft}
          >
            Clear Draft
          </Button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id={inputId}
        name="responseText"
        rows={4}
        value={value}
        onChange={(event) => {
          setEditedValue(event.target.value);
          setStatusMessage(null);
        }}
        maxLength={5000}
        placeholder="Write your assignment answer here. Use Save Local Draft to keep an in-progress draft offline before submitting."
        className="w-full rounded-md border border-border-strong bg-surface p-2.5 text-xs text-fg focus-visible:outline-2 focus-visible:outline-accent"
      />

      {statusMessage ? (
        <p role="status" className="text-[11px] text-fg-muted">
          {statusMessage}
        </p>
      ) : savedLocalDraft && editedValue === null && !initialResponseText ? (
        <p role="status" className="text-[11px] text-fg-muted">
          Restored saved local browser draft.
        </p>
      ) : null}
    </div>
  );
}
