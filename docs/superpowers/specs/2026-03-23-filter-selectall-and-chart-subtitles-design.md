# Filter Select All/None & Dynamic Chart Subtitles — Design Spec

## Overview

Two enhancements to the Vehicle Registration Dashboard:
1. Select all/none checkbox for each shared filter group
2. Dynamic subtitles on chart panels in detail view

## Feature 1: Select All/None Checkbox

### Behavior

Each filter group (Motive Power, Vehicle Type) gets a checkbox in its title row, before the group title text.

**Tri-state display** using native HTML checkbox `indeterminate` property:
- **Checked**: all items in the group are selected
- **Unchecked**: no items are selected
- **Indeterminate** (dash): some items are selected

**Click behavior**:
- Indeterminate → selects all
- Unchecked → selects all
- Checked → deselects all

### Implementation

**Location**: `controls.js` — `_buildFilterGroup()` method.

Add a checkbox element to the title row, before the title text. A helper `_syncGroupCheckbox(checkbox, selectedMap, options)` recalculates checkbox state (checked/unchecked/indeterminate) based on the current `selectedMap`.

Called:
- After group checkbox is toggled (to update all items + re-sync)
- After any individual item checkbox changes (to re-sync group state)

Both paths trigger `VehicleReg.charts.updateAll()`.

### Styling

Same appearance as existing filter item checkboxes. Inline with the group title label.

## Feature 2: Dynamic Chart Subtitles

### Where

Detail view only. A subtitle `<div>` appears below the panel `<h3>` title.

### Structure

Two lines separated by `<br>`:

**Line 1 — Panel controls summary**:
- Fleet Age Profile: `"{censusYear} · by {groupByLabel}"`
- Fleet Composition: `"by {groupByLabel}"`
- Adoption Trends: `"Year-over-Year Change"` or `"Total Registrations"`
- Fleet Comparison: `"by {groupByLabel}"`

**Line 2 — Shared filter summary**:
Format per filter group:
- All selected → `"All motive powers"` / `"All vehicle types"`
- 1–3 selected → list names, e.g. `"Petrol, Diesel, Hybrid electric"`
- More than 3 selected → count, e.g. `"4 of 6 motive powers"`
- None selected → `"No motive powers"` / `"No vehicle types"`

Two groups joined with ` · ` separator.

Example: `"2025 · by Motive Power"` / `"Petrol, Diesel · All vehicle types"`

### Implementation

**Location**: `controls.js` — new `getSubtitle(panelId)` function and `updateSubtitle(panelId)` function.

In `buildPanel()`: when `isDetail` is true, wrap the `<h3>` and a new subtitle `<div>` in a container div. The subtitle div gets id `vr-subtitle-{panelId}`.

The panel header layout changes from:
```
[h3 title] ——————— [controls]
```
To (detail only):
```
[h3 title          ] [controls]
[subtitle line 1   ]
[subtitle line 2   ]
```

`updateSubtitle(panelId)` is called from `updatePanel()` and `updateAll()` to refresh the subtitle innerHTML.

### Styling

```css
.vr-panel-subtitle {
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}
```

## Files Changed

- `controls.js` — select all/none checkbox logic, subtitle generation and update
- `styles.css` — subtitle styling, title container layout for detail view
- `docs/prd/vehicle-registration-dashboard.md` — update PRD to reflect new features
