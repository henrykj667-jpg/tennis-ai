// Player-impact layer for NHL model development.
// Pure model logic: feed verified pre-game lineup/player data from a licensed source.
// No player values are invented here.

const DEFAULTS={priorGames:12,recentWeight:.35,maxTeamGoalShift:.55};

function shrink(rate,games,leagueRate,priorGames){
 if(!Number.isFinite(rate)||!Number.isFinite(games)||games<=0)return leagueRate;
 return (rate*games+leagueRate*priorGames)/(games+priorGames);
}

export function playerImpact(player,league,opts=DEFAULTS){
 if(!player||!league)return 0;
 const games=player.games||0;
 const toiShare=Number.isFinite(player.toiShare)?player.toiShare:0;
 const season=shrink(player.pointsPer60,games,league.pointsPer60,opts.priorGames);
 const recent=Number.isFinite(player.recentPointsPer60)?player.recentPointsPer60:season;
 const production=(1-opts.recentWeight)*season+opts.recentWeight*recent;
 const offense=(production-league.pointsPer60)*toiShare;
 const shot=Number.isFinite(player.xgShare)&&Number.isFinite(league.xgShare)
   ?(player.xgShare-league.xgShare)*toiShare:0;
 return +(offense*.22+shot*.08).toFixed(4);
}

export function lineupAdjustment(players,league,opts=DEFAULTS){
 if(!Array.isArray(players)||!players.length)return {goalShift:0,status:"unknown",players:0};
 const active=players.filter(p=>p&&p.expectedActive!==false);
 const raw=active.reduce((s,p)=>s+playerImpact(p,league,opts),0);
 return {
  goalShift:+Math.max(-opts.maxTeamGoalShift,Math.min(opts.maxTeamGoalShift,raw)).toFixed(3),
  status:"verified-lineup",
  players:active.length
 };
}

export function applyPlayerLayer(expectedGoals,awayAdj,homeAdj){
 if(!expectedGoals)return null;
 return {
  home:+Math.max(.5,expectedGoals.home+(homeAdj?.goalShift||0)).toFixed(2),
  away:+Math.max(.5,expectedGoals.away+(awayAdj?.goalShift||0)).toFixed(2)
 };
}
