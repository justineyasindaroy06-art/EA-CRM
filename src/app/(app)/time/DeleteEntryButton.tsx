"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEntryAction } from "./actions";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this time entry?")) return;
        startTransition(async () => {
          await deleteEntryAction(entryId);
          router.refresh();
        });
      }}
      className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-60"
    >
      Delete
    </button>
  );
}
