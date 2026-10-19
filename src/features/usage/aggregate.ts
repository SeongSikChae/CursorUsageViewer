import type {
  AggregateBucket,
  TimeGrain,
  TokenAmounts,
  Timezone,
  UsageFilterOptions,
  UsageFilters,
  UsageRecord,
  UsageTotals,
} from './types'

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timezone: Timezone): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timezone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formatterCache.set(timezone, formatter)
  }
  return formatter
}

function dateParts(timestamp: number, timezone: Timezone): Record<string, number> {
  return Object.fromEntries(
    getFormatter(timezone)
      .formatToParts(timestamp)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
}

function partsToTimestamp(parts: Record<string, number>): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
}

function offsetMinutes(timestamp: number, timezone: Timezone): number {
  return (partsToTimestamp(dateParts(timestamp, timezone)) - timestamp) / 60_000
}

function zonedTimestamp(parts: Record<string, number>, timezone: Timezone): number {
  const naive = partsToTimestamp(parts)
  let result = naive
  for (let index = 0; index < 3; index += 1) {
    result = naive - offsetMinutes(result, timezone) * 60_000
  }
  return result
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function getZonedDateStart(value: string, timezone: Timezone): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const normalized = new Date(Date.UTC(year, month - 1, day))
  if (normalized.getUTCFullYear() !== year || normalized.getUTCMonth() + 1 !== month || normalized.getUTCDate() !== day) return null
  return zonedTimestamp({ year, month, day, hour: 0, minute: 0 }, timezone)
}

export function getZonedDateEnd(value: string, timezone: Timezone): number | null {
  if (getZonedDateStart(value, timezone) === null) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const normalized = new Date(Date.UTC(year, month - 1, day + 1))
  const nextDate = `${normalized.getUTCFullYear()}-${pad(normalized.getUTCMonth() + 1)}-${pad(normalized.getUTCDate())}`
  const nextStart = getZonedDateStart(nextDate, timezone)
  return nextStart === null ? null : nextStart - 1
}

export function formatZonedDate(timestamp: number, timezone: Timezone): string {
  const parts = dateParts(timestamp, timezone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

interface BucketTime {
  key: string
  label: string
  timestamp: number
}

export function getTimeBucket(timestamp: number, grain: TimeGrain, timezone: Timezone): BucketTime {
  const parts = dateParts(timestamp, timezone)
  const year = parts.year
  const month = parts.month
  const day = parts.day
  const hour = parts.hour
  const minute = parts.minute

  if (grain === 'minute' || grain === 'hour') {
    parts.minute = grain === 'minute' ? minute : 0
    if (grain === 'hour') parts.minute = 0
    const label = grain === 'minute'
      ? `${pad(month)}.${pad(day)} ${pad(hour)}:${pad(minute)}`
      : `${pad(month)}.${pad(day)} ${pad(hour)}시`
    return {
      key: `${parts.year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(parts.minute)}`,
      label,
      timestamp: zonedTimestamp(parts, timezone),
    }
  }

  parts.hour = 0
  parts.minute = 0
  if (grain === 'day') {
    return {
      key: `${year}-${pad(month)}-${pad(day)}`,
      label: `${pad(month)}.${pad(day)}`,
      timestamp: zonedTimestamp(parts, timezone),
    }
  }

  const localNoon = zonedTimestamp({ ...parts, hour: 12 }, timezone)
  const weekday = new Date(localNoon).getUTCDay()
  const daysFromMonday = (weekday + 6) % 7
  const monday = new Date(Date.UTC(year, month - 1, day - daysFromMonday))
  const weekParts = {
    year: monday.getUTCFullYear(),
    month: monday.getUTCMonth() + 1,
    day: monday.getUTCDate(),
    hour: 0,
    minute: 0,
  }
  const thursday = new Date(Date.UTC(weekParts.year, weekParts.month - 1, weekParts.day + 3))
  const isoYear = thursday.getUTCFullYear()
  const firstIsoMonday = new Date(Date.UTC(isoYear, 0, 4))
  const firstIsoMondayDay = (firstIsoMonday.getUTCDay() + 6) % 7
  firstIsoMonday.setUTCDate(firstIsoMonday.getUTCDate() - firstIsoMondayDay)
  const weekNumber = Math.floor((Date.UTC(weekParts.year, weekParts.month - 1, weekParts.day) - firstIsoMonday.getTime()) / (7 * 86_400_000)) + 1
  return {
    key: `${isoYear}-W${pad(weekNumber)}`,
    label: `${pad(weekParts.month)}.${pad(weekParts.day)} 주`,
    timestamp: zonedTimestamp(weekParts, timezone),
  }
}

export function filterUsageRecords(records: UsageRecord[], filters: UsageFilters, options: UsageFilterOptions = {}): UsageRecord[] {
  const { from, to } = filters.dateRange
  const modelSet = new Set(options.models ?? filters.models)
  const usageTypeSet = new Set(options.usageTypes ?? filters.usageTypes)
  return records.filter((record) => {
    if (from !== null && record.timestamp < from) return false
    if (to !== null && record.timestamp > to) return false
    if (modelSet.size && !modelSet.has(record.model)) return false
    if (usageTypeSet.size && !usageTypeSet.has(record.usageType)) return false
    return true
  })
}

function blankBucket(key: string, label: string, timestamp?: number): AggregateBucket {
  return { key, label, timestamp, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0, count: 0 }
}

function addAmounts(bucket: AggregateBucket, record: UsageRecord) {
  bucket.input += record.input
  bucket.cacheRead += record.cacheRead
  bucket.cacheWrite += record.cacheWrite
  bucket.output += record.output
  bucket.total += record.input + record.cacheRead + record.cacheWrite + record.output
  bucket.count += 1
}

function advanceCalendar(timestamp: number, grain: TimeGrain, timezone: Timezone): number {
  const parts = dateParts(timestamp, timezone)
  const daysToAdd = grain === 'week' ? 7 : 1
  const calendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysToAdd))
  const nextDay = { year: calendarDate.getUTCFullYear(), month: calendarDate.getUTCMonth() + 1, day: calendarDate.getUTCDate() }
  if (grain === 'day' || grain === 'week') return zonedTimestamp({ ...nextDay, hour: 0, minute: 0 }, timezone)
  if (grain === 'hour') {
    const nextParts = { ...parts, hour: parts.hour + 1, minute: 0 }
    if (parts.hour === 23) return zonedTimestamp({ ...nextDay, hour: 0, minute: 0 }, timezone)
    return zonedTimestamp(nextParts, timezone)
  }
  const nextParts = parts.minute === 59
    ? (parts.hour === 23 ? { ...nextDay, hour: 0, minute: 0 } : { ...parts, hour: parts.hour + 1, minute: 0 })
    : { ...parts, minute: parts.minute + 1 }
  return zonedTimestamp(nextParts, timezone)
}

