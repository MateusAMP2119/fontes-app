import { useEffect, useRef } from 'react'
import { init, use as registerCharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

registerCharts([BarChart, GridComponent, TooltipComponent, SVGRenderer])

export type ArticleActivity = { at: number; count: number; events?: number }
const config = {
  count: { label: 'Artigos', theme: { light: '#93c5fd', dark: '#93c5fd' } },
  events: { label: 'Eventos', theme: { light: '#3b82f6', dark: '#3b82f6' } },
}
const number = new Intl.NumberFormat('pt-PT')
export function ArticleActivityLegend({ activity }: { activity: ArticleActivity[] | null }) {
  return <div className="news-feed-legend" aria-label="Legenda do gráfico">
    {Object.entries(config).map(([key, series]) => <span key={key}>
      <i aria-hidden="true" style={{ background: series.theme.light }} /><span>{series.label}</span>
      {activity && <strong>{number.format(activity.reduce((sum, point) => sum + (key === 'count' ? point.count : point.events ?? 0), 0))}</strong>}
    </span>)}
  </div>
}

/** The time axis uses clock-aligned ticks, independently of the rolling data buckets. */
export default function ArticleActivityChart({ activity, days }: { activity: ArticleActivity[] | null; days: number }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = container.current
    if (!element || !activity?.length) return
    const chart = init(element, undefined, { renderer: 'svg' })
    const hasEvents = activity.every(point => Number.isSafeInteger(point.events))
    const interval = days === 1 ? 3600 : days === 7 ? 43200 : 86400
    const date = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', day: 'numeric', month: 'short' })
    const time = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    const clock = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const day = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', day: 'numeric' })
    let focusedIndex = 0
    const render = () => {
      const css = getComputedStyle(element)
      const foreground = css.getPropertyValue('--foreground').trim() || '#1b1b1b'
      const muted = css.getPropertyValue('--muted-foreground').trim() || '#757575'
      const border = css.getPropertyValue('--border').trim() || '#dfdfdf'
      const option: EChartsOption = {
        animation: false,
        textStyle: { fontFamily: css.fontFamily, fontSize: 12 },
        grid: { top: 24, right: 14, bottom: 34, left: 14 },
        xAxis: {
          type: 'time', splitNumber: element.clientWidth < 520 ? 3 : 6,
          axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
          axisLabel: { color: muted, hideOverlap: true, margin: 12,
            formatter: (value: number) => days === 1
              ? (clock.format(value) === '00:00' ? `{day|${day.format(value)}}` : clock.format(value))
              : date.format(value),
            rich: { day: { fontWeight: 600, color: foreground } },
          },
        },
        yAxis: { type: 'value', min: 0, axisLabel: { show: false }, axisLine: { show: false },
          axisTick: { show: false }, splitNumber: 5, splitLine: { lineStyle: { color: border, type: 'dashed' } } },
        tooltip: {
          trigger: 'axis', confine: true, transitionDuration: 0, backgroundColor: css.getPropertyValue('--popover').trim() || '#fff',
          borderColor: border, borderWidth: 1, padding: [8, 10], textStyle: { color: foreground, fontSize: 12 },
          extraCssText: 'border-radius:6px;box-shadow:0 2px 8px #00000018;',
          axisPointer: { type: 'line', lineStyle: { color: muted, type: 'dashed' } },
          formatter: (params: unknown) => {
            const index = (Array.isArray(params) ? params[0] : params) as { dataIndex: number }
            const point = activity[index.dataIndex]
            const tooltip = document.createElement('div')
            tooltip.className = 'news-feed-tooltip'
            tooltip.setAttribute('role', 'status')
            const header = document.createElement('div')
            header.className = 'news-feed-tooltip-date'
            header.textContent = `${date.format(point.at * 1000)} às ${time.format(point.at * 1000)}`
            tooltip.append(header)
            for (const key of hasEvents ? ['count', 'events'] as const : ['count'] as const) {
              const row = document.createElement('div'); row.className = 'news-feed-tooltip-row'
              const dot = document.createElement('i'); dot.style.background = config[key].theme.light
              const label = document.createElement('span'); label.textContent = config[key].label
              const value = document.createElement('strong'); value.textContent = number.format(point[key] ?? 0)
              row.append(dot, label, value); tooltip.append(row)
            }
            return tooltip
          },
        },
        series: (hasEvents ? ['count', 'events'] as const : ['count'] as const).map(key => ({
          name: config[key].label, type: 'bar', barMaxWidth: 32, barGap: '15%', barCategoryGap: '30%',
          itemStyle: { color: config[key].theme.light }, emphasis: { focus: 'none' },
          data: activity.map(point => [point.at * 1000, point[key] ?? 0]),
        })),
      }
      chart.setOption(option, true)
    }
    const show = () => {
      chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: focusedIndex })
      const point = activity[focusedIndex]
      element.setAttribute('aria-label', `${date.format(point.at * 1000)} às ${time.format(point.at * 1000)}: ${point.count} artigos, ${point.events ?? 0} eventos. Intervalo de ${interval / 3600} horas.`)
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { chart.dispatchAction({ type: 'hideTip' }); return }
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      focusedIndex = event.key === 'Home' ? 0 : event.key === 'End' ? activity.length - 1
        : Math.max(0, Math.min(activity.length - 1, focusedIndex + (event.key === 'ArrowRight' ? 1 : -1)))
      show()
    }
    const hide = () => chart.dispatchAction({ type: 'hideTip' })
    render()
    const resize = new ResizeObserver(() => { chart.resize(); render() }); resize.observe(element)
    const theme = new MutationObserver(render)
    const dashboard = element.closest('[data-theme]')
    if (dashboard) theme.observe(dashboard, { attributes: true, attributeFilter: ['data-theme'] })
    element.addEventListener('keydown', keydown); element.addEventListener('focus', show); element.addEventListener('blur', hide)
    return () => {
      resize.disconnect(); theme.disconnect(); chart.dispose()
      element.removeEventListener('keydown', keydown); element.removeEventListener('focus', show); element.removeEventListener('blur', hide)
    }
  }, [activity, days])
  return <div className="news-feed-activity" aria-label="Artigos e eventos ao longo do período" aria-busy={activity === null}>
    {activity === null ? <div className="news-feed-chart-skeleton" aria-label="A carregar o gráfico de artigos e eventos" />
      : <div ref={container} className="news-feed-chart" tabIndex={0} role="group" aria-label="Artigos e eventos ao longo do período" />}
  </div>
}
