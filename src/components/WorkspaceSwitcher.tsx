"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setWorkspaceAction } from "@/app/(app)/actions";

interface Workspace {
  id: string;
  name: string;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-800 disabled:opacity-60"
      value={currentWorkspaceId ?? "all"}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await setWorkspaceAction(value === "all" ? null : value);
          router.refresh();
        });
      }}
    >
      <option value="all">All Clients</option>
      {workspaces.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  );
}
