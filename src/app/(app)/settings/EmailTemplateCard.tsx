"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleEmailTemplateAction, updateEmailTemplateAction } from "./actions";

interface Template {
  id: string;
  key: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
}

export function EmailTemplateCard({ template }: { template: Template }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const updateWithId = updateEmailTemplateAction.bind(null, template.id);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">{template.name}</p>
          <p className="text-xs text-neutral-400">{template.key}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={template.enabled}
              disabled={pending}
              onChange={(e) => {
                const value = e.target.checked;
                startTransition(async () => {
                  await toggleEmailTemplateAction(template.id, value);
                  router.refresh();
                });
              }}
              className="h-3.5 w-3.5"
            />
            Enabled
          </label>
          <button onClick={() => setExpanded((v) => !v)} className="text-xs text-neutral-500 hover:underline">
            {expanded ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {expanded && (
        <form
          action={async (formData) => {
            await updateWithId(formData);
            setExpanded(false);
            router.refresh();
          }}
          className="mt-3 space-y-2"
        >
          <div>
            <label className="block text-xs font-medium text-neutral-500">Subject</label>
            <input name="subject" defaultValue={template.subject} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500">Body</label>
            <textarea name="body" defaultValue={template.body} rows={4} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">
            Save
          </button>
        </form>
      )}
    </div>
  );
}
