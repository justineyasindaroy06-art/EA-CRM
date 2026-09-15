"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

export function ActionButton({
  action,
  children,
  className,
  confirmMessage,
  variant = "secondary",
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        startTransition(async () => {
          await action();
          router.refresh();
        });
      }}
      className={clsx(
        "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60",
        variant === "primary" && "bg-neutral-900 text-white hover:bg-neutral-800",
        variant === "secondary" && "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
    >
      {pending ? "..." : children}
    </button>
  );
}
