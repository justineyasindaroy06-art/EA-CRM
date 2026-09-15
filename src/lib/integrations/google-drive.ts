import { google, drive_v3 } from "googleapis";
import { nanoid } from "nanoid";
import { isTestMode, googleConfigured } from "./types";
import { getAuthorizedGoogleClient, recordGoogleApiError, clearGoogleApiError } from "./google-oauth";

export const DEFAULT_DRIVE_FOLDERS = [
  "01 - Contracts",
  "02 - Client Documents",
  "03 - Presentations",
  "04 - Videos & Media",
  "05 - Marketing",
  "06 - Other",
];

interface CreateClientDriveResult {
  rootUrl: string;
  folders: string[];
  mocked: boolean;
}

/** Escapes a value for safe use inside a Drive API `q` query string literal. */
function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

async function findFolderByName(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string | null> {
  const parentClause = parentId ? ` and '${escapeDriveQueryValue(parentId)}' in parents` : "";
  const q = `name='${escapeDriveQueryValue(name)}' and mimeType='${FOLDER_MIME_TYPE}' and trashed=false${parentClause}`;

  const response = await drive.files.list({ q, fields: "files(id, name)", pageSize: 1 });
  return response.data.files?.[0]?.id ?? null;
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  const existingId = await findFolderByName(drive, name, parentId);
  if (existingId) return existingId;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME_TYPE,
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error(`Google Drive did not return a folder ID when creating "${name}".`);
  }

  return created.data.id;
}

/**
 * Creates (or links) the client's root Drive folder and the standard
 * subfolder structure. Without configured Google credentials, returns a
 * mocked link and does not attempt to create real folders
 * (spec section 18, 29, 46). Once connected, this is idempotent — re-running
 * it for the same client name reuses existing folders instead of duplicating
 * them (production-readiness item 3).
 */
export async function createClientDriveStructure(
  clientName: string
): Promise<CreateClientDriveResult> {
  const mocked = isTestMode() || !googleConfigured();

  if (mocked) {
    const id = nanoid(10);
    return {
      rootUrl: `https://drive.google.com/drive/folders/mock-${id}`,
      folders: DEFAULT_DRIVE_FOLDERS,
      mocked: true,
    };
  }

  try {
    const auth = await getAuthorizedGoogleClient();
    const drive = google.drive({ version: "v3", auth });

    const rootId = await findOrCreateFolder(drive, clientName);
    for (const folderName of DEFAULT_DRIVE_FOLDERS) {
      await findOrCreateFolder(drive, folderName, rootId);
    }

    await clearGoogleApiError();

    return {
      rootUrl: `https://drive.google.com/drive/folders/${rootId}`,
      folders: DEFAULT_DRIVE_FOLDERS,
      mocked: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Google Drive API error";
    await recordGoogleApiError(message);
    throw new Error(`Google Drive folder setup failed for "${clientName}": ${message}`);
  }
}
