import { useEffect, useMemo, useState } from "react";
import ActivityFeed from "./components/ActivityFeed.jsx";
import KpiCard from "./components/KpiCard.jsx";
import RevenueChart from "./components/RevenueChart.jsx";
import { buildEntries, summarize } from "./lib/ledger.js";
import { formatCount, formatEuro, formatTime } from "./lib/format.js";
import { supabase } from "./lib/supabase.js";

const REFRESH_MS = 60_000;

export default function App() {
  const [state, setState] = useState({ status: "loading", snapshots: [], updatedAt: null });

  useEffect(() => {
    if (!supabase) {
      setState({ status: "error", snapshots: [], updatedAt: null });
      return undefined;
    }

    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("donation_snapshots")
        .select("amount_cents, participant_count, checked_at")
        .order("checked_at", { ascending: true })
        .limit(5000);

      if (cancelled) return;

      if (error || !Array.isArray(data)) {
        setState((previous) => ({ ...previous, status: "error" }));
        return;
      }

      setState({ status: "ready", snapshots: data, updatedAt: new Date() });
    }

    load();
    const interval = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const entries = useMemo(() => buildEntries(state.snapshots), [state.snapshots]);
  const stats = useMemo(() => summarize(state.snapshots, entries), [state.snapshots, entries]);

  if (state.status === "error") {
    return (
      <main className="shell">
        <div className="panel panel--error" role="alert">
          <h2 className="panel-title">Données indisponibles</h2>
          <p className="panel-subtitle">
            Impossible de charger le tableau de bord pour le moment. Il sera rafraîchi automatiquement.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Vue d'ensemble</p>
          <h1 className="page-title">Tableau de bord</h1>
        </div>
        <div className="live-badge" aria-live="polite">
          <span className="live-dot" aria-hidden="true" />
          <span>
            {state.updatedAt ? `En direct · mis à jour à ${formatTime(state.updatedAt)}` : "Chargement…"}
          </span>
        </div>
      </header>

      <section className="kpi-grid">
        <KpiCard
          label="Bénéfice total"
          value={formatEuro(stats.totalCents)}
          hint="Cumul depuis le début"
          accent
          delay={0}
        />
        <KpiCard
          label="Clients"
          value={formatCount(stats.totalClients)}
          hint="Clients enregistrés"
          delay={80}
        />
        <KpiCard
          label="Entrées"
          value={formatCount(stats.entryCount)}
          hint="Encaissements détectés"
          delay={160}
        />
        <KpiCard
          label="Aujourd'hui"
          value={formatEuro(stats.todayCents)}
          hint={`${formatCount(stats.todayCount)} entrée${stats.todayCount > 1 ? "s" : ""} aujourd'hui`}
          delay={240}
        />
      </section>

      <section className="content-grid">
        <RevenueChart entries={entries} />
        <ActivityFeed entries={entries} />
      </section>
    </main>
  );
}
