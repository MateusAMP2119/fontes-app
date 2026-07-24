/**
 * The visualization catalog behind the add T.
 *
 * Every entry is a placeholder-only definition: a name, a category, and a
 * sketch (the ChartKind drawn on tiles and on the canvas placeholder).
 * Real rendering comes later; the catalog is the browsing surface.
 */

import type { ChartKind } from '../items/items'

export type VizCategory = 'Charts' | 'KPIs' | 'Tables' | 'Maps' | 'Flows' | 'Time'

export type VizDef = {
  id: string
  name: string
  category: VizCategory
  sketch: ChartKind
}

export const VIZ_CATEGORIES: VizCategory[] = [
  'Charts',
  'KPIs',
  'Tables',
  'Maps',
  'Flows',
  'Time',
]

export const VIZ_CATALOG: VizDef[] = [
  // Charts
  { id: 'bars', name: 'Bars', category: 'Charts', sketch: 'bar' },
  { id: 'bars-stacked', name: 'Bars — stacked', category: 'Charts', sketch: 'bar' },
  { id: 'bars-grouped', name: 'Bars — grouped', category: 'Charts', sketch: 'bar' },
  { id: 'bars-horizontal', name: 'Bars — horizontal', category: 'Charts', sketch: 'bar' },
  { id: 'histogram', name: 'Histogram', category: 'Charts', sketch: 'bar' },
  { id: 'line', name: 'Line', category: 'Charts', sketch: 'line' },
  { id: 'line-multi', name: 'Line — multi series', category: 'Charts', sketch: 'line' },
  { id: 'area', name: 'Area', category: 'Charts', sketch: 'area' },
  { id: 'area-stacked', name: 'Area — stacked', category: 'Charts', sketch: 'area' },
  { id: 'pie', name: 'Pie', category: 'Charts', sketch: 'pie' },
  { id: 'donut', name: 'Donut', category: 'Charts', sketch: 'donut' },
  { id: 'scatter', name: 'Scatter', category: 'Charts', sketch: 'scatter' },
  { id: 'scatter-trend', name: 'Scatter — trend', category: 'Charts', sketch: 'scatter' },
  { id: 'bubble', name: 'Bubble', category: 'Charts', sketch: 'scatter' },
  { id: 'heatmap', name: 'Heatmap', category: 'Charts', sketch: 'heat' },
  { id: 'hexbin', name: 'Hexbin', category: 'Charts', sketch: 'heat' },
  { id: 'radar', name: 'Radar', category: 'Charts', sketch: 'scatter' },
  { id: 'waterfall', name: 'Waterfall', category: 'Charts', sketch: 'bar' },

  // KPIs
  { id: 'kpi-stat', name: 'KPI stat', category: 'KPIs', sketch: 'stat' },
  { id: 'kpi-row', name: 'KPI row', category: 'KPIs', sketch: 'stat' },
  { id: 'kpi-spark', name: 'KPI + sparkline', category: 'KPIs', sketch: 'line' },
  { id: 'kpi-delta', name: 'KPI + delta', category: 'KPIs', sketch: 'stat' },
  { id: 'kpi-grid', name: 'KPI grid', category: 'KPIs', sketch: 'heat' },
  { id: 'gauge', name: 'Gauge', category: 'KPIs', sketch: 'donut' },
  { id: 'bullet', name: 'Bullet', category: 'KPIs', sketch: 'bar' },
  { id: 'progress-ring', name: 'Progress ring', category: 'KPIs', sketch: 'donut' },

  // Tables
  { id: 'table-basic', name: 'Table', category: 'Tables', sketch: 'table' },
  { id: 'table-heat', name: 'Table — heat cells', category: 'Tables', sketch: 'heat' },
  { id: 'table-spark', name: 'Table — sparklines', category: 'Tables', sketch: 'table' },
  { id: 'pivot', name: 'Pivot', category: 'Tables', sketch: 'table' },
  { id: 'ranking', name: 'Ranking', category: 'Tables', sketch: 'table' },

  // Maps
  { id: 'map-choropleth', name: 'Choropleth', category: 'Maps', sketch: 'map' },
  { id: 'map-dots', name: 'Dot map', category: 'Maps', sketch: 'map' },
  { id: 'map-bubbles', name: 'Bubble map', category: 'Maps', sketch: 'map' },
  { id: 'map-routes', name: 'Route map', category: 'Maps', sketch: 'map' },

  // Flows
  { id: 'funnel', name: 'Funnel', category: 'Flows', sketch: 'flow' },
  { id: 'funnel-stacked', name: 'Funnel — stacked', category: 'Flows', sketch: 'flow' },
  { id: 'sankey', name: 'Sankey', category: 'Flows', sketch: 'flow' },
  { id: 'chord', name: 'Chord', category: 'Flows', sketch: 'donut' },
  { id: 'tree', name: 'Tree', category: 'Flows', sketch: 'flow' },
  { id: 'treemap', name: 'Treemap', category: 'Flows', sketch: 'heat' },

  // Time
  { id: 'timeline', name: 'Timeline', category: 'Time', sketch: 'line' },
  { id: 'gantt', name: 'Gantt', category: 'Time', sketch: 'bar' },
  { id: 'calendar-heat', name: 'Calendar heat', category: 'Time', sketch: 'heat' },
  { id: 'candlestick', name: 'Candlestick', category: 'Time', sketch: 'bar' },
  { id: 'cohort', name: 'Cohort retention', category: 'Time', sketch: 'heat' },
]

/** Case-insensitive substring match on name and category. */
export function searchViz(query: string): VizDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return VIZ_CATALOG.filter(
    (v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q),
  )
}
