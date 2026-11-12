# DataCo-Public

> **Proprietary — © 2026 The Data Co (Pty) Ltd. All rights reserved.** Everything in this repository is
> proprietary and confidential. It may be used only under a written licence or services agreement with
> The Data Co. See [LICENSE](LICENSE).

Content created by **[The Data Co](https://thedataco.co.za)** across Data, Analytics & AI workflows,
mainly **SAP Analytics Cloud (SAC) custom widgets**. Each widget is self-contained: it renders
pure SVG, needs no CDN or external libraries, and can be installed in any SAC tenant with
one JSON manifest and one ZIP bundle.

## SAC custom widgets by area

23 widgets in five areas. Click a preview to open the widget, or an area for its full-size gallery.

| Area | Widgets | Focus |
|---|---|---|
| **[EXCO](SAC/EXCO/README.md)** | 4 | Executive dashboards |
| **[Finance](SAC/Finance/README.md)** | 4 | Financial reporting and analysis |
| **[Mining](SAC/Mining/README.md)** | 8 | Mining operations |
| **[Retail](SAC/Retail/README.md)** | 4 | Retail performance and merchandise planning |
| **[General](SAC/General/README.md)** | 3 | Cross-industry visuals |

### EXCO

Executive dashboards: headline KPIs, attainment, variance hot-spots and value-driver trees for board and EXCO packs.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="SAC/EXCO/Variance%20KPI%20Tile"><img src="SAC/EXCO/Variance%20KPI%20Tile/Example.png" width="260" alt="Variance KPI Tile"/></a> | **[Variance KPI Tile](SAC/EXCO/Variance%20KPI%20Tile)** | Headline Actual with ▲/▼ variance vs Plan and Prior Year, plus a sparkline |
| <a href="SAC/EXCO/Bullet%20Chart"><img src="SAC/EXCO/Bullet%20Chart/Example.png" width="260" alt="Bullet Chart"/></a> | **[Bullet Chart](SAC/EXCO/Bullet%20Chart)** | Actual vs Target with % of target bands and a Forecast marker |
| <a href="SAC/EXCO/Variance%20Heatmap"><img src="SAC/EXCO/Variance%20Heatmap/Example.png" width="260" alt="Variance Heatmap"/></a> | **[Variance Heatmap](SAC/EXCO/Variance%20Heatmap)** | Row × column variance % with RAG or diverging colour and totals |
| <a href="SAC/EXCO/Driver%20Tree"><img src="SAC/EXCO/Driver%20Tree/Example.png" width="260" alt="Driver Tree"/></a> | **[Driver Tree](SAC/EXCO/Driver%20Tree)** | Value driver tree (e.g. ROCE → margin × turnover) with actual, plan and RAG per node |

### Finance

Financial reporting and analysis: income statement, revenue bridges, working capital and variance analysis. Currency switch: ZAR / USD.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="SAC/Finance/PnL%20Waterfall"><img src="SAC/Finance/PnL%20Waterfall/Example.png" width="260" alt="P&L Waterfall"/></a> | **[P&L Waterfall](SAC/Finance/PnL%20Waterfall)** | Income statement from revenue to net profit with automatic sub-totals and % of revenue |
| <a href="SAC/Finance/PVM%20Bridge"><img src="SAC/Finance/PVM%20Bridge/Example.png" width="260" alt="Price-Volume-Mix Bridge"/></a> | **[Price-Volume-Mix Bridge](SAC/Finance/PVM%20Bridge)** | Revenue bridge split into volume, mix, price and new/discontinued effects, with top product drivers |
| <a href="SAC/Finance/Ageing%20Buckets"><img src="SAC/Finance/Ageing%20Buckets/Example.png" width="260" alt="Ageing Buckets (AR/AP)"/></a> | **[Ageing Buckets (AR/AP)](SAC/Finance/Ageing%20Buckets)** | Debtors / creditors ageing by customer or vendor with overdue tiles |
| <a href="SAC/Finance/Variance%20Bridge"><img src="SAC/Finance/Variance%20Bridge/Example.png" width="260" alt="Variance Bridge"/></a> | **[Variance Bridge](SAC/Finance/Variance%20Bridge)** | Plan → Actual waterfall by driver, with Top-N + Other |

### Mining

Mining operations: material flow, resources, plant performance, reconciliation, equipment, cost position and safety. Units default to copper (t, % Cu, US$/lb) and are configurable.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="SAC/Mining/Mine-to-Mill%20Sankey"><img src="SAC/Mining/Mine-to-Mill%20Sankey/Example.png" width="260" alt="Mine-to-Mill Sankey"/></a> | **[Mine-to-Mill Sankey](SAC/Mining/Mine-to-Mill%20Sankey)** | Tonnes from pits through stockpiles, crusher and mill to concentrate, with grade |
| <a href="SAC/Mining/Grade-Tonnage%20Curve"><img src="SAC/Mining/Grade-Tonnage%20Curve/Example.png" width="260" alt="Grade-Tonnage Curve"/></a> | **[Grade-Tonnage Curve](SAC/Mining/Grade-Tonnage%20Curve)** | Tonnes and average grade above cut-off, with a cut-off read-out |
| <a href="SAC/Mining/Recovery%20vs%20Head%20Grade"><img src="SAC/Mining/Recovery%20vs%20Head%20Grade/Example.png" width="260" alt="Recovery vs Head Grade"/></a> | **[Recovery vs Head Grade](SAC/Mining/Recovery%20vs%20Head%20Grade)** | Plant recovery vs feed grade with fitted curve and target band |
| <a href="SAC/Mining/Metal%20Balance"><img src="SAC/Mining/Metal%20Balance/Example.png" width="260" alt="Metal Balance & Reconciliation"/></a> | **[Metal Balance & Reconciliation](SAC/Mining/Metal%20Balance)** | Stage metal balance with F1/F2/F3 reconciliation factors |
| <a href="SAC/Mining/OEE%20Time%20Usage"><img src="SAC/Mining/OEE%20Time%20Usage/Example.png" width="260" alt="OEE Time-Usage Waterfall"/></a> | **[OEE Time-Usage Waterfall](SAC/Mining/OEE%20Time%20Usage)** | Calendar → direct operating hours waterfall with A/U/E/OEE |
| <a href="SAC/Mining/Fleet%20Status%20Timeline"><img src="SAC/Mining/Fleet%20Status%20Timeline/Example.png" width="260" alt="Fleet Status Timeline"/></a> | **[Fleet Status Timeline](SAC/Mining/Fleet%20Status%20Timeline)** | Equipment status lanes across the shift with % operating |
| <a href="SAC/Mining/Cost%20Curve"><img src="SAC/Mining/Cost%20Curve/Example.png" width="260" alt="Cost Curve"/></a> | **[Cost Curve](SAC/Mining/Cost%20Curve)** | Industry cost curve with own assets, quartiles and price line |
| <a href="SAC/Mining/Safety%20Pyramid"><img src="SAC/Mining/Safety%20Pyramid/Example.png" width="260" alt="Safety Pyramid"/></a> | **[Safety Pyramid](SAC/Mining/Safety%20Pyramid)** | Incidents by severity with LTIFR / TRIFR |

### Retail

Retail performance and merchandise planning: store productivity, range classification, stock health and season sell-through. Currency switch: ZAR / USD.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="SAC/Retail/Store%20Quadrant"><img src="SAC/Retail/Store%20Quadrant/Example.png" width="260" alt="Store Performance Quadrant"/></a> | **[Store Performance Quadrant](SAC/Retail/Store%20Quadrant)** | Stores on two KPIs (e.g. sales/m² vs margin %) in four labelled quadrants, bubble = revenue |
| <a href="SAC/Retail/ABC-XYZ%20Matrix"><img src="SAC/Retail/ABC-XYZ%20Matrix/Example.png" width="260" alt="ABC/XYZ Matrix"/></a> | **[ABC/XYZ Matrix](SAC/Retail/ABC-XYZ%20Matrix)** | Revenue contribution × demand variability 3×3 matrix with stock policy hints |
| <a href="SAC/Retail/Weeks%20of%20Cover"><img src="SAC/Retail/Weeks%20of%20Cover/Example.png" width="260" alt="Weeks of Cover"/></a> | **[Weeks of Cover](SAC/Retail/Weeks%20of%20Cover)** | Weeks of cover vs target band, with stock value, OOS % and aged stock % |
| <a href="SAC/Retail/Sell-through%20Curve"><img src="SAC/Retail/Sell-through%20Curve/Example.png" width="260" alt="Sell-through Curve"/></a> | **[Sell-through Curve](SAC/Retail/Sell-through%20Curve)** | Cumulative sell-through % by week since launch vs plan and target |

### General

Cross-industry visuals: calendars, process funnels and project timelines.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="SAC/General/Calendar%20Heatmap"><img src="SAC/General/Calendar%20Heatmap/Example.png" width="260" alt="Calendar Heatmap"/></a> | **[Calendar Heatmap](SAC/General/Calendar%20Heatmap)** | Daily values on a calendar grid (Gregorian or 4-4-5 retail) |
| <a href="SAC/General/Order%20Flow%20Funnel"><img src="SAC/General/Order%20Flow%20Funnel/Example.png" width="260" alt="Order Flow Funnel"/></a> | **[Order Flow Funnel](SAC/General/Order%20Flow%20Funnel)** | Process-flow funnel with stage conversion |
| <a href="SAC/General/Gantt%20Chart"><img src="SAC/General/Gantt%20Chart/Example.png" width="260" alt="Gantt Chart"/></a> | **[Gantt Chart](SAC/General/Gantt%20Chart)** | Timeline bars from start/end dates with swimlanes |

## Conventions

- **Bind in order.** Unless a widget uses named feeds (Fleet Status Timeline, Gantt Chart), dimensions and
  measures are read in binding order (e.g. Actual first, then Plan). Each widget README gives the exact order.
- **Currency.** Finance, EXCO and Retail widgets have a `currency` switch: `ZAR` (R), `USD` ($) or `custom`.
  It changes the symbol only (no FX conversion); bind the reporting-currency measure for the currency you show.
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
