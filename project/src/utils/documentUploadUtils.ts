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

    if (thisGroup.length === 0) break;

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
 * Strips the leading timestamp prefix (e.g. "1779164388763_" or "1779164388763-")
 * and URL-decodes the result.
 */
export function getFileName(fileUrl: string): string {
  const segment = fileUrl.split('/').pop() || fileUrl;
  const withoutTimestamp = segment
    .replace(/^\d{10,}_/, '')
    .replace(/^\d{10,}-/, '');
  try {
    return decodeURIComponent(withoutTimestamp);
  } catch {
    return withoutTimestamp;
  }
}