export function aggregateByTime(
  records: UsageRecord[],
  grain: TimeGrain,
  timezone: Timezone,
  maximumBuckets = 10_000,
): AggregateBucket[] {
  const buckets = new Map<string, AggregateBucket>()
  for (const record of records) {
    const info = getTimeBucket(record.timestamp, grain, timezone)
    const bucket = buckets.get(info.key) ?? blankBucket(info.key, info.label, info.timestamp)
    addAmounts(bucket, record)
    buckets.set(info.key, bucket)
  }

  const result = [...buckets.values()].sort((left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0))
  if (result.length <= 1 || result.length > maximumBuckets) return result

  const first = result[0]!.timestamp!
  const last = result[result.length - 1]!.timestamp!
  const roughInterval = grain === 'minute'
    ? 60_000
    : grain === 'hour'
      ? 3_600_000
      : grain === 'day'
        ? 86_400_000
        : 7 * 86_400_000
  const roughExpected = Math.floor((last - first) / roughInterval) + 1
  if (roughExpected > maximumBuckets || roughExpected / result.length > 3) return result

  const allBuckets = new Map(result.map((bucket) => [bucket.key, bucket]))
  const dense: AggregateBucket[] = []
  let timestamp = first
  while (timestamp <= last && dense.length < maximumBuckets) {
    const info = getTimeBucket(timestamp, grain, timezone)
    dense.push(allBuckets.get(info.key) ?? blankBucket(info.key, info.label, timestamp))
    const nextTimestamp = advanceCalendar(timestamp, grain, timezone)
    if (nextTimestamp <= timestamp) return result
    timestamp = nextTimestamp
  }
  return dense
}

export function aggregateByDimension(
  records: UsageRecord[],
  dimension: 'model' | 'usageType',
): AggregateBucket[] {
  const buckets = new Map<string, AggregateBucket>()
  for (const record of records) {
    const label = record[dimension]
    const bucket = buckets.get(label) ?? blankBucket(label, label)
    addAmounts(bucket, record)
    buckets.set(label, bucket)
  }
  return [...buckets.values()].sort((left, right) => right.total - left.total || left.label.localeCompare(right.label))
}

export function sumUsage(records: UsageRecord[]): UsageTotals {
  const totals: UsageTotals = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0, rows: 0 }
  for (const record of records) {
    totals.input += record.input
    totals.cacheRead += record.cacheRead
    totals.cacheWrite += record.cacheWrite
    totals.output += record.output
    totals.total += record.input + record.cacheRead + record.cacheWrite + record.output
    totals.rows += 1
  }
  return totals
}

export function addTokenAmounts(left: TokenAmounts, right: TokenAmounts): TokenAmounts {
  return {
    input: left.input + right.input,
    cacheRead: left.cacheRead + right.cacheRead,
    cacheWrite: left.cacheWrite + right.cacheWrite,
    output: left.output + right.output,
  }
}

export function getExtents(records: UsageRecord[]): { from: number; to: number } | null {
  if (!records.length) return null
  return {
    from: records[0]!.timestamp,
    to: records[records.length - 1]!.timestamp,
  }
}
