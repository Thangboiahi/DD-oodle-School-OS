"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { buildAttendanceIdempotencyKey } from "@/lib/attendance/rules";
import {
  STUDENT_DAILY_ATTENDANCE_STATUSES,
  type StudentDailyAttendanceStatus,
} from "@/lib/attendance/schemas";

export interface OfflineQueueRosterOption {
  enrolmentId: string;
  studentProfileId: string;
  fullName: string;
  admissionNumber: string;
  rollNumber: string | null;
}

interface QueuedAttendanceItem {
  idempotencyKey: string;
  subjectKind: "student";
  studentProfileId: string;
  studentEnrolmentId: string;
  studentLabel: string;
  sectionId: string;
  attendanceDate: string;
  eventType: "day_roll";
  attendanceStatus: StudentDailyAttendanceStatus;
  occurredAt: string;
  remarks?: string;
  source: "offline_queue";
}

interface OfflineQueuePanelProps {
  slug: string;
  institutionId: string;
  sectionId: string;
  sectionCode: string;
  attendanceDate: string;
  roster: readonly OfflineQueueRosterOption[];
}

const QUEUE_CHANGE_EVENT = "dd-oodle:attendance-queue-change";
const EMPTY_QUEUE: QueuedAttendanceItem[] = [];

const snapshotCache = new Map<
  string,
  { raw: string | null; parsed: QueuedAttendanceItem[] }
>();

function getStorageKey(slug: string): string {
  return `dd-oodle:attendance-queue:${slug}`;
}

function getClientQueueSnapshot(storageKey: string): QueuedAttendanceItem[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const cached = snapshotCache.get(storageKey);
    if (cached && cached.raw === raw) {
      return cached.parsed;
    }
    if (!raw) {
      snapshotCache.set(storageKey, { raw: null, parsed: EMPTY_QUEUE });
      return EMPTY_QUEUE;
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? (parsed as QueuedAttendanceItem[])
      : EMPTY_QUEUE;
    snapshotCache.set(storageKey, { raw, parsed: list });
    return list;
  } catch {
    return EMPTY_QUEUE;
  }
}

function subscribeQueue(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(QUEUE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(QUEUE_CHANGE_EVENT, callback);
  };
}

function persistQueue(key: string, items: QueuedAttendanceItem[]): void {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(key);
      snapshotCache.set(key, { raw: null, parsed: EMPTY_QUEUE });
    } else {
      const raw = JSON.stringify(items);
      window.localStorage.setItem(key, raw);
      snapshotCache.set(key, { raw, parsed: items });
    }
    window.dispatchEvent(new Event(QUEUE_CHANGE_EVENT));
  } catch {
    // Ignore storage quota issues cleanly without breaking UI state.
  }
}

export function OfflineQueuePanel({
  slug,
  institutionId,
  sectionId,
  sectionCode,
  attendanceDate,
  roster,
}: OfflineQueuePanelProps) {
  const router = useRouter();
  const storageKey = getStorageKey(slug);
  const queue = useSyncExternalStore(
    subscribeQueue,
    () => getClientQueueSnapshot(storageKey),
    () => EMPTY_QUEUE,
  );

  const [selectedEnrolmentId, setSelectedEnrolmentId] = useState<string>(
    roster[0]?.enrolmentId ?? "",
  );
  const effectiveEnrolmentId = roster.some(
    (item) => item.enrolmentId === selectedEnrolmentId,
  )
    ? selectedEnrolmentId
    : (roster[0]?.enrolmentId ?? "");

  const [statusValue, setStatusValue] =
    useState<StudentDailyAttendanceStatus>("present");
  const [remarks, setRemarks] = useState<string>("");
  const [syncMessage, setSyncMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleQueueEntry = () => {
    const student = roster.find(
      (item) => item.enrolmentId === effectiveEnrolmentId,
    );
    if (!student) return;

    const idempotencyKey = buildAttendanceIdempotencyKey({
      institutionId,
      scope: "day_roll",
      targetId: student.studentProfileId,
      attendanceDate,
      qualifier: `${sectionCode}-${statusValue}`,
      source: "offline_queue",
    });

    const newItem: QueuedAttendanceItem = {
      idempotencyKey,
      subjectKind: "student",
      studentProfileId: student.studentProfileId,
      studentEnrolmentId: student.enrolmentId,
      studentLabel: `${student.fullName} (${student.admissionNumber})`,
      sectionId,
      attendanceDate,
      eventType: "day_roll",
      attendanceStatus: statusValue,
      occurredAt: new Date().toISOString(),
      remarks: remarks.trim() || undefined,
      source: "offline_queue",
    };

    const nextQueue = [
      ...queue.filter((item) => item.idempotencyKey !== idempotencyKey),
      newItem,
    ];
    persistQueue(storageKey, nextQueue);
    setRemarks("");
    setSyncMessage({
      tone: "success",
      text: `Queued offline event ${idempotencyKey} (${nextQueue.length} pending).`,
    });
  };

  const handleSyncQueue = async () => {
    if (queue.length === 0) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const payload = {
        events: queue.map((item) => ({
          idempotencyKey: item.idempotencyKey,
          subjectKind: item.subjectKind,
          studentProfileId: item.studentProfileId,
          studentEnrolmentId: item.studentEnrolmentId,
          sectionId: item.sectionId,
          attendanceDate: item.attendanceDate,
          eventType: item.eventType,
          attendanceStatus: item.attendanceStatus,
          occurredAt: item.occurredAt,
          remarks: item.remarks,
          source: item.source,
        })),
      };

      const res = await fetch(
        `/api/t/${encodeURIComponent(slug)}/attendance/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = (await res.json()) as {
        accepted?: number;
        deduplicated?: number;
        rejected?: { idempotencyKey: string; reason: string }[];
        error?: string;
      };

      if (!res.ok) {
        setSyncMessage({
          tone: "error",
          text: data.error ?? `Sync failed (HTTP ${res.status}).`,
        });
        return;
      }

      const rejectedKeys = new Set(
        (data.rejected ?? []).map((item) => item.idempotencyKey),
      );
      const remaining = queue.filter((item) =>
        rejectedKeys.has(item.idempotencyKey),
      );
      persistQueue(storageKey, remaining);

      const rejectedNotes =
        data.rejected && data.rejected.length > 0
          ? ` Rejected: ${data.rejected.map((r) => r.reason).join("; ")}`
          : "";

      setSyncMessage({
        tone: data.rejected && data.rejected.length > 0 ? "error" : "success",
        text: `Sync complete: ${data.accepted ?? 0} accepted, ${data.deduplicated ?? 0} deduplicated, ${data.rejected?.length ?? 0} rejected.${rejectedNotes}`,
      });
      router.refresh();
    } catch {
      setSyncMessage({
        tone: "error",
        text: "Network unavailable while syncing offline attendance queue.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearQueue = () => {
    persistQueue(storageKey, []);
    setSyncMessage({
      tone: "success",
      text: "Cleared local offline attendance queue.",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-fg-muted">
          Stages attendance events locally with deterministic{" "}
          <span className="font-mono text-fg">idempotency_key</span> values (no
          full directory cache; cleared on sync or reset) and replays safely
          via{" "}
          <span className="font-mono text-fg">
            POST /api/t/{slug}/attendance/sync
          </span>
          .
        </p>
        <Badge tone={queue.length > 0 ? "warning" : "neutral"}>
          {queue.length} pending
        </Badge>
      </div>

      {roster.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="offline-queue-student"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Student ({sectionCode})
            </label>
            <select
              id="offline-queue-student"
              value={effectiveEnrolmentId}
              onChange={(event) => setSelectedEnrolmentId(event.target.value)}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              {roster.map((student) => (
                <option key={student.enrolmentId} value={student.enrolmentId}>
                  {student.rollNumber ? `#${student.rollNumber} ` : ""}
                  {student.fullName} ({student.admissionNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="offline-queue-status"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Queued Status
            </label>
            <select
              id="offline-queue-status"
              value={statusValue}
              onChange={(event) =>
                setStatusValue(event.target.value as StudentDailyAttendanceStatus)
              }
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              {STUDENT_DAILY_ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="offline-queue-remarks"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Optional Note
            </label>
            <input
              id="offline-queue-remarks"
              type="text"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              maxLength={240}
              placeholder="Gate / bus delay note"
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleQueueEntry}
            >
              Queue Offline Entry
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={queue.length === 0 || isSyncing}
              onClick={handleSyncQueue}
            >
              {isSyncing ? "Syncing..." : "Sync Queue"}
            </Button>
            {queue.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClearQueue}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {syncMessage ? (
        <div
          role={syncMessage.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={[
            "rounded-md border px-3 py-2 text-xs font-medium",
            syncMessage.tone === "error"
              ? "border-status-danger bg-elevated text-status-danger"
              : "border-status-success bg-elevated text-status-success",
          ].join(" ")}
        >
          {syncMessage.text}
        </div>
      ) : null}

      {queue.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border-subtle">
          <table className="w-full min-w-[34rem] divide-y divide-border-subtle text-left text-xs">
            <thead className="bg-elevated text-fg-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Idempotency Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface">
              {queue.map((item) => (
                <tr key={item.idempotencyKey}>
                  <td className="px-3 py-2 font-medium text-fg">
                    {item.studentLabel}
                  </td>
                  <td className="px-3 py-2 text-fg-muted">
                    {item.attendanceDate}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone="neutral">{item.attendanceStatus}</Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">
                    {item.idempotencyKey}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
