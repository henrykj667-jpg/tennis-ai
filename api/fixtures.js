const BASE = "https://api.livetennisapi.com/api/public/v1";

async function upstream(path, key) {
  const r = await fetch(BASE + path, { headers: { Authorization: "Bearer " + key } });
  const text = await r.text();
  if (!r.ok) throw new Error("Live Tennis API " + r.status + ": " + text.slice(0,160));
  return JSON.parse(text);
}

export default async function handler(req, res) {
  const key = process.env.LIVE_TENNIS_API_KEY;
  if (!key) return res.status(500).json({ error: "LIVE_TENNIS_API_KEY is not configured" });
  try {
    const [atpData,wtaData,challengerData] = await Promise.all([
      upstream("/fixtures?tour=atp&draw=singles&limit=100", key),
      upstream("/fixtures?tour=wta&draw=singles&limit=100", key),
      upstream("/fixtures?tour=challenger&draw=singles&limit=100", key)
    ]);
    const rows = [atpData,wtaData,challengerData].flatMap(x=>Array.isArray(x.data)?x.data:[]);
    const unique = [...new Map(rows.map(m=>[m.id,m])).values()];
    const byTime = (a,b) => {
      const ta = a.start_time ? new Date(a.start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.start_time ? new Date(b.start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return ta-tb;
    };
    const scheduled = unique.filter(m => m.status === "scheduled" || m.status === "upcoming").sort(byTime);
    const live = unique.filter(m => m.status === "live").sort(byTime);
    const ordered = [...live, ...scheduled].slice(0, 60);
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=300");
    res.status(200).json({ data: ordered, meta: { total: ordered.length, scheduled: scheduled.length, live: live.length, scope: "ATP/WTA/Challenger singles", itfEnabled: false } });
  } catch (e) {
    res.status(502).json({ error: e.message || "Could not reach tennis data provider" });
  }
}
