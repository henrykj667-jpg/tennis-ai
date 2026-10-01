const BASE = "https://api.livetennisapi.com/api/public/v1";

export default async function handler(req, res) {
  const key = process.env.LIVE_TENNIS_API_KEY;
  if (!key) return res.status(500).json({ error: "LIVE_TENNIS_API_KEY is not configured" });

  try {
    const upstream = await fetch(BASE + "/fixtures?limit=30", {
      headers: { Authorization: "Bearer " + key }
    });
    const body = await upstream.text();
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=300");
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: "Could not reach tennis data provider" });
  }
}
