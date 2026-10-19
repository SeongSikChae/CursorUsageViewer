import { useMemo } from 'react'
import { CalendarDays, FilterX, RotateCcw } from 'lucide-react'
import { MultiFilter } from '@/components/filters/MultiFilter'
import { Button } from '@/components/ui/button'
import type { UsageFilters, UsageRecord } from '@/features/usage/types'
import { filterUsageRecords, formatZonedDate, getZonedDateEnd, getZonedDateStart } from '@/features/usage/aggregate'
import { formatDate } from '@/lib/format'

interface FilterPanelProps {
  records: UsageRecord[]
  filters: UsageFilters
  onModelsChange: (values: string[]) => void
  onUsageTypesChange: (values: string[]) => void
  onDateRangeChange: (from: number | null, to: number | null) => void
  onClear: () => void
}


export function FilterPanel({ records, filters, onModelsChange, onUsageTypesChange, onDateRangeChange, onClear }: FilterPanelProps) {
  const availableRecords = useMemo(() => filterUsageRecords(records, filters, { models: [], usageTypes: [] }), [filters, records])
  const models = useMemo(() => [...new Set(availableRecords
    .filter((record) => filters.usageTypes.length === 0 || filters.usageTypes.includes(record.usageType))
    .map((record) => record.model))].sort((left, right) => left.localeCompare(right)), [availableRecords, filters.usageTypes])
  const usageTypes = useMemo(() => [...new Set(availableRecords
    .filter((record) => filters.models.length === 0 || filters.models.includes(record.model))
    .map((record) => record.usageType))].sort((left, right) => left.localeCompare(right)), [availableRecords, filters.models])
  const minimum = records[0]?.timestamp
  const maximum = records.at(-1)?.timestamp
  const hasFilters = filters.models.length > 0 || filters.usageTypes.length > 0 || filters.dateRange.from !== null || filters.dateRange.to !== null
  const fromValue = filters.dateRange.from !== null ? formatZonedDate(filters.dateRange.from, filters.timezone) : minimum !== undefined ? formatZonedDate(minimum, filters.timezone) : ''
  const toValue = filters.dateRange.to !== null ? formatZonedDate(filters.dateRange.to, filters.timezone) : maximum !== undefined ? formatZonedDate(maximum, filters.timezone) : ''

  const handleFromDate = (value: string) => {
    const from = value ? getZonedDateStart(value, filters.timezone) : null
    onDateRangeChange(from, filters.dateRange.to)
  }

  const handleToDate = (value: string) => {
    const to = value ? getZonedDateEnd(value, filters.timezone) : null
    onDateRangeChange(filters.dateRange.from, to)
  }

  return (
    <aside className="rounded-2xl border border-border bg-white p-5 shadow-[0_12px_40px_-34px_rgba(35,43,79,0.36)] sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-[#f0efff] text-[#5e61d4]"><CalendarDays className="size-4" /></span>
          <h2 className="text-sm font-semibold text-[#34394e]">필터</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={!hasFilters} className="h-8 px-2 text-[10px] text-[#83889a]">
          <RotateCcw className="size-3" />초기화
        </Button>
      </div>
      <div className="mt-5 space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[11px] font-semibold text-[#676d82]">사용 기간</label>
            <span className="text-[9px] text-[#a0a4b2]">{filters.timezone === 'UTC' ? 'UTC' : '한국 시간'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[9px] text-[#999eae]">시작</span>
              <input aria-label="시작 날짜" type="date" value={fromValue} max={toValue || undefined} disabled={!records.length} onChange={(event) => handleFromDate(event.currentTarget.value)} className="h-9 w-full min-w-0 rounded-lg border border-border bg-white px-2 text-[10px] text-[#5c6277] outline-none focus-visible:border-ring" />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[9px] text-[#999eae]">종료</span>
              <input aria-label="종료 날짜" type="date" value={toValue} min={fromValue || undefined} disabled={!records.length} onChange={(event) => handleToDate(event.currentTarget.value)} className="h-9 w-full min-w-0 rounded-lg border border-border bg-white px-2 text-[10px] text-[#5c6277] outline-none focus-visible:border-ring" />
            </label>
          </div>
          {records.length > 0 && minimum !== undefined && maximum !== undefined && (
            <p className="mt-2 text-[9px] text-[#9b9faf]">전체 데이터 · {formatDate(minimum, filters.timezone)} – {formatDate(maximum, filters.timezone)}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold text-[#676d82]">사용 유형 <span className="font-normal text-[#a5a8b5]">({usageTypes.length})</span></label>
          <MultiFilter label="사용 유형" placeholder="모든 사용 유형" values={usageTypes} selected={filters.usageTypes} onChange={onUsageTypesChange} />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold text-[#676d82]">모델 <span className="font-normal text-[#a5a8b5]">({models.length})</span></label>
          <MultiFilter label="모델" placeholder="모든 모델" values={models} selected={filters.models} onChange={onModelsChange} />
        </div>

        <div className="flex gap-2 rounded-xl bg-[#f7f7fb] p-3">
          <FilterX className="mt-0.5 size-3.5 shrink-0 text-[#8f93a4]" />
          <p className="text-[10px] leading-relaxed text-[#8b90a1]">선택한 조건이 세 차트에 동일하게 적용됩니다. 날짜 경계는 선택한 시간대를 기준으로 계산됩니다.</p>
        </div>
      </div>
    </aside>
  )
}
