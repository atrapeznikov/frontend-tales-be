const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes a value for safe interpolation into HTML text or double/single-quoted
 * attribute contexts. Use this for ANY user-controlled value that is rendered
 * into a server-built HTML string (admin confirmation pages, notification
 * emails, etc.) to prevent stored/reflected XSS.
 *
 * Returns an empty string for null/undefined.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITY_MAP[char]);
}
