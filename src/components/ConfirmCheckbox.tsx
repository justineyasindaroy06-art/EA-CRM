"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ConfirmCheckbox({
  checked,
  label,
  action,
}: {
  checked: boolean;
  label: string;
  action: (checked: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.checked;
          startTransition(async () => {
            await action(value);
            router.refresh();
          });
        }}
        className="h-4 w-4 rounded border-neutral-300"
      />
      {label}
    </label>
  );
}
