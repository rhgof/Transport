window.VehicleReg = window.VehicleReg || {};

VehicleReg.state = {
  view: 'overview',
  allRows: [],
  metadata: null,
  selectedVehicleTypes: {},
  selectedMotivePowers: {},
  ageProfileYear: 2025,
  ageProfileGroupBy: 'motive_power',
  showAllYears: false,
  compositionGroupBy: 'vehicle_type',
  comparisonGroupBy: 'motive_power',
  adoptionYoY: false
};

VehicleReg.init = function(selector) {
  var container = document.querySelector(selector);
  if (!container) {
    console.error('VehicleReg: container not found:', selector);
    return;
  }

  var csvUrl = container.getAttribute('data-csv-url');
  if (!csvUrl) {
    container.innerHTML = '<div class="vr-error">Missing data-csv-url attribute</div>';
    return;
  }

  container.innerHTML = '<div class="vr-loading">Loading vehicle registration data...</div>';
  VehicleReg.container = container;

  VehicleReg.data.fetchAndParse(csvUrl, function(err, rows) {
    if (err) {
      container.innerHTML = '<div class="vr-error">Failed to load data: ' + err.message + '</div>';
      return;
    }

    var state = VehicleReg.state;
    state.allRows = rows;
    state.metadata = VehicleReg.data.buildMetadata(rows);

    state.metadata.vehicleTypes.forEach(function(vt) { state.selectedVehicleTypes[vt] = true; });
    state.metadata.motivePowers.forEach(function(mp) { state.selectedMotivePowers[mp] = true; });

    var latestYear = state.metadata.censusYears[state.metadata.censusYears.length - 1];
    state.ageProfileYear = latestYear;

    VehicleReg.controls.renderShell();
    VehicleReg.charts.updateAll();
  });
};

