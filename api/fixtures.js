const BASE = "https://api.livetennisapi.com/api/public/v1";
let memoryCache = null;
let memoryCacheAt = 0;
const CACHE_MS = 60 * 60 * 1000;

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
    const nowMs = Date.now();
    if (memoryCache && nowMs - memoryCacheAt < CACHE_MS) {
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");
      return res.status(200).json({ ...memoryCache, meta: { ...memoryCache.meta, cached: true } });
    }
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
    const now = Date.now();
    const trulyLive = unique.filter(m => m.status === "live" && (!m.start_time || new Date(m.start_time).getTime() <= now)).sort(byTime);
    const scheduled = unique.filter(m => {
      const starts = m.start_time ? new Date(m.start_time).getTime() : 0;
      return m.status === "scheduled" || m.status === "upcoming" || (m.status === "live" && starts > now);
    }).sort(byTime);
    const ordered = [...trulyLive, ...scheduled].slice(0, 60);
    const payload = { data: ordered, meta: { total: ordered.length, scheduled: scheduled.length, live: trulyLive.length, scope: "ATP/WTA/Challenger singles", itfEnabled: false, cached: false } };
    memoryCache = payload;
    memoryCacheAt = Date.now();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");
    res.status(200).json(payload);
  } catch (e) {
    if (memoryCache) {
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");
      return res.status(200).json({ ...memoryCache, meta: { ...memoryCache.meta, cached: true, stale: true } });
    }
    res.status(502).json({ error: e.message || "Could not reach tennis data provider" });
  }
}
