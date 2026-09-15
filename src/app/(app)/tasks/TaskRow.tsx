"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/Badge";
import { updateTaskStatusAction, deleteTaskAction } from "./actions";

const STATUSES = ["To Do", "In Progress", "Waiting", "Done"];

interface TaskRowProps {
  id: string;
  taskName: string;
  status: string;
  priority: string;
  category: string;
  dueDate: Date | null;
  waitingOn: string | null;
  relatedLabel: string | null;
  highlighted: boolean;
}

export function TaskRow(task: TaskRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <tr className={task.highlighted ? "bg-amber-50" : "hover:bg-neutral-50"}>
      <td className="px-4 py-2">
        <p className="text-sm text-neutral-800">{task.taskName}</p>
        {task.waitingOn && (
          <p className="text-xs text-neutral-400">Waiting on: {task.waitingOn}</p>
        )}
      </td>
      <td className="px-4 py-2 text-sm text-neutral-500">{task.relatedLabel ?? "—"}</td>
      <td className="px-4 py-2">
        <Badge label={task.category} />
      </td>
      <td className="px-4 py-2">
        <Badge label={task.priority} />
      </td>
      <td className="px-4 py-2 text-sm text-neutral-500">{formatDate(task.dueDate)}</td>
      <td className="px-4 py-2">
        <select
          value={task.status}
          disabled={pending}
          onChange={(e) => {
            const value = e.target.value;
            startTransition(async () => {
              await updateTaskStatusAction(task.id, value);
              router.refresh();
            });
          }}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs disabled:opacity-60"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-right">
        <button
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete task "${task.taskName}"?`)) return;
            startTransition(async () => {
              await deleteTaskAction(task.id);
              router.refresh();
            });
          }}
          className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-60"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
