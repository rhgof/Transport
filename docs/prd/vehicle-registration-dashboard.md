# Vehicle Registration Dashboard — PRD

## Purpose
Interactive browser-based dashboard for exploring Australian vehicle registration data.

## Data Source
- **File**: `Inputs/rva-mvs-vehtype-mtvpwr-yom-rpc.csv`
- **Rows**: ~37K
- **Columns**: year_of_manufacture, vehicle_type, motive_power, no_vehicles, Year (census year), File
- **Census years**: 2021–2025
- **Vehicle types**: Passenger vehicles, Light commercial vehicles, Motorcycles, Heavy rigid trucks, Articulated trucks, Light rigid trucks, Light buses, Heavy buses, Campervans, Non-freight-carrying vehicles
- **Motive powers**: Petrol, Diesel, Battery/Fuel-cell electric, Hybrid electric, Dual fuel, Other

## Tech
- Plain HTML/CSS/JS with Plotly.js + PapaParse from CDN, no build step
- 5-file architecture: index.html, styles.css, data.js, charts.js, controls.js
- Single global namespace (`VehicleReg`)
- Embeddable widget pattern per interactive-dashboard skill
- Will deploy via GitHub Pages

## Layout
- **Top-down order**: Header > View Tabs > Filters > Chart area
- View tabs above filters
- Shared filters with color dots (serve as legend — no separate chart legends in overview)
- Two views: **Overview** (2x2 grid) and **Detail** (single chart, full width)
- Overview: 4 chart panels in a 2x2 grid — click any panel to drill in
- Detail: tabbed navigation between panels, full-size chart with mode bar and legend

## Header
- Title, subtitle, and source attribution line
- Source: `BITRE - Road Vehicles - data.gov.au | @deadinlongrun.bsky.social | <month> <year>`

## Filters (shared, below tabs)
- **Motive Power** (first row): multi-select checkboxes with colored dots, flowing horizontally
- **Vehicle Type** (second row): multi-select checkboxes with colored dots, flowing horizontally (wraps)
- Groups stacked vertically (Motive Power above Vehicle Type)
- Options within each group flow left to right (horizontally), wrapping as needed
- Sorted by total registration count (highest first)
- Colors are stable/fixed per value (same color always maps to same category)

## Chart Panels (display order)

### Panel 1: Fleet Age Profile
- Stacked bar chart
- X axis: year of manufacture
- Y axis: number of registrations
- Toggle to group by **motive power** (default) or **vehicle type**
- Census year selector to pick which snapshot to show
- Default X axis starts at 1980; toggle to show full range (back to 1901) in detail view
- Traces sorted by total registrations (largest first)

### Panel 2: Fleet Composition
- Stacked bar chart
- X axis: census year (2021-2025)
- Y axis: number of registrations
- Toggle to group by vehicle type (default) or motive power
- Traces sorted by total registrations (largest first)

### Panel 3: Adoption Trends
- Line chart with markers, all motive powers (controlled by shared filters)
- X axis: census year (2021-2025)
- Y axis: number of registrations
- One line per selected motive power
- Toggle to show year-over-year differences instead of absolute values
- Traces sorted by total registrations (largest first)

### Panel 4: Fleet Comparison
- Side-by-side (grouped) bar chart
- X axis: census year (2021-2025)
- Y axis: number of registrations
- Toggle to group by **motive power** (default) or **vehicle type**
- Traces sorted by total registrations (largest first)

## Iterative approach
- Building incrementally, iterating on chart types and layout based on feedback
