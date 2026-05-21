/**
 * documentRequirements.ts
 *
 * Single source of truth for which document types are required in the
 * student application flow. Centralizing this avoids the previous pattern
 * of repeating ['passport', 'diploma', 'funds_proof'] in 7+ files.
 */

export const REQUIRED_DOCUMENT_TYPES = ['passport'] as const;
export type RequiredDocType = (typeof REQUIRED_DOCUMENT_TYPES)[number];

export interface ApplicationDocument {
  type: string;
  status?: string;
  url?: string;
}

/**
 * Returns which required doc types are missing from the given documents array.
 * Empty array means all required docs are present.
 */
export function getMissingRequiredDocs(documents: ApplicationDocument[]): string[] {
  const presentTypes = documents.map((d) => (d.type || '').toLowerCase());
  return REQUIRED_DOCUMENT_TYPES.filter((t) => !presentTypes.includes(t));
}

/**
 * Returns true only when all required docs are present AND all of them
 * have status 'approved'.
 */
export function canApproveApplication(documents: ApplicationDocument[]): boolean {
  const missing = getMissingRequiredDocs(documents);
  if (missing.length > 0) return false;
  const requiredDocs = documents.filter((d) =>
    (REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(d.type?.toLowerCase()),
  );
  return requiredDocs.every((d) => (d.status || '').toLowerCase() === 'approved');
}

/**
 * Builds the newEntries array for the scholarship_applications.documents JSONB.
 * Only includes passport — diploma and funds_proof are now collected via
 * Global Document Requests.
 */
export function buildDocumentEntries(passportUrl: string): { type: string; url: string }[] {
  return [{ type: 'passport', url: passportUrl }].filter((d) => d.url);
}

/**
 * Builds the payload sent to the analyze-student-documents edge function / n8n.
 * Only passport_url is included in the new flow.
 */
export function buildAnalysisWebhookPayload(
  userId: string,
  studentName: string,
  passportUrl: string,
): Record<string, string> {
  return {
    user_id: userId,
    student_name: studentName,
    passport_url: passportUrl,
  };
}
