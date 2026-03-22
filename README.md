# Australian Vehicle Registration Dashboard

Interactive browser-based dashboard for exploring Australian vehicle registration data by type, motive power, and year of manufacture.

## Running Locally

The dashboard is a static site with no build step. You just need a local HTTP server (required because the app fetches CSV data).

### Option 1: Python (built-in)

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open http://localhost:8000

### Option 2: Node.js

```bash
npx serve .
```

### Option 3: PHP

```bash
php -S localhost:8000
```

## GitHub Pages

This site is configured to deploy via GitHub Pages from the root of the repository. Once enabled, it will be available at:

```
https://<username>.github.io/Transport/
```

To enable: go to the repo Settings > Pages > Source > Deploy from a branch > select `main` / `root`.

## Data

The dashboard loads `Inputs/rva-mvs-vehtype-mtvpwr-yom-rpc.csv` which contains Australian registered motor vehicle census data broken down by:

- **Year of manufacture** (1901–present)
- **Vehicle type** (Passenger vehicles, Light commercial, Motorcycles, Trucks, Buses, etc.)
- **Motive power** (Petrol, Diesel, Battery/Fuel-cell electric, Hybrid electric, Dual fuel, Other)
- **Census year** (2021–2025)
