import {seasonGames,auditGames} from "../lib/nhl-history.js";
import {walkForward,tuneEloHoldout} from "../lib/nhl-backtest.js";

export default async function handler(req,res){
 try{
  const season=String(req.query?.season||"20252026");
  if(!/^20\d{6}$/.test(season))return res.status(400).json({error:"season must be YYYYYYYY"});
  const games=await seasonGames(season),audit=auditGames(games);
  if(!audit.valid)return res.status(500).json({season,audit,error:"Historical data audit failed"});
  const result=walkForward(games,{eloWeight:0});
  const eloCandidate=walkForward(games,{eloWeight:0.35});
  const warmup=Math.min(100,result.rows.length);
  const scored=result.rows.slice(warmup),eloScored=eloCandidate.rows.slice(warmup);
  const avg=k=>scored.length?scored.reduce((s,r)=>s+r[k],0)/scored.length:null;
  res.setHeader("Cache-Control","s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json({
   model:"SPORTAI NHL historical baseline v0.1",
   season,audit,warmupGames:warmup,evaluatedGames:scored.length,
   scorecard:{brier:avg("brier"),logLoss:avg("logLoss"),goalMAE:avg("goalAE")},
   eloHomeCandidate:{weight:0.35,brier:eloScored.reduce((s,r)=>s+r.brier,0)/eloScored.length,logLoss:eloScored.reduce((s,r)=>s+r.logLoss,0)/eloScored.length,goalMAE:eloScored.reduce((s,r)=>s+r.goalAE,0)/eloScored.length},
   calibrationNote:"Chronological walk-forward; each result updates the model only after its prediction.",
   holdoutTest:tuneEloHoldout(games),
   regulationNote:"OT/SO games are evaluated as draws after 60 minutes.",
   sample:scored.slice(-10)
  });
 }catch(e){return res.status(500).json({error:e.message});}
}
