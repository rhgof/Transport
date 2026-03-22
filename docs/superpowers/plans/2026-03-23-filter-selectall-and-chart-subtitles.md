# Filter Select All/None & Dynamic Chart Subtitles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add select all/none checkboxes to each filter group and dynamic subtitles to detail-view chart panels.

**Architecture:** Two independent features in the existing plain JS dashboard. Feature 1 modifies `_buildFilterGroup()` in controls.js to add a tri-state group checkbox. Feature 2 adds subtitle DOM elements in `buildPanel()` and a subtitle update function called from charts.js render methods.

**Tech Stack:** Plain HTML/CSS/JS, Plotly.js, no build step, no test framework (manual browser verification)

**Spec:** `docs/superpowers/specs/2026-03-23-filter-selectall-and-chart-subtitles-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `controls.js` | Modify | Add group checkbox in `_buildFilterGroup()`, add `_syncGroupCheckbox()` helper, add `GROUP_LABELS` constant, add `getSubtitle()`/`updateSubtitle()` functions, modify `buildPanel()` for subtitle DOM |
| `charts.js` | Modify | Add `VehicleReg.controls.updateSubtitle()` calls at end of each render method |
| `styles.css` | Modify | Fix `.vr-filter-title` selector, add `.vr-panel-subtitle`, `.vr-panel-title-block`, detail header alignment |
| `docs/prd/vehicle-registration-dashboard.md` | Modify | Document both new features |

---

### Task 1: Add select all/none checkbox to filter groups

**Files:**
- Modify: `controls.js:106-139` (`_buildFilterGroup` method)

- [ ] **Step 1: Add `_syncGroupCheckbox` helper to `controls.js`**

Add this method to the `VehicleReg.controls` object, after `_buildSelect`:

```javascript
_syncGroupCheckbox: function(checkbox, selectedMap, options) {
  var count = 0;
  options.forEach(function(opt) { if (selectedMap[opt]) count++; });
  if (count === 0) {
    checkbox.checked = false;
    checkbox.indeterminate = false;
    checkbox.removeAttribute('aria-checked');
  } else if (count === options.length) {
    checkbox.checked = true;
    checkbox.indeterminate = false;
    checkbox.removeAttribute('aria-checked');
  } else {
    checkbox.checked = false;
    checkbox.indeterminate = true;
    checkbox.setAttribute('aria-checked', 'mixed');
  }
}
```

- [ ] **Step 2: Add group checkbox to `_buildFilterGroup`**

Replace the title label section in `_buildFilterGroup` (lines 110-113) with:

```javascript
var titleRow = document.createElement('div');
titleRow.className = 'vr-filter-title';

var groupCb = document.createElement('input');
groupCb.type = 'checkbox';
groupCb.checked = true;

