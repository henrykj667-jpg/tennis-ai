// NHL walk-forward backtest engine.
// Feed chronological completed games: {date, away, home, awayGoals, homeGoals}.
// Each game is predicted BEFORE its result updates team ratings.
const K=20,HOME_ADV=35;
const pWin=(a,b)=>1/(1+Math.pow(10,(b-a)/400));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function pois(k,l){let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f}
function outcome60(hg,ag){let h=0,d=0,a=0;for(let x=0;x<=10;x++)for(let y=0;y<=10;y++){const p=pois(x,hg)*pois(y,ag);if(x>y)h+=p;else if(x===y)d+=p;else a+=p}const z=h+d+a;return[h/z,d/z,a/z]}
export function walkForward(games){
 const elo={},stats={};const rows=[];
 const team=t=>{elo[t]??=1500;stats[t]??={g:0,gf:0,ga:0}};
 for(const g of [...games].sort((a,b)=>String(a.date).localeCompare(String(b.date)))){
  team(g.home);team(g.away);const H=stats[g.home],A=stats[g.away];
  const league=rows.length?rows.reduce((s,r)=>s+r.actualTotal,0)/rows.length:6.1;
  const hgf=H.g?H.gf/H.g:league/2,hga=H.g?H.ga/H.g:league/2,agf=A.g?A.gf/A.g:league/2,aga=A.g?A.ga/A.g:league/2;
  const hg=clamp((hgf+aga)/2,1.5,5),ag=clamp((agf+hga)/2,1.5,5),pr=outcome60(hg,ag);
  const actual=g.homeGoals>g.awayGoals?0:g.homeGoals===g.awayGoals?1:2;
  const eps=1e-12,logLoss=-Math.log(Math.max(eps,pr[actual]));
  const brier=((pr[0]-(actual===0))**2+(pr[1]-(actual===1))**2+(pr[2]-(actual===2))**2)/3;
  rows.push({date:g.date,home:g.home,away:g.away,prob:pr,expectedTotal:hg+ag,actualTotal:g.homeGoals+g.awayGoals,brier,logLoss,goalAE:Math.abs(hg+ag-g.homeGoals-g.awayGoals)});
  const ep=pWin(elo[g.home]+HOME_ADV,elo[g.away]),score=g.homeGoals>g.awayGoals?1:g.homeGoals===g.awayGoals?.5:0;
  elo[g.home]+=K*(score-ep);elo[g.away]+=K*((1-score)-(1-ep));
  H.g++;H.gf+=g.homeGoals;H.ga+=g.awayGoals;A.g++;A.gf+=g.awayGoals;A.ga+=g.homeGoals;
 }
 const avg=k=>rows.length?rows.reduce((s,r)=>s+r[k],0)/rows.length:null;
 return{games:rows.length,brier:avg("brier"),logLoss:avg("logLoss"),goalMAE:avg("goalAE"),rows};
}
