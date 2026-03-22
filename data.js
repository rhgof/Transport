window.VehicleReg = window.VehicleReg || {};

VehicleReg.data = {
  fetchAndParse: function(url, callback) {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        var rows = results.data.map(function(row) {
          var yom = row['year_of_manufacture'];
          return {
            year_of_manufacture: yom && !isNaN(parseInt(yom)) ? parseInt(yom) : null,
            vehicle_type: row['vehicle_type'] || null,
            motive_power: row['motive_power'] || null,
            no_vehicles: row['no_vehicles'] !== undefined && row['no_vehicles'] !== '' ? parseInt(row['no_vehicles']) : null,
            census_year: row['Year'] ? parseInt(row['Year']) : null
          };
        }).filter(function(r) {
          return r.census_year !== null;
        });
        callback(null, rows);
      },
      error: function(err) {
        callback(err, null);
      }
    });
  },

  buildMetadata: function(rows) {
    var vehicleTypes = {};
    var motivePowers = {};
    var censusYears = {};
    var yomRange = { min: 9999, max: 0 };

    // Sum total registrations for sorting
    var vtTotals = {};
    var mpTotals = {};

    rows.forEach(function(r) {
      if (r.vehicle_type) {
        vehicleTypes[r.vehicle_type] = true;
        vtTotals[r.vehicle_type] = (vtTotals[r.vehicle_type] || 0) + (r.no_vehicles || 0);
      }
      if (r.motive_power) {
        motivePowers[r.motive_power] = true;
        mpTotals[r.motive_power] = (mpTotals[r.motive_power] || 0) + (r.no_vehicles || 0);
      }
      if (r.census_year) censusYears[r.census_year] = true;
      if (r.year_of_manufacture !== null) {
        if (r.year_of_manufacture < yomRange.min) yomRange.min = r.year_of_manufacture;
        if (r.year_of_manufacture > yomRange.max) yomRange.max = r.year_of_manufacture;
      }
    });

    // Sort by total registrations descending
    var sortedVT = Object.keys(vehicleTypes).sort(function(a, b) {
      return (vtTotals[b] || 0) - (vtTotals[a] || 0);
    });
    var sortedMP = Object.keys(motivePowers).sort(function(a, b) {
      return (mpTotals[b] || 0) - (mpTotals[a] || 0);
    });

    return {
      vehicleTypes: sortedVT,
      motivePowers: sortedMP,
      vehicleTypeTotals: vtTotals,
      motivePowerTotals: mpTotals,
      censusYears: Object.keys(censusYears).map(Number).sort(),
      yomRange: yomRange
    };
  },

  filterRows: function(rows, state) {
    return rows.filter(function(r) {
      if (!state.selectedVehicleTypes[r.vehicle_type]) return false;
      if (!state.selectedMotivePowers[r.motive_power]) return false;
      return true;
    });
  },

  aggregate: function(rows, xField, groupField) {
    var result = {};
    rows.forEach(function(r) {
      var x = r[xField];
      var g = r[groupField];
      if (x === null || g === null) return;
      if (!result[g]) result[g] = {};
      if (!result[g][x]) result[g][x] = 0;
      var v = r.no_vehicles;
      if (v !== null) result[g][x] += v;
    });
    return result;
  },

  // Sort keys by their total across all x values, descending
  sortKeysByTotal: function(agg, keys) {
    return keys.slice().sort(function(a, b) {
      var totalA = 0, totalB = 0;
      if (agg[a]) Object.keys(agg[a]).forEach(function(x) { totalA += agg[a][x] || 0; });
      if (agg[b]) Object.keys(agg[b]).forEach(function(x) { totalB += agg[b][x] || 0; });
      return totalB - totalA;
    });
  },

  VEHICLE_TYPE_COLORS: {
    'Articulated trucks': '#1f77b4',
    'Campervans': '#ff7f0e',
    'Heavy buses': '#2ca02c',
    'Heavy rigid trucks': '#d62728',
    'Light buses': '#9467bd',
    'Light commercial vehicles': '#8c564b',
    'Light rigid trucks': '#e377c2',
    'Motorcycles': '#7f7f7f',
    'Non-freight-carrying vehicles': '#bcbd22',
    'Passenger vehicles': '#17becf'
  },

  MOTIVE_POWER_COLORS: {
    'Battery/Fuel-cell electric': '#2ca02c',
    'Diesel': '#d62728',
    'Dual fuel': '#9467bd',
    'Hybrid electric': '#ff7f0e',
    'Other': '#7f7f7f',
    'Petrol': '#1f77b4'
  },

  colorFor: function(groupField, key) {
    if (groupField === 'vehicle_type') {
      return this.VEHICLE_TYPE_COLORS[key] || '#999';
    }
    return this.MOTIVE_POWER_COLORS[key] || '#999';
  }
};
