interface ReadingCardProps {
  label: string;
  value: string;
}

export function ReadingCard({ label, value }: ReadingCardProps) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
    </div>
  );
}
