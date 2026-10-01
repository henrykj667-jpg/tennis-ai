# Tennis AI

Pre-match tennis analytics prototype.

## Architecture

The app is being split into reusable sport modules so tennis can later be joined by other sports without rewriting the UI.

### Tennis model
- Overall Elo
- Surface Elo
- Recent form
- Serve strength
- Return strength
- Transparent factor contributions
- Model confidence
- Match / set probability outputs

### Data layer
Production match data will be loaded server-side. API secrets must never be committed to GitHub or exposed in the browser.

Expected environment variable:
`RAPIDAPI_KEY`

Planned schedule source:
`GET /tennis/v2/{atp|wta}/fixtures?filter=PlayerGroup:singles`

The free Tennis API tier currently supports factual scheduled fixtures with a daily request quota. We deliberately keep third-party prediction output out of our model: Tennis AI computes its own analysis.

## Current status
v0.2 UI + transparent prototype model is deployed. Current player ratings are fixtures for development, not production analytics.

## Next
1. Connect licensed factual ATP/WTA schedule data.
2. Normalize player/tournament/surface records.
3. Build historical feature pipeline.
4. Backtest and calibrate probabilities.
5. Replace prototype ratings with computed ratings.
