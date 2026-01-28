# OPD LoggerX (v1)

A lightweight, offline-capable PWA to register OPD cases by day, show a **one-screen summary**, and export **Excel .xlsx** (per-day) with formulas.

## Features
- Single doctor per phone (doctor name saved in Settings; included in exports)
- Records stored by **date**
- New/Edit entry: Patient ID keypad, Gender, Age group, 1–2 diagnoses, Disposition
- WW / Non-WW appears **only** when a surgical diagnosis is selected
- Summary page: totals, disposition, age×gender, and diagnosis counts (all on one screen)
- Export **Excel .xlsx per selected day** with formulas (Day Summary + Raw Data)
- Backup/Restore JSON

## Quick start (local)
1) Install Node.js (LTS)
2) In the project folder:
```bash
npm install
npm run dev
```

## Build for GitHub Pages
```bash
npm run build
```
Then deploy the `dist/` folder to GitHub Pages.

### Optional: GitHub Actions deploy
You can add a Pages workflow. If you want, tell me and I'll include it in the next zip (v2).

## Notes
- The app is designed to be compact on phones.
- Exports are generated entirely in-browser using ExcelJS.
