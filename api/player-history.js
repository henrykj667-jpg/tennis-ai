const BASE="https://api.livetennisapi.com/api/public/v1";
async function get(path,key){const r=await fetch(BASE+path,{headers:{Authorization:"Bearer "+key}});const t=await r.text();if(!r.ok)throw new Error("API "+r.status+": "+t.slice(0,160));return JSON.parse(t)}
export default async function handler(req,res){
 const key=process.env.LIVE_TENNIS_API_KEY,id=String(req.query?.id||"").replace(/[^0-9]/g,"");
 if(!key)return res.status(500).json({error:"API key missing"});if(!id)return res.status(400).json({error:"player id required"});
 try{
  const fixture=await get("/fixtures?player_id="+id+"&limit=100",key);
  let rows=Array.isArray(fixture.data)?fixture.data:[];
  rows=rows.filter(m=>String(m.player1_id)===id||String(m.player2_id)===id);
  res.setHeader("Cache-Control","s-maxage=3600, stale-while-revalidate=600");
  return res.status(200).json({data:rows,source:"fixtures",meta:{count:rows.length}});
 }catch(e){return res.status(502).json({error:e.message||"History fetch failed"})}
}