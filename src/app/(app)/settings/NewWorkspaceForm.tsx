"use client";

import { useState, useRef } from "react";
import { createWorkspaceAction } from "./actions";

export function NewWorkspaceForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
        New Workspace
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createWorkspaceAction(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="mb-3 space-y-2 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div>
        <label className="block text-xs font-medium text-neutral-500">Name</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Description</label>
        <input name="description" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Google Drive root URL</label>
        <input name="googleDriveRootUrl" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Create Workspace
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
