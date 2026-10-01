const BASE = "https://api.livetennisapi.com/api/public/v1";
async function get(path,key){const r=await fetch(BASE+path,{headers:{Authorization:"Bearer "+key}});const t=await r.text();if(!r.ok)throw new Error("API "+r.status+": "+t.slice(0,120));return JSON.parse(t)}
export default async function handler(req,res){
 const key=process.env.LIVE_TENNIS_API_KEY;
 if(!key)return res.status(500).json({error:"API key missing"});
 const id=String(req.query?.id||"").replace(/[^0-9]/g,"");
 if(!id)return res.status(400).json({error:"player id required"});
 try{
  const paths=["/matches?player_id="+id+"&limit=30","/matches?player="+id+"&limit=30","/players/"+id+"/matches?limit=30"];
  let last;
  for(const path of paths){try{const j=await get(path,key);const rows=Array.isArray(j.data)?j.data:[];if(rows.length){res.setHeader("Cache-Control","s-maxage=3600, stale-while-revalidate=600");return res.status(200).json({data:rows,source:path})}}catch(e){last=e}}
  return res.status(200).json({data:[],warning:last?.message||"No history returned"});
 }catch(e){return res.status(502).json({error:e.message})}
}