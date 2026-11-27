"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { clearPwaCaches } from "@/components/pwa/ServiceWorkerRegistrar";

export interface SwitcherMembershipOption {
  slug: string;
  institutionName: string;
  roleSummary: string;
}

interface WorkspaceSwitcherProps {
  currentPath: string;
  memberships: readonly SwitcherMembershipOption[];
  hasPlatformAccess: boolean;
}

export function WorkspaceSwitcher({
  currentPath,
  memberships,
  hasPlatformAccess,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const normalizedValue =
    currentPath === "/workspace" ||
    currentPath === "/platform" ||
    memberships.some((item) => `/t/${item.slug}` === currentPath)
      ? currentPath
      : "/workspace";

  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const targetPath = event.target.value;
    if (!targetPath || targetPath === normalizedValue || switching) {
      return;
    }

    setSwitching(true);
    try {
      // Clear cached tenant responses on workspace switch per Blueprint Part A §12.5.
      await clearPwaCaches();
      router.push(targetPath);
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="flex items-center">
      <label htmlFor="dd-oodle-workspace-switcher" className="sr-only">
        Switch verified workspace
      </label>
      <select
        id="dd-oodle-workspace-switcher"
        aria-label="Switch verified workspace"
        value={normalizedValue}
        disabled={switching}
        onChange={handleChange}
        className="min-h-9 max-w-[15rem] rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 sm:max-w-xs"
      >
        <option value="/workspace">Personal Workspace</option>
        {memberships.map((membership) => (
          <option
            key={membership.slug}
            value={`/t/${membership.slug}`}
          >
            {membership.institutionName} ({membership.roleSummary})
          </option>
        ))}
        {hasPlatformAccess ? (
          <option value="/platform">Platform Console (Ops)</option>
        ) : null}
      </select>
    </div>
  );
}
