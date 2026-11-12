# SAP Analytics Cloud custom widgets

**Proprietary — © 2026 The Data Co (Pty) Ltd. All rights reserved.** Use requires a written licence; see [LICENSE](../LICENSE).

Widgets are grouped by business area. Each area folder has a README with a gallery; each widget folder has
its manifest (JSON), bundle (ZIP), sources, preview and README.

## [EXCO](EXCO/README.md)

Executive dashboards: headline KPIs, attainment, variance hot-spots and value-driver trees for board and EXCO packs.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="EXCO/Variance%20KPI%20Tile"><img src="EXCO/Variance%20KPI%20Tile/Example.png" width="260" alt="Variance KPI Tile"/></a> | **[Variance KPI Tile](EXCO/Variance%20KPI%20Tile)** | Headline Actual with ▲/▼ variance vs Plan and Prior Year, plus a sparkline |
| <a href="EXCO/Bullet%20Chart"><img src="EXCO/Bullet%20Chart/Example.png" width="260" alt="Bullet Chart"/></a> | **[Bullet Chart](EXCO/Bullet%20Chart)** | Actual vs Target with % of target bands and a Forecast marker |
| <a href="EXCO/Variance%20Heatmap"><img src="EXCO/Variance%20Heatmap/Example.png" width="260" alt="Variance Heatmap"/></a> | **[Variance Heatmap](EXCO/Variance%20Heatmap)** | Row × column variance % with RAG or diverging colour and totals |
| <a href="EXCO/Driver%20Tree"><img src="EXCO/Driver%20Tree/Example.png" width="260" alt="Driver Tree"/></a> | **[Driver Tree](EXCO/Driver%20Tree)** | Value driver tree (e.g. ROCE → margin × turnover) with actual, plan and RAG per node |

## [Finance](Finance/README.md)

Financial reporting and analysis: income statement, revenue bridges, working capital and variance analysis. Currency switch: ZAR / USD.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="Finance/PnL%20Waterfall"><img src="Finance/PnL%20Waterfall/Example.png" width="260" alt="P&L Waterfall"/></a> | **[P&L Waterfall](Finance/PnL%20Waterfall)** | Income statement from revenue to net profit with automatic sub-totals and % of revenue |
| <a href="Finance/PVM%20Bridge"><img src="Finance/PVM%20Bridge/Example.png" width="260" alt="Price-Volume-Mix Bridge"/></a> | **[Price-Volume-Mix Bridge](Finance/PVM%20Bridge)** | Revenue bridge split into volume, mix, price and new/discontinued effects, with top product drivers |
| <a href="Finance/Ageing%20Buckets"><img src="Finance/Ageing%20Buckets/Example.png" width="260" alt="Ageing Buckets (AR/AP)"/></a> | **[Ageing Buckets (AR/AP)](Finance/Ageing%20Buckets)** | Debtors / creditors ageing by customer or vendor with overdue tiles |
| <a href="Finance/Variance%20Bridge"><img src="Finance/Variance%20Bridge/Example.png" width="260" alt="Variance Bridge"/></a> | **[Variance Bridge](Finance/Variance%20Bridge)** | Plan → Actual waterfall by driver, with Top-N + Other |

## [Mining](Mining/README.md)

