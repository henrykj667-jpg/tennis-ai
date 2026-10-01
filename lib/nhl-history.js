// Historical NHL regular-season game importer for SPORTAI model research.
// Uses team season schedules and de-duplicates games by NHL game id.
// This module only imports completed game outcomes; it contains no odds/betting data.

const BASE="https://api-web.nhle.com";
const TEAMS=["ANA","BOS","BUF","CAR","CBJ","CGY","CHI","COL","DAL","DET","EDM","FLA","LAK","MIN","MTL","NJD","NSH","NYI","NYR","OTT","PHI","PIT","SEA","SJS","STL","TBL","TOR","UTA","VAN","VGK","WPG","WSH"];

async function json(path){
 const r=await fetch(BASE+path,{headers:{Accept:"application/json","User-Agent":"SPORTAI-development"}});
 if(!r.ok)throw new Error(`NHL request failed ${r.status}: ${path}`);
 return r.json();
}
const name=t=>t?.commonName?.default||t?.placeName?.default||t?.name?.default||t?.abbrev||"";
const score=t=>Number(t?.score);

export async function seasonGames(season){
 const all=await Promise.all(TEAMS.map(async team=>{
  const x=await json(`/v1/club-schedule-season/${team}/${season}`);
  return x.games||[];
 }));
 const unique=new Map();
 for(const g of all.flat()){
  if(g.gameType!==2||!["FINAL","OFF"].includes(g.gameState))continue;
  if(!Number.isFinite(score(g.homeTeam))||!Number.isFinite(score(g.awayTeam)))continue;
  unique.set(g.id,{
   id:g.id,date:g.gameDate,
   away:name(g.awayTeam),home:name(g.homeTeam),
   awayAbbrev:g.awayTeam?.abbrev,homeAbbrev:g.homeTeam?.abbrev,
   awayGoals:score(g.awayTeam),homeGoals:score(g.homeTeam),
   gameType:g.gameType,
   lastPeriodType:g.gameOutcome?.lastPeriodType||null,
   regulationTie:["OT","SO"].includes(g.gameOutcome?.lastPeriodType)||undefined
  });
 }
 return [...unique.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.id-b.id);
}

export function auditGames(games){
 const ids=new Set(),errors=[];
 for(const g of games){
  if(ids.has(g.id))errors.push(`duplicate ${g.id}`);ids.add(g.id);
  if(!g.date||!g.home||!g.away)errors.push(`missing identity ${g.id}`);
  if(!Number.isFinite(g.homeGoals)||!Number.isFinite(g.awayGoals))errors.push(`missing score ${g.id}`);
 }
 return {games:games.length,uniqueIds:ids.size,valid:errors.length===0,errors:errors.slice(0,20)};
}
