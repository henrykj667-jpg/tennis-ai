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
    const data = await upstream("/fixtures?limit=300", key);
    const rows = Array.isArray(data.data) ? data.data : [];
    const singles = rows.filter(m => !String(m.tour || "").includes("doubles"));
    const supported = singles.filter(m => { const t=String(m.tour||"").toLowerCase(); return !t.includes("itf") && (t.includes("atp") || t.includes("wta") || t.includes("challenger")); });
    const scheduled = supported.filter(m => m.status === "scheduled");
    const live = supported.filter(m => m.status === "live");
    const finished = supported.filter(m => m.status === "finished");
    const byTime = (a,b) => new Date(a.start_time || 0) - new Date(b.start_time || 0); const ordered = [...live.sort(byTime), ...scheduled.sort(byTime).slice(0, 30), ...finished.sort((a,b)=>byTime(b,a)).slice(0, 10)];
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=300");
    res.status(200).json({ data: ordered, meta: { total: ordered.length, scheduled: scheduled.length, live: live.length, scope: "ATP/WTA/Challenger", itfEnabled: false } });
  } catch (e) {
    res.status(502).json({ error: e.message || "Could not reach tennis data provider" });
  }
}
