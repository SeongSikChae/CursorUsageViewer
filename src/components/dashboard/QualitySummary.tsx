import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UsageWarning } from '@/features/usage/types'

const PAGE_SIZE = 20
const EXCLUDED_CODES = new Set<UsageWarning['code']>(['missing-token', 'invalid-token', 'invalid-date', 'csv-structure'])

type WarningFilter = 'all' | 'excluded' | 'other'

interface QualitySummaryProps {
  warnings: UsageWarning[]
  skippedRows: number
  invalidRows: number
  totalRows: number
  acceptedRows: number
}

function getWarningLabel(code: UsageWarning['code']): string {
  switch (code) {
    case 'missing-token': return '토큰 누락 · 집계 제외'
    case 'invalid-token': return '토큰 오류 · 집계 제외'
    case 'invalid-date': return '날짜 오류 · 집계 제외'
    case 'csv-structure': return 'CSV 형식 오류 · 집계 제외'
    case 'total-mismatch': return '총 토큰 합계 경고'
    case 'missing-dimension': return '모델·사용 유형 정보 누락'
  }
}

function getWarningStyle(code: UsageWarning['code']): string {
  if (EXCLUDED_CODES.has(code)) return 'border-[#f1d7d4] bg-[#fff4f2] text-[#b65b52]'
  if (code === 'total-mismatch') return 'border-[#f0e2bd] bg-[#fffaed] text-[#a9782c]'
  return 'border-[#e4e6ee] bg-[#f6f7fa] text-[#73798d]'
}

