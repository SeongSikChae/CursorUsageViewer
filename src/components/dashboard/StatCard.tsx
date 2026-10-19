import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Equal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  detail: string
  icon: ReactNode
  tone: 'violet' | 'teal' | 'amber' | 'rose'
  trend?: 'up' | 'down' | 'steady'
}

const toneStyles = {
  violet: 'bg-[#f0efff] text-[#5c5fd0]',
  teal: 'bg-[#e8f7f3] text-[#249b80]',
  amber: 'bg-[#fff5e4] text-[#ca8a24]',
  rose: 'bg-[#fff0f3] text-[#cf637a]',
}

export function StatCard({ label, value, detail, icon, tone, trend }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-[#ebecf3] bg-white px-4 py-3.5 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-[#858ba0]">{label}</span>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', toneStyles[tone])}>{icon}</span>
      </div>
      <p className="stat-value mt-2 text-[23px] leading-none font-semibold text-[#2f354a] sm:text-[26px]">{value}</p>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-[#979bad]">
        {trend === 'up' ? <ArrowUpRight className="size-3 text-[#27a786]" /> : trend === 'down' ? <ArrowDownRight className="size-3 text-[#d27988]" /> : <Equal className="size-3" />}
        {detail}
      </p>
    </div>
  )
}
