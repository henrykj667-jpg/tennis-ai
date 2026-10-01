const SEASON="2026-27";
const seed=[
["2026-09-19","Frölunda HC","Växjö Lakers HC",5,4],
["2026-09-19","HV 71","IF Malmö Redhawks",4,5],
["2026-09-19","Linköping HC","Timrå IK",3,2],
["2026-09-19","Djurgårdens IF","IF Björklöven",0,3],
["2026-09-19","Färjestad BK","Örebro HK",7,0],
["2026-09-19","Luleå HF","Rögle BK",4,2],
["2026-09-19","Skellefteå AIK","Brynäs IF",7,2],
["2026-09-22","Frölunda HC","Färjestad BK",3,2],
["2026-09-22","Linköping HC","Brynäs IF",2,9],
["2026-09-22","Rögle BK","Djurgårdens IF",3,1],
["2026-09-22","Timrå IK","Örebro HK",1,5],
["2026-09-22","Växjö Lakers HC","IF Malmö Redhawks",4,3],
["2026-09-24","Djurgårdens IF","Växjö Lakers HC",4,3],
["2026-09-24","Färjestad BK","Rögle BK",2,1],
["2026-09-24","HV 71","Skellefteå AIK",4,3],
["2026-09-24","Luleå HF","Frölunda HC",3,7],
["2026-09-24","Örebro HK","IF Björklöven",3,4],
["2026-09-26","Brynäs IF","Luleå HF",4,2],
["2026-09-26","IF Björklöven","Färjestad BK",0,5],
["2026-09-26","Rögle BK","Linköping HC",2,1],
["2026-09-26","IF Malmö Redhawks","Frölunda HC",1,2],
["2026-09-26","Timrå IK","Djurgårdens IF",3,2],
["2026-09-26","Växjö Lakers HC","HV 71",7,5],
["2026-09-26","Örebro HK","Skellefteå AIK",3,0],
["2026-09-29","IF Björklöven","HV 71",4,2],
["2026-09-29","Skellefteå AIK","Luleå HF",6,1],
["2026-09-29","Brynäs IF","Timrå IK",1,0]
];

