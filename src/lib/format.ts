/**
 * Shared Indonesian date formatting — single source for screen detail + PDF export.
 * Screen previously used Intl long dates while PDF used raw split('T')[0];
 * both now resolve through these helpers.
 */

export function formatTanggalID(s: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toDateString();
  }
}

export function formatTanggalWaktuID(s: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toString();
  }
}
