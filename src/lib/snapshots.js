const SNAPSHOTS_URL = "https://koxhnfevzhqnnuhiersc.supabase.co/functions/v1/donation-snapshots";

export async function fetchSnapshots() {
  const res = await fetch(SNAPSHOTS_URL);
  if (!res.ok) {
    throw new Error(`Snapshots request failed: ${res.status}`);
  }

  const body = await res.json();
  if (!Array.isArray(body?.snapshots)) {
    throw new Error("Unexpected snapshots response");
  }

  return body.snapshots;
}
