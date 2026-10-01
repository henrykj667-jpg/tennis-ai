// NHL development data client.
// Uses the public read-only endpoints used by NHL's web properties.
// Keep this isolated so the provider can be replaced without touching model logic.

const BASE="https://api-web.nhle.com";

async function getJson(path){
 const r=await fetch(BASE+path,{headers:{"Accept":"application/json","User-Agent":"SPORTAI-development"}});
 if(!r.ok)throw new Error("NHL data request failed: "+r.status+" "+path);
 return r.json();
}

export async function getRoster(team,season){
 return getJson(`/v1/roster/${encodeURIComponent(team)}/${season}`);
}

export async function getPlayerGameLog(playerId,season,gameType=2){
 return getJson(`/v1/player/${playerId}/game-log/${season}/${gameType}`);
}

export function gamesBefore(raw,cutoffDate){
 const rows=raw?.gameLog||raw?.games||[];
 return rows.filter(g=>{
  const d=g.gameDate||g.date;
  return d&&String(d)<String(cutoffDate);
 });
}

export function playerSnapshotFromLog(player,raw,cutoffDate,recentN=10){
 const games=gamesBefore(raw,cutoffDate);
 const recent=games.slice(0,recentN);
 const sum=(xs,key)=>xs.reduce((s,x)=>s+(Number(x[key])||0),0);
 const toiToMinutes=v=>{
  if(typeof v==="number")return v;
  if(typeof v!=="string")return 0;
  const [m,s="0"]=v.split(":").map(Number);return (m||0)+(s||0)/60;
 };
 const toi=games.reduce((s,g)=>s+toiToMinutes(g.toi||g.timeOnIce),0);
 const rtoi=recent.reduce((s,g)=>s+toiToMinutes(g.toi||g.timeOnIce),0);
 return {
  playerId:player.id??player.playerId,
  name:[player.firstName?.default??player.firstName,player.lastName?.default??player.lastName].filter(Boolean).join(" "),
  games:games.length,
  points:sum(games,"goals")+sum(games,"assists"),
  toiMinutes:toi,
  recentPoints:sum(recent,"goals")+sum(recent,"assists"),
  recentToiMinutes:rtoi,
  expectedActive:true,
  cutoffDate
 };
}
