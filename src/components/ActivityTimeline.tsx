import { formatDateTime } from "@/lib/dates";
import { EmptyState } from "./EmptyState";

interface ActivityItem {
  id: string;
  eventType: string;
  summary: string;
  createdAt: Date;
}

export function ActivityTimeline({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return <EmptyState message="No activity yet." />;
  }

  return (
    <ul className="space-y-3">
      {activities.map((a) => (
        <li key={a.id} className="flex gap-3 text-sm">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
          <div>
            <p className="text-neutral-700">{a.summary}</p>
            <p className="text-xs text-neutral-400">{formatDateTime(a.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
