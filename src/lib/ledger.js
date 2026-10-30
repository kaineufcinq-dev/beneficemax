export function buildEntries(snapshots) {
  const entries = [];
  let previous = { amount_cents: 0, participant_count: 0 };

  for (const current of snapshots) {
    const deltaCents = current.amount_cents - previous.amount_cents;
    const deltaClients = current.participant_count - previous.participant_count;

    if (deltaCents > 0 || deltaClients > 0) {
      entries.push({
        at: new Date(current.checked_at),
        deltaCents: Math.max(deltaCents, 0),
        deltaClients: Math.max(deltaClients, 0),
        totalCents: current.amount_cents,
        totalClients: current.participant_count,
      });
    }

    previous = current;
  }

  return entries;
}

export function summarize(snapshots, entries) {
  const latest = snapshots.at(-1);
  const now = new Date();
  const todayEntries = entries.filter((entry) => isSameDay(entry.at, now));

  return {
    totalCents: latest?.amount_cents ?? 0,
    totalClients: latest?.participant_count ?? 0,
    entryCount: entries.length,
    todayCents: todayEntries.reduce((sum, entry) => sum + entry.deltaCents, 0),
    todayCount: todayEntries.length,
  };
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
