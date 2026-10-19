import { createStore } from 'redux'
import type { Action } from 'redux'
import type { CsvParseResult, TimeGrain, Timezone, UsageState } from '@/features/usage/types'

export const initialUsageState: UsageState = {
  records: [],
  fileName: null,
  warnings: [],
  skippedRows: 0,
  invalidRows: 0,
  totalRows: 0,
  parseError: null,
  filters: {
    dateRange: { from: null, to: null },
    models: [],
    usageTypes: [],
    timezone: 'Asia/Seoul',
    timeGrain: 'day',
  },
}

export const usageActions = {
  loadStarted: () => ({ type: 'usage/loadStarted' as const }),
  loadSucceeded: (result: CsvParseResult) => ({ type: 'usage/loadSucceeded' as const, payload: result }),
  loadFailed: (message: string) => ({ type: 'usage/loadFailed' as const, payload: message }),
  setModels: (models: string[]) => ({ type: 'usage/setModels' as const, payload: models }),
  setUsageTypes: (usageTypes: string[]) => ({ type: 'usage/setUsageTypes' as const, payload: usageTypes }),
  setDateRange: (from: number | null, to: number | null) => ({ type: 'usage/setDateRange' as const, payload: { from, to } }),
  setTimeGrain: (grain: TimeGrain) => ({ type: 'usage/setTimeGrain' as const, payload: grain }),
  setTimezone: (timezone: Timezone) => ({ type: 'usage/setTimezone' as const, payload: timezone }),
  clearFilters: () => ({ type: 'usage/clearFilters' as const }),
  clear: () => ({ type: 'usage/clear' as const }),
}

export type UsageAction = ReturnType<(typeof usageActions)[keyof typeof usageActions]>

const usageReducer = (state: UsageState = initialUsageState, action: Action & { payload?: unknown }): UsageState => {
  switch (action.type) {
    case 'usage/loadStarted':
      return { ...state, parseError: null }
    case 'usage/loadSucceeded': {
      const result = action.payload as CsvParseResult
      return {
        ...state,
        records: result.records,
        fileName: result.fileName ?? null,
        warnings: result.warnings,
        skippedRows: result.skippedRows,
        invalidRows: result.invalidRows,
        totalRows: result.totalRows,
        parseError: null,
        filters: { ...state.filters, dateRange: { from: null, to: null }, models: [], usageTypes: [] },
      }
    }
    case 'usage/loadFailed':
      return { ...state, parseError: action.payload as string }
    case 'usage/setModels':
      return { ...state, filters: { ...state.filters, models: action.payload as string[] } }
    case 'usage/setUsageTypes':
      return { ...state, filters: { ...state.filters, usageTypes: action.payload as string[] } }
    case 'usage/setDateRange':
      return { ...state, filters: { ...state.filters, dateRange: action.payload as UsageState['filters']['dateRange'] } }
    case 'usage/setTimeGrain':
      return { ...state, filters: { ...state.filters, timeGrain: action.payload as TimeGrain } }
    case 'usage/setTimezone':
      return { ...state, filters: { ...state.filters, timezone: action.payload as Timezone } }
    case 'usage/clearFilters':
      return { ...state, filters: { ...state.filters, dateRange: { from: null, to: null }, models: [], usageTypes: [] } }
    case 'usage/clear':
      return { ...initialUsageState, filters: state.filters }
    default:
      return state
  }
}

export const store = createStore(usageReducer)
export type RootState = UsageState
export type AppDispatch = (action: UsageAction) => UsageAction
export const getUsageState = (): UsageState => store.getState() as UsageState
