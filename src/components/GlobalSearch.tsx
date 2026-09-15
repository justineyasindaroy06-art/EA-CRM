"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import Link from "next/link";
import { searchAction } from "@/app/(app)/search-action";
import type { SearchResult } from "@/lib/search";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        type="search"
        placeholder="Search clients, leads, tasks, invoices..."
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setOpen(true);
          startTransition(async () => {
            const r = value.trim().length >= 2 ? await searchAction(value) : [];
            setResults(r);
          });
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg">
          {pending && <div className="px-3 py-2 text-sm text-neutral-400">Searching...</div>}
          {!pending && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-400">No results</div>
          )}
          {!pending &&
            results.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50"
              >
                <span className="text-neutral-800">{r.title}</span>
                <span className="text-xs text-neutral-400">
                  {r.type} · {r.subtitle}
                </span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