export function QualitySummary({ warnings, skippedRows, invalidRows, totalRows, acceptedRows }: QualitySummaryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filter, setFilter] = useState<WarningFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const mismatches = warnings.filter((item) => item.code === 'total-mismatch').length
  const excludedWarnings = warnings.filter((item) => EXCLUDED_CODES.has(item.code)).length
  const excludedWarningRows = new Set(warnings.filter((item) => EXCLUDED_CODES.has(item.code)).map((item) => item.row)).size
  const otherWarnings = warnings.length - excludedWarnings
  const hasIssue = warnings.length > 0

  const filteredWarnings = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('ko-KR')
    return [...warnings]
      .filter((item) => {
        if (filter === 'excluded' && !EXCLUDED_CODES.has(item.code)) return false
        if (filter === 'other' && EXCLUDED_CODES.has(item.code)) return false
        if (!normalizedSearch) return true
        const searchableText = `CSV ${item.row}행 ${item.code} ${getWarningLabel(item.code)} ${item.message}`.toLocaleLowerCase('ko-KR')
        return searchableText.includes(normalizedSearch)
      })
      .sort((left, right) => left.row - right.row || left.code.localeCompare(right.code))
  }, [filter, search, warnings])

  const pageCount = Math.ceil(filteredWarnings.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(pageCount - 1, 0))
  const visibleWarnings = filteredWarnings.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const firstVisibleWarning = filteredWarnings.length === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const lastVisibleWarning = Math.min((currentPage + 1) * PAGE_SIZE, filteredWarnings.length)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !isDialogOpen) return
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [isDialogOpen])

  const openDialog = () => {
    setFilter('all')
    setSearch('')
    setPage(0)
    setIsDialogOpen(true)
  }

  return (
    <section aria-label="CSV 검증 결과" className={`rounded-xl border px-4 py-3 ${hasIssue ? 'border-[#f0e2bd] bg-[#fffbf2]' : 'border-[#dfeee9] bg-[#f5fbf8]'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {hasIssue ? <AlertTriangle className="size-4 text-[#c78a2c]" /> : <CheckCircle2 className="size-4 text-[#2a9b7c]" />}
          <span className="text-xs font-semibold text-[#464c61]">CSV 검증 {hasIssue ? '확인 필요' : '완료'}</span>
          <Badge className="border-[#e4e6ee] bg-white/80 px-2 py-0.5 text-[9px] text-[#82879a]">{acceptedRows.toLocaleString('ko-KR')} / {totalRows.toLocaleString('ko-KR')}행 집계</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#858b9d]">
          {skippedRows > 0 && <span>집계 제외 {skippedRows.toLocaleString('ko-KR')}행</span>}
          {invalidRows > 0 && <span className="text-[#bd715f]">오류 행 {invalidRows.toLocaleString('ko-KR')}개</span>}
          {mismatches > 0 && <span className="text-[#b68135]">합계 경고 {mismatches.toLocaleString('ko-KR')}건</span>}
          {otherWarnings > mismatches && <span>기타 경고 {(otherWarnings - mismatches).toLocaleString('ko-KR')}건</span>}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 border-t border-[#efe9d9] pt-2">
          <Button type="button" variant="ghost" size="sm" aria-haspopup="dialog" onClick={openDialog} className="h-7 px-1.5 text-[10px] text-[#77758b] hover:text-[#4f53c4]">
            <Info className="size-3" />전체 제외·경고 목록 보기 ({warnings.length.toLocaleString('ko-KR')}건)<ChevronRight className="size-3" />
          </Button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="csv-validation-title"
        className="validation-dialog"
        onCancel={(event) => { event.preventDefault(); setIsDialogOpen(false) }}
        onClose={() => setIsDialogOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setIsDialogOpen(false) }}
      >
        <div className="flex min-h-0 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-[#ececf2] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#fff5e4] text-[#bc812c]"><AlertTriangle className="size-4" /></span>
                <h2 id="csv-validation-title" className="text-sm font-semibold text-[#34394e]">CSV 검증 상세</h2>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#858b9d]">집계에서 제외된 행과 집계는 유지했지만 확인이 필요한 경고를 모두 표시합니다.</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)} aria-label="검증 상세 닫기" className="size-8 text-[#858b9d]">
              <X className="size-4" />
            </Button>
          </header>

          <div className="space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-[#ececf2] bg-[#fafafd] px-3 py-2">
                <p className="text-[9px] text-[#8b90a2]">전체 항목</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-[#464c61]">{warnings.length.toLocaleString('ko-KR')}<span className="ml-1 text-[9px] font-normal">건</span></p>
              </div>
              <div className="rounded-lg border border-[#f1d7d4] bg-[#fff8f6] px-3 py-2">
                <p className="text-[9px] text-[#a56a62]">집계 제외 행</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-[#b65b52]">{skippedRows.toLocaleString('ko-KR')}<span className="ml-1 text-[9px] font-normal">행</span></p>
                <p className="mt-0.5 text-[9px] text-[#a56a62]">{excludedWarningRows.toLocaleString('ko-KR')}개 항목</p>
              </div>
              <div className="rounded-lg border border-[#f0e2bd] bg-[#fffcf5] px-3 py-2">
                <p className="text-[9px] text-[#a9782c]">집계 유지 경고</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-[#a9782c]">{otherWarnings.toLocaleString('ko-KR')}<span className="ml-1 text-[9px] font-normal">건</span></p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5" aria-label="검증 항목 분류">
              {([
                { value: 'all', label: '전체', count: warnings.length },
                { value: 'excluded', label: '집계 제외', count: excludedWarnings },
                { value: 'other', label: '기타 경고', count: otherWarnings },
              ] as const).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={filter === item.value}
                  onClick={() => { setFilter(item.value); setPage(0) }}
                  className={`rounded-lg border px-3 py-2 text-[10px] font-medium transition-colors ${filter === item.value ? 'border-[#c9c9f0] bg-[#f3f2ff] text-[#5559c9]' : 'border-[#e8e9f0] bg-white text-[#777d90] hover:bg-[#f7f7fb]'}`}
                >
                  {item.label}<span className="ml-1.5 tabular-nums">{item.count.toLocaleString('ko-KR')}</span>
                </button>
              ))}
            </div>

            <label className="flex h-10 items-center gap-2 rounded-lg border border-[#e4e5ed] bg-white px-3 focus-within:border-[#a6a8e9]">
              <Search className="size-3.5 shrink-0 text-[#999eaf]" />
              <span className="sr-only">행 번호 또는 경고 내용 검색</span>
              <input
                type="search"
                autoFocus
                value={search}
                onChange={(event) => { setSearch(event.currentTarget.value); setPage(0) }}
                placeholder="행 번호 또는 경고 내용 검색"
                className="min-w-0 flex-1 bg-transparent text-xs text-[#50566d] outline-none placeholder:text-[#a1a5b3]"
              />
            </label>

            <div className="validation-dialog__list" aria-label="CSV 검증 경고 목록">
              {visibleWarnings.length > 0 ? (
                <ul className="space-y-2">
                  {visibleWarnings.map((item, index) => (
                    <li key={`${item.row}-${item.code}-${currentPage * PAGE_SIZE + index}`} className="rounded-xl border border-[#ececf2] bg-white px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-[#5d6378]">CSV {item.row.toLocaleString('ko-KR')}행</span>
                        <span className={`rounded-md border px-2 py-1 text-[9px] font-medium ${getWarningStyle(item.code)}`}>{getWarningLabel(item.code)}</span>
                      </div>
                      <p className="mt-2 break-words text-[11px] leading-relaxed text-[#777d8e]">{item.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-[#e4e5ed] bg-[#fafafd] px-4 text-center text-xs text-[#8c91a2]">
                  조건에 맞는 항목이 없습니다. 검색어 또는 분류를 변경해 주세요.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ececf2] pt-3">
              <p className="text-[10px] text-[#858b9d]">{firstVisibleWarning.toLocaleString('ko-KR')}–{lastVisibleWarning.toLocaleString('ko-KR')} / {filteredWarnings.length.toLocaleString('ko-KR')}건</p>
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="outline" size="sm" aria-label="이전 검증 항목" disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="h-8 px-2.5 text-[10px]">
                  <ChevronLeft className="size-3" />이전
                </Button>
                <span className="min-w-14 text-center text-[10px] tabular-nums text-[#777d90]">{pageCount === 0 ? 0 : currentPage + 1} / {pageCount}</span>
                <Button type="button" variant="outline" size="sm" aria-label="다음 검증 항목" disabled={currentPage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} className="h-8 px-2.5 text-[10px]">
                  다음<ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </section>
  )
}
