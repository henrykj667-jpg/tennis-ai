// NHL walk-forward backtest engine.
// Feed chronological completed games: {date, away, home, awayGoals, homeGoals}.
// Each game is predicted BEFORE its result updates team ratings.
const K=20,HOME_ADV=35;
const pWin=(a,b)=>1/(1+Math.pow(10,(b-a)/400));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function pois(k,l){let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f}
function outcome60(hg,ag){let h=0,d=0,a=0;for(let x=0;x<=10;x++)for(let y=0;y<=10;y++){const p=pois(x,hg)*pois(y,ag);if(x>y)h+=p;else if(x===y)d+=p;else a+=p}const z=h+d+a;return[h/z,d/z,a/z]}
export function walkForward(games,{eloWeight=0}={}){
 const elo={},stats={};const rows=[];
 const team=t=>{elo[t]??=1500;stats[t]??={g:0,gf:0,ga:0}};
 for(const g of [...games].sort((a,b)=>String(a.date).localeCompare(String(b.date)))){
  team(g.home);team(g.away);const H=stats[g.home],A=stats[g.away];
  const league=rows.length?rows.reduce((s,r)=>s+r.actualTotal,0)/rows.length:6.1;
  const hgf=H.g?H.gf/H.g:league/2,hga=H.g?H.ga/H.g:league/2,agf=A.g?A.gf/A.g:league/2,aga=A.g?A.ga/A.g:league/2;
  const hg=clamp((hgf+aga)/2,1.5,5),ag=clamp((agf+hga)/2,1.5,5);
  const goalPr=outcome60(hg,ag);
  const eloHome=pWin(elo[g.home]+HOME_ADV,elo[g.away]);
  // Elo is a binary final-result signal, so only redistribute H/A mass; preserve Poisson draw probability.
  const draw=goalPr[1],elo60=[eloHome*(1-draw),draw,(1-eloHome)*(1-draw)];
  const w=clamp(eloWeight,0,1),pr=goalPr.map((p,i)=>(1-w)*p+w*elo60[i]);
  const actual=g.regulationTie===true?1:g.homeGoals>g.awayGoals?0:g.homeGoals===g.awayGoals?1:2;
  const eps=1e-12,logLoss=-Math.log(Math.max(eps,pr[actual]));
  const brier=((pr[0]-(actual===0))**2+(pr[1]-(actual===1))**2+(pr[2]-(actual===2))**2)/3;
  rows.push({date:g.date,home:g.home,away:g.away,actual60:actual,prob:pr,expectedTotal:hg+ag,actualTotal:g.homeGoals+g.awayGoals,brier,logLoss,goalAE:Math.abs(hg+ag-g.homeGoals-g.awayGoals)});
  const ep=pWin(elo[g.home]+HOME_ADV,elo[g.away]),score=g.homeGoals>g.awayGoals?1:g.homeGoals===g.awayGoals?.5:0;
  elo[g.home]+=K*(score-ep);elo[g.away]+=K*((1-score)-(1-ep));
  H.g++;H.gf+=g.homeGoals;H.ga+=g.awayGoals;A.g++;A.gf+=g.awayGoals;A.ga+=g.homeGoals;
 }
 const avg=k=>rows.length?rows.reduce((s,r)=>s+r[k],0)/rows.length:null;
 return{games:rows.length,brier:avg("brier"),logLoss:avg("logLoss"),goalMAE:avg("goalAE"),eloWeight,rows};
}

export function tuneEloHoldout(games,{trainFraction=.7,warmup=100,weights=[0,.1,.2,.3,.4,.5,.6]}={}){
 const sorted=[...games].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const split=Math.max(warmup+1,Math.floor(sorted.length*trainFraction));
 const train=sorted.slice(0,split),holdout=sorted.slice(split);
 const score=(rows,start=0)=>{
  const x=rows.slice(start),avg=k=>x.length?x.reduce((s,r)=>s+r[k],0)/x.length:null;
  return {games:x.length,brier:avg("brier"),logLoss:avg("logLoss"),goalMAE:avg("goalAE")};
 };
 const candidates=weights.map(weight=>({weight,...score(walkForward(train,{eloWeight:weight}).rows,warmup)}));
 const best=[...candidates].sort((a,b)=>a.brier-b.brier||a.logLoss-b.logLoss)[0];
 // IMPORTANT: evaluate holdout as a continuation of training history.
 // Running walkForward on holdout alone would reset Elo/team stats and create an artificial cold start.
 // Elo/team state is learned only from earlier games because walkForward predicts each game before updating.
 const baselineAll=walkForward(sorted,{eloWeight:0}).rows;
 const selectedAll=walkForward(sorted,{eloWeight:best.weight}).rows;
 const baseline=score(baselineAll,split);
 const selected=score(selectedAll,split);
 return {
  trainGames:train.length,holdoutGames:holdout.length,splitIndex:split,
  weights,candidates,selectedWeight:best.weight,
  methodology:"Chronological 70/30. Weight selected on training only; holdout keeps pre-split Elo/team state and is scored only after the split.",
  holdout:{baseline,selected}
 };
}
