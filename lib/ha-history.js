// HockeyAllsvenskan historical adapter.
// Source parsing stays isolated from the prediction model.
export function normalizeHAGame(raw){
  const home=raw.home||raw.homeTeam||raw.home_team;
  const away=raw.away||raw.awayTeam||raw.away_team;
  const homeGoals=Number(raw.homeGoals??raw.home_goals??raw.homeScore);
  const awayGoals=Number(raw.awayGoals??raw.away_goals??raw.awayScore);
  const period=String(raw.lastPeriodType||raw.periodType||raw.decision||"").toUpperCase();
  const regulationTie=raw.regulationTie===true||["OT","SO","GWS"].includes(period);
  return {id:String(raw.id??raw.gameId??[raw.date,home,away].join("|")),date:raw.date,home,away,homeGoals,awayGoals,regulationTie,lastPeriodType:period||null};
}
export function auditHAGames(rows){
  const ids=new Set(),errors=[];
  rows.forEach((g,i)=>{
    if(!g.date||!g.home||!g.away)errors.push("missing identity @"+i);
    if(!Number.isFinite(g.homeGoals)||!Number.isFinite(g.awayGoals))errors.push("invalid score @"+i);
    if(g.home===g.away)errors.push("same team @"+i);
    if(ids.has(g.id))errors.push("duplicate "+g.id);
    ids.add(g.id);
  });
  return {games:rows.length,uniqueIds:ids.size,valid:errors.length===0,errors};
}
export function normalizeHASeason(rawRows){
  return rawRows.map(normalizeHAGame).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
