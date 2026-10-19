export function formatTokens(value: number): string {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(value)
}

export function formatCompactTokens(value: number): string {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000_000) return `${trimDecimal(value / 1_000_000_000)}B`
  if (absolute >= 1_000_000) return `${trimDecimal(value / 1_000_000)}M`
  if (absolute >= 1_000) return `${trimDecimal(value / 1_000)}K`
  return formatTokens(value)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

export function trimDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

export function formatDate(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(timestamp)
}
