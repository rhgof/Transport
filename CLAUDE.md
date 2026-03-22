# Transport Project

## Overview
Australian transport data analysis and visualization project.

## Current Work
Building an interactive browser-based dashboard for vehicle registration data exploration.

## Dashboard: Vehicle Registration Explorer
- **Data source**: `Inputs/rva-mvs-vehtype-mtvpwr-yom-rpc.csv`
- **Tech**: Plain HTML/CSS/JS with Plotly.js, no build step
- **Architecture**: 5-file structure (index.html, styles.css, data.js, charts.js, controls.js)
- **PRD**: `docs/prd/vehicle-registration-dashboard.md`

## Known Issues / Gotchas

### Plotly.js automargin fails on first render
Plotly's automargin calculations (for axis titles and legends positioned outside the plot area) fail on the first render pass but correct on a second pass. This is a known Plotly.js architectural issue ([#2704](https://github.com/plotly/plotly.js/issues/2704)). Our fix in `charts.js` `_render()`:
1. Use `automargin: true` on all axis title objects (e.g. `{ text: 'Year', automargin: true }`)
2. Call `Plotly.Plots.resize(div)` via `setTimeout(fn, 0)` after `Plotly.react()` resolves — this triggers the second pass
3. Do NOT use `overflow: hidden` on `.vr-panel-chart` — it clips legends/titles that Plotly renders outside the plot area
