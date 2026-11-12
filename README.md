# DataCo-Public

> **Proprietary — © 2026 The Data Co (Pty) Ltd. All rights reserved.** Everything in this repository is
> proprietary and confidential. It may be used only under a written licence or services agreement with
> The Data Co. See [LICENSE](LICENSE).

Content created by **[The Data Co](https://thedataco.co.za)** across Data, Analytics & AI workflows,
mainly **SAP Analytics Cloud (SAC) custom widgets**. Each widget is self-contained: it renders
pure SVG, needs no CDN or external libraries, and can be installed in any SAC tenant with
one JSON manifest and one ZIP bundle.

## SAC custom widgets

| Widget | Version | What it shows | Folder |
|---|---|---|---|
| **Variance KPI Tile** | 0.1.0 | Headline Actual with ▲/▼ variance vs Plan and Prior Year, plus a sparkline | [`SAC/Variance KPI Tile`](SAC/Variance%20KPI%20Tile) |
| **Variance Bridge** | 0.1.0 | Plan → Actual waterfall by driver, with Top‑N + Other | [`SAC/Variance Bridge`](SAC/Variance%20Bridge) |
| **Bullet Chart** | 0.1.0 | Actual vs Target with % of target bands and a Forecast marker | [`SAC/Bullet Chart`](SAC/Bullet%20Chart) |
| **Variance Heatmap** | 0.1.0 | Row × column variance % with RAG or diverging colour and totals | [`SAC/Variance Heatmap`](SAC/Variance%20Heatmap) |
| **Mine-to-Mill Sankey** | 0.1.0 | Tonnes flowing from pits through stockpiles, crusher and mill to concentrate, with grade | [`SAC/Mine-to-Mill Sankey`](SAC/Mine-to-Mill%20Sankey) |
| **Grade-Tonnage Curve** | 0.1.0 | Tonnes and average grade above cut-off, with a cut-off read-out | [`SAC/Grade-Tonnage Curve`](SAC/Grade-Tonnage%20Curve) |
| **Recovery vs Head Grade** | 0.1.0 | Plant recovery vs feed grade with fitted curve and target band | [`SAC/Recovery vs Head Grade`](SAC/Recovery%20vs%20Head%20Grade) |
| **Metal Balance** | 0.1.0 | Stage metal balance with F1/F2/F3 reconciliation factors | [`SAC/Metal Balance`](SAC/Metal%20Balance) |
| **OEE Time Usage** | 0.1.0 | Calendar → direct operating hours waterfall with A/U/E/OEE | [`SAC/OEE Time Usage`](SAC/OEE%20Time%20Usage) |
| **Fleet Status Timeline** | 0.1.0 | Equipment status lanes across the shift with % operating | [`SAC/Fleet Status Timeline`](SAC/Fleet%20Status%20Timeline) |
| **Cost Curve** | 0.1.0 | Industry cost curve with own assets, quartiles and price line | [`SAC/Cost Curve`](SAC/Cost%20Curve) |
| **Safety Pyramid** | 0.1.0 | Incidents by severity with LTIFR / TRIFR | [`SAC/Safety Pyramid`](SAC/Safety%20Pyramid) |
| **Calendar Heatmap** | 0.2.0 | Daily values on a calendar grid (Gregorian or 4‑4‑5 retail) | [`SAC/Calendar Heatmap`](SAC/Calendar%20Heatmap) |
| **Order Flow Funnel** | 0.3.0 | Process‑flow funnel with stage conversion | [`SAC/Flow Diagram`](SAC/Flow%20Diagram) |
| **Gantt Chart** | 0.1.1 | Timeline bars from start/end dates with swimlanes | [`SAC/ganttChart_1.json`](SAC/ganttChart_1.json) |

Screenshots of every widget are in the [gallery](#widget-gallery) below, and each widget folder has its own README with its data
model and properties.

## Widget gallery

### Variance KPI Tile
![Variance KPI Tile](SAC/Variance%20KPI%20Tile/Example.png)

### Variance Bridge
![Variance Bridge](SAC/Variance%20Bridge/Example.png)

### Bullet Chart
![Bullet Chart](SAC/Bullet%20Chart/Example.png)

### Variance Heatmap
![Variance Heatmap](SAC/Variance%20Heatmap/Example.png)

### Mine-to-Mill Sankey
![Mine-to-Mill Sankey](SAC/Mine-to-Mill%20Sankey/Example.png)

### Grade-Tonnage Curve
![Grade-Tonnage Curve](SAC/Grade-Tonnage%20Curve/Example.png)

### Recovery vs Head Grade
![Recovery vs Head Grade](SAC/Recovery%20vs%20Head%20Grade/Example.png)

### Metal Balance
![Metal Balance](SAC/Metal%20Balance/Example.png)

### OEE Time Usage
![OEE Time Usage](SAC/OEE%20Time%20Usage/Example.png)

### Fleet Status Timeline
![Fleet Status Timeline](SAC/Fleet%20Status%20Timeline/Example.png)

### Cost Curve
![Cost Curve](SAC/Cost%20Curve/Example.png)

### Safety Pyramid
![Safety Pyramid](SAC/Safety%20Pyramid/Example.png)

### Calendar Heatmap
![Calendar Heatmap](SAC/Calendar%20Heatmap/Example.png)

### Order Flow Funnel
![Order Flow Funnel](SAC/Flow%20Diagram/Example.png)

### Gantt Chart
![Gantt Chart](SAC/ganttChart_Example.png)

## Widget packs

### Variance pack

The four variance widgets are built to be used together on management dashboards, and they share
the same conventions:

- **Measures are bound in order, with Actual first**, followed by Plan/Target, then Prior Year or Forecast.
- **`invertSign`** is for cost measures: when it is on, coming in under plan shows green.
- The **number format** is the same in all four: `valueScale` (auto/K/M/B), `decimals`, `prefix`, `suffix`.
- Hierarchy **total nodes are skipped**, so totals are not counted twice.

### Mining pack

Eight widgets for mining operations dashboards, covering production, processing, reconciliation,
equipment, cost and safety. Units default to copper (t, % Cu, US$/lb), and grade unit, metal
factor and cost formatting can all be changed in the Styling panel (e.g. `g/t Au`). The
Fleet Status Timeline uses **named feeds** (Equipment, Status, Start, End); the others bind
dimensions and measures **in order**, and each widget's README gives the exact order.

## Install a widget in SAC

1. Download the widget's `<name>.json` and `<name>.zip` from its folder.
2. In SAC, go to **Administration → App Integration → Custom Widgets → Add**.
3. Upload the **JSON** into the manifest slot and the **ZIP** into the resource slot.
4. In a story or analytic application, choose **Insert → Custom Widgets**, add the widget, and bind
   the dimensions and measures in the Builder panel. Use the Styling panel for labels, colours and thresholds.

All widgets have `supportsExport: true`, so they appear in PDF/PPT exports.

## Folder layout

```
SAC/<Widget>/
  <name>.json          manifest (upload to SAC)
  <name>.zip           JS bundle (upload to SAC)
  <name>.js            main web component (renderer inlined)
  <name>Styling.js     Builder / styling panel
  renderer.core.js     pure renderer, shared with the preview
  preview.html         local sandbox with synthetic data (open in a browser)
  README.md            data model, properties, notes
  Example.png          screenshot
```

## Preview locally

Open any `preview.html` in a browser; it doesn't need a server or a SAC tenant. It runs the same
renderer as the widget on synthetic data, with controls for the main options.

## Notes and limitations

- The widgets work with SAC data bindings on both live (BW/HANA) and import models. On live BW,
  keep variance, YTD and restricted key figure logic in the query or HANA view, and use the
  widgets for presentation.
- In the manifests, `ignoreIntegrity` is `true`, which is fine for development. For production
  tenants that enforce integrity, set it to `false` and keep the `integrity` hashes in step with
  the JS files.
- Licensed customers should test the widgets on their own models before using them in production.

## Licence

Proprietary. Copyright © 2026 The Data Co (Pty) Ltd, including the DataVizCo brand. All rights reserved.
No licence is granted by publication in this repository; use, copying, modification and distribution
require a written agreement with The Data Co. Every manifest carries the licence and EULA, and every
source file carries a copyright header. See [LICENSE](LICENSE) for the full terms.

## Contact

Licensing and enquiries: The Data Co (Pty) Ltd · Century City, Cape Town · [thedataco.co.za](https://thedataco.co.za) · admin@thedataco.co.za
SAP Analytics (BW, Datasphere, SAC, HANA Cloud) · SAP ABAP/Fiori · SAP GRC
