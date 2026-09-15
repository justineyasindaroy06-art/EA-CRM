"use client";

import { useState, useRef } from "react";
import { createMeetingAction } from "./actions";

export function NewMeetingForm({
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
      <button onClick={() => setOpen(true)} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
        New Meeting
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createMeetingAction(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-4"
    >
      <div className="col-span-2">
        <label className="block text-xs font-medium text-neutral-500">Title</label>
        <input name="title" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Workspace</label>
        <select name="workspaceId" defaultValue={defaultWorkspaceId} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Client (optional)</label>
        <select name="clientId" defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">None</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Start</label>
        <input type="datetime-local" name="startAt" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Duration (min)</label>
        <input type="number" name="durationMinutes" defaultValue={45} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Type</label>
        <select name="meetingType" defaultValue="Session" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {["Consultation", "Session", "Internal", "Other"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4">
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Create Meeting
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Cancel
        </button>
        <p className="text-xs text-neutral-400">Creates a mock Google Meet link unless Google Calendar is connected in Settings.</p>
      </div>
    </form>
  );
}
