const baseline={"Buffalo Sabres":{"gf":3.05,"ga":3.12},"Columbus Blue Jackets":{"gf":3.12,"ga":3.18},"Philadelphia Flyers":{"gf":2.82,"ga":3.24},"New Jersey Devils":{"gf":3.2,"ga":2.91},"Tampa Bay Lightning":{"gf":3.49,"ga":2.79},"New York Rangers":{"gf":3.08,"ga":3.02},"Minnesota Wild":{"gf":3.27,"ga":2.87},"Nashville Predators":{"gf":2.91,"ga":3.05},"Seattle Kraken":{"gf":2.95,"ga":3.01},"Calgary Flames":{"gf":2.54,"ga":3.12},"Chicago Blackhawks":{"gf":2.56,"ga":3.29},"Utah Mammoth":{"gf":3.16,"ga":2.98},"Florida Panthers":{"gf":3.31,"ga":2.82},"San Jose Sharks":{"gf":3.04,"ga":3.54},"Edmonton Oilers":{"gf":3.46,"ga":3.04},"Vancouver Canucks":{"gf":2.56,"ga":3.83}};
function pois(k,l){let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f}
function model(away,home){const a=baseline[away],h=baseline[home];if(!a||!h)return null;const hg=(h.gf+a.ga)/2,ag=(a.gf+h.ga)/2;let hp=0,dp=0,ap=0;for(let x=0;x<=10;x++)for(let y=0;y<=10;y++){const p=pois(x,hg)*pois(y,ag);if(x>y)hp+=p;else if(x===y)dp+=p;else ap+=p}const z=hp+dp+ap;return{expectedGoals:{home:+hg.toFixed(2),away:+ag.toFixed(2),total:+(hg+ag).toFixed(2)},regulation:{home:+(hp/z).toFixed(3),draw:+(dp/z).toFixed(3),away:+(ap/z).toFixed(3)}}}

// Pre-game projected starters verified from NHL.com where available.
// Informational only in Test #001: goalie stats are not allowed to change the frozen v0.2 forecast retroactively.
const projectedGoalies={
"Buffalo Sabres":"Ukko-Pekka Luukkonen",
"Philadelphia Flyers":"Joseph Woll",
"New Jersey Devils":"Jake Allen",
"Tampa Bay Lightning":"Andrei Vasilevskiy",
"New York Rangers":"Igor Shesterkin",
"Minnesota Wild":"Jesper Wallstedt",
"Nashville Predators":"Juuse Saros",
"Florida Panthers":"Akira Schmid",
"San Jose Sharks":"Yaroslav Askarov",
"Edmonton Oilers":"Devon Levi"
};


// Frozen pre-game availability snapshot from NHL.com projected-lineup/status reports, 2026-10-01.
// Informational in Test #001: it does not retroactively change the already frozen v0.2 probabilities.
const injuries={
"Buffalo Sabres":["Olen Zellweger","Conor Timmins","Alex Lyon","Jason Zucker"],
"Columbus Blue Jackets":["Dante Fabbro","Ivan Provorov","Damon Severson","Isac Lundestrom"],
"Philadelphia Flyers":["Denver Barkey","Nikita Grebenkin"],
"New Jersey Devils":["Johnathan Kovacevic","Connor Brown"],
"Minnesota Wild":["Brock Faber","Filip Gustavsson"],
"Nashville Predators":[],
"Florida Panthers":["Brad Marchand","Jonah Gadjovich"],
"San Jose Sharks":["Adam Gaudette"],
"Edmonton Oilers":["Zach Hyman","Frederik Andersen","Jason Dickinson","Mattias Janmark","Ryan Nugent-Hopkins","Alec Regula","Matt Savoie"],
"Vancouver Canucks":["Thatcher Demko","Filip Chytil"]
};


// Next-model inputs: explicit home/away splits. Null means not yet verified.
// Kept separate from frozen Test #001 so missing data can never be silently invented.
const venueSplits={};
function nextModelReadiness(away,home){
 const a=venueSplits[away],h=venueSplits[home];
 const venueReady=!!(a&&h&&Number.isFinite(a.awayGf)&&Number.isFinite(a.awayGa)&&Number.isFinite(h.homeGf)&&Number.isFinite(h.homeGa));
 return {
   venueSplits:venueReady?"ready":"pending",
   goalieLayer:(projectedGoalies[away]&&projectedGoalies[home])?"starter-known":"pending",
   availabilityLayer:(Object.prototype.hasOwnProperty.call(injuries,away)&&Object.prototype.hasOwnProperty.call(injuries,home))?"snapshot-ready":"pending"
 };
}

const games=[
["Buffalo Sabres","Columbus Blue Jackets","01:00"],["Philadelphia Flyers","New Jersey Devils","01:00"],["Tampa Bay Lightning","New York Rangers","01:00"],["Minnesota Wild","Nashville Predators","02:00"],["Seattle Kraken","Calgary Flames","03:00"],["Chicago Blackhawks","Utah Mammoth","03:30"],["Florida Panthers","San Jose Sharks","04:00"],["Edmonton Oilers","Vancouver Canucks","04:00"]
];
export default function handler(req,res){res.setHeader("Cache-Control","s-maxage=3600");res.status(200).json({test:"NHL Test #001",frozenAt:"2026-10-01T21:44:00+02:00",status:"pre-match snapshot",note:"Fixture set is frozen before puck drop. Model probabilities will only be added from pre-game data; results must never be used as model inputs for this test.",model:"NHL Goals v0.2 + goalie info v0.1",modelNote:"Frozen Test #001 remains v0.2. Next model is being built separately and will require verified home/away splits before venue effects can change a forecast.",games:games.map(([away,home,swedenTime])=>({date:"2026-10-02",away,home,swedenTime,forecast:model(away,home),goalies:{away:projectedGoalies[away]||null,home:projectedGoalies[home]||null,status:(projectedGoalies[away]||projectedGoalies[home])?"projected":"unknown"},availability:{away:injuries[away]||[],home:injuries[home]||[],source:"NHL.com pre-game snapshot"},nextModel:nextModelReadiness(away,home)}))});}