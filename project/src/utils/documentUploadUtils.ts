export interface UploadRecord {
  id: string;
  uploaded_at: string;
  reviewed_at?: string | null;
  status: 'under_review' | 'approved' | 'rejected';
  file_url: string;
  [key: string]: any;
}

export interface GroupedSubmissions {
  closedGroups: UploadRecord[][];
  currentGroup: UploadRecord[];
}

/**
 * Groups individual file uploads into logical "submission rounds" using review timestamps.
 *
 * Algorithm: all uploads whose `uploaded_at` is earlier than or equal to the earliest
 * `reviewed_at` belong to the same submission round.  Once a round is fully reviewed
 * (every file is approved or rejected) it is pushed to `closedGroups`.  Uploads that
 * have not been reviewed yet (no `reviewed_at` on any remaining upload) form the
 * `currentGroup`.
 */
export function groupUploadsBySubmission(uploads: UploadRecord[]): GroupedSubmissions {
  if (uploads.length === 0) return { closedGroups: [], currentGroup: [] };

  const sorted = [...uploads].sort(
    (a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
  );

  const closedGroups: UploadRecord[][] = [];
  let remaining = [...sorted];

  while (remaining.length > 0) {
    const minReviewedAt = remaining
      .filter(u => u.reviewed_at)
      .reduce((min: number | null, u) => {
        const t = new Date(u.reviewed_at!).getTime();
        return min === null ? t : Math.min(min, t);
      }, null as number | null);

    // No reviews yet — all remaining uploads are the current pending submission
    if (minReviewedAt === null) return { closedGroups, currentGroup: remaining };

    const thisGroup = remaining.filter(
      u => new Date(u.uploaded_at).getTime() <= minReviewedAt
    );
    remaining = remaining.filter(
      u => new Date(u.uploaded_at).getTime() > minReviewedAt
    );

    // Malformed data (e.g. uploaded_at later than reviewed_at) could make no
    // upload fall into this round. Rather than silently dropping the records
    // (which leaves callers with an all-empty result for a non-empty input),
    // surface whatever is left as the current pending submission.
    if (thisGroup.length === 0) {
      return { closedGroups, currentGroup: remaining };
    }

    const allReviewed = thisGroup.every(
      u => u.status === 'rejected' || u.status === 'approved'
    );

    if (allReviewed) {
      closedGroups.push(thisGroup);
    } else {
      // Some files still pending review — this is the current active submission
      return { closedGroups, currentGroup: thisGroup };
    }
  }

  return { closedGroups, currentGroup: [] };
}

/**
 * Extracts a human-readable filename from a Supabase storage path or URL.
 * Strips query strings (?token=...), leading/trailing timestamp prefixes, and URL-decodes.
 */
export function getUploadDisplayName(upload: { file_url?: string; filename?: string | null }): string {
  if (upload.filename) return upload.filename;
  return upload.file_url ? getFileName(upload.file_url) : 'Student response file';
}

export function getFileName(fileUrl: string): string {
  const withoutQuery = fileUrl.split('?')[0];
  const segment = withoutQuery.split('/').pop() || withoutQuery;
  const clean = segment
    .replace(/^\d{10,}[_-]/, '')       // leading timestamp: 1779164388763_name.jpg
    .replace(/[_-]\d{10,}(\.[^.]+)$/, '$1'); // trailing timestamp: name_1779164388763.jpg
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
}
