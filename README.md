# EA SPORTS FC Data Lab

An interactive, client-side web dashboard for analyzing and comparing EA Sports FC 25 and FC 26 player ratings. Built with vanilla JavaScript — no frameworks, no build tools.

## Features

- **Dataset Selection** — Switch between FC25 and FC26 player data
- **Multi-Dimension Rankings** — Filter by Overall, Position, League, Nationality, Attacking, Defending, Physical, or Goalkeeping
- **Advanced Filtering** — Filter by position, league, nationality, name search, and top-N slider
- **Player Comparison** — Compare two players side-by-side, compare a player vs dataset averages, or compare the same player across FC25 and FC26
- **Distribution Charts** — Canvas-based bar charts for Position, League, Team, and Nationality distributions
- **Formation & Lineup Simulator** — Build a starting XI from 7 formations, with squad/zone ratings and stat breakdowns
- **Tournament Predictions** — Simulate UCL, Premier League, La Liga, Serie A, and Bundesliga win probability based on squad balance

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Vanilla JavaScript (ES Modules) |
| Markup | HTML5 |
| Styling | CSS3 (custom properties, responsive, animations) |
| Charts | HTML5 Canvas (no chart library) |
| Data | CSV (fetched at runtime) |
| Server | Any static file server |

## Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- A local HTTP server (for CORS support with ES modules)

## Running the App

The app uses ES modules and `fetch()`, so it must be served over HTTP — not opened directly as a file.

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

Or use VS Code's Live Server extension, or any other static file server.

## Project Structure

```
├── index.html             # Single-page application shell
├── app.js                 # Main entry point (ES Module)
├── styles.css             # All styles
├── data/
│   ├── ea_fc25_players.csv
│   ├── ea_fc26_players.csv
│   └── data_scripts.py    # CSV transformation script
├── src/
│   ├── state.js           # Global state, ranking labels, formation maps
│   ├── utils.js           # CSV parser, filter, scoring utilities
│   ├── features.js        # Table, comparison, lineup, tournament logic
│   └── chart.js           # Canvas bar chart rendering
└── README.md
```

## Data Processing

The raw player data is processed with `data/data_scripts.py`, which transforms a source CSV into the EA FC template format (column mapping, name splitting, ID extraction, play style parsing).

## Development

No build step, bundler, or package manager is required. Edit any file and refresh the browser.
