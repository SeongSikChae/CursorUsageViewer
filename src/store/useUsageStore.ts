import { useCallback, useSyncExternalStore } from 'react'
import type { UsageState } from '@/features/usage/types'
import type { UsageAction } from './index'
import { store } from './index'

export function useUsageSelector<T>(selector: (state: UsageState) => T): T {
  const getSnapshot = useCallback(() => selector(store.getState() as UsageState), [selector])
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export function useUsageDispatch(): (action: UsageAction) => UsageAction {
  return store.dispatch as (action: UsageAction) => UsageAction
}