var titleSpan = document.createElement('span');
titleSpan.textContent = title;
titleRow.appendChild(groupCb);
titleRow.appendChild(titleSpan);
group.appendChild(titleRow);
```

- [ ] **Step 3: Wire up group checkbox change handler**

Add the group checkbox event listener after creating `groupCb`, before `titleRow.appendChild(groupCb)`:

```javascript
var self = this;
groupCb.addEventListener('change', function() {
  var setTo = groupCb.checked;
  options.forEach(function(opt) { selectedMap[opt] = setTo; });
  // Update individual checkboxes in place (no DOM rebuild)
  var itemCbs = optionsDiv.querySelectorAll('input[type="checkbox"]');
  itemCbs.forEach(function(cb, i) { cb.checked = setTo; });
  self._syncGroupCheckbox(groupCb, selectedMap, options);
  VehicleReg.charts.updateAll();
});
```

- [ ] **Step 4: Sync group checkbox when individual items change**

In the individual checkbox `change` event listener (inside the `options.forEach` loop), after `selectedMap[opt] = cb.checked;`, add:

```javascript
self._syncGroupCheckbox(groupCb, selectedMap, options);
```

Note: capture `self = this` at the top of `_buildFilterGroup`.

- [ ] **Step 5: Set initial group checkbox state**

After the `options.forEach` loop that builds individual checkboxes, add:

```javascript
this._syncGroupCheckbox(groupCb, selectedMap, options);
```

- [ ] **Step 6: Verify in browser**

Open `index.html` in browser. Verify:
- Each filter group has a checkbox next to its title
- Checkbox shows checked (all selected), unchecked (none), indeterminate dash (some)
- Clicking checked → unchecks all items
- Clicking unchecked/indeterminate → checks all items
- Individual checkbox changes update group checkbox state
- Charts update correctly after each change

- [ ] **Step 7: Update CSS selector for filter title**

The existing CSS at `styles.css:91` uses `label.vr-filter-title` but the title element is now a `<div>`. Update the selector:

Change `.vr-filter-group label.vr-filter-title` to `.vr-filter-group .vr-filter-title`.

Also add flexbox layout to the title row so the checkbox and text align:

```css
.vr-filter-group .vr-filter-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #555;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
}
```

- [ ] **Step 8: Commit**

```bash
git add controls.js styles.css
git commit -m "Add select all/none checkbox to filter groups"
```

---

### Task 2: Add GROUP_LABELS constant and subtitle generation functions

**Files:**
- Modify: `controls.js` (top of controls object + new methods)

- [ ] **Step 1: Add GROUP_LABELS constant**

Add at the top of the `VehicleReg.controls` object (after line `VehicleReg.controls = {`):

```javascript
GROUP_LABELS: { motive_power: 'Motive Power', vehicle_type: 'Vehicle Type' },
```

- [ ] **Step 2: Add `_filterSummary` helper**

Add this method to `VehicleReg.controls`:

```javascript
_filterSummary: function(selectedMap, options, groupName) {
  var count = 0;
  var names = [];
  options.forEach(function(opt) {
    if (selectedMap[opt]) { count++; names.push(opt); }
  });
  if (count === options.length) return 'All ' + groupName;
  if (count === 0) return 'No ' + groupName;
  if (count <= 3) return names.join(', ');
  return count + ' of ' + options.length + ' ' + groupName;
},
```

- [ ] **Step 3: Add `getSubtitle` function**

Add this method to `VehicleReg.controls`:

```javascript
getSubtitle: function(panelId) {
  var state = VehicleReg.state;
  var line1 = '';

  switch (panelId) {
    case 'age-profile':
      line1 = state.ageProfileYear + ' \u00b7 by ' + this.GROUP_LABELS[state.ageProfileGroupBy];
      break;
    case 'composition':
      line1 = 'by ' + this.GROUP_LABELS[state.compositionGroupBy];
      break;
    case 'adoption-trends':
      line1 = state.adoptionYoY ? 'Year-over-Year Change' : 'Total Registrations';
      break;
    case 'comparison':
      line1 = 'by ' + this.GROUP_LABELS[state.comparisonGroupBy];
      break;
  }

  var mpSummary = this._filterSummary(state.selectedMotivePowers, state.metadata.motivePowers, 'motive powers');
  var vtSummary = this._filterSummary(state.selectedVehicleTypes, state.metadata.vehicleTypes, 'vehicle types');
  var line2 = mpSummary + ' \u00b7 ' + vtSummary;

  return line1 + '<br>' + line2;
},
```

- [ ] **Step 4: Add `updateSubtitle` function**

Add this method to `VehicleReg.controls`:

```javascript
updateSubtitle: function(panelId) {
  var el = document.getElementById('vr-subtitle-' + panelId);
  if (!el) return;
  el.innerHTML = this.getSubtitle(panelId);
},
```

- [ ] **Step 5: Commit**

```bash
git add controls.js
git commit -m "Add subtitle generation functions and GROUP_LABELS constant"
```

---

### Task 3: Add subtitle DOM element to detail panel header

**Files:**
- Modify: `controls.js:217-241` (`buildPanel` method)
- Modify: `styles.css` (add subtitle and title-block styles)

- [ ] **Step 1: Modify `buildPanel` to add subtitle in detail view**

In `buildPanel()`, replace the title/header section (lines 222-231):

```javascript
var header = document.createElement('div');
header.className = 'vr-panel-header';

if (isDetail) {
  var titleBlock = document.createElement('div');
  titleBlock.className = 'vr-panel-title-block';

  var title = document.createElement('h3');
  title.textContent = VehicleReg.charts.PANEL_TITLES[panelId];
  titleBlock.appendChild(title);

  var subtitle = document.createElement('div');
  subtitle.className = 'vr-panel-subtitle';
  subtitle.id = 'vr-subtitle-' + panelId;
  titleBlock.appendChild(subtitle);

  header.appendChild(titleBlock);
} else {
  var title = document.createElement('h3');
  title.textContent = VehicleReg.charts.PANEL_TITLES[panelId];
  header.appendChild(title);
}

var controls = document.createElement('div');
controls.className = 'vr-panel-controls';
this._addPanelControls(panelId, controls, isDetail);
header.appendChild(controls);
```

- [ ] **Step 2: Add CSS styles**

Add to `styles.css` after the `.vr-panel-header h3` rule:

```css
.vr-panel-title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vr-panel-subtitle {
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}

.vr-detail .vr-panel-header {
  align-items: flex-start;
}
```

- [ ] **Step 3: Commit**

```bash
git add controls.js styles.css
git commit -m "Add subtitle DOM element to detail panel header"
```

---

### Task 4: Wire subtitle updates into chart render cycle

**Files:**
- Modify: `charts.js:13-25` (`updateAll` method)
- Modify: `charts.js:27-36` (`updatePanel` method)

- [ ] **Step 1: Add subtitle update call to `updatePanel`**

In `charts.js`, at the end of the `updatePanel` method (after the switch statement, before the closing `}`), add:

```javascript
VehicleReg.controls.updateSubtitle(panelId);
```

- [ ] **Step 2: Verify `updateAll` coverage**

No change needed in `updateAll` — it calls `updatePanel` for detail view, which already includes the subtitle update from Step 1. Overview mode has no subtitle elements, so no update is needed there.

- [ ] **Step 3: Verify in browser**

Open `index.html`. Click into any detail panel. Verify:
- Subtitle appears below the panel title
- Line 1 shows panel-specific control state
- Line 2 shows shared filter summary
- Changing panel controls (year, group-by, YoY toggle) updates line 1
- Changing shared filters updates line 2
- Subtitle shows "All motive powers" when all are selected
- Deselect all but 2 motive powers → shows names (e.g. "Petrol, Diesel")
- Select 4 motive powers → shows "4 of 6 motive powers"
- Overview mode shows no subtitles

- [ ] **Step 4: Commit**

```bash
git add charts.js
git commit -m "Wire subtitle updates into chart render cycle"
```

---

### Task 5: Update PRD

**Files:**
- Modify: `docs/prd/vehicle-registration-dashboard.md`

- [ ] **Step 1: Add select all/none to filters section**

In the Filters section, after the "Sorted by total registration count" line, add:

```markdown
- Each group has a select all/none checkbox in the title row
- Tri-state: checked (all), unchecked (none), indeterminate dash (some)
- Click toggles between all selected and none selected
```

- [ ] **Step 2: Add subtitle info to chart panels section**

After the "## Chart Panels (display order)" heading and before Panel 1, add:

```markdown
- Detail view panels show a dynamic subtitle below the title
- Line 1: panel-specific control state (year, group-by, mode)
- Line 2: shared filter summary (lists names if ≤3 selected, count otherwise)
```

- [ ] **Step 3: Commit**

```bash
git add docs/prd/vehicle-registration-dashboard.md
git commit -m "Update PRD with select all/none and dynamic subtitles"
```
