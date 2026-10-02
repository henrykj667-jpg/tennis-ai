import {normalizeHASeason,auditHAGames} from "./ha-history.js";
const BASE="https://stats.swehockey.se";
export const HA_SEASONS={"2025-26":18266};
const decode=s=>s.replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&ouml;|&#246;/g,"ö").replace(/&auml;|&#228;/g,"ä").replace(/&aring;|&#229;/g,"å").replace(/&Ouml;|&#214;/g,"Ö").replace(/&Auml;|&#196;/g,"Ä").replace(/&Aring;|&#197;/g,"Å");
const textFromHtml=html=>decode(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
const TEAMS=["MoDo Hockey","Östersunds IK","Södertälje SK","BIK Karlskoga","AIK","Västerås IK","Mora IK","IF Björklöven","Nybro Vikings IF","IK Oskarshamn","Almtuna IS","Kalmar HC","Vimmerby HC","IF Troja-Ljungby"];
export function parseHASchedule(html){
 const t=textFromHtml(html),rows=[];let date=null;
 const token=/((?:20\d\d)-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))|((?:[01]\d|2[0-3]):[0-5]\d)/g;let m,marks=[];
 while((m=token.exec(t)))marks.push({value:m[0],i:m.index});
 for(let j=0;j<marks.length;j++){const mark=marks[j];if(/^20/.test(mark.value)){date=mark.value;continue}if(!date)continue;
  const end=marks[j+1]?.i??t.length,chunk=t.slice(mark.i+mark.value.length,end);
  let home=null,away=null;for(const h of TEAMS){const p=chunk.indexOf(h);if(p<0)continue;for(const a of TEAMS){if(a===h)continue;const q=chunk.indexOf(a,p+h.length);if(q<0)continue;const between=chunk.slice(p+h.length,q);if(!between.includes("-"))continue;const after=chunk.slice(q+a.length);const sm=after.match(/(\d+)\s*-\s*(\d+)/);if(sm){home=h;away=a;rows.push({id:[date,mark.value,h,a].join("|"),date,time:mark.value,home,away,homeGoals:+sm[1],awayGoals:+sm[2],regulationTie:null,lastPeriodType:null});break}}if(home)break}
 }
 return normalizeHASeason(rows);
}
export async function fetchHASeason(season="2025-26"){
 const groupId=HA_SEASONS[season];if(!groupId)throw new Error("Unsupported HA season: "+season);
 const r=await fetch(BASE+"/ScheduleAndResults/Schedule/"+groupId,{headers:{"User-Agent":"SPORTAI/1.0"}});
 if(!r.ok)throw new Error("Swehockey schedule HTTP "+r.status);
 const games=parseHASchedule(await r.text()),audit=auditHAGames(games);
 return{season,groupId,source:BASE+"/ScheduleAndResults/Schedule/"+groupId,games,audit,regulationDecisionCoverage:0,note:"Schedule results are imported without guessing OT/SO. Regulation outcome remains unknown until a verified per-game decision source is added."};
}
