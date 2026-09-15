"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startTimerAction, stopTimerAction } from "./actions";

interface ActiveTimer {
  id: string;
  startAt: string;
  clientLabel: string | null;
  project: string | null;
}

export function TimerWidget({
  activeTimer,
  workspaces,
  clients,
  defaultWorkspaceId,
}: {
  activeTimer: ActiveTimer | null;
  workspaces: { id: string; name: string }[];
  clients: { id: string; workspaceId: string; label: string }[];
  defaultWorkspaceId: string | undefined;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer) return;
    const start = new Date(activeTimer.startAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  if (activeTimer) {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-xs text-neutral-400">Timer running</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          {activeTimer.clientLabel ?? "No client"} {activeTimer.project ? `· ${activeTimer.project}` : ""}
        </p>
        <button
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await stopTimerAction(activeTimer.id);
              router.refresh();
            });
          }}
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          Stop Timer
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await startTimerAction(formData);
        router.refresh();
      }}
      className="rounded-lg border border-neutral-200 bg-white p-4"
    >
      <p className="mb-3 text-xs text-neutral-400">No timer running</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select name="workspaceId" defaultValue={defaultWorkspaceId} required className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select name="clientId" defaultValue="" className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">No client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <input name="project" placeholder="Project (optional)" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
        <input type="checkbox" name="billable" defaultChecked className="h-3.5 w-3.5" />
        Billable
      </label>
      <button type="submit" className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
        Start Timer
      </button>
    </form>
  );
}
