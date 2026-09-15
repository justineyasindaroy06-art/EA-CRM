"use client";

import { useState, useRef } from "react";
import { createPackageAction } from "./actions";

export function NewPackageForm({
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
      <button onClick={() => setOpen(true)} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
        New Package
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createPackageAction(formData);
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
        <label className="block text-xs font-medium text-neutral-500">Name</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Price</label>
        <input type="number" step="0.01" name="price" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Duration</label>
        <input name="duration" placeholder="12 weeks, Monthly..." className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2 md:col-span-4">
        <label className="block text-xs font-medium text-neutral-500">Description</label>
        <input name="description" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4">
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Create Package
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
