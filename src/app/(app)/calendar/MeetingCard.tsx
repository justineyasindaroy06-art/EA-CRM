"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/dates";
import { Badge } from "@/components/Badge";
import { completeMeetingAction, cancelMeetingAction, syncMeetingFromGoogleAction } from "./actions";

interface MeetingCardProps {
  id: string;
  title: string;
  meetingType: string;
  startAt: Date;
  status: string;
  googleMeetUrl: string | null;
  externalCalendarEventId: string | null;
  who: string | null;
  notes: string | null;
}

export function MeetingCard(m: MeetingCardProps) {
  const [showComplete, setShowComplete] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const completeWithId = completeMeetingAction.bind(null, m.id);
  const isRealEvent = Boolean(m.externalCalendarEventId) && !m.externalCalendarEventId?.startsWith("mock_event_");

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-800">{m.title}</p>
          <p className="text-xs text-neutral-400">
            {formatDateTime(m.startAt)} · {who_or_dash(m.who)} · {m.meetingType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {m.googleMeetUrl && m.status === "Scheduled" && (
            <a href={m.googleMeetUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-neutral-600 hover:underline">
              Join Meet
            </a>
          )}
          <Badge label={m.status} />
        </div>
      </div>

      {m.status === "Scheduled" && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setShowComplete((v) => !v)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50"
          >
            Mark Completed
          </button>
          <button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await cancelMeetingAction(m.id);
                router.refresh();
              });
            }}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-60"
          >
            Cancel
          </button>
          {isRealEvent && (
            <button
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await syncMeetingFromGoogleAction(m.id);
                  setSyncMessage(result.synced ? "Synced from Google Calendar." : "Nothing to sync.");
                  router.refresh();
                });
              }}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-60"
            >
              Sync from Google
            </button>
          )}
        </div>
      )}
      {syncMessage && <p className="mt-1 text-xs text-neutral-400">{syncMessage}</p>}

      {showComplete && (
        <form
          action={async (formData) => {
            await completeWithId(formData);
            setShowComplete(false);
            router.refresh();
          }}
          className="mt-2 space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3"
        >
          <div>
            <label className="block text-xs font-medium text-neutral-500">Meeting notes</label>
            <textarea name="notes" rows={2} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-neutral-500">Next Action</label>
              <input name="nextAction" className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Due</label>
              <input type="date" name="nextActionDue" className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input type="checkbox" name="createFollowUp" defaultChecked className="h-3.5 w-3.5" />
            Create a follow-up task for this
          </label>
          <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">
            Save &amp; Complete
          </button>
        </form>
      )}

      {m.notes && m.status === "Completed" && (
        <p className="mt-1 text-xs text-neutral-500">{m.notes}</p>
      )}
    </li>
  );
}

function who_or_dash(who: string | null) {
  return who ?? "—";
}
