"use client";

import { useState, useRef } from "react";
import { createTaskAction } from "./actions";

export function NewTaskForm({
  workspaces,
  defaultWorkspaceId,
}: {
  workspaces: { id: string; name: string }[];
  defaultWorkspaceId: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        New Task
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createTaskAction(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-4"
    >
      <div className="col-span-2 md:col-span-2">
        <label className="block text-xs font-medium text-neutral-500">Task name</label>
        <input name="taskName" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
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
        <label className="block text-xs font-medium text-neutral-500">Category</label>
        <select name="category" defaultValue="Admin" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {["Lead", "Client", "Meeting", "Content", "Billing", "Admin"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Priority</label>
        <select name="priority" defaultValue="Medium" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {["Low", "Medium", "High", "Urgent"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Due date</label>
        <input type="date" name="dueDate" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4">
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Create Task
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
