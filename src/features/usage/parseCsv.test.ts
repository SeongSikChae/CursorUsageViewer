import { describe, expect, it } from 'vitest'
import { parseUsageCsv } from './parseCsv'

const headers = [
  'Date', 'Cloud Agent ID', 'Automation ID', 'Kind', 'Model', 'Max Mode',
  'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output Tokens', 'Total Tokens', 'Cost',
].join(',')

function row(overrides: Record<string, string> = {}) {
  const values = {
    Date: '2026-10-19T03:40:34.091Z',
    'Cloud Agent ID': '',
    'Automation ID': '',
    Kind: 'User API Key',
    Model: 'Bizadm-GPT-6-LUNA-max',
    'Max Mode': 'No',
    'Input (w/ Cache Write)': '624',
    'Input (w/o Cache Write)': '3',
    'Cache Read': '118970',
    'Output Tokens': '426',
    'Total Tokens': '120023',
    Cost: '0.00',
    ...overrides,
  }
  return Object.values(values).map((value) => `"${value}"`).join(',')
}

describe('parseUsageCsv', () => {
  it('매핑된 4개 토큰 열을 독립 집계하고 날짜순으로 정렬한다', () => {
    const older = row({ Date: '2026-10-19T02:40:34.091Z' })
    const result = parseUsageCsv(`\uFEFF${headers}\r\n${row()}\r\n${older}`, 'usage.csv')

    expect(result.fileName).toBe('usage.csv')
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toMatchObject({
      input: 3,
      cacheRead: 118970,
      cacheWrite: 624,
      output: 426,
      usageType: 'User API Key',
      model: 'Bizadm-GPT-6-LUNA-max',
    })
    expect(result.records[0]!.input + result.records[0]!.cacheRead + result.records[0]!.cacheWrite + result.records[0]!.output).toBe(120023)
    expect(result.records[0]!.timestamp).toBeLessThan(result.records[1]!.timestamp)
    expect(result.warnings).toHaveLength(0)
  })

  it('빈 토큰과 유효하지 않은 날짜를 0으로 바꾸지 않고 건너뛴다', () => {
    const emptyTokens = row({ 'Input (w/ Cache Write)': '', 'Input (w/o Cache Write)': '', 'Cache Read': '', 'Output Tokens': '', 'Total Tokens': '', Cost: 'Free' })
    const invalidDate = row({ Date: 'not-a-date' })
    const result = parseUsageCsv(`${headers}\n${emptyTokens}\n${invalidDate}`)

    expect(result.records).toHaveLength(0)
    expect(result.skippedRows).toBe(2)
    expect(result.invalidRows).toBe(1)
    expect(result.warnings.map((item) => item.code)).toEqual(['missing-token', 'invalid-date'])
  })

  it('합계 불일치를 경고하되 실제 4시리즈 합계는 보존한다', () => {
    const result = parseUsageCsv(`${headers}\n${row({ 'Total Tokens': '1', Kind: 'Custom Plan' })}`)

    expect(result.records[0]!.usageType).toBe('Custom Plan')
    expect(result.warnings[0]!.code).toBe('total-mismatch')
    expect(result.warnings[0]!.calculatedTotal).toBe(120023)
  })

  it('필수 헤더가 누락되면 입력 오류를 반환한다', () => {
    expect(() => parseUsageCsv(`Date,Model\n${row()}`)).toThrow('필수 CSV 열')
  })

  it('중복된 헤더 이름은 입력 오류로 처리한다', () => {
    expect(() => parseUsageCsv(`${headers},Date\n${row()},2026-10-19T03:40:34.091Z`)).toThrow('중복된 열 이름')
  })

  it('열 개수가 맞지 않는 행을 유효한 레코드로 포함하지 않는다', () => {
    const result = parseUsageCsv(`${headers}\n${row()}\n${row().split(',').slice(0, 10).join(',')}`)
    expect(result.records).toHaveLength(1)
    expect(result.skippedRows).toBe(1)
    expect(result.invalidRows).toBe(1)
    expect(result.warnings.at(-1)?.code).toBe('csv-structure')
  })

  it('숫자 형식 오류가 있는 행은 집계에서 제외한다', () => {
    const result = parseUsageCsv(`${headers}\n${row({ 'Cache Read': '1.5' })}`)
    expect(result.records).toHaveLength(0)
    expect(result.invalidRows).toBe(1)
    expect(result.warnings[0]!.code).toBe('invalid-token')
  })
})
