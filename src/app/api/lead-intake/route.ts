import { NextRequest, NextResponse } from "next/server";
import { leadIntakeSchema } from "@/lib/validations";
import { handleLeadIntake } from "@/lib/automations/lead-intake";

/**
 * Public webhook for the website lead-intake form (spec section 8, 10, 29).
 * Not behind auth (see proxy.ts PUBLIC_PATHS) since the public website posts
 * to it directly. Protect it in production by keeping workspaceId values
 * private and/or adding a shared-secret header check.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const lead = await handleLeadIntake(parsed.data);
    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process lead" },
      { status: 500 }
    );
  }
}
