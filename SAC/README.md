# SAP Analytics Cloud custom widgets

**Proprietary — © 2026 The Data Co (Pty) Ltd. All rights reserved.** Use requires a written licence; see [LICENSE](../LICENSE).

Widgets are grouped by business area. Each area folder has a README with a gallery; each widget folder has
its manifest (JSON), bundle (ZIP), sources, preview and README.

## [EXCO](EXCO/README.md)

Executive dashboards: headline KPIs, attainment, variance hot-spots and value-driver trees for board and EXCO packs.

| Widget | What it shows | Folder |
|---|---|---|
| **Variance KPI Tile** | Headline Actual with ▲/▼ variance vs Plan and Prior Year, plus a sparkline | [`EXCO/Variance KPI Tile`](EXCO/Variance%20KPI%20Tile) |
| **Bullet Chart** | Actual vs Target with % of target bands and a Forecast marker | [`EXCO/Bullet Chart`](EXCO/Bullet%20Chart) |
| **Variance Heatmap** | Row × column variance % with RAG or diverging colour and totals | [`EXCO/Variance Heatmap`](EXCO/Variance%20Heatmap) |
| **Driver Tree** | Value driver tree (e.g. ROCE → margin × turnover) with actual, plan and RAG per node | [`EXCO/Driver Tree`](EXCO/Driver%20Tree) |

## [Finance](Finance/README.md)

Financial reporting and analysis: income statement, revenue bridges, working capital and variance analysis. Currency switch: ZAR / USD.

| Widget | What it shows | Folder |
|---|---|---|
| **P&L Waterfall** | Income statement from revenue to net profit with automatic sub-totals and % of revenue | [`Finance/PnL Waterfall`](Finance/PnL%20Waterfall) |
| **Price-Volume-Mix Bridge** | Revenue bridge split into volume, mix, price and new/discontinued effects, with top product drivers | [`Finance/PVM Bridge`](Finance/PVM%20Bridge) |
| **Ageing Buckets (AR/AP)** | Debtors / creditors ageing by customer or vendor with overdue tiles | [`Finance/Ageing Buckets`](Finance/Ageing%20Buckets) |
| **Variance Bridge** | Plan → Actual waterfall by driver, with Top-N + Other | [`Finance/Variance Bridge`](Finance/Variance%20Bridge) |

## [Mining](Mining/README.md)

Mining operations: material flow, resources, plant performance, reconciliation, equipment, cost position and safety. Units default to copper (t, % Cu, US$/lb) and are configurable.

| Widget | What it shows | Folder |
|---|---|---|
| **Mine-to-Mill Sankey** | Tonnes from pits through stockpiles, crusher and mill to concentrate, with grade | [`Mining/Mine-to-Mill Sankey`](Mining/Mine-to-Mill%20Sankey) |
| **Grade-Tonnage Curve** | Tonnes and average grade above cut-off, with a cut-off read-out | [`Mining/Grade-Tonnage Curve`](Mining/Grade-Tonnage%20Curve) |
| **Recovery vs Head Grade** | Plant recovery vs feed grade with fitted curve and target band | [`Mining/Recovery vs Head Grade`](Mining/Recovery%20vs%20Head%20Grade) |
| **Metal Balance & Reconciliation** | Stage metal balance with F1/F2/F3 reconciliation factors | [`Mining/Metal Balance`](Mining/Metal%20Balance) |
| **OEE Time-Usage Waterfall** | Calendar → direct operating hours waterfall with A/U/E/OEE | [`Mining/OEE Time Usage`](Mining/OEE%20Time%20Usage) |
| **Fleet Status Timeline** | Equipment status lanes across the shift with % operating | [`Mining/Fleet Status Timeline`](Mining/Fleet%20Status%20Timeline) |
| **Cost Curve** | Industry cost curve with own assets, quartiles and price line | [`Mining/Cost Curve`](Mining/Cost%20Curve) |
| **Safety Pyramid** | Incidents by severity with LTIFR / TRIFR | [`Mining/Safety Pyramid`](Mining/Safety%20Pyramid) |

## [Retail](Retail/README.md)

Retail performance and merchandise planning: store productivity, range classification, stock health and season sell-through. Currency switch: ZAR / USD.

| Widget | What it shows | Folder |
|---|---|---|
| **Store Performance Quadrant** | Stores on two KPIs (e.g. sales/m² vs margin %) in four labelled quadrants, bubble = revenue | [`Retail/Store Quadrant`](Retail/Store%20Quadrant) |
| **ABC/XYZ Matrix** | Revenue contribution × demand variability 3×3 matrix with stock policy hints | [`Retail/ABC-XYZ Matrix`](Retail/ABC-XYZ%20Matrix) |
| **Weeks of Cover** | Weeks of cover vs target band, with stock value, OOS % and aged stock % | [`Retail/Weeks of Cover`](Retail/Weeks%20of%20Cover) |
| **Sell-through Curve** | Cumulative sell-through % by week since launch vs plan and target | [`Retail/Sell-through Curve`](Retail/Sell-through%20Curve) |

## [General](General/README.md)

Cross-industry visuals: calendars, process funnels and project timelines.

| Widget | What it shows | Folder |
|---|---|---|
| **Calendar Heatmap** | Daily values on a calendar grid (Gregorian or 4-4-5 retail) | [`General/Calendar Heatmap`](General/Calendar%20Heatmap) |
| **Order Flow Funnel** | Process-flow funnel with stage conversion | [`General/Order Flow Funnel`](General/Order%20Flow%20Funnel) |
| **Gantt Chart** | Timeline bars from start/end dates with swimlanes | [`General/Gantt Chart`](General/Gantt%20Chart) |
