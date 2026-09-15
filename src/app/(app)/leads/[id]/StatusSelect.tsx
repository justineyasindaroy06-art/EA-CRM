"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function StatusSelect({
  leadId,
  status,
  statuses,
  action,
}: {
  leadId: string;
  status: string;
  statuses: string[];
  action: (leadId: string, status: string) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await action(leadId, value);
          router.refresh();
        });
      }}
      className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
