import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  AriaComponent,
  DatasetComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TransformComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Download, RotateCcw } from 'lucide-react'
import type { AggregateBucket, TokenSeriesKey } from '@/features/usage/types'
import { formatCompactTokens, formatTokens } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TokenChartProps } from './chartTypes'

echarts.use([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  DatasetComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TransformComponent,
])

const SERIES: { key: TokenSeriesKey; name: string; color: string }[] = [
  { key: 'input', name: 'Input', color: '#5d66dc' },
  { key: 'cacheRead', name: 'CacheRead', color: '#25a88a' },
  { key: 'cacheWrite', name: 'CacheWrite', color: '#edae45' },
  { key: 'output', name: 'Output', color: '#e2768c' },
]

const tooltipFormatter = (timezone: string, kind: TokenChartProps['kind']) => (raw: unknown) => {
  const params = (Array.isArray(raw) ? raw : [raw]) as Array<{
    axisValueLabel?: string
    axisValue?: string
    seriesName?: string
    value?: number | number[]
    color?: string
  }>
  if (!params.length) return ''
  const label = kind === 'time'
    ? (params[0]!.axisValueLabel ?? new Date(Number(params[0]!.axisValue)).toLocaleString('ko-KR', { timeZone: timezone }))
    : params[0]!.axisValueLabel ?? String(params[0]!.axisValue ?? '')
  const rows = params
    .map((item) => {
      const value = Array.isArray(item.value) ? Number(item.value.at(-1) ?? 0) : Number(item.value ?? 0)
      return `<div style="display:flex;justify-content:space-between;gap:28px;margin-top:8px"><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:8px"></i>${item.seriesName ?? ''}</span><strong style="font-variant-numeric:tabular-nums">${formatTokens(value)}</strong></div>`
    })
    .join('')
  const visibleTotal = params.reduce((sum, item) => sum + (Array.isArray(item.value) ? Number(item.value.at(-1) ?? 0) : Number(item.value ?? 0)), 0)
  return `<div style="min-width:205px"><div style="color:#858ba0;font-size:11px;margin-bottom:6px">${escapeHtml(label)}</div><div style="font-size:13px;font-weight:650;color:#20263a">${escapeHtml(kind === 'time' ? timezone : '사용량')}</div>${rows}<div style="border-top:1px solid #e9eaf1;margin-top:12px;padding-top:9px;display:flex;justify-content:space-between;gap:24px;font-weight:650">합계 <span>${formatTokens(visibleTotal)}</span></div></div>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

function makeOption(
  kind: TokenChartProps['kind'],
  data: AggregateBucket[],
  selectedSeries: TokenSeriesKey[],
  timezone: string,
): echarts.EChartsCoreOption {
  const isTime = kind === 'time'
  const isHorizontal = !isTime
  const hasMany = data.length > 10
  const labels = data.map((bucket) => bucket.label)
  const axisType = isTime ? 'time' : 'category'
  const series = SERIES
    .filter((item) => selectedSeries.includes(item.key))
    .map((item) => ({
      name: item.name,
      type: 'bar' as const,
      stack: 'total',
      barMaxWidth: isTime ? 32 : 34,
      barMinWidth: isTime ? undefined : 12,
      itemStyle: {
        color: item.color,
        borderRadius: item.key === 'output'
          ? (isHorizontal ? [0, 6, 6, 0] as [number, number, number, number] : [5, 5, 0, 0] as [number, number, number, number])
          : undefined,
      },
      emphasis: { focus: 'series' as const, itemStyle: { opacity: 0.92 } },
      data: isTime
        ? data.map((bucket) => [bucket.timestamp, bucket[item.key]])
        : data.map((bucket) => bucket[item.key]),
    }))

  return {
    animationDuration: 350,
    animationDurationUpdate: 250,
    aria: { enabled: true, decal: { show: true } },
    color: SERIES.map((item) => item.color),
    grid: isHorizontal
      ? { left: 12, right: 56, top: 24, bottom: hasMany ? 74 : 48, containLabel: true }
      : { left: 12, right: 22, top: 32, bottom: hasMany ? 78 : 56, containLabel: true },
    legend: {
      top: 0,
      left: 12,
      itemGap: 18,
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
      textStyle: { color: '#757b90', fontSize: 11, fontFamily: 'Inter, Pretendard, sans-serif' },
      selected: Object.fromEntries(SERIES.map((item) => [item.name, selectedSeries.includes(item.key)])),
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: isTime ? 'line' : 'shadow', animation: true, lineStyle: { color: '#a6a9bc', type: 'dashed' } },
      backgroundColor: '#fff',
      borderColor: '#e8e9f1',
      borderWidth: 1,
      padding: [13, 15],
      textStyle: { color: '#20263a', fontSize: 12, fontFamily: 'Inter, Pretendard, sans-serif' },
      extraCssText: 'box-shadow:0 12px 36px rgba(24,34,70,0.13);border-radius:12px',
      formatter: tooltipFormatter(timezone, kind) as never,
    },
    xAxis: isHorizontal
      ? {
          type: 'value',
          position: 'top',
          axisLabel: { color: '#9399ab', fontSize: 10, formatter: (value: number) => formatCompactTokens(value) },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f0f1f5', type: 'dashed' } },
        }
      : {
          type: axisType,
          boundaryGap: true,
          axisLabel: {
            color: '#9399ab',
            fontSize: 10,
            hideOverlap: true,
            formatter: isTime
              ? (value: number) => new Intl.DateTimeFormat('ko-KR', { timeZone: timezone, month: '2-digit', day: '2-digit', ...(data.length < 26 ? { hour: '2-digit' as const } : {}) }).format(value)
              : undefined,
          },
          axisLine: { lineStyle: { color: '#e9eaf1' } },
          axisTick: { show: false, alignWithLabel: true },
          splitLine: { show: false },
        },
    yAxis: isHorizontal
      ? {
          type: 'category',
          inverse: true,
          data: labels,
          axisLabel: { color: '#596078', fontSize: 11, width: 230, overflow: 'truncate', interval: 0 },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        }
      : {
          type: 'value',
          min: 0,
          axisLabel: { color: '#9399ab', fontSize: 10, formatter: (value: number) => formatCompactTokens(value) },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f0f1f5', type: 'dashed' } },
        },
    dataZoom: [
      {
        type: 'inside',
        ...(isHorizontal ? { xAxisIndex: undefined, yAxisIndex: 0 } : { xAxisIndex: 0, yAxisIndex: undefined }),
        ...(isHorizontal && hasMany ? { start: 0, end: Math.min(100, (12 / data.length) * 100) } : {}),
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        filterMode: 'none',
        minValueSpan: isTime ? undefined : 1,
        maxValueSpan: isTime ? undefined : Math.max(1, Math.min(50, data.length)),
      },
      {
        type: 'slider',
        ...(isHorizontal ? { xAxisIndex: undefined, yAxisIndex: 0 } : { xAxisIndex: 0, yAxisIndex: undefined }),
        show: data.length > 1,
        ...(isHorizontal ? { orient: 'vertical' as const, right: 2, top: 34, bottom: 82, width: 10 } : { bottom: 18, height: 18 }),
        ...(isHorizontal && hasMany ? { start: 0, end: Math.min(100, (12 / data.length) * 100) } : {}),
        borderColor: 'transparent',
        backgroundColor: '#f1f2f8',
        fillerColor: 'rgba(93,102,220,0.14)',
        handleStyle: { color: '#fff', borderColor: '#7377e2', borderWidth: 1.5, shadowBlur: 6, shadowColor: 'rgba(53,60,148,0.16)' },
        moveHandleStyle: { color: '#7377e2' },
        dataBackground: { lineStyle: { color: '#cdd0df', opacity: 0.45 }, areaStyle: { color: '#cdd0df', opacity: 0.25 } },
        selectedDataBackground: { lineStyle: { color: '#878be9', opacity: 0.7 }, areaStyle: { color: '#b9bbf5', opacity: 0.3 } },
        showDetail: false,
        brushSelect: false,
        filterMode: 'none',
      },
    ],
    series,
  }
}

export function TokenChart({ kind, data, selectedSeries, onSelectedSeriesChange, timezone = 'Asia/Seoul' }: TokenChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<echarts.ECharts | null>(null)
  const option = useMemo(() => makeOption(kind, data, selectedSeries, timezone), [data, kind, selectedSeries, timezone])

  useEffect(() => {
    const element = chartRef.current
    if (!element) return
    const instance = echarts.init(element, undefined, { renderer: 'canvas' })
    instanceRef.current = instance

    const handleLegend = (event: unknown) => {
      const selected = (event as { selected?: Record<string, boolean> }).selected
      if (!selected) return
      const next = SERIES.filter((item) => selected[item.name]).map((item) => item.key)
      onSelectedSeriesChange(next)
    }
    instance.on('legendselectchanged', handleLegend)

    const resizeObserver = new ResizeObserver(() => instance.resize())
    resizeObserver.observe(element)
    return () => {
      resizeObserver.disconnect()
      instance.off('legendselectchanged', handleLegend)
      instance.dispose()
      if (instanceRef.current === instance) instanceRef.current = null
    }
  }, [onSelectedSeriesChange])

  useEffect(() => {
    instanceRef.current?.setOption(option, { notMerge: false, replaceMerge: ['series', 'xAxis', 'yAxis', 'legend', 'dataZoom'] })
  }, [option])

  const resetZoom = () => {
    instanceRef.current?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
  }

  const downloadChart = () => {
    const instance = instanceRef.current
    if (!instance) return
    const link = document.createElement('a')
    link.href = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' })
    link.download = `cursor-usage-${kind}.png`
    link.click()
  }

  return (
    <div className="relative min-w-0">
      <div className="absolute right-1 top-[-5px] z-10 flex gap-1">
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={resetZoom} aria-label="차트 확대 범위 초기화" title="확대 범위 초기화">
          <RotateCcw className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={downloadChart} aria-label="차트 PNG 다운로드" title="PNG 다운로드">
          <Download className="size-3.5" />
        </Button>
      </div>
      <div
        ref={chartRef}
        role="img"
        aria-label={kind === 'time' ? '시간별 토큰 사용량 누적 막대 차트' : kind === 'model' ? '모델별 토큰 사용량 누적 막대 차트' : '사용 유형별 토큰 사용량 누적 막대 차트'}
        className={cn('chart-surface', kind === 'time' && 'chart-surface--time')}
      />
    </div>
  )
}
