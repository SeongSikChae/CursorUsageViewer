import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="badge" className={cn('inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap', className)} {...props} />
}
