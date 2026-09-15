"use client";

import { useState, useRef } from "react";
import { CONTENT_TYPES, DEFAULT_PLATFORMS } from "@/lib/constants";
import { createContentAction } from "./actions";

export function NewContentForm({
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
        New Content
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createContentAction(formData);
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
        <label className="block text-xs font-medium text-neutral-500">Type</label>
        <select name="contentType" defaultValue="Social Post" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Platform</label>
        <select name="platform" defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">—</option>
          {DEFAULT_PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Due date</label>
        <input type="date" name="dueDate" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Canva URL</label>
        <input name="canvaUrl" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">CapCut URL</label>
        <input name="capcutUrl" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Google Drive URL</label>
        <input name="googleDriveUrl" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4">
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Create Content
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
