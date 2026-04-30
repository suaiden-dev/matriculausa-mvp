/**
 * Extracts a clean filename from a URL, stripping query strings (e.g. Supabase signed URL tokens).
 *
 * ".split('/').pop()" alone includes "?token=..." for signed URLs.
 * This helper strips the query string first.
 */
export function filenameFromUrl(url: string | null | undefined, fallback = 'document'): string {
  if (!url) return fallback;
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').pop();
    return name ? decodeURIComponent(name) : fallback;
  } catch {
    // Not a valid URL — strip query string manually
    return url.split('?')[0].split('/').pop() || fallback;
  }
}
