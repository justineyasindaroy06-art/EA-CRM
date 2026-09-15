import { clsx } from "clsx";

const STATUS_COLORS: Record<string, string> = {
  // Generic
  active: "bg-emerald-50 text-emerald-700",
  archived: "bg-neutral-100 text-neutral-500",
  paused: "bg-amber-50 text-amber-700",

  // Leads
  "New Lead": "bg-blue-50 text-blue-700",
  Contacted: "bg-blue-50 text-blue-700",
  "Consultation Booked": "bg-indigo-50 text-indigo-700",
  "Consultation Completed": "bg-indigo-50 text-indigo-700",
  "Agreement Sent": "bg-amber-50 text-amber-700",
  "Agreement Signed": "bg-amber-50 text-amber-700",
  "Payment Pending": "bg-amber-50 text-amber-700",
  Paid: "bg-emerald-50 text-emerald-700",
  "Ready for Conversion": "bg-emerald-50 text-emerald-700",
  Nurture: "bg-purple-50 text-purple-700",
  "Re-engaged": "bg-purple-50 text-purple-700",
  "Lost / Disqualified": "bg-neutral-100 text-neutral-500",

  // Tasks
  "To Do": "bg-neutral-100 text-neutral-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Waiting: "bg-amber-50 text-amber-700",
  Done: "bg-emerald-50 text-emerald-700",

  // Priority
  Low: "bg-neutral-100 text-neutral-500",
  Medium: "bg-blue-50 text-blue-700",
  High: "bg-amber-50 text-amber-700",
  Urgent: "bg-red-50 text-red-700",

  // Meetings
  Scheduled: "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-neutral-100 text-neutral-500",

  // Content
  Idea: "bg-neutral-100 text-neutral-600",
  Draft: "bg-neutral-100 text-neutral-700",
  Design: "bg-blue-50 text-blue-700",
  Review: "bg-amber-50 text-amber-700",
  Approved: "bg-indigo-50 text-indigo-700",
  Published: "bg-emerald-50 text-emerald-700",

  // Billing
  Sent: "bg-blue-50 text-blue-700",
  "Partially Paid": "bg-amber-50 text-amber-700",
  Overdue: "bg-red-50 text-red-700",
  Draft_invoice: "bg-neutral-100 text-neutral-500",

  // Integration / scheduler status
  Mock: "bg-neutral-100 text-neutral-600",
  "Test Mode": "bg-neutral-100 text-neutral-600",
  Connected: "bg-emerald-50 text-emerald-700",
  Disconnected: "bg-neutral-100 text-neutral-500",
  Error: "bg-red-50 text-red-700",
  Configured: "bg-emerald-50 text-emerald-700",
  "Not Configured": "bg-neutral-100 text-neutral-500",
};

export function Badge({ label }: { label: string }) {
  const color = STATUS_COLORS[label] ?? "bg-neutral-100 text-neutral-600";
  return <span className={clsx("badge", color)}>{label}</span>;
}
