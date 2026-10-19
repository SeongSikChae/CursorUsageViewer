import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MultiFilterProps {
  label: string
  placeholder: string
  values: string[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function MultiFilter({ label, placeholder, values, selected, onChange }: MultiFilterProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filteredValues = useMemo(() => values.filter((value) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [search, values])
  const allSelected = values.length > 0 && selected.length === values.length

  const toggleValue = (value: string) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${label} 필터 열기`}
        onClick={() => setOpen((current) => !current)}
        className={cn('flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 text-left text-xs font-medium text-[#50566d] shadow-[0_1px_2px_rgba(24,34,70,0.02)] hover:border-[#c9cbe0]', selected.length > 0 && 'border-[#c9c8f1] bg-[#fbfaff]')}
      >
        <span className="truncate">{selected.length ? `${label} · ${selected.length}개` : placeholder}</span>
        <ChevronDown className={cn('size-3.5 shrink-0 text-[#9095a7] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <button aria-label="필터 닫기" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} tabIndex={-1} />
          <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[min(320px,calc(100vw-36px))] rounded-xl border border-border bg-white p-2 shadow-[0_18px_50px_-20px_rgba(25,32,65,0.24)]">
            <div className="flex items-center gap-2 border-b border-[#f0f1f5] px-2 pb-2">
              <Search className="size-3.5 shrink-0 text-[#a0a4b2]" />
              <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`${label} 검색`} className="h-8 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#a3a7b4]" />
              <button aria-label="필터 닫기" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-[#969bad] hover:bg-secondary"><X className="size-3.5" /></button>
            </div>
            <div className="flex items-center justify-between px-2 py-2 text-[10px] font-medium text-[#8b90a2]">
              <span>{selected.length} / {values.length} 선택</span>
              <button onClick={() => onChange(allSelected ? [] : values)} className="text-[#585dcc] hover:underline">{allSelected ? '모두 해제' : '모두 선택'}</button>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredValues.length ? filteredValues.map((value) => {
                const checked = selected.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleValue(value)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-xs text-[#51566b] hover:bg-[#f7f7fb]"
                  >
                    <span className={cn('grid size-4 shrink-0 place-items-center rounded border', checked ? 'border-[#6266dc] bg-[#6266dc] text-white' : 'border-[#d8dae5] bg-white')}>
                      {checked && <Check className="size-3" />}
                    </span>
                    <span className="truncate" title={value}>{value}</span>
                  </button>
                )
              }) : <p className="px-3 py-6 text-center text-xs text-[#a0a4b2]">검색 결과가 없습니다.</p>}
            </div>
            <div className="mt-1 flex justify-end border-t border-[#f0f1f5] pt-2">
              <Button size="sm" onClick={() => setOpen(false)}>완료</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
