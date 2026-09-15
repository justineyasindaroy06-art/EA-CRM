"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const MOBILE_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Meetings" },
  { href: "/leads", label: "Leads" },
  { href: "/clients", label: "Clients" },
  { href: "/time", label: "Timer" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-neutral-200 bg-white md:hidden">
      {MOBILE_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex-1 py-2.5 text-center text-xs font-medium",
              active ? "text-neutral-900" : "text-neutral-400"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
