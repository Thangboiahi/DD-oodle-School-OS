"use client";

import { useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { OfflineTimetableSnapshot } from "@/lib/timetable/rules";

interface OfflineTimetableCacheEnvelope {
  syncedAt: string | null;
  snapshot: OfflineTimetableSnapshot | null;
}

interface OfflineTimetableCachePanelProps {
  slug: string;
  snapshot: OfflineTimetableSnapshot | null;
}

const CACHE_CHANGE_EVENT = "dd-oodle:offline-timetable-change";
const EMPTY_ENVELOPE: OfflineTimetableCacheEnvelope = {
  syncedAt: null,
  snapshot: null,
};

const cacheSnapshotMap = new Map<
  string,
  { raw: string | null; parsed: OfflineTimetableCacheEnvelope }
>();

function getStorageKey(slug: string): string {
  return `dd-oodle:offline-timetable:${slug}`;
}

function getClientTimetableCacheSnapshot(
  storageKey: string,
): OfflineTimetableCacheEnvelope {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const cached = cacheSnapshotMap.get(storageKey);
    if (cached && cached.raw === raw) {
      return cached.parsed;
    }
    if (!raw) {
      cacheSnapshotMap.set(storageKey, { raw: null, parsed: EMPTY_ENVELOPE });
      return EMPTY_ENVELOPE;
    }
    const parsed = JSON.parse(raw) as Partial<OfflineTimetableCacheEnvelope>;
    const envelope: OfflineTimetableCacheEnvelope = {
      syncedAt: typeof parsed.syncedAt === "string" ? parsed.syncedAt : null,
      snapshot:
        parsed.snapshot && typeof parsed.snapshot === "object"
          ? (parsed.snapshot as OfflineTimetableSnapshot)
          : null,
    };
    cacheSnapshotMap.set(storageKey, { raw, parsed: envelope });
    return envelope;
  } catch {
    return EMPTY_ENVELOPE;
  }
}

function subscribeTimetableCache(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CACHE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CACHE_CHANGE_EVENT, callback);
  };
}

function writeTimetableCache(
  key: string,
  envelope: OfflineTimetableCacheEnvelope | null,
): void {
  try {
    if (!envelope || !envelope.snapshot) {
      window.localStorage.removeItem(key);
      cacheSnapshotMap.set(key, { raw: null, parsed: EMPTY_ENVELOPE });
    } else {
      const raw = JSON.stringify(envelope);
      window.localStorage.setItem(key, raw);
      cacheSnapshotMap.set(key, { raw, parsed: envelope });
    }
    window.dispatchEvent(new Event(CACHE_CHANGE_EVENT));
  } catch {
    // Ignore storage quota errors gracefully without disrupting UI state.
  }
}

export function OfflineTimetableCachePanel({
  slug,
  snapshot,
}: OfflineTimetableCachePanelProps) {
  const storageKey = getStorageKey(slug);
  const cached = useSyncExternalStore(
    subscribeTimetableCache,
    () => getClientTimetableCacheSnapshot(storageKey),
    () => EMPTY_ENVELOPE,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSaveCache = () => {
    if (!snapshot) {
      writeTimetableCache(storageKey, null);
      setStatusMessage(
        "Selected timetable is not published and offline-cacheable; cleared local timetable cache.",
      );
      return;
    }

    const syncedAt = new Date().toISOString();
    writeTimetableCache(storageKey, {
      syncedAt,
      snapshot,
    });
    setStatusMessage(
      `Saved ${snapshot.name} (v${snapshot.versionNo}, ${snapshot.periods.length} periods, ${snapshot.slots.length} slots) locally.`,
    );
  };

  const handleClearCache = () => {
    writeTimetableCache(storageKey, null);
    setStatusMessage("Cleared local offline timetable cache.");
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-elevated/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="min-w-0 flex-1 text-fg-muted">
          Only published timetables flagged{" "}
          <span className="font-mono">is_offline_cacheable=true</span> may be
          stored locally (§12.5). Draft versions, daily substitutions, and
          private staff records stay strictly online-only.
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={cached.snapshot ? "success" : "neutral"}>
            {cached.snapshot
              ? `Cached v${cached.snapshot.versionNo}`
              : "Not cached"}
          </Badge>
          {cached.syncedAt ? (
            <span className="font-mono text-[11px] text-fg-muted">
              Synced {cached.syncedAt.slice(0, 19).replace("T", " ")}Z
            </span>
          ) : null}
        </div>
      </div>

      {cached.snapshot ? (
        <p className="text-xs text-fg-muted">
          Cached:{" "}
          <span className="font-medium text-fg">
            {cached.snapshot.name} (v{cached.snapshot.versionNo})
          </span>{" "}
          — {cached.snapshot.periods.length} period(s),{" "}
          {cached.snapshot.slots.length} slot(s).
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!snapshot}
          onClick={handleSaveCache}
        >
          Sync Published Timetable Offline
        </Button>
        {cached.snapshot ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearCache}
          >
            Clear Local Timetable Cache
          </Button>
        ) : null}
      </div>

      {!snapshot ? (
        <p className="text-xs text-fg-muted">
          Offline caching is disabled for draft, archived, or non-cacheable
          timetables.
        </p>
      ) : null}

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-status-success bg-elevated px-3 py-2 text-xs font-medium text-status-success"
        >
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
}