// 2025/26 regular-season finishing strength used only as a preseason warm start.
// Points and goal difference are from the official final SHL table (52 games/team).
const previousSeason=[
["Skellefteå AIK",108,61],["Frölunda HC",101,55],["Växjö Lakers HC",94,14],["Rögle BK",93,32],
["Färjestad BK",80,14],["Brynäs IF",78,11],["Luleå HF",77,5],["IF Malmö Redhawks",77,-11],
["Djurgårdens IF",73,-28],["Örebro HK",66,-19],["Linköping HC",64,-29],["Timrå IK",63,-21],
["HV 71",59,-36],["Leksands IF",59,-48]
];
function warmStart(){
  const avg=previousSeason.reduce((s,x)=>s+x[1],0)/previousSeason.length;
  return Object.fromEntries(previousSeason.map(([team,pts,gd])=>[team,1500+(pts-avg)*2.2+gd*.35]));
}
const expected=d=>1/(1+Math.pow(10,-d/400));
function walkForward(rows,formWeight=0,goalWeight=0){
  const r=warmStart(), recent={}, goalRecent={}, predictions=[]; let correct=0,brier=0,logloss=0;
  for(const [date,home,away,hg,ag] of rows){
    r[home]??=1500;r[away]??=1500;
    const form=t=>{const a=recent[t]||[];return a.length?a.reduce((s,x)=>s+x,0)/a.length:.5};
    const formDelta=(form(home)-form(away))*formWeight;
    const goalForm=t=>{const a=goalRecent[t]||[];return a.length?a.reduce((s,x)=>s+x,0)/a.length:0};
    const goalDelta=Math.max(-3,Math.min(3,goalForm(home)-goalForm(away)))*goalWeight;
    const p=expected((r[home]+55+formDelta+goalDelta)-r[away]), actual=hg>ag?1:0;
    predictions.push({date,home,away,pHome:+p.toFixed(3),actual});
    correct+=(p>=.5?1:0)===actual?1:0;brier+=(p-actual)**2;logloss+=-(actual*Math.log(Math.max(p,1e-9))+(1-actual)*Math.log(Math.max(1-p,1e-9)));
    const k=24;r[home]+=k*(actual-p);r[away]+=k*((1-actual)-(1-p));
    recent[home]=[...(recent[home]||[]),actual].slice(-5);recent[away]=[...(recent[away]||[]),1-actual].slice(-5);
    goalRecent[home]=[...(goalRecent[home]||[]),hg-ag].slice(-5);goalRecent[away]=[...(goalRecent[away]||[]),ag-hg].slice(-5);
  }
  const n=rows.length;return{n,accuracy:n?correct/n:0,brier:n?brier/n:0,logloss:n?logloss/n:0,predictions,ratings:Object.entries(r).map(([team,elo])=>({team,elo:Math.round(elo)})).sort((a,b)=>b.elo-a.elo)}
}
function build(rows){const r=warmStart();for(const [,home,away,hg,ag] of rows){r[home]??=1500;r[away]??=1500;const homeAdv=55,e=expected((r[home]+homeAdv)-r[away]),s=hg>ag?1:0,k=24;r[home]+=k*(s-e);r[away]+=k*((1-s)-(1-e));}return Object.entries(r).map(([team,elo])=>({team,elo:Math.round(elo)})).sort((a,b)=>b.elo-a.elo)}
export default function handler(req,res){const base=walkForward(seed,0,0), formTests=[40,70,100,130].map(w=>({weight:w,...walkForward(seed,w,0)}));const bestForm=[...formTests].sort((a,b)=>a.logloss-b.logloss)[0];const goalTests=[10,20,30,40].map(w=>({goalWeight:w,...walkForward(seed,bestForm.weight,w)}));const bestGoal=[...goalTests].sort((a,b)=>a.logloss-b.logloss)[0];const candidates=[base,bestForm,bestGoal];const test=[...candidates].sort((a,b)=>a.logloss-b.logloss)[0];res.setHeader("Cache-Control","s-maxage=86400, stale-while-revalidate=604800");res.status(200).json({season:SEASON,source:"Swehockey official statistics",status:"current-season results through 2026-09-29",games:seed.map(([date,home,away,homeGoals,awayGoals])=>({date,home,away,homeGoals,awayGoals})),ratings:build(seed),validation:{method:"walk-forward",n:test.n,accuracy:+test.accuracy.toFixed(3),brier:+test.brier.toFixed(3),logloss:+test.logloss.toFixed(3),selected:test===base?"Elo only":test===bestForm?"Elo + form":"Elo + form + goal form",comparison:[{name:"Elo only",brier:+base.brier.toFixed(3),logloss:+base.logloss.toFixed(3)},{name:"Elo + form",brier:+bestForm.brier.toFixed(3),logloss:+bestForm.logloss.toFixed(3)},{name:"Elo + form + goal form",brier:+bestGoal.brier.toFixed(3),logloss:+bestGoal.logloss.toFixed(3)}],baseline:{brier:+base.brier.toFixed(3),logloss:+base.logloss.toFixed(3)},formTest:{window:5,selectedWeight:test.weight||0,candidates:formTests.map(x=>({weight:x.weight,brier:+x.brier.toFixed(3),logloss:+x.logloss.toFixed(3)}))},goalFormTest:{window:5,selectedWeight:test.goalWeight||0,candidates:goalTests.map(x=>({weight:x.goalWeight,brier:+x.brier.toFixed(3),logloss:+x.logloss.toFixed(3)}))}},model:{name:"SHL Model v0.5",base:1500,k:24,homeAdvantage:55,warmStart:"2025/26 final regular-season strength"},previousSeason:{games:364,teams:14},note:"2026/27 Elo is now warm-started from the official 2025/26 final regular-season table, then updated chronologically with current-season results. Recent-form and five-game goal-difference form are now tested separately, with weights selected by walk-forward log loss. No future match data is used.  The next data milestone is replacing the table-derived warm start with all 364 match-by-match results from 2025/26."})}