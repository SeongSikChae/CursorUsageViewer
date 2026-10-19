import { describe, expect, it } from 'vitest'
import { aggregateByDimension, aggregateByTime, filterUsageRecords, getTimeBucket, getZonedDateEnd, getZonedDateStart, sumUsage } from './aggregate'
import type { UsageFilters, UsageRecord } from './types'

const makeRecord = (timestamp: string, overrides: Partial<UsageRecord> = {}): UsageRecord => ({
  timestamp: Date.parse(timestamp),
  model: 'model-a',
  usageType: 'Included',
  input: 10,
  cacheRead: 20,
  cacheWrite: 30,
  output: 40,
  ...overrides,
})

const records = [
  makeRecord('2026-10-12T15:20:00.000Z'),
  makeRecord('2026-10-12T15:59:00.000Z', { input: 1, usageType: 'User API Key', model: 'model-b' }),
  makeRecord('2026-10-19T02:10:00.000Z', { input: 5, cacheRead: 0, cacheWrite: 1, output: 2 }),
]

const filters: UsageFilters = {
  dateRange: { from: null, to: null },
  models: [],
  usageTypes: [],
  timezone: 'Asia/Seoul',
  timeGrain: 'day',
}

describe('usage aggregation', () => {
  it('Asia/Seoul의 날짜·시간 버킷 및 월요일 시작 주를 계산한다', () => {
    expect(getTimeBucket(records[0]!.timestamp, 'day', 'Asia/Seoul').key).toBe('2026-10-13')
    expect(getTimeBucket(records[0]!.timestamp, 'hour', 'Asia/Seoul').label).toBe('10.13 00시')
    expect(getTimeBucket(records[0]!.timestamp, 'minute', 'Asia/Seoul').label).toBe('10.13 00:20')
    expect(getTimeBucket(records[0]!.timestamp, 'week', 'Asia/Seoul').label).toBe('10.12 주')
    expect(getTimeBucket(records[2]!.timestamp, 'week', 'Asia/Seoul').label).toBe('10.19 주')
  })

  it('분·시·일·주 집계 모두 4개 시리즈와 전체 합계를 보존한다', () => {
    for (const grain of ['minute', 'hour', 'day', 'week'] as const) {
      const buckets = aggregateByTime(records, grain, 'Asia/Seoul')
      expect(buckets.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(sumUsage(records).total)
      expect(buckets.reduce((sum, bucket) => sum + bucket.input, 0)).toBe(sumUsage(records).input)
    }
    expect(aggregateByTime(records, 'day', 'Asia/Seoul')).toHaveLength(2)
    const weekly = aggregateByTime(records, 'week', 'Asia/Seoul')
    expect(weekly.map((bucket) => bucket.label)).toEqual(['10.12 주', '10.19 주'])
    expect(aggregateByTime(records, 'minute', 'Asia/Seoul', 1)).toHaveLength(3)
  })

  it('UTC 분 경계와 선택한 시간대 날짜 경계를 올바르게 버킷팅한다', () => {
    const timestamp = Date.parse('2026-10-19T03:40:34.091Z')
    expect(getTimeBucket(timestamp, 'minute', 'UTC').label).toBe('10.19 03:40')
    expect(getZonedDateStart('2026-10-19', 'Asia/Seoul')).toBe(Date.parse('2026-10-18T15:00:00Z'))
    expect(getZonedDateEnd('2026-10-19', 'Asia/Seoul')).toBe(Date.parse('2026-10-19T14:59:59.999Z'))
    expect(getZonedDateStart('2026-02-30', 'UTC')).toBeNull()
    expect(getZonedDateEnd('2026-02-30', 'UTC')).toBeNull()
  })

  it('날짜·모델·사용 유형의 공통 필터를 세 집계에 적용한다', () => {
    const filtered = filterUsageRecords(records, {
      ...filters,
      dateRange: { from: records[0]!.timestamp, to: records[1]!.timestamp },
      models: ['model-b'],
      usageTypes: ['User API Key'],
    })
    expect(filtered).toHaveLength(1)
    expect(aggregateByDimension(filtered, 'model')[0]!.label).toBe('model-b')
    expect(aggregateByDimension(filtered, 'usageType')[0]!.label).toBe('User API Key')
    expect(sumUsage(filtered).total).toBe(91)

    const availableModels = new Set(filterUsageRecords(records, { ...filters, usageTypes: ['User API Key'] }, { models: [] }).map((record) => record.model))
    const availableUsageTypes = new Set(filterUsageRecords(records, { ...filters, models: ['model-b'] }, { usageTypes: [] }).map((record) => record.usageType))
    expect(availableModels.has('model-b')).toBe(true)
    expect(availableModels.has('model-a')).toBe(false)
    expect([...availableUsageTypes]).toEqual(['User API Key'])
  })

  it('유형과 모델별 합계 순으로 정렬하면서 새로운 유형을 표시한다', () => {
    const byType = aggregateByDimension(records, 'usageType')
    const byModel = aggregateByDimension(records, 'model')
    expect(byType.map((bucket) => bucket.label)).toEqual(['Included', 'User API Key'])
    expect(byModel[0]!.label).toBe('model-a')
    expect(byType[0]!.total + byType[1]!.total).toBe(sumUsage(records).total)
  })
})
