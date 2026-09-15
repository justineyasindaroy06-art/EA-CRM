import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { PageHeader } from "@/components/PageHeader";
import { createLeadAction } from "../actions";

export default async function NewLeadPage() {
  const [workspaces, currentWorkspaceId] = await Promise.all([
    prisma.workspace.findMany({ orderBy: { name: "asc" } }),
    getCurrentWorkspaceId(),
  ]);

  return (
    <div className="max-w-lg">
      <PageHeader title="New Lead" description="Manually add a lead (e.g. from a call or referral)." />

      <form action={createLeadAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Workspace</label>
          <select
            name="workspaceId"
            defaultValue={currentWorkspaceId ?? workspaces[0]?.id}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700">First name</label>
            <input name="firstName" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Last name</label>
            <input name="lastName" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Phone</label>
            <input name="phone" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Company</label>
            <input name="company" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Source</label>
          <input name="source" defaultValue="Manual Entry" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Service / Program interested in</label>
          <input name="serviceOrProgram" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Notes</label>
          <textarea name="notes" rows={3} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>

        <p className="text-xs text-neutral-400">
          Creating a lead will trigger the Day 0 welcome email + booking link automation.
        </p>

        <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Create Lead
        </button>
      </form>
    </div>
  );
}
