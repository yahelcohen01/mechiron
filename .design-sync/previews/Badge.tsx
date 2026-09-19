import { Badge } from 'mechiron';

export function Variants() {
  return (
    <div dir="rtl" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <Badge variant="gray">טיוטה</Badge>
      <Badge variant="blue">בתהליך</Badge>
      <Badge variant="green">הושלם</Badge>
    </div>
  );
}

/** Badge also labels the RFQ domains and supplier approval state. */
export function Domains() {
  return (
    <div dir="rtl" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <Badge>חומר גלם</Badge>
      <Badge>ציפוי</Badge>
      <Badge>חישול</Badge>
      <Badge variant="green">מאושר</Badge>
      <Badge variant="blue">חד-פעמי</Badge>
    </div>
  );
}

export function InEnglish() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <Badge variant="gray">Draft</Badge>
      <Badge variant="blue">In progress</Badge>
      <Badge variant="green">Completed</Badge>
    </div>
  );
}
