export default function KpiCard({ label, value, hint, accent = false, delay = 0 }) {
  return (
    <article
      className={`kpi-card${accent ? " kpi-card--accent" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      <p className="kpi-hint">{hint}</p>
    </article>
  );
}
