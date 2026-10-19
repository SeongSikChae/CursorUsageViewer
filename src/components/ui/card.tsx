import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section data-slot="card" className={cn('rounded-2xl border border-border bg-card text-card-foreground shadow-[0_12px_40px_-34px_rgba(35,43,79,0.36)]', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn('px-5 pb-5 sm:px-6 sm:pb-6', className)} {...props} />
}
