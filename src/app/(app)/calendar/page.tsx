import Link from "next/link";
import { clsx } from "clsx";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId, getAllWorkspaces } from "@/lib/workspace";
import { startOfToday, endOfToday } from "@/lib/dates";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { MeetingCard } from "./MeetingCard";
import { NewMeetingForm } from "./NewMeetingForm";

const VIEWS = ["Today", "Upcoming", "All"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "Upcoming";
  const workspaceId = await getCurrentWorkspaceId();
  const scope: Record<string, unknown> = workspaceId ? { workspaceId } : {};

  const where: Record<string, unknown> = { ...scope };
  if (view === "Today") {
    where.startAt = { gte: startOfToday(), lte: endOfToday() };
  } else if (view === "Upcoming") {
    where.status = "Scheduled";
    where.startAt = { gte: startOfToday() };
  }

  const [meetings, workspaces, clients] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: {
        client: { include: { contact: true } },
        lead: { include: { contact: true } },
      },
      orderBy: { startAt: view === "All" ? "desc" : "asc" },
    }),
    getAllWorkspaces(),
    prisma.client.findMany({ where: scope, include: { contact: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Meetings and Google Meet links."
        actions={
          <NewMeetingForm
            workspaces={workspaces}
            clients={clients.map((c) => ({ id: c.id, workspaceId: c.workspaceId, label: `${c.contact.firstName} ${c.contact.lastName}` }))}
            defaultWorkspaceId={workspaceId ?? workspaces[0]?.id}
          />
        }
      />

      <div className="mb-4 flex gap-1 rounded-md border border-neutral-200 bg-white p-1 w-fit">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={`/calendar?view=${v}`}
            className={clsx(
              "rounded px-3 py-1.5 text-sm font-medium",
              view === v ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
            )}
          >
            {v}
          </Link>
        ))}
      </div>

      {meetings.length === 0 ? (
        <EmptyState message="No meetings scheduled." />
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white px-4">
          <ul className="divide-y divide-neutral-100">
            {meetings.map((m) => (
              <MeetingCard
                key={m.id}
                id={m.id}
                title={m.title}
                meetingType={m.meetingType}
                startAt={m.startAt}
                status={m.status}
                googleMeetUrl={m.googleMeetUrl}
                externalCalendarEventId={m.externalCalendarEventId}
                notes={m.notes}
                who={m.client ? `${m.client.contact.firstName} ${m.client.contact.lastName}` : m.lead ? `${m.lead.contact.firstName} ${m.lead.contact.lastName}` : null}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
