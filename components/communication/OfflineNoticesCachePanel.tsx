"use client";

import { useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { OfflineCachedNoticeDto } from "@/lib/communication/rules";

interface OfflineNoticeCacheEnvelope {
  syncedAt: string | null;
  notices: OfflineCachedNoticeDto[];
}

interface OfflineNoticesCachePanelProps {
  slug: string;
  cacheableNotices: readonly OfflineCachedNoticeDto[];
}

const CACHE_CHANGE_EVENT = "dd-oodle:offline-notices-change";
const EMPTY_ENVELOPE: OfflineNoticeCacheEnvelope = {
  syncedAt: null,
  notices: [],
};

const cacheSnapshotMap = new Map<
  string,
  { raw: string | null; parsed: OfflineNoticeCacheEnvelope }
>();

function getStorageKey(slug: string): string {
  return `dd-oodle:offline-notices:${slug}`;
}

function getClientNoticeCacheSnapshot(
  storageKey: string,
): OfflineNoticeCacheEnvelope {
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
    const parsed = JSON.parse(raw) as Partial<OfflineNoticeCacheEnvelope>;
    const envelope: OfflineNoticeCacheEnvelope = {
      syncedAt: typeof parsed.syncedAt === "string" ? parsed.syncedAt : null,
      notices: Array.isArray(parsed.notices)
        ? (parsed.notices as OfflineCachedNoticeDto[])
        : [],
    };
    cacheSnapshotMap.set(storageKey, { raw, parsed: envelope });
    return envelope;
  } catch {
    return EMPTY_ENVELOPE;
  }
}

function subscribeNoticeCache(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CACHE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CACHE_CHANGE_EVENT, callback);
  };
}

function writeNoticeCache(
  key: string,
  envelope: OfflineNoticeCacheEnvelope | null,
): void {
  try {
    if (!envelope || envelope.notices.length === 0) {
      window.localStorage.removeItem(key);
      cacheSnapshotMap.set(key, { raw: null, parsed: EMPTY_ENVELOPE });
    } else {
      const raw = JSON.stringify(envelope);
      window.localStorage.setItem(key, raw);
      cacheSnapshotMap.set(key, { raw, parsed: envelope });
    }
    window.dispatchEvent(new Event(CACHE_CHANGE_EVENT));
  } catch {
    // Ignore storage quota issues cleanly without breaking UI state.
  }
}

export function OfflineNoticesCachePanel({
  slug,
  cacheableNotices,
}: OfflineNoticesCachePanelProps) {
  const storageKey = getStorageKey(slug);
  const cached = useSyncExternalStore(
    subscribeNoticeCache,
    () => getClientNoticeCacheSnapshot(storageKey),
    () => EMPTY_ENVELOPE,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSaveCache = () => {
    const syncedAt = new Date().toISOString();
    writeNoticeCache(storageKey, {
      syncedAt,
      notices: [...cacheableNotices],
    });
    setStatusMessage(
      cacheableNotices.length === 0
        ? "No offline-cacheable published notices available; cleared local notice cache."
        : `Saved ${cacheableNotices.length} published offline-cacheable notice(s) locally.`,
    );
  };

  const handleClearCache = () => {
    writeNoticeCache(storageKey, null);
    setStatusMessage("Cleared local offline notice cache.");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-fg-muted">
          Only published notices flagged <span className="font-mono">is_offline_cacheable=true</span>{" "}
          may be stored locally (§12.5). Parent enquiries, confidential records, and
          internal staff notes remain strictly online-only.
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={cached.notices.length > 0 ? "success" : "neutral"}>
            {cached.notices.length} cached
          </Badge>
          {cached.syncedAt ? (
            <span className="font-mono text-[11px] text-fg-muted">
              Synced {cached.syncedAt.slice(0, 19).replace("T", " ")}Z
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleSaveCache}
        >
          Sync {cacheableNotices.length} Cacheable Notice(s) Offline
        </Button>
        {cached.notices.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearCache}
          >
            Clear Local Notice Cache
          </Button>
        ) : null}
      </div>

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
