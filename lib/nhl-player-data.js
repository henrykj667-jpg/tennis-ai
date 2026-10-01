// Historical NHL player-data adapter for model development.
// Normalizes pre-game player snapshots into the player-impact layer.
// Source-specific fetching stays outside this module so the model can swap providers later.

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};

export function normalizePlayer(row){
 if(!row)return null;
 const games=num(row.gamesPlayed??row.games??row.gp)??0;
 const points=num(row.points);
 const toiMinutes=num(row.toiMinutes??row.toi);
 const xgFor=num(row.xgFor),xgAgainst=num(row.xgAgainst);
 const recentPoints=num(row.recentPoints),recentToi=num(row.recentToiMinutes);
 return {
  playerId:row.playerId??row.id??null,
  name:row.name??row.playerName??null,
  team:row.team??null,
  games,
  expectedActive:row.expectedActive!==false,
  pointsPer60:games>0&&points!==null&&toiMinutes>0?+(points*60/toiMinutes).toFixed(4):null,
  recentPointsPer60:recentPoints!==null&&recentToi>0?+(recentPoints*60/recentToi).toFixed(4):null,
  toiShare:toiMinutes>0&&games>0?+Math.min(1,toiMinutes/(games*60)).toFixed(4):0,
  xgShare:xgFor!==null&&xgAgainst!==null&&xgFor+xgAgainst>0?+(xgFor/(xgFor+xgAgainst)).toFixed(4):null
 };
}

export function buildPregameSnapshot({date,team,players=[]}){
 return {
  date,team,
  players:players.map(normalizePlayer).filter(Boolean),
  generatedFrom:"pregame-only",
  leakageGuard:true
 };
}

export function validateSnapshot(snapshot,gameDate){
 const errors=[];
 if(!snapshot?.date)errors.push("missing snapshot date");
 if(snapshot?.date&&gameDate&&String(snapshot.date)>String(gameDate))errors.push("snapshot is after game date");
 if(!snapshot?.team)errors.push("missing team");
 if(!Array.isArray(snapshot?.players)||!snapshot.players.length)errors.push("no players");
 return {valid:errors.length===0,errors};
}
