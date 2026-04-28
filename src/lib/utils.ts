import { format } from 'date-fns';

export function formatTimestamp(ts: unknown, fmt = 'MMM dd, yyyy'): string {
  if (!ts) return '-';
  try {
    const date =
      ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as any).toDate === 'function'
        ? (ts as any).toDate()
        : new Date(ts as string | number | Date);
    return format(date, fmt);
  } catch {
    return '-';
  }
}
