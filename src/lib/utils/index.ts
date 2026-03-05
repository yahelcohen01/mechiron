export { formatRevision, defaultSubject, getQuantity } from '../types';

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
