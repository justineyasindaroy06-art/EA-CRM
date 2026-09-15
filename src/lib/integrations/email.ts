import { prisma } from "../prisma";
import { isTestMode, gmailConfigured } from "./types";
import { sendGmailMessage } from "./gmail";

interface SendEmailParams {
  workspaceId: string;
  templateKey: string;
  to: string;
  variables?: Record<string, string>;
  relatedRecordType?: string;
  relatedRecordId?: string;
}

function renderTemplate(body: string, variables: Record<string, string> = {}) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}

/**
 * Sends (or, in test mode / without Gmail credentials, simulates sending) an
 * automation email. Always writes an AutomationRun log entry so runs are
 * auditable and retry-safe (spec section 30, 31, 40).
 */
export async function sendAutomationEmail(params: SendEmailParams) {
  const template = await prisma.emailTemplate.findUnique({ where: { key: params.templateKey } });

  if (!template) {
    await prisma.automationRun.create({
      data: {
        workspaceId: params.workspaceId,
        automationName: `email:${params.templateKey}`,
        relatedRecordType: params.relatedRecordType,
        relatedRecordId: params.relatedRecordId,
        status: "error",
        error: `No email template configured for key "${params.templateKey}"`,
        testMode: isTestMode(),
      },
    });
    return { sent: false, reason: "template_missing" as const };
  }

  if (!template.enabled) {
    await prisma.automationRun.create({
      data: {
        workspaceId: params.workspaceId,
        automationName: `email:${params.templateKey}`,
        relatedRecordType: params.relatedRecordType,
        relatedRecordId: params.relatedRecordId,
        status: "skipped",
        error: "Template disabled in Settings",
        testMode: isTestMode(),
      },
    });
    return { sent: false, reason: "disabled" as const };
  }

  const subject = renderTemplate(template.subject, params.variables);
  const body = renderTemplate(template.body, params.variables);
  const mocked = isTestMode() || !gmailConfigured();

  if (mocked) {
    await prisma.automationRun.create({
      data: {
        workspaceId: params.workspaceId,
        automationName: `email:${params.templateKey}`,
        relatedRecordType: params.relatedRecordType,
        relatedRecordId: params.relatedRecordId,
        status: "success",
        error: `MOCK SEND to ${params.to}: "${subject}"`,
        testMode: true,
      },
    });
    return { sent: true, mocked: true, subject, body };
  }

  // Real send via the Gmail API (production-readiness item 4). Never record
  // a "success" AutomationRun if Gmail actually rejected the message — the
  // caller (and the automation) must be able to tell a real failure from a
  // real send.
  try {
    const { messageId } = await sendGmailMessage({ to: params.to, subject, body });

    await prisma.automationRun.create({
      data: {
        workspaceId: params.workspaceId,
        automationName: `email:${params.templateKey}`,
        relatedRecordType: params.relatedRecordType,
        relatedRecordId: params.relatedRecordId,
        status: "success",
        error: null,
        metadata: JSON.stringify({ gmailMessageId: messageId, to: params.to }),
        testMode: false,
      },
    });

    return { sent: true, mocked: false, subject, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Gmail send error";

    await prisma.automationRun.create({
      data: {
        workspaceId: params.workspaceId,
        automationName: `email:${params.templateKey}`,
        relatedRecordType: params.relatedRecordType,
        relatedRecordId: params.relatedRecordId,
        status: "error",
        error: message,
        testMode: false,
      },
    });

    return { sent: false, mocked: false, reason: "gmail_error" as const, error: message };
  }
}
