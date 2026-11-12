# DataCo-Public

> **Proprietary — © 2026 The Data Co (Pty) Ltd. All rights reserved.** Everything in this repository is
> proprietary and confidential. It may be used only under a written licence or services agreement with
> The Data Co. See [LICENSE](LICENSE).

Content created by **[The Data Co](https://thedataco.co.za)** across Data, Analytics & AI workflows,
mainly **SAP Analytics Cloud (SAC) custom widgets**. Each widget is self-contained: it renders
pure SVG, needs no CDN or external libraries, and can be installed in any SAC tenant with
one JSON manifest and one ZIP bundle.

## SAC custom widgets by area

23 widgets in five areas. Click an area for its gallery.

| Area | Widgets | Focus |
|---|---|---|
| **[EXCO](SAC/EXCO/README.md)** | 4 | Executive dashboards |
| **[Finance](SAC/Finance/README.md)** | 4 | Financial reporting and analysis |
| **[Mining](SAC/Mining/README.md)** | 8 | Mining operations |
| **[Retail](SAC/Retail/README.md)** | 4 | Retail performance and merchandise planning |
| **[General](SAC/General/README.md)** | 3 | Cross-industry visuals |

### EXCO

Executive dashboards: headline KPIs, attainment, variance hot-spots and value-driver trees for board and EXCO packs.

| Widget | What it shows | Folder |
|---|---|---|
| **Variance KPI Tile** | Headline Actual with ▲/▼ variance vs Plan and Prior Year, plus a sparkline | [`EXCO/Variance KPI Tile`](SAC/EXCO/Variance%20KPI%20Tile) |
| **Bullet Chart** | Actual vs Target with % of target bands and a Forecast marker | [`EXCO/Bullet Chart`](SAC/EXCO/Bullet%20Chart) |
| **Variance Heatmap** | Row × column variance % with RAG or diverging colour and totals | [`EXCO/Variance Heatmap`](SAC/EXCO/Variance%20Heatmap) |
| **Driver Tree** | Value driver tree (e.g. ROCE → margin × turnover) with actual, plan and RAG per node | [`EXCO/Driver Tree`](SAC/EXCO/Driver%20Tree) |

<p><a href="SAC/EXCO/Variance%20KPI%20Tile"><img src="SAC/EXCO/Variance%20KPI%20Tile/Example.png" width="31%" alt="Variance KPI Tile"/></a> <a href="SAC/EXCO/Bullet%20Chart"><img src="SAC/EXCO/Bullet%20Chart/Example.png" width="31%" alt="Bullet Chart"/></a> <a href="SAC/EXCO/Variance%20Heatmap"><img src="SAC/EXCO/Variance%20Heatmap/Example.png" width="31%" alt="Variance Heatmap"/></a> <a href="SAC/EXCO/Driver%20Tree"><img src="SAC/EXCO/Driver%20Tree/Example.png" width="31%" alt="Driver Tree"/></a></p>

### Finance

Financial reporting and analysis: income statement, revenue bridges, working capital and variance analysis. Currency switch: ZAR / USD.

| Widget | What it shows | Folder |
|---|---|---|
| **P&L Waterfall** | Income statement from revenue to net profit with automatic sub-totals and % of revenue | [`Finance/PnL Waterfall`](SAC/Finance/PnL%20Waterfall) |
| **Price-Volume-Mix Bridge** | Revenue bridge split into volume, mix, price and new/discontinued effects, with top product drivers | [`Finance/PVM Bridge`](SAC/Finance/PVM%20Bridge) |
| **Ageing Buckets (AR/AP)** | Debtors / creditors ageing by customer or vendor with overdue tiles | [`Finance/Ageing Buckets`](SAC/Finance/Ageing%20Buckets) |
| **Variance Bridge** | Plan → Actual waterfall by driver, with Top-N + Other | [`Finance/Variance Bridge`](SAC/Finance/Variance%20Bridge) |

<p><a href="SAC/Finance/PnL%20Waterfall"><img src="SAC/Finance/PnL%20Waterfall/Example.png" width="31%" alt="PnL Waterfall"/></a> <a href="SAC/Finance/PVM%20Bridge"><img src="SAC/Finance/PVM%20Bridge/Example.png" width="31%" alt="PVM Bridge"/></a> <a href="SAC/Finance/Ageing%20Buckets"><img src="SAC/Finance/Ageing%20Buckets/Example.png" width="31%" alt="Ageing Buckets"/></a> <a href="SAC/Finance/Variance%20Bridge"><img src="SAC/Finance/Variance%20Bridge/Example.png" width="31%" alt="Variance Bridge"/></a></p>

### Mining

Mining operations: material flow, resources, plant performance, reconciliation, equipment, cost position and safety. Units default to copper (t, % Cu, US$/lb) and are configurable.

| Widget | What it shows | Folder |
|---|---|---|
| **Mine-to-Mill Sankey** | Tonnes from pits through stockpiles, crusher and mill to concentrate, with grade | [`Mining/Mine-to-Mill Sankey`](SAC/Mining/Mine-to-Mill%20Sankey) |
| **Grade-Tonnage Curve** | Tonnes and average grade above cut-off, with a cut-off read-out | [`Mining/Grade-Tonnage Curve`](SAC/Mining/Grade-Tonnage%20Curve) |
| **Recovery vs Head Grade** | Plant recovery vs feed grade with fitted curve and target band | [`Mining/Recovery vs Head Grade`](SAC/Mining/Recovery%20vs%20Head%20Grade) |
| **Metal Balance & Reconciliation** | Stage metal balance with F1/F2/F3 reconciliation factors | [`Mining/Metal Balance`](SAC/Mining/Metal%20Balance) |
| **OEE Time-Usage Waterfall** | Calendar → direct operating hours waterfall with A/U/E/OEE | [`Mining/OEE Time Usage`](SAC/Mining/OEE%20Time%20Usage) |
| **Fleet Status Timeline** | Equipment status lanes across the shift with % operating | [`Mining/Fleet Status Timeline`](SAC/Mining/Fleet%20Status%20Timeline) |
| **Cost Curve** | Industry cost curve with own assets, quartiles and price line | [`Mining/Cost Curve`](SAC/Mining/Cost%20Curve) |
| **Safety Pyramid** | Incidents by severity with LTIFR / TRIFR | [`Mining/Safety Pyramid`](SAC/Mining/Safety%20Pyramid) |

<p><a href="SAC/Mining/Mine-to-Mill%20Sankey"><img src="SAC/Mining/Mine-to-Mill%20Sankey/Example.png" width="31%" alt="Mine-to-Mill Sankey"/></a> <a href="SAC/Mining/Grade-Tonnage%20Curve"><img src="SAC/Mining/Grade-Tonnage%20Curve/Example.png" width="31%" alt="Grade-Tonnage Curve"/></a> <a href="SAC/Mining/Recovery%20vs%20Head%20Grade"><img src="SAC/Mining/Recovery%20vs%20Head%20Grade/Example.png" width="31%" alt="Recovery vs Head Grade"/></a> <a href="SAC/Mining/Metal%20Balance"><img src="SAC/Mining/Metal%20Balance/Example.png" width="31%" alt="Metal Balance"/></a> <a href="SAC/Mining/OEE%20Time%20Usage"><img src="SAC/Mining/OEE%20Time%20Usage/Example.png" width="31%" alt="OEE Time Usage"/></a> <a href="SAC/Mining/Fleet%20Status%20Timeline"><img src="SAC/Mining/Fleet%20Status%20Timeline/Example.png" width="31%" alt="Fleet Status Timeline"/></a> <a href="SAC/Mining/Cost%20Curve"><img src="SAC/Mining/Cost%20Curve/Example.png" width="31%" alt="Cost Curve"/></a> <a href="SAC/Mining/Safety%20Pyramid"><img src="SAC/Mining/Safety%20Pyramid/Example.png" width="31%" alt="Safety Pyramid"/></a></p>

### Retail

Retail performance and merchandise planning: store productivity, range classification, stock health and season sell-through. Currency switch: ZAR / USD.

| Widget | What it shows | Folder |
|---|---|---|
| **Store Performance Quadrant** | Stores on two KPIs (e.g. sales/m² vs margin %) in four labelled quadrants, bubble = revenue | [`Retail/Store Quadrant`](SAC/Retail/Store%20Quadrant) |
| **ABC/XYZ Matrix** | Revenue contribution × demand variability 3×3 matrix with stock policy hints | [`Retail/ABC-XYZ Matrix`](SAC/Retail/ABC-XYZ%20Matrix) |
| **Weeks of Cover** | Weeks of cover vs target band, with stock value, OOS % and aged stock % | [`Retail/Weeks of Cover`](SAC/Retail/Weeks%20of%20Cover) |
| **Sell-through Curve** | Cumulative sell-through % by week since launch vs plan and target | [`Retail/Sell-through Curve`](SAC/Retail/Sell-through%20Curve) |

<p><a href="SAC/Retail/Store%20Quadrant"><img src="SAC/Retail/Store%20Quadrant/Example.png" width="31%" alt="Store Quadrant"/></a> <a href="SAC/Retail/ABC-XYZ%20Matrix"><img src="SAC/Retail/ABC-XYZ%20Matrix/Example.png" width="31%" alt="ABC-XYZ Matrix"/></a> <a href="SAC/Retail/Weeks%20of%20Cover"><img src="SAC/Retail/Weeks%20of%20Cover/Example.png" width="31%" alt="Weeks of Cover"/></a> <a href="SAC/Retail/Sell-through%20Curve"><img src="SAC/Retail/Sell-through%20Curve/Example.png" width="31%" alt="Sell-through Curve"/></a></p>

### General

Cross-industry visuals: calendars, process funnels and project timelines.

| Widget | What it shows | Folder |
|---|---|---|
| **Calendar Heatmap** | Daily values on a calendar grid (Gregorian or 4-4-5 retail) | [`General/Calendar Heatmap`](SAC/General/Calendar%20Heatmap) |
| **Order Flow Funnel** | Process-flow funnel with stage conversion | [`General/Order Flow Funnel`](SAC/General/Order%20Flow%20Funnel) |
| **Gantt Chart** | Timeline bars from start/end dates with swimlanes | [`General/Gantt Chart`](SAC/General/Gantt%20Chart) |

<p><a href="SAC/General/Calendar%20Heatmap"><img src="SAC/General/Calendar%20Heatmap/Example.png" width="31%" alt="Calendar Heatmap"/></a> <a href="SAC/General/Order%20Flow%20Funnel"><img src="SAC/General/Order%20Flow%20Funnel/Example.png" width="31%" alt="Order Flow Funnel"/></a> <a href="SAC/General/Gantt%20Chart"><img src="SAC/General/Gantt%20Chart/Example.png" width="31%" alt="Gantt Chart"/></a></p>

## Conventions

- **Bind in order.** Unless a widget uses named feeds (Fleet Status Timeline, Gantt Chart), dimensions and
  measures are read in binding order (e.g. Actual first, then Plan). Each widget README gives the exact order.
- **Currency.** The P&L Waterfall, PVM Bridge, Ageing Buckets, Driver Tree and Retail widgets have a `currency`
  switch: `ZAR` (R), `USD` ($) or `custom`. The variance widgets take a `prefix` (e.g. `R` or `$`). Both change
  the symbol only (no FX conversion), so bind the reporting-currency measure for the currency you show.
- **Cost measures.** `invertSign` / `lowerIsBetter` make under-plan favourable for cost-type measures.
- **Totals.** Hierarchy total nodes are skipped, so values aren't double-counted.
- **Mining units** default to copper (t, % Cu, US$/lb) and are configurable (e.g. `g/t Au`).

## Install a widget in SAC

1. Download the widget's `<name>.json` and `<name>.zip` from its folder.
2. In SAC, go to **Administration → App Integration → Custom Widgets → Add**.
3. Upload the **JSON** into the manifest slot and the **ZIP** into the resource slot.
4. In a story or analytic application, choose **Insert → Custom Widgets**, add the widget, and bind
   the dimensions and measures in the Builder panel. Use the Styling panel for labels, colours and thresholds.

All widgets have `supportsExport: true`, so they appear in PDF/PPT exports.

## Folder layout

```
SAC/<Area>/<Widget>/        Area = EXCO | Finance | Mining | Retail | General
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
