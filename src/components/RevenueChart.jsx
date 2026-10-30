import { useState } from "react";
import { formatCount, formatDateTime, formatEuro } from "../lib/format.js";

const WIDTH = 640;
const HEIGHT = 260;
const PAD = 24;

export default function RevenueChart({ entries }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (entries.length === 0) {
    return (
      <section className="panel panel--chart">
        <h2 className="panel-title">Évolution du bénéfice</h2>
        <p className="empty-state">Les premières entrées apparaîtront ici dès leur arrivée.</p>
      </section>
    );
  }

  const maxValue = Math.max(...entries.map((entry) => entry.totalCents), 1);
  const count = entries.length;

  const points = entries.map((entry, index) => {
    const x = count === 1 ? WIDTH / 2 : PAD + (index * (WIDTH - PAD * 2)) / (count - 1);
    const y = HEIGHT - PAD - (entry.totalCents / maxValue) * (HEIGHT - PAD * 2);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${points.at(-1).x.toFixed(1)},${HEIGHT - PAD} L${points[0].x.toFixed(1)},${HEIGHT - PAD} Z`;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (count - 1));
    setHoverIndex(Math.min(Math.max(index, 0), count - 1));
  };

  const active = hoverIndex !== null ? entries[hoverIndex] : null;
  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <section className="panel panel--chart">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Évolution du bénéfice</h2>
          <p className="panel-subtitle">Bénéfice cumulé au fil des entrées</p>
        </div>
      </div>

      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="chart"
          role="img"
          aria-label="Courbe du bénéfice cumulé"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#areaFill)" className="chart-area" />
          <path d={linePath} className="chart-line" pathLength="1" />
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={PAD}
                y2={HEIGHT - PAD}
                className="chart-guide"
              />
              <circle cx={activePoint.x} cy={activePoint.y} r="6" className="chart-dot" />
            </>
          )}
        </svg>

        {active && activePoint && (
          <div
            className="chart-tooltip"
            style={{ left: `${(activePoint.x / WIDTH) * 100}%` }}
          >
            <span className="chart-tooltip-date">{formatDateTime(active.at)}</span>
            <span className="chart-tooltip-value">{formatEuro(active.totalCents)}</span>
          </div>
        )}
      </div>

      <p className="chart-footer">
        {formatCount(count)} entrée{count > 1 ? "s" : ""} enregistrée{count > 1 ? "s" : ""}
      </p>
    </section>
  );
}
