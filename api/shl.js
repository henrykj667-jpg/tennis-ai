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
const expected=d=>1/(1+Math.pow(10,-d/400));
function build(rows){const r={};for(const [,home,away,hg,ag] of rows){r[home]??=1500;r[away]??=1500;const homeAdv=55,e=expected((r[home]+homeAdv)-r[away]),s=hg>ag?1:0,k=24;r[home]+=k*(s-e);r[away]+=k*((1-s)-(1-e));}return Object.entries(r).map(([team,elo])=>({team,elo:Math.round(elo)})).sort((a,b)=>b.elo-a.elo)}
export default function handler(req,res){res.setHeader("Cache-Control","s-maxage=86400, stale-while-revalidate=604800");res.status(200).json({season:SEASON,source:"Swehockey official statistics",status:"current-season results through 2026-09-29",games:seed.map(([date,home,away,homeGoals,awayGoals])=>({date,home,away,homeGoals,awayGoals})),ratings:build(seed),model:{name:"SHL Elo v0.1",base:1500,k:24,homeAdvantage:55},note:"Current-season Elo now uses all 27 completed SHL games through 2026-09-29. Historical warm-start seasons are still required before this becomes a serious pre-match model."})}