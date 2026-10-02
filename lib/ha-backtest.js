const K=24,HOME_ADV=45;
const expected=d=>1/(1+Math.pow(10,-d/400));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function poisson(k,l){let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*l**k/f}
function outcome60(hg,ag){let h=0,d=0,a=0;for(let x=0;x<=10;x++)for(let y=0;y<=10;y++){const p=poisson(x,hg)*poisson(y,ag);if(x>y)h+=p;else if(x===y)d+=p;else a+=p}const z=h+d+a;return[h/z,d/z,a/z]}
function score(rows,start=0){let b=0,l=0,g=0,n=0;for(const r of rows.slice(start)){const y=r.actual60==="H"?[1,0,0]:r.actual60==="D"?[0,1,0]:[0,0,1];b+=((r.p[0]-y[0])**2+(r.p[1]-y[1])**2+(r.p[2]-y[2])**2)/3;l-=Math.log(Math.max(1e-9,r.p[y.indexOf(1)]));g+=Math.abs(r.expectedTotal-r.actualTotal);n++}return{n,brier:n?b/n:null,logLoss:n?l/n:null,goalMAE:n?g/n:null}}
export function walkForward(games,{eloWeight=.25,venueWeight=.2}={}){
 const sorted=[...games].sort((a,b)=>String(a.date).localeCompare(String(b.date))),elo={},stats={},rows=[];
 const get=t=>stats[t]??={gf:0,ga:0,n:0,hgf:0,hga:0,hn:0,agf:0,aga:0,an:0};
 for(const g of sorted){elo[g.home]??=1500;elo[g.away]??=1500;const h=get(g.home),a=get(g.away);
  const league=Object.values(stats).reduce((s,x)=>s+x.gf,0)/Math.max(1,Object.values(stats).reduce((s,x)=>s+x.n,0))||2.8;
  const shrink=(sum,n,prior=10)=>(sum+league*prior)/(n+prior);
  const hFor=shrink(h.gf,h.n),hAg=shrink(h.ga,h.n),aFor=shrink(a.gf,a.n),aAg=shrink(a.ga,a.n);
  const hVenue=h.hn?shrink(h.hgf,h.hn):hFor,aVenue=a.an?shrink(a.agf,a.an):aFor;
  let hg=(hFor+aAg)/2,ag=(aFor+hAg)/2;hg=(1-venueWeight)*hg+venueWeight*(hVenue+aAg)/2;ag=(1-venueWeight)*ag+venueWeight*(aVenue+hAg)/2;
  hg=clamp(hg,1,5);ag=clamp(ag,1,5);const base=outcome60(hg,ag),eh=expected((elo[g.home]+HOME_ADV)-elo[g.away]),draw=base[1],ep=[eh*(1-draw),draw,(1-eh)*(1-draw)],p=base.map((x,i)=>x*(1-eloWeight)+ep[i]*eloWeight);
  const regulationTie=g.regulationTie===true;const actual60=regulationTie?"D":g.homeGoals>g.awayGoals?"H":"A";
  rows.push({...g,p,expectedHome:hg,expectedAway:ag,expectedTotal:hg+ag,actualTotal:g.homeGoals+g.awayGoals,actual60});
  const finalHome=g.homeGoals>g.awayGoals?1:g.homeGoals<g.awayGoals?0:.5,e=expected((elo[g.home]+HOME_ADV)-elo[g.away]);elo[g.home]+=K*(finalHome-e);elo[g.away]+=K*((1-finalHome)-(1-e));
  h.gf+=g.homeGoals;h.ga+=g.awayGoals;h.n++;h.hgf+=g.homeGoals;h.hga+=g.awayGoals;h.hn++;a.gf+=g.awayGoals;a.ga+=g.homeGoals;a.n++;a.agf+=g.awayGoals;a.aga+=g.homeGoals;a.an++;
 }
 return{rows,score:score(rows),ratings:Object.entries(elo).map(([team,rating])=>({team,elo:Math.round(rating)})).sort((a,b)=>b.elo-a.elo)}
}
export function holdout(games){
 const sorted=[...games].sort((a,b)=>String(a.date).localeCompare(String(b.date))),split=Math.floor(sorted.length*.7),weights=[0,.1,.2,.3,.4,.5],venues=[0,.15,.3,.45];
 let best=null;for(const eloWeight of weights)for(const venueWeight of venues){const r=walkForward(sorted,{eloWeight,venueWeight}),s=score(r.rows,Math.min(100,split));const trainRows=r.rows.slice(0,split),trainScore=score(trainRows,Math.min(100,trainRows.length));const c={eloWeight,venueWeight,...trainScore};if(!best||c.logLoss<best.logLoss)best=c}
 const baseline=walkForward(sorted,{eloWeight:0,venueWeight:0}),selected=walkForward(sorted,best);
 return{trainGames:split,holdoutGames:sorted.length-split,selected:{eloWeight:best.eloWeight,venueWeight:best.venueWeight},baseline:score(baseline.rows,split),candidate:score(selected.rows,split),methodology:"Chronological 70/30; weights selected on training only; holdout preserves all pre-split team state."}
}
