import {seasonGames,auditGames} from "../lib/nhl-history.js";
import {tuneEloHoldout} from "../lib/nhl-backtest.js";

const season="20252026";
const games=await seasonGames(season);
const audit=auditGames(games);
if(!audit.valid) throw new Error("NHL historical data audit failed: "+JSON.stringify(audit.errors));
const holdout=tuneEloHoldout(games);
console.log("SPORTAI_NHL_HOLDOUT_RESULT "+JSON.stringify({season,audit:{games:audit.games,uniqueIds:audit.uniqueIds,valid:audit.valid},holdout}));
