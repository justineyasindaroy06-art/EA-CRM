import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Case-insensitive "contains" filter, portable across SQLite (dev) and
 * Postgres (production) — a real SQLite-vs-Postgres difference found during
 * the production-readiness review: SQLite's LIKE is already
 * case-insensitive for ASCII, so Prisma's generated StringFilter type omits
 * `mode` entirely while the schema's datasource provider is "sqlite" (it's
 * simply not a valid option there). Postgres's `contains` is case-sensitive
 * unless `mode: "insensitive"` is passed explicitly. This only sets `mode`
 * when DATABASE_URL is a Postgres URL, so it's a no-op (and type-safe) today
 * under SQLite; after moving the schema's provider to "postgresql" (see
 * README "Moving to Postgres/Supabase") and regenerating the client, this
 * becomes a plain, exactly-typed filter with no code change needed.
 */
function caseInsensitiveContains(value: string): Prisma.StringFilter {
  const filter = { contains: value } as Prisma.StringFilter;
  if (process.env.DATABASE_URL?.startsWith("postgres")) {
    (filter as unknown as { mode?: "insensitive" }).mode = "insensitive";
  }
  return filter;
}

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/** Global search across Clients, Contacts, Leads, Tasks, Meetings, Content, Invoices (spec section 24). */
export async function globalSearch(query: string, workspaceId: string | null): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const scope = workspaceId ? { workspaceId } : {};
  const contains = caseInsensitiveContains(q);

  const [clients, leads, tasks, invoices, content] = await Promise.all([
    prisma.client.findMany({
      where: {
        ...scope,
        OR: [
          { contact: { firstName: contains } },
          { contact: { lastName: contains } },
          { contact: { email: contains } },
          { contact: { company: contains } },
        ],
      },
      include: { contact: true },
      take: 8,
    }),
    prisma.lead.findMany({
      where: {
        ...scope,
        OR: [
          { contact: { firstName: contains } },
          { contact: { lastName: contains } },
          { contact: { email: contains } },
          { contact: { company: contains } },
        ],
      },
      include: { contact: true },
      take: 8,
    }),
    prisma.task.findMany({
      where: { ...scope, taskName: contains },
      take: 8,
    }),
    prisma.invoice.findMany({
      where: { ...scope, invoiceNumber: contains },
      include: { client: { include: { contact: true } } },
      take: 8,
    }),
    prisma.contentItem.findMany({
      where: { ...scope, title: contains },
      take: 8,
    }),
  ]);

  const results: SearchResult[] = [];

  for (const c of clients) {
    results.push({
      type: "Client",
      id: c.id,
      title: `${c.contact.firstName} ${c.contact.lastName}`,
      subtitle: c.contact.company || c.contact.email,
      href: `/clients/${c.id}`,
    });
  }

  for (const l of leads) {
    results.push({
      type: "Lead",
      id: l.id,
      title: `${l.contact.firstName} ${l.contact.lastName}`,
      subtitle: l.status,
      href: `/leads/${l.id}`,
    });
  }

  for (const t of tasks) {
    results.push({
      type: "Task",
      id: t.id,
      title: t.taskName,
      subtitle: t.status,
      href: `/tasks?highlight=${t.id}`,
    });
  }

  for (const i of invoices) {
    results.push({
      type: "Invoice",
      id: i.id,
      title: i.invoiceNumber,
      subtitle: `${i.client.contact.firstName} ${i.client.contact.lastName}`,
      href: `/billing?highlight=${i.id}`,
    });
  }

  for (const c of content) {
    results.push({
      type: "Content",
      id: c.id,
      title: c.title,
      subtitle: c.status,
      href: `/content?highlight=${c.id}`,
    });
  }

  return results;
}
