import { useCallback, useMemo, useState } from 'react'
import { Activity, AlertCircle, ArrowDownRight, Boxes, ChevronRight, Database, FileUp, Gauge, RotateCcw, Sparkles, Waypoints } from 'lucide-react'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { QualitySummary } from '@/components/dashboard/QualitySummary'
import { StatCard } from '@/components/dashboard/StatCard'
import { CsvUpload } from '@/components/upload/CsvUpload'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { aggregateByDimension, aggregateByTime, filterUsageRecords, sumUsage } from '@/features/usage/aggregate'
import { parseUsageCsv } from '@/features/usage/parseCsv'
import type { TokenSeriesKey } from '@/features/usage/types'
import { formatTokens } from '@/lib/format'
import { store, usageActions } from '@/store'
import { useUsageDispatch, useUsageSelector } from '@/store/useUsageStore'

const ALL_SERIES: TokenSeriesKey[] = ['input', 'cacheRead', 'cacheWrite', 'output']

export default function App() {
  const state = useUsageSelector((current) => current)
  const dispatch = useUsageDispatch()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSeries, setSelectedSeries] = useState<TokenSeriesKey[]>(ALL_SERIES)
  const handleSelectedSeriesChange = useCallback((series: TokenSeriesKey[]) => setSelectedSeries(series), [])

  const visibleRecords = useMemo(() => filterUsageRecords(state.records, state.filters), [state.records, state.filters])
  const totals = useMemo(() => sumUsage(visibleRecords), [visibleRecords])
  const originalTotals = useMemo(() => sumUsage(state.records), [state.records])
  const timeData = useMemo(() => aggregateByTime(visibleRecords, state.filters.timeGrain, state.filters.timezone), [visibleRecords, state.filters.timeGrain, state.filters.timezone])
  const modelData = useMemo(() => aggregateByDimension(visibleRecords, 'model'), [visibleRecords])
  const usageTypeData = useMemo(() => aggregateByDimension(visibleRecords, 'usageType'), [visibleRecords])
  const activeModels = useMemo(() => new Set(visibleRecords.map((record) => record.model)).size, [visibleRecords])
  const activeUsageTypes = useMemo(() => new Set(visibleRecords.map((record) => record.usageType)).size, [visibleRecords])
  const filtersLabel = [
    state.filters.dateRange.from !== null || state.filters.dateRange.to !== null ? '기간 선택됨' : '전체 기간',
    state.filters.models.length > 0 ? `모델 ${state.filters.models.length}개` : null,
    state.filters.usageTypes.length > 0 ? `유형 ${state.filters.usageTypes.length}개` : null,
  ].filter(Boolean).join(' · ')

  const handleFile = async (file: File) => {
    setIsLoading(true)
    dispatch(usageActions.loadStarted())
    try {
      const text = await file.text()
      const result = parseUsageCsv(text, file.name)
      dispatch(usageActions.loadSucceeded(result))
      setSelectedSeries(ALL_SERIES)
    } catch (error) {
      dispatch(usageActions.loadFailed(error instanceof Error ? error.message : 'CSV를 읽지 못했습니다.'))
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => dispatch(usageActions.clearFilters())
  const resetDashboard = () => {
    store.dispatch(usageActions.clear())
    setSelectedSeries(ALL_SERIES)
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#20263a]">
      <header className="border-b border-[#ebecf2] bg-white/85 backdrop-blur-sm">
        <div className="page-shell flex h-[58px] items-center justify-between gap-3">
          <a href="#main" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#5c60d8] text-white shadow-[0_5px_16px_rgba(86,91,205,0.22)]"><Activity className="size-4" /></span>
            <span className="text-sm font-semibold tracking-[-0.025em] text-[#353b51]">Cursor<span className="font-medium text-[#8b8fa0]">Usage</span></span>
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[#dcefe9] bg-[#f4fbf8] px-2.5 py-1 text-[10px] font-medium text-[#458d78] sm:flex"><span className="size-1.5 rounded-full bg-[#35ae8b]" />로컬 처리</span>
            {state.fileName && <Button variant="ghost" size="sm" onClick={resetDashboard} className="h-8 text-[10px] text-[#858a9c]"><RotateCcw className="size-3" />초기화</Button>}
            <span className="rounded-full border border-[#e8e9f0] px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-[#777d90]">CURSOR CSV</span>
          </div>
        </div>
      </header>

      <main id="main" className="page-shell page-shell--main">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-5 pt-7 sm:pb-6 sm:pt-9">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.12em] text-[#9398aa]">
              <span>USAGE INSIGHTS</span><ChevronRight className="size-3" /><span className="text-[#666bd3]">ANALYTICS</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.055em] text-[#2d344a] sm:text-[30px]">토큰 사용량 분석</h1>
              <Badge className="border-[#dedef9] bg-[#f2f1ff] px-2.5 py-1 text-[9px] font-semibold tracking-wide text-[#5b5dc4]">BETA</Badge>
            </div>
            <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-[#898ea0] sm:text-xs">모델과 사용 유형별 토큰 흐름을 한눈에 살펴보세요. 사용량 CSV는 브라우저 안에서 안전하게 처리됩니다.</p>
          </div>
          <p className="flex items-center gap-1.5 pb-0.5 text-[10px] text-[#a0a4b1]"><Sparkles className="size-3 text-[#ad9bd8]" />Input · Cache Read · Cache Write · Output</p>
        </div>

        <div className="space-y-5">
          <CsvUpload onFile={handleFile} fileName={state.fileName} isLoading={isLoading} />

          {state.parseError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[#f0d6d7] bg-[#fff8f8] px-4 py-3 text-xs text-[#b04e5c]">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div><p className="font-semibold">CSV를 불러오지 못했습니다</p><p className="mt-1 leading-relaxed">{state.parseError}</p></div>
            </div>
          )}

          {!state.fileName ? (
            <Card className="grid min-h-[300px] place-items-center overflow-hidden border-dashed bg-[radial-gradient(ellipse_at_top,_#ffffff,_#fafaff_68%,_#f7f8fc)] p-8 text-center">
              <div className="max-w-sm">
                <span className="mx-auto grid size-[58px] place-items-center rounded-2xl border border-[#e8e7ff] bg-white text-[#6468d7] shadow-[0_8px_30px_-16px_rgba(86,91,205,0.4)]"><FileUp className="size-6" /></span>
                <h2 className="mt-5 text-base font-semibold text-[#41475d]">사용량 데이터를 시작해 보세요</h2>
                <p className="mt-2 text-xs leading-relaxed text-[#9095a7]">Cursor 대시보드에서 내보낸 CSV를 선택하면<br className="hidden sm:block" /> 토큰 사용 흐름을 세 가지 관점에서 분석합니다.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {['시간별 사용량', '모델별 비교', '사용 유형별 분포'].map((item) => <span key={item} className="rounded-full border border-[#e7e8f1] bg-white px-2.5 py-1.5 text-[9px] font-medium text-[#73798d]">{item}</span>)}
                </div>
                <p className="mt-5 flex items-center justify-center gap-1.5 text-[9px] text-[#a0a4b1]"><Database className="size-3 text-[#3ba889]" />서버 전송 없이 로컬 브라우저에서만 분석</p>
              </div>
            </Card>
          ) : (
            <>
              <QualitySummary warnings={state.warnings} skippedRows={state.skippedRows} invalidRows={state.invalidRows} totalRows={state.totalRows} acceptedRows={state.records.length} />

              <section aria-label="토큰 사용 요약" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <StatCard label="총 토큰" value={formatTokens(totals.total)} detail={`전체 ${formatTokens(originalTotals.total)} 중 현재 필터`} icon={<Boxes className="size-4" />} tone="violet" trend="steady" />
                <StatCard label="Input" value={formatTokens(totals.input)} detail={`전체 토큰의 ${totals.total ? ((totals.input / totals.total) * 100).toFixed(1) : '0.0'}%`} icon={<Waypoints className="size-4" />} tone="violet" trend="steady" />
                <StatCard label="CacheRead" value={formatTokens(totals.cacheRead)} detail={`전체 토큰의 ${totals.total ? ((totals.cacheRead / totals.total) * 100).toFixed(1) : '0.0'}%`} icon={<Database className="size-4" />} tone="teal" trend="steady" />
                <StatCard label="CacheWrite" value={formatTokens(totals.cacheWrite)} detail={`전체 토큰의 ${totals.total ? ((totals.cacheWrite / totals.total) * 100).toFixed(1) : '0.0'}%`} icon={<Gauge className="size-4" />} tone="amber" trend="steady" />
                <StatCard label="Output" value={formatTokens(totals.output)} detail={`전체 토큰의 ${totals.total ? ((totals.output / totals.total) * 100).toFixed(1) : '0.0'}%`} icon={<ArrowDownRight className="size-4" />} tone="rose" trend="steady" />
              </section>

              <div className="page-grid">
                <section aria-label="토큰 사용 차트" className="min-w-0 space-y-4">
                  <ChartCard
                    kind="time"
                    title="시간별 토큰 사용량"
                    description="시간 흐름에 따라 토큰 소비량과 캐시 사용을 살펴봅니다."
                    data={timeData}
                    total={totals.total}
                    selectedSeries={selectedSeries}
                    onSelectedSeriesChange={handleSelectedSeriesChange}
                    grain={state.filters.timeGrain}
                    onGrainChange={(grain) => dispatch(usageActions.setTimeGrain(grain))}
                    timezone={state.filters.timezone}
                    onTimezoneChange={(timezone) => dispatch(usageActions.setTimezone(timezone as 'Asia/Seoul' | 'UTC'))}
                    filtersLabel={filtersLabel}
                  />
                  <ChartCard
                    kind="model"
                    title="모델별 토큰 사용량"
                    description="모델별 전체 사용량을 토큰 유형별로 나누어 비교합니다."
                    data={modelData}
                    total={totals.total}
                    selectedSeries={selectedSeries}
                    onSelectedSeriesChange={handleSelectedSeriesChange}
                    filtersLabel={filtersLabel}
                  />
                  <ChartCard
                    kind="usageType"
                    title="사용 유형별 토큰 사용량"
                    description="Included, User API Key 등 사용 유형을 비교합니다."
                    data={usageTypeData}
                    total={totals.total}
                    selectedSeries={selectedSeries}
                    onSelectedSeriesChange={handleSelectedSeriesChange}
                    filtersLabel={filtersLabel}
                  />
                </section>
                <div className="min-w-0">
                  <div className="sticky top-5">
                    <FilterPanel
                      records={state.records}
                      filters={state.filters}
                      onModelsChange={(models) => dispatch(usageActions.setModels(models))}
                      onUsageTypesChange={(usageTypes) => dispatch(usageActions.setUsageTypes(usageTypes))}
                      onDateRangeChange={(from, to) => dispatch(usageActions.setDateRange(from, to))}
                      onClear={clearFilters}
                    />
                    <div className="mt-4 rounded-xl border border-[#e6e7f0] bg-white/70 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-[#74798c]"><ArrowDownRight className="size-3.5 text-[#8589dc]" />차트 사용 팁</div>
                      <ul className="mt-2 space-y-1.5 text-[9px] leading-relaxed text-[#9297a8]">
                        <li>· 차트 안에서 마우스 휠로 확대·축소</li>
                        <li>· 아래 범위 슬라이더를 끌어 구간 이동</li>
                        <li>· 범례를 눌러 토큰 시리즈 표시 전환</li>
                        <li>· 우측 상단 아이콘으로 확대 초기화·PNG 저장</li>
                      </ul>
                    </div>
                    <div className="mt-3 flex items-center justify-between px-1 text-[9px] text-[#a1a5b2]">
                      <span className="flex items-center gap-1"><Boxes className="size-3" />모델 {activeModels}개 · 유형 {activeUsageTypes}개</span>
                      <button onClick={clearFilters} disabled={!state.filters.models.length && !state.filters.usageTypes.length && state.filters.dateRange.from === null && state.filters.dateRange.to === null} className="flex items-center gap-1 rounded px-1 py-1 hover:bg-[#eeeef7] disabled:opacity-40"><RotateCcw className="size-2.5" />필터 해제</button>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e7e8ef] pt-4 text-[9px] text-[#9da2b1]">
                <span>집계된 {formatTokens(totals.rows)}개 이벤트 · 원본 CSV는 이 브라우저를 벗어나지 않습니다.</span>
                <span>표시 중 모델 {activeModels}개 · 사용 유형 {activeUsageTypes}개</span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
