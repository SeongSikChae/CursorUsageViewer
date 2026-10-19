import type { ReactNode } from 'react'
import { ArrowDownWideNarrow, BarChart3, Layers3, Tag } from 'lucide-react'
import { formatCompactTokens, formatTokens } from '@/lib/format'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TokenChart } from '@/components/charts/TokenChart'
import type { TokenChartProps } from '@/components/charts/chartTypes'

const icons: Record<TokenChartProps['kind'], ReactNode> = {
  time: <BarChart3 className="size-4" />,
  model: <Layers3 className="size-4" />,
  usageType: <Tag className="size-4" />,
}

const tones: Record<TokenChartProps['kind'], string> = {
  time: 'bg-[#f0efff] text-[#5d60cf]',
  model: 'bg-[#eaf6f3] text-[#26977e]',
  usageType: 'bg-[#fff4e7] text-[#ca8a37]',
}

interface ChartCardProps extends TokenChartProps {
  title: string
  description: string
  total: number
  grain?: string
  onGrainChange?: (grain: 'minute' | 'hour' | 'day' | 'week') => void
  timezone?: string
  onTimezoneChange?: (timezone: string) => void
  filtersLabel: string
}

export function ChartCard({
  kind,
  data,
  selectedSeries,
  onSelectedSeriesChange,
  title,
  description,
  total,
  grain,
  onGrainChange,
  timezone,
  onTimezoneChange,
  filtersLabel,
}: ChartCardProps) {
  const isTime = kind === 'time'
  const rows = data.reduce((sum, bucket) => sum + bucket.count, 0)
  const isPositive = data.length > 0
  const domainLabel = kind === 'time' ? '기간' : kind === 'model' ? '모델' : '유형'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 pb-1 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${tones[kind]}`}>{icons[kind]}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#30364b]">{title}</h2>
              <span className="rounded-md bg-[#f3f4f8] px-1.5 py-0.5 text-[9px] font-medium text-[#8c91a2]">누적</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#9599a9]">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pl-12 sm:pl-0">
          {isTime && onGrainChange && (
            <Select value={grain} onValueChange={(value) => onGrainChange(value as 'minute' | 'hour' | 'day' | 'week')}>
              <SelectTrigger className="h-8 min-w-[76px] border-[#eaebf2] px-2.5 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minute">분 단위</SelectItem>
                <SelectItem value="hour">시간 단위</SelectItem>
                <SelectItem value="day">일 단위</SelectItem>
                <SelectItem value="week">주 단위</SelectItem>
              </SelectContent>
            </Select>
          )}
          {isTime && onTimezoneChange && (
            <Select value={timezone} onValueChange={(value) => onTimezoneChange(value)}>
              <SelectTrigger className="h-8 min-w-[108px] border-[#eaebf2] px-2.5 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Seoul">한국 시간</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {isPositive ? (
          <TokenChart kind={kind} data={data} selectedSeries={selectedSeries} onSelectedSeriesChange={onSelectedSeriesChange} timezone={timezone} />
        ) : (
          <div className={`chart-surface chart-surface--empty ${isTime ? 'chart-surface--time' : ''}`}>
            <div className="rounded-xl border border-[#ededf4] bg-white/90 px-5 py-4 text-center shadow-sm">
              <ArrowDownWideNarrow className="mx-auto size-5 text-[#adafbe]" />
              <p className="mt-2 text-xs font-medium text-[#656b80]">표시할 데이터가 없습니다</p>
              <p className="mt-1 text-[10px] text-[#9b9faf]">날짜 또는 필터 조건을 확인해 주세요.</p>
            </div>
          </div>
        )}
        <div className="mt-[-1px] flex flex-wrap items-center justify-between gap-2 border-t border-[#f0f1f5] pt-3 text-[10px] text-[#9297a8]">
          <span>{filtersLabel} · {domainLabel} {data.length}개 · {formatTokens(rows)}건</span>
          <span className="font-medium text-[#747a90]">{formatCompactTokens(total)} tokens <span className="ml-1 text-[#a5a8b5]">({formatTokens(total)})</span></span>
        </div>
      </CardContent>
    </Card>
  )
}
