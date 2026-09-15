"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/dates";
import { CONTENT_STATUSES } from "@/lib/constants";
import { updateContentStatusAction } from "./actions";

interface ContentRowProps {
  id: string;
  title: string;
  contentType: string;
  platform: string | null;
  status: string;
  dueDate: Date | null;
  canvaUrl: string | null;
  capcutUrl: string | null;
  googleDriveUrl: string | null;
  highlighted: boolean;
}

export function ContentRow(item: ContentRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <tr className={item.highlighted ? "bg-amber-50" : "hover:bg-neutral-50"}>
      <td className="px-4 py-2">
        <p className="text-sm text-neutral-800">{item.title}</p>
        <div className="mt-0.5 flex gap-2 text-xs">
          {item.canvaUrl && <a href={item.canvaUrl} target="_blank" rel="noreferrer" className="text-neutral-500 hover:underline">Canva</a>}
          {item.capcutUrl && <a href={item.capcutUrl} target="_blank" rel="noreferrer" className="text-neutral-500 hover:underline">CapCut</a>}
          {item.googleDriveUrl && <a href={item.googleDriveUrl} target="_blank" rel="noreferrer" className="text-neutral-500 hover:underline">Drive</a>}
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-neutral-500">{item.contentType}</td>
      <td className="px-4 py-2 text-sm text-neutral-500">{item.platform ?? "—"}</td>
      <td className="px-4 py-2 text-sm text-neutral-500">{formatDate(item.dueDate)}</td>
      <td className="px-4 py-2">
        <select
          value={item.status}
          disabled={pending}
          onChange={(e) => {
            const value = e.target.value;
            startTransition(async () => {
              await updateContentStatusAction(item.id, value);
              router.refresh();
            });
          }}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs disabled:opacity-60"
        >
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}
