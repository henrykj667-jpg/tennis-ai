import {mkdir,writeFile} from "node:fs/promises";
import {seasonGames,auditGames} from "../lib/nhl-history.js";
import {tuneEloHoldout} from "../lib/nhl-backtest.js";

const season="20252026";
const games=await seasonGames(season);
const audit=auditGames(games);
if(!audit.valid) throw new Error("NHL historical data audit failed: "+JSON.stringify(audit.errors));
const holdout=tuneEloHoldout(games);
const payload={generatedAt:new Date().toISOString(),season,audit:{games:audit.games,uniqueIds:audit.uniqueIds,valid:audit.valid},holdout};
await mkdir("public",{recursive:true});
await writeFile("public/nhl-holdout-result.json",JSON.stringify(payload,null,2));
console.log("SPORTAI_NHL_HOLDOUT_RESULT "+JSON.stringify(payload));
