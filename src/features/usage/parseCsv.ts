import Papa from 'papaparse'
import type { CsvParseResult, TokenAmounts, UsageRecord, UsageWarning } from './types'

const REQUIRED_COLUMNS = [
  'Date',
  'Kind',
  'Model',
  'Input (w/ Cache Write)',
  'Input (w/o Cache Write)',
  'Cache Read',
  'Output Tokens',
  'Total Tokens',
] as const

const TOKEN_COLUMNS = [
  { key: 'input', column: 'Input (w/o Cache Write)' },
  { key: 'cacheRead', column: 'Cache Read' },
  { key: 'cacheWrite', column: 'Input (w/ Cache Write)' },
  { key: 'output', column: 'Output Tokens' },
] as const

function parseToken(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null
  if (!/^\d+$/.test(normalized)) return undefined
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function parseDate(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const timestamp = Date.parse(value.trim())
  return Number.isFinite(timestamp) ? timestamp : null
}

function warning(row: number, code: UsageWarning['code'], message: string): UsageWarning {
  return { row, code, message }
}

export function parseUsageCsv(text: string, fileName?: string): CsvParseResult {
  const normalizedText = text.replace(/^\uFEFF/, '')
  const parsed = Papa.parse<Record<string, string>>(normalizedText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })
  const headers = (parsed.meta.fields ?? []).map((header) => header.trim())
  if (parsed.meta.renamedHeaders) {
    const duplicates = Object.values(parsed.meta.renamedHeaders)
    throw new Error(`CSV 헤더에 중복된 열 이름이 있습니다: ${duplicates.join(', ')}`)
  }
  const headerSet = new Set(headers)
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerSet.has(column))
  if (missingColumns.length) {
    throw new Error(`필수 CSV 열을 찾을 수 없습니다: ${missingColumns.join(', ')}`)
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error('CSV 헤더에 중복된 열 이름이 있습니다.')
  }

  const records: UsageRecord[] = []
  const warnings: UsageWarning[] = []
  let skippedRows = 0
  let invalidRows = 0

  const structurallyInvalidRows = new Set<number>()
  for (const rowResult of parsed.errors) {
    const row = Math.max(2, (rowResult.row ?? 0) + 2)
    if (rowResult.code === 'TooFewFields' || rowResult.code === 'TooManyFields') {
      structurallyInvalidRows.add(rowResult.row ?? 0)
    }
    warnings.push(warning(row, 'csv-structure', `CSV ${row}행 형식 오류: ${rowResult.message}`))
  }

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2
    if (structurallyInvalidRows.has(index)) {
      skippedRows += 1
      invalidRows += 1
      return
    }
    const timestamp = parseDate(row.Date)
    if (timestamp === null) {
      skippedRows += 1
      invalidRows += 1
      warnings.push(warning(rowNumber, 'invalid-date', '날짜가 없거나 올바른 날짜 형식이 아닙니다.'))
      return
    }

    const parsedAmounts: Partial<TokenAmounts> = {}
    let missingToken = false
    let invalidToken = false
    for (const mapping of TOKEN_COLUMNS) {
      const amount = parseToken(row[mapping.column])
      if (amount === null) missingToken = true
      else if (amount === undefined) invalidToken = true
      else parsedAmounts[mapping.key] = amount
    }

    if (invalidToken || missingToken) {
      skippedRows += 1
      if (invalidToken) invalidRows += 1
      warnings.push(
        warning(
          rowNumber,
          invalidToken ? 'invalid-token' : 'missing-token',
          invalidToken
            ? '토큰 값이 0 이상의 안전한 정수가 아니어서 집계에서 제외했습니다.'
            : '4종 토큰 중 빈 값이 있어 집계에서 제외했습니다.',
        ),
      )
      return
    }

    const amounts = parsedAmounts as TokenAmounts
    const calculatedTotal = amounts.input + amounts.cacheRead + amounts.cacheWrite + amounts.output
    const rawTotal = String(row['Total Tokens'] ?? '').trim()
    const declaredTotal = parseToken(rawTotal)
    if (declaredTotal !== null && declaredTotal !== undefined && declaredTotal !== calculatedTotal) {
      warnings.push({
        ...warning(rowNumber, 'total-mismatch', `총 토큰 검증 불일치: CSV ${rawTotal}, 4종 합계 ${calculatedTotal}`),
        rawTotal,
        calculatedTotal,
      })
    } else if (declaredTotal === undefined) {
      warnings.push(warning(rowNumber, 'total-mismatch', 'Total Tokens 값이 숫자가 아니므로 4종 합계와 비교하지 못했습니다.'))
    }

    const model = String(row.Model ?? '').trim()
    const usageType = String(row.Kind ?? '').trim()
    if (!model || !usageType) {
      warnings.push(warning(rowNumber, 'missing-dimension', '모델 또는 Kind 값이 없어 미분류로 표시합니다.'))
    }

    records.push({
      timestamp,
      model: model || '알 수 없는 모델',
      usageType: usageType || '미분류',
      ...amounts,
    })
  })

  return {
    records: records.sort((left, right) => left.timestamp - right.timestamp),
    warnings,
    skippedRows,
    invalidRows,
    totalRows: parsed.data.length,
    fileName,
  }
}
