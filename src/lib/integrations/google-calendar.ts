import { google } from "googleapis";
import { nanoid } from "nanoid";
import { isTestMode, googleConfigured } from "./types";
import { getAuthorizedGoogleClient, recordGoogleApiError, clearGoogleApiError } from "./google-oauth";

interface CreateMeetingParams {
  title: string;
  startAt: Date;
  endAt: Date;
  attendeeEmail?: string;
}

interface CreateMeetingResult {
  externalCalendarEventId: string;
  googleMeetUrl: string;
  mocked: boolean;
}

/**
 * Creates a Google Calendar event with a Meet link. Without configured
 * Google OAuth credentials (or in test mode), returns a clearly-fake mocked
 * event so the rest of the app can be built and tested end to end
 * (spec section 17, 29, 46). Once connected, creates a real event with a
 * real Google Meet conference attached.
 */
export async function createCalendarEvent(
  params: CreateMeetingParams
): Promise<CreateMeetingResult> {
  const mocked = isTestMode() || !googleConfigured();

  if (mocked) {
    const id = nanoid(10);
    return {
      externalCalendarEventId: `mock_event_${id}`,
      googleMeetUrl: `https://meet.google.com/mock-${id}`,
      mocked: true,
    };
  }

  try {
    const auth = await getAuthorizedGoogleClient();
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: params.title,
        start: { dateTime: params.startAt.toISOString() },
        end: { dateTime: params.endAt.toISOString() },
        attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
        conferenceData: {
          createRequest: {
            requestId: nanoid(16),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    await clearGoogleApiError();

    const event = response.data;
    const meetUrl = event.hangoutLink ?? event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;

    if (!event.id || !meetUrl) {
      throw new Error("Google Calendar created the event but did not return an event ID or Meet link.");
    }

    return { externalCalendarEventId: event.id, googleMeetUrl: meetUrl, mocked: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Google Calendar API error";
    await recordGoogleApiError(message);
    throw new Error(`Google Calendar event creation failed: ${message}`);
  }
}

export interface GoogleCalendarEventSummary {
  id: string;
  status: string;
  htmlLink: string | null;
  googleMeetUrl: string | null;
  start: string | null;
  end: string | null;
}

/**
 * Fetches the current state of a previously-created event by its external
 * ID — used to keep a CRM meeting in sync with Google Calendar (e.g. if it
 * was rescheduled or cancelled directly in Google) and to confirm the real
 * Meet link is still valid (spec production-readiness item 2).
 */
export async function getCalendarEvent(externalCalendarEventId: string): Promise<GoogleCalendarEventSummary> {
  if (isTestMode() || !googleConfigured()) {
    throw new Error("Google Calendar is in mock mode — there is no real event to fetch.");
  }

  try {
    const auth = await getAuthorizedGoogleClient();
    const calendar = google.calendar({ version: "v3", auth });
    const response = await calendar.events.get({ calendarId: "primary", eventId: externalCalendarEventId });
    await clearGoogleApiError();

    const event = response.data;
    return {
      id: event.id ?? externalCalendarEventId,
      status: event.status ?? "unknown",
      htmlLink: event.htmlLink ?? null,
      googleMeetUrl: event.hangoutLink ?? null,
      start: event.start?.dateTime ?? event.start?.date ?? null,
      end: event.end?.dateTime ?? event.end?.date ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Google Calendar API error";
    await recordGoogleApiError(message);
    throw new Error(`Failed to fetch Google Calendar event: ${message}`);
  }
}
