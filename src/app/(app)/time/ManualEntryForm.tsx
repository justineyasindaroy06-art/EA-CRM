"use client";

import { useState, useRef } from "react";
import { createManualEntryAction } from "./actions";

export function ManualEntryForm({
  workspaces,
  clients,
  defaultWorkspaceId,
}: {
  workspaces: { id: string; name: string }[];
  clients: { id: string; workspaceId: string; label: string }[];
  defaultWorkspaceId: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50">
        Add Manual Entry
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createManualEntryAction(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-4"
    >
      <div>
        <label className="block text-xs font-medium text-neutral-500">Workspace</label>
        <select name="workspaceId" defaultValue={defaultWorkspaceId} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Client</label>
        <select name="clientId" defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">No client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Project</label>
        <input name="project" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" name="billable" defaultChecked className="h-3.5 w-3.5" />
          Billable
        </label>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Start</label>
        <input type="datetime-local" name="startAt" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">End</label>
        <input type="datetime-local" name="endAt" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-neutral-500">Notes</label>
        <input name="notes" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4">
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Add Entry
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
