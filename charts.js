window.VehicleReg = window.VehicleReg || {};

VehicleReg.charts = {
  PANEL_IDS: ['age-profile', 'composition', 'adoption-trends', 'comparison'],

  PANEL_TITLES: {
    'age-profile': 'Fleet Age Profile',
    'composition': 'Fleet Composition',
    'adoption-trends': 'Adoption Trends',
    'comparison': 'Fleet Comparison'
  },

  updateAll: function() {
    var s = VehicleReg.state;
    var filtered = VehicleReg.data.filterRows(s.allRows, s);

    if (s.view === 'overview') {
      this.renderAgeProfile(filtered, s);
      this.renderComposition(filtered, s);
      this.renderAdoptionTrends(filtered, s);
      this.renderComparison(filtered, s);
    } else {
      this.updatePanel(s.view);
    }
  },

  updatePanel: function(panelId) {
    var s = VehicleReg.state;
    var filtered = VehicleReg.data.filterRows(s.allRows, s);

    switch (panelId) {
      case 'age-profile': this.renderAgeProfile(filtered, s); break;
      case 'composition': this.renderComposition(filtered, s); break;
      case 'adoption-trends': this.renderAdoptionTrends(filtered, s); break;
      case 'comparison': this.renderComparison(filtered, s); break;
    }

    VehicleReg.controls.updateSubtitle(panelId);
  },

  _layoutDefaults: function(panelId, isDetail) {
    var legend;
    var hasBottomLegend = (panelId === 'composition' || panelId === 'adoption-trends');
    if (panelId === 'age-profile') {
      legend = { font: { size: 10 }, x: 0.01, y: 0.99, xanchor: 'left', yanchor: 'top', bgcolor: 'rgba(255,255,255,0.7)', traceorder: 'normal' };
    } else if (panelId === 'comparison') {
      legend = { font: { size: 10 }, x: 0.99, y: 0.99, xanchor: 'right', yanchor: 'top', bgcolor: 'rgba(255,255,255,0.7)', traceorder: 'normal' };
    } else {
      legend = { font: { size: 10 }, orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', traceorder: 'normal' };
    }
    var bottomMargin = isDetail ? (hasBottomLegend ? 90 : 60) : 25;
    return {
      margin: isDetail ? { t: 10, r: 30, b: bottomMargin, l: 70 } : { t: 5, r: 5, b: 25, l: 45 },
      font: { size: isDetail ? 12 : 10 },
      showlegend: isDetail,
      legend: legend,
      hovermode: 'closest',
      plot_bgcolor: '#fff',
      paper_bgcolor: '#fff'
    };
  },

  _chartDiv: function(panelId) {
    return document.getElementById('vr-chart-' + panelId);
  },

  _render: function(panelId, traces, layoutOverrides) {
    var self = this;
    var div = this._chartDiv(panelId);
    if (!div) return;
    var isDetail = VehicleReg.state.view !== 'overview';
    var layout = Object.assign({}, this._layoutDefaults(panelId, isDetail), layoutOverrides || {});
    if (isDetail) {
      var panel = div.parentElement;
      var panelH = panel.offsetHeight;
      if (panelH < 100) {
        // Layout not yet computed — defer render
        setTimeout(function() { self._render(panelId, traces, layoutOverrides); }, 0);
        return;
      }
      var header = panel.querySelector('.vr-panel-header');
      var footer = panel.querySelector('.vr-panel-footer');
      var chartH = panelH - (header ? header.offsetHeight : 0) - (footer ? footer.offsetHeight : 0);
      layout.height = chartH;
    }
    Plotly.react(div, traces, layout, { responsive: true, displayModeBar: isDetail }).then(function() {
      if (isDetail) {
        // Plotly's automargin needs a second pass to correctly size legends/axis titles
        setTimeout(function() { Plotly.Plots.resize(div); }, 0);
      }
    });
  },

  // Panel 1: Fleet Age Profile — stacked bars by year of manufacture
  renderAgeProfile: function(filtered, state) {
    var censusYear = state.ageProfileYear;
    var groupBy = state.ageProfileGroupBy;
    var rows = filtered.filter(function(r) { return r.census_year === censusYear; });

    var minYom = state.showAllYears ? state.metadata.yomRange.min : 1980;
    rows = rows.filter(function(r) { return r.year_of_manufacture !== null && r.year_of_manufacture >= minYom; });

    var agg = VehicleReg.data.aggregate(rows, 'year_of_manufacture', groupBy);
    var keys = groupBy === 'vehicle_type' ? state.metadata.vehicleTypes : state.metadata.motivePowers;
    var sortedKeys = VehicleReg.data.sortKeysByTotal(agg, keys);

    var traces = [];
    sortedKeys.forEach(function(k) {
      if (!agg[k]) return;
      var xs = Object.keys(agg[k]).map(Number).sort(function(a, b) { return a - b; });
      traces.push({
        x: xs,
        y: xs.map(function(x) { return agg[k][x] || 0; }),
        name: k,
        type: 'bar',
        marker: { color: VehicleReg.data.colorFor(groupBy, k) }
      });
    });

    this._render('age-profile', traces, {
      barmode: 'stack',
      xaxis: { title: { text: 'Year of Manufacture', automargin: true }, range: [minYom - 0.5, state.metadata.yomRange.max + 0.5] },
      yaxis: { title: { text: 'Registrations', automargin: true } }
    });
  },

  // Panel 2: Fleet Composition — stacked bars by census year
  renderComposition: function(filtered, state) {
    var groupBy = state.compositionGroupBy || 'vehicle_type';
    var agg = VehicleReg.data.aggregate(filtered, 'census_year', groupBy);
    var keys = groupBy === 'vehicle_type' ? state.metadata.vehicleTypes : state.metadata.motivePowers;
    var sortedKeys = VehicleReg.data.sortKeysByTotal(agg, keys);

    var traces = [];
    sortedKeys.forEach(function(k) {
      if (!agg[k]) return;
      var xs = state.metadata.censusYears;
      traces.push({
        x: xs,
        y: xs.map(function(x) { return (agg[k] && agg[k][x]) || 0; }),
        name: k,
        type: 'bar',
        marker: { color: VehicleReg.data.colorFor(groupBy, k) }
      });
    });

    this._render('composition', traces, {
      barmode: 'stack',
      xaxis: { title: { text: 'Year', automargin: true }, dtick: 1 },
      yaxis: { title: { text: 'Registrations', automargin: true } }
    });
  },

  // Panel 3: Adoption Trends — lines by motive power over census years
  renderAdoptionTrends: function(filtered, state) {
    var agg = VehicleReg.data.aggregate(filtered, 'census_year', 'motive_power');
    var sortedKeys = VehicleReg.data.sortKeysByTotal(agg, state.metadata.motivePowers);

    var traces = [];
    sortedKeys.forEach(function(mp) {
      if (!state.selectedMotivePowers[mp]) return;
      if (!agg[mp]) return;
      var xs = state.metadata.censusYears;
      var ys;

      if (state.adoptionYoY) {
        // Year-over-year differences
        ys = xs.map(function(x, i) {
          if (i === 0) return null;
          var curr = (agg[mp] && agg[mp][x]) || 0;
          var prev = (agg[mp] && agg[mp][xs[i - 1]]) || 0;
          return curr - prev;
        });
        // Skip first year (no prior to diff against)
        xs = xs.slice(1);
        ys = ys.slice(1);
      } else {
        ys = xs.map(function(x) { return (agg[mp] && agg[mp][x]) || 0; });
      }

      traces.push({
        x: xs,
        y: ys,
        name: mp,
        type: 'scatter',
        mode: 'lines+markers',
        line: { width: 3, color: VehicleReg.data.colorFor('motive_power', mp) },
        marker: { size: 8, color: VehicleReg.data.colorFor('motive_power', mp) }
      });
    });

    this._render('adoption-trends', traces, {
      xaxis: { title: { text: 'Year', automargin: true }, dtick: 1 },
      yaxis: { title: { text: state.adoptionYoY ? 'Change from Prior Year' : 'Registrations', automargin: true } }
    });
  },

  // Panel 4: Fleet Comparison — side-by-side bars by census year
  renderComparison: function(filtered, state) {
    var groupBy = state.comparisonGroupBy || 'motive_power';
    var agg = VehicleReg.data.aggregate(filtered, 'census_year', groupBy);
    var keys = groupBy === 'vehicle_type' ? state.metadata.vehicleTypes : state.metadata.motivePowers;
    var sortedKeys = VehicleReg.data.sortKeysByTotal(agg, keys);

    var traces = [];
    sortedKeys.forEach(function(k) {
      if (!agg[k]) return;
      var xs = state.metadata.censusYears;
      traces.push({
        x: xs,
        y: xs.map(function(x) { return (agg[k] && agg[k][x]) || 0; }),
        name: k,
        type: 'bar',
        marker: { color: VehicleReg.data.colorFor(groupBy, k) }
      });
    });

    this._render('comparison', traces, {
      barmode: 'group',
      xaxis: { title: { text: 'Year', automargin: true }, dtick: 1 },
      yaxis: { title: { text: 'Registrations', automargin: true } }
    });
  }
};
