import type { AggregateBucket, TokenSeriesKey } from '@/features/usage/types'

export interface TokenChartProps {
  kind: 'time' | 'model' | 'usageType'
  data: AggregateBucket[]
  selectedSeries: TokenSeriesKey[]
  onSelectedSeriesChange: (series: TokenSeriesKey[]) => void
  timezone?: string
  loading?: boolean
}
