const SEASON="2026-27";
const seed=[
["2026-09-19","Frölunda HC","Växjö Lakers HC",5,4],
["2026-09-19","HV 71","IF Malmö Redhawks",4,5],
["2026-09-19","Linköping HC","Timrå IK",3,2],
["2026-09-19","Djurgårdens IF","IF Björklöven",0,3],
["2026-09-19","Färjestad BK","Örebro HK",7,0],
["2026-09-19","Luleå HF","Rögle BK",4,2],
["2026-09-19","Skellefteå AIK","Brynäs IF",7,2]
];
const expected=d=>1/(1+Math.pow(10,-d/400));
function build(rows){const r={};for(const [,home,away,hg,ag] of rows){r[home]??=1500;r[away]??=1500;const homeAdv=55,e=expected((r[home]+homeAdv)-r[away]),s=hg>ag?1:0,k=24;r[home]+=k*(s-e);r[away]+=k*((1-s)-(1-e));}return Object.entries(r).map(([team,elo])=>({team,elo:Math.round(elo)})).sort((a,b)=>b.elo-a.elo)}
export default function handler(req,res){res.setHeader("Cache-Control","s-maxage=86400, stale-while-revalidate=604800");res.status(200).json({season:SEASON,source:"Swehockey official statistics",status:"development seed",games:seed.map(([date,home,away,homeGoals,awayGoals])=>({date,home,away,homeGoals,awayGoals})),ratings:build(seed),model:{name:"SHL Elo v0.1",base:1500,k:24,homeAdvantage:55},note:"Initial verified result seed. Expand to full historical seasons before using ratings as a match model."})}