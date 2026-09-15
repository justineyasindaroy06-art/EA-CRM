"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { logoutAction } from "@/app/(app)/actions";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/clients", label: "Clients" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/content", label: "Content" },
  { href: "/billing", label: "Billing" },
  { href: "/time", label: "Time" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: { id: string; name: string }[];
  currentWorkspaceId: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
      <div className="border-b border-neutral-200 px-4 py-4">
        <span className="text-sm font-semibold text-neutral-900">EA CRM</span>
      </div>

      <div className="border-b border-neutral-200 px-4 py-3">
        <WorkspaceSwitcher workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} />
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-md px-3 py-2 text-sm font-medium",
                active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={logoutAction} className="border-t border-neutral-200 px-4 py-3">
        <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-800">
          Sign out
        </button>
      </form>
    </aside>
  );
}