Mining operations: material flow, resources, plant performance, reconciliation, equipment, cost position and safety. Units default to copper (t, % Cu, US$/lb) and are configurable.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="Mining/Mine-to-Mill%20Sankey"><img src="Mining/Mine-to-Mill%20Sankey/Example.png" width="260" alt="Mine-to-Mill Sankey"/></a> | **[Mine-to-Mill Sankey](Mining/Mine-to-Mill%20Sankey)** | Tonnes from pits through stockpiles, crusher and mill to concentrate, with grade |
| <a href="Mining/Grade-Tonnage%20Curve"><img src="Mining/Grade-Tonnage%20Curve/Example.png" width="260" alt="Grade-Tonnage Curve"/></a> | **[Grade-Tonnage Curve](Mining/Grade-Tonnage%20Curve)** | Tonnes and average grade above cut-off, with a cut-off read-out |
| <a href="Mining/Recovery%20vs%20Head%20Grade"><img src="Mining/Recovery%20vs%20Head%20Grade/Example.png" width="260" alt="Recovery vs Head Grade"/></a> | **[Recovery vs Head Grade](Mining/Recovery%20vs%20Head%20Grade)** | Plant recovery vs feed grade with fitted curve and target band |
| <a href="Mining/Metal%20Balance"><img src="Mining/Metal%20Balance/Example.png" width="260" alt="Metal Balance & Reconciliation"/></a> | **[Metal Balance & Reconciliation](Mining/Metal%20Balance)** | Stage metal balance with F1/F2/F3 reconciliation factors |
| <a href="Mining/OEE%20Time%20Usage"><img src="Mining/OEE%20Time%20Usage/Example.png" width="260" alt="OEE Time-Usage Waterfall"/></a> | **[OEE Time-Usage Waterfall](Mining/OEE%20Time%20Usage)** | Calendar → direct operating hours waterfall with A/U/E/OEE |
| <a href="Mining/Fleet%20Status%20Timeline"><img src="Mining/Fleet%20Status%20Timeline/Example.png" width="260" alt="Fleet Status Timeline"/></a> | **[Fleet Status Timeline](Mining/Fleet%20Status%20Timeline)** | Equipment status lanes across the shift with % operating |
| <a href="Mining/Cost%20Curve"><img src="Mining/Cost%20Curve/Example.png" width="260" alt="Cost Curve"/></a> | **[Cost Curve](Mining/Cost%20Curve)** | Industry cost curve with own assets, quartiles and price line |
| <a href="Mining/Safety%20Pyramid"><img src="Mining/Safety%20Pyramid/Example.png" width="260" alt="Safety Pyramid"/></a> | **[Safety Pyramid](Mining/Safety%20Pyramid)** | Incidents by severity with LTIFR / TRIFR |

## [Retail](Retail/README.md)

Retail performance and merchandise planning: store productivity, range classification, stock health and season sell-through. Currency switch: ZAR / USD.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="Retail/Store%20Quadrant"><img src="Retail/Store%20Quadrant/Example.png" width="260" alt="Store Performance Quadrant"/></a> | **[Store Performance Quadrant](Retail/Store%20Quadrant)** | Stores on two KPIs (e.g. sales/m² vs margin %) in four labelled quadrants, bubble = revenue |
| <a href="Retail/ABC-XYZ%20Matrix"><img src="Retail/ABC-XYZ%20Matrix/Example.png" width="260" alt="ABC/XYZ Matrix"/></a> | **[ABC/XYZ Matrix](Retail/ABC-XYZ%20Matrix)** | Revenue contribution × demand variability 3×3 matrix with stock policy hints |
| <a href="Retail/Weeks%20of%20Cover"><img src="Retail/Weeks%20of%20Cover/Example.png" width="260" alt="Weeks of Cover"/></a> | **[Weeks of Cover](Retail/Weeks%20of%20Cover)** | Weeks of cover vs target band, with stock value, OOS % and aged stock % |
| <a href="Retail/Sell-through%20Curve"><img src="Retail/Sell-through%20Curve/Example.png" width="260" alt="Sell-through Curve"/></a> | **[Sell-through Curve](Retail/Sell-through%20Curve)** | Cumulative sell-through % by week since launch vs plan and target |

## [General](General/README.md)

Cross-industry visuals: calendars, process funnels and project timelines.

| Preview | Widget | What it shows |
|---|---|---|
| <a href="General/Calendar%20Heatmap"><img src="General/Calendar%20Heatmap/Example.png" width="260" alt="Calendar Heatmap"/></a> | **[Calendar Heatmap](General/Calendar%20Heatmap)** | Daily values on a calendar grid (Gregorian or 4-4-5 retail) |
| <a href="General/Order%20Flow%20Funnel"><img src="General/Order%20Flow%20Funnel/Example.png" width="260" alt="Order Flow Funnel"/></a> | **[Order Flow Funnel](General/Order%20Flow%20Funnel)** | Process-flow funnel with stage conversion |
| <a href="General/Gantt%20Chart"><img src="General/Gantt%20Chart/Example.png" width="260" alt="Gantt Chart"/></a> | **[Gantt Chart](General/Gantt%20Chart)** | Timeline bars from start/end dates with swimlanes |
