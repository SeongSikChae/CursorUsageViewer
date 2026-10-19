export const TOKEN_SERIES = ['input', 'cacheRead', 'cacheWrite', 'output'] as const

export type TokenSeriesKey = (typeof TOKEN_SERIES)[number]
export type TimeGrain = 'minute' | 'hour' | 'day' | 'week'
export type Timezone = 'Asia/Seoul' | 'UTC'

export interface TokenAmounts {
  input: number
  cacheRead: number
  cacheWrite: number
  output: number
}

export interface UsageRecord extends TokenAmounts {
  timestamp: number
  model: string
  usageType: string
}

export interface DateRange {
  from: number | null
  to: number | null
}

export interface UsageFilters {
  dateRange: DateRange
  models: string[]
  usageTypes: string[]
  timezone: Timezone
  timeGrain: TimeGrain
}

export interface UsageFilterOptions {
  models?: string[]
  usageTypes?: string[]
}

export interface UsageWarning {
  row: number
  code: 'missing-token' | 'invalid-token' | 'total-mismatch' | 'missing-dimension' | 'invalid-date' | 'csv-structure'
  message: string
  rawTotal?: string
  calculatedTotal?: number
}

export interface CsvParseResult {
  records: UsageRecord[]
  warnings: UsageWarning[]
  skippedRows: number
  invalidRows: number
  totalRows: number
  fileName?: string
}

export interface AggregateBucket extends TokenAmounts {
  key: string
  label: string
  total: number
  count: number
  timestamp?: number
}

export interface UsageTotals extends TokenAmounts {
  total: number
  rows: number
}

export interface UsageState {
  records: UsageRecord[]
  fileName: string | null
  warnings: UsageWarning[]
  skippedRows: number
  invalidRows: number
  totalRows: number
  parseError: string | null
  filters: UsageFilters
}
