import { formatEuro, formatRelative } from "../lib/format.js";

const MAX_ITEMS = 8;

export default function ActivityFeed({ entries }) {
  const recent = entries.slice(-MAX_ITEMS).reverse();

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Activité récente</h2>
          <p className="panel-subtitle">Dernières entrées</p>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="empty-state">Aucune entrée pour le moment.</p>
      ) : (
        <ul className="feed">
          {recent.map((entry, index) => (
            <li
              key={entry.at.getTime()}
              className="feed-item"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="feed-dot" aria-hidden="true" />
              <div className="feed-body">
                <p className="feed-title">Nouvelle entrée</p>
                <p className="feed-meta">
                  {formatRelative(entry.at)}
                  {entry.deltaClients > 0 && ` · +${entry.deltaClients} client${entry.deltaClients > 1 ? "s" : ""}`}
                </p>
              </div>
              {entry.deltaCents > 0 && (
                <span className="feed-amount">+{formatEuro(entry.deltaCents)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
