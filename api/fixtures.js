const BASE = "https://api.livetennisapi.com/api/public/v1";
let memoryCache = null;
let memoryCacheAt = 0;
const CACHE_MS = 2 * 60 * 1000;

function normalizedStatus(m) {
  const raw = String(m.status || m.state || m.match_status || "").toLowerCase().trim();
  if (["live","in progress","in_progress","playing","started","ongoing"].includes(raw)) return "live";
  if (["finished","complete","completed","final","ended"].includes(raw)) return "finished";
  if (["scheduled","upcoming","not started","not_started","pending"].includes(raw)) return "scheduled";
  return raw || "scheduled";
}

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
      res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
      return res.status(200).json({ ...memoryCache, meta: { ...memoryCache.meta, cached: true } });
    }
    const [atpData,wtaData,challengerData] = await Promise.all([
      upstream("/fixtures?tour=atp&draw=singles&limit=100", key),
      upstream("/fixtures?tour=wta&draw=singles&limit=100", key),
      upstream("/fixtures?tour=challenger&draw=singles&limit=100", key)
    ]);
    const rows = [atpData,wtaData,challengerData].flatMap(x=>Array.isArray(x.data)?x.data:[]);
    const unique = [...new Map(rows.map(m=>[m.id,m])).values()].map(m=>({...m,status:normalizedStatus(m)}));
    const byTime = (a,b) => {
      const ta = a.start_time ? new Date(a.start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.start_time ? new Date(b.start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return ta-tb;
    };
    const now = Date.now();
    // Safety guard: provider status can occasionally mark future fixtures as live.\n    // A fixture can only be LIVE once its scheduled start time has been reached.\n    const trulyLive = unique.filter(m => {\n      if (m.status !== "live") return false;\n      if (!m.start_time) return true;\n      const starts = new Date(m.start_time).getTime();\n      return Number.isFinite(starts) && starts <= now;\n    }).sort(byTime);
    const scheduled = unique.filter(m => {
      const starts = m.start_time ? new Date(m.start_time).getTime() : 0;
      // Future time always wins over a bad upstream LIVE flag.\n      if (m.start_time) {\n        const starts = new Date(m.start_time).getTime();\n        if (Number.isFinite(starts) && starts > now) return true;\n      }\n      return m.status === "scheduled";
    }).sort(byTime);
    const finished = unique.filter(m => m.status === "finished").sort((a,b)=>byTime(b,a));
    const ordered = [...trulyLive, ...scheduled, ...finished.slice(0,10)].slice(0, 60);
    const payload = { data: ordered, meta: { total: ordered.length, scheduled: scheduled.length, live: trulyLive.length, finished: finished.length, scope: "ATP/WTA/Challenger singles", itfEnabled: false, cached: false } };
    memoryCache = payload;
    memoryCacheAt = Date.now();
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    res.status(200).json(payload);
  } catch (e) {
    if (memoryCache) {
      res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
      return res.status(200).json({ ...memoryCache, meta: { ...memoryCache.meta, cached: true, stale: true } });
    }
    res.status(502).json({ error: e.message || "Could not reach tennis data provider" });
  }
}
