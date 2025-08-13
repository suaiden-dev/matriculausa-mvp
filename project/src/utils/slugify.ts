/**
 * Converts a string to a URL-friendly slug
 * @param str - The string to convert
 * @returns A URL-friendly slug
 */
export function slugify(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
