import { format } from 'date-fns';

type FirestoreTimestamp = { toDate: () => Date };

function isFirestoreTimestamp(val: unknown): val is FirestoreTimestamp {
  return (
    val !== null &&
    typeof val === 'object' &&
    'toDate' in val &&
    typeof (val as { toDate: unknown }).toDate === 'function'
  );
}

export function formatTimestamp(ts: unknown, fmt = 'MMM dd, yyyy'): string {
  if (!ts) return '-';
  try {
    const date = isFirestoreTimestamp(ts)
      ? ts.toDate()
      : new Date(ts as string | number | Date);
    return format(date, fmt);
  } catch {
    return '-';
  }
}
