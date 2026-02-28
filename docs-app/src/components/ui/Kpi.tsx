interface KpiProps {
  label: string;
  value: string;
  detail?: string;
  status?: 'positive' | 'negative' | 'neutral';
}

export function Kpi({ label, value, detail, status = 'neutral' }: KpiProps) {
  return (
    <div className={`kpi kpi-${status}`} role="group" aria-label={`${label}: ${value}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {detail && <div className="kpi-detail">{detail}</div>}
    </div>
  );
}
