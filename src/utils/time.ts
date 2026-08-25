/**
 * Formats a Date object into a readable Indian editorial string (e.g., "25 Aug 2026").
 */
export function formatDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Calculates estimated reading time for an article content string.
 */
export function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const wpm = 200; // Average reading speed
  return Math.max(1, Math.ceil(words / wpm));
}