VehicleReg.controls = {
  GROUP_LABELS: { motive_power: 'Motive Power', vehicle_type: 'Vehicle Type' },

  renderShell: function() {
    var c = VehicleReg.container;
    c.innerHTML = '';

    var header = document.createElement('div');
    header.className = 'vr-header';
    var now = new Date();
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var dateStr = months[now.getMonth()] + ' ' + now.getFullYear();
    header.innerHTML = '<h1>Australian Vehicle Registration Dashboard</h1>' +
      '<p>Registered motor vehicles by type, motive power, and year of manufacture</p>' +
      '<div class="vr-source">Source: BITRE - Road Vehicles - data.gov.au | @deadinlongrun.bsky.social | ' + dateStr + '</div>';
    c.appendChild(header);

    c.appendChild(this.buildViewBar());

    var filtersContainer = document.createElement('div');
    filtersContainer.id = 'vr-filters-container';
    c.appendChild(filtersContainer);
    this.renderFilters();

    var main = document.createElement('div');
    main.className = 'vr-main';
    main.id = 'vr-main';
    c.appendChild(main);

    this.renderView();
  },

  renderFilters: function() {
    var container = document.getElementById('vr-filters-container');
    if (!container) return;
    container.innerHTML = '';

    var state = VehicleReg.state;
    var filtersDiv = document.createElement('div');
    filtersDiv.className = 'vr-filters';

    // Motive Power first (smaller group)
    filtersDiv.appendChild(this._buildFilterGroup(
      'Motive Power', state.metadata.motivePowers, state.selectedMotivePowers, 'motive_power'
    ));

    // Vehicle Type second (larger, wraps to two columns)
    filtersDiv.appendChild(this._buildFilterGroup(
      'Vehicle Type', state.metadata.vehicleTypes, state.selectedVehicleTypes, 'vehicle_type'
    ));

    container.appendChild(filtersDiv);
  },

  _buildFilterGroup: function(title, options, selectedMap, groupField) {
    var group = document.createElement('div');
    group.className = 'vr-filter-group';

    var self = this;

    var titleRow = document.createElement('div');
    titleRow.className = 'vr-filter-title';

    var groupCb = document.createElement('input');
    groupCb.type = 'checkbox';

    var titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    titleRow.appendChild(groupCb);
    titleRow.appendChild(titleSpan);
    group.appendChild(titleRow);

    var optionsDiv = document.createElement('div');
    optionsDiv.className = 'vr-filter-options';

    groupCb.addEventListener('change', function() {
      var setTo = groupCb.checked;
      options.forEach(function(opt) { selectedMap[opt] = setTo; });
      var itemCbs = optionsDiv.querySelectorAll('input[type="checkbox"]');
      itemCbs.forEach(function(cb, i) { cb.checked = setTo; });
      self._syncGroupCheckbox(groupCb, selectedMap, options);
      VehicleReg.charts.updateAll();
    });

    options.forEach(function(opt) {
      var lbl = document.createElement('label');

      var dot = document.createElement('span');
      dot.className = 'vr-color-dot';
      dot.style.backgroundColor = VehicleReg.data.colorFor(groupField, opt);
      lbl.appendChild(dot);

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!selectedMap[opt];
      cb.addEventListener('change', function() {
        selectedMap[opt] = cb.checked;
        self._syncGroupCheckbox(groupCb, selectedMap, options);
        VehicleReg.charts.updateAll();
      });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(' ' + opt));
      optionsDiv.appendChild(lbl);
    });

    this._syncGroupCheckbox(groupCb, selectedMap, options);

    group.appendChild(optionsDiv);
    return group;
  },

  buildViewBar: function() {
    var bar = document.createElement('div');
    bar.className = 'vr-view-bar';
    bar.id = 'vr-view-bar';

    var state = VehicleReg.state;
    var tabs = [{ id: 'overview', label: 'Overview' }];
    VehicleReg.charts.PANEL_IDS.forEach(function(id) {
      tabs.push({ id: id, label: VehicleReg.charts.PANEL_TITLES[id] });
    });

    tabs.forEach(function(tab) {
      var btn = document.createElement('button');
      btn.className = 'vr-view-tab' + (state.view === tab.id ? ' active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', function() {
        state.view = tab.id;
        VehicleReg.controls.updateViewBar();
        VehicleReg.controls.renderView();
        VehicleReg.charts.updateAll();
      });
      bar.appendChild(btn);
    });

    return bar;
  },

  updateViewBar: function() {
    var bar = document.getElementById('vr-view-bar');
    if (!bar) return;
    var tabs = bar.querySelectorAll('.vr-view-tab');
    var ids = ['overview'].concat(VehicleReg.charts.PANEL_IDS);
    tabs.forEach(function(tab, i) {
      tab.className = 'vr-view-tab' + (VehicleReg.state.view === ids[i] ? ' active' : '');
    });
  },

  renderView: function() {
    var main = document.getElementById('vr-main');
    if (!main) return;
    main.innerHTML = '';

    if (VehicleReg.state.view === 'overview') {
      this.renderOverview(main);
    } else {
      this.renderDetail(main, VehicleReg.state.view);
    }
  },

  renderOverview: function(main) {
    var grid = document.createElement('div');
    grid.className = 'vr-grid';

    var self = this;
    VehicleReg.charts.PANEL_IDS.forEach(function(id) {
      var panel = self.buildPanel(id, false);
      panel.addEventListener('click', function(e) {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        VehicleReg.state.view = id;
        self.updateViewBar();
        self.renderView();
        VehicleReg.charts.updateAll();
      });
      grid.appendChild(panel);
    });

    main.appendChild(grid);
  },

  renderDetail: function(main, panelId) {
    var detail = document.createElement('div');
    detail.className = 'vr-detail';
    detail.appendChild(this.buildPanel(panelId, true));
    main.appendChild(detail);
  },

  buildPanel: function(panelId, isDetail) {
    var panel = document.createElement('div');
    panel.className = 'vr-panel';

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

    panel.appendChild(header);

    var chartDiv = document.createElement('div');
    chartDiv.className = 'vr-panel-chart';
    chartDiv.id = 'vr-chart-' + panelId;
    panel.appendChild(chartDiv);

    return panel;
  },

  _addPanelControls: function(panelId, container, isDetail) {
    var state = VehicleReg.state;

    if (panelId === 'age-profile') {
      var yearSel = this._buildSelect(state.metadata.censusYears, state.ageProfileYear, function(val) {
        state.ageProfileYear = parseInt(val);
        VehicleReg.charts.updatePanel('age-profile');
      });
      container.appendChild(document.createTextNode('Year: '));
      container.appendChild(yearSel);

      var grpSel = this._buildSelect(
        [{ v: 'motive_power', l: 'Motive Power' }, { v: 'vehicle_type', l: 'Vehicle Type' }],
        state.ageProfileGroupBy,
        function(val) {
          state.ageProfileGroupBy = val;
          VehicleReg.charts.updatePanel('age-profile');
        }
      );
      container.appendChild(document.createTextNode(' Group: '));
      container.appendChild(grpSel);

      if (isDetail) {
        var allBtn = document.createElement('button');
        allBtn.textContent = state.showAllYears ? 'Since 1980' : 'All Years';
        allBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          state.showAllYears = !state.showAllYears;
          allBtn.textContent = state.showAllYears ? 'Since 1980' : 'All Years';
          VehicleReg.charts.updatePanel('age-profile');
        });
        container.appendChild(allBtn);
      }
    }

    if (panelId === 'composition') {
      var groupSel = this._buildSelect(
        [{ v: 'vehicle_type', l: 'Vehicle Type' }, { v: 'motive_power', l: 'Motive Power' }],
        state.compositionGroupBy,
        function(val) {
          state.compositionGroupBy = val;
          VehicleReg.charts.updatePanel('composition');
        }
      );
      container.appendChild(document.createTextNode('Group: '));
      container.appendChild(groupSel);
    }

    if (panelId === 'adoption-trends') {
      var yoyBtn = document.createElement('button');
      yoyBtn.textContent = state.adoptionYoY ? 'Show Totals' : 'Show YoY Change';
      yoyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        state.adoptionYoY = !state.adoptionYoY;
        yoyBtn.textContent = state.adoptionYoY ? 'Show Totals' : 'Show YoY Change';
        VehicleReg.charts.updatePanel('adoption-trends');
      });
      container.appendChild(yoyBtn);
    }

    if (panelId === 'comparison') {
      var grpSel2 = this._buildSelect(
        [{ v: 'motive_power', l: 'Motive Power' }, { v: 'vehicle_type', l: 'Vehicle Type' }],
        state.comparisonGroupBy,
        function(val) {
          state.comparisonGroupBy = val;
          VehicleReg.charts.updatePanel('comparison');
        }
      );
      container.appendChild(document.createTextNode('Group: '));
      container.appendChild(grpSel2);
    }
  },

  _filterSummary: function(selectedMap, options, label) {
    var count = 0;
    var names = [];
    options.forEach(function(opt) {
      if (selectedMap[opt]) { count++; names.push(opt); }
    });
    if (count === options.length) return label + ': All';
    if (count === 0) return label + ': None';
    var shown = names.slice(0, 4).join(', ');
    if (names.length > 4) shown += ' etc.';
    return label + ': ' + shown + ' (' + count + ' of ' + options.length + ')';
  },

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

    var mpSummary = this._filterSummary(state.selectedMotivePowers, state.metadata.motivePowers, 'Motive Power');
    var vtSummary = this._filterSummary(state.selectedVehicleTypes, state.metadata.vehicleTypes, 'Vehicle Type');
    var line2 = mpSummary + ' \u00b7 ' + vtSummary;

    return line1 + '<br>' + line2;
  },

  updateSubtitle: function(panelId) {
    var el = document.getElementById('vr-subtitle-' + panelId);
    if (!el) return;
    el.innerHTML = this.getSubtitle(panelId);
  },

  _buildSelect: function(options, currentValue, onChange) {
    var sel = document.createElement('select');
    options.forEach(function(opt) {
      var o = document.createElement('option');
      if (typeof opt === 'object') {
        o.value = opt.v;
        o.textContent = opt.l;
        if (opt.v == currentValue) o.selected = true;
      } else {
        o.value = opt;
        o.textContent = opt;
        if (opt == currentValue) o.selected = true;
      }
      sel.appendChild(o);
    });
    sel.addEventListener('change', function(e) {
      e.stopPropagation();
      onChange(sel.value);
    });
    return sel;
  },

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
};
