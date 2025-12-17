import { useState, useEffect, useRef, useCallback } from 'react'
import { syncQueue } from './sync-queue'

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

type UseSyncedStateOptions<T> = {
  key: string
  saveFn: (data: T) => Promise<any>
  localStorageKey?: string
  debounceMs?: number
  enabled?: boolean
}

type UseSyncedStateReturn<T> = [
  T,
  (value: T | ((prev: T) => T)) => void,
  {
    status: SyncStatus
    error: Error | null
    isPending: boolean
    flush: () => Promise<void>
  }
]

/**
 * React hook for synced state with debouncing, retry logic, and status tracking
 *
 * @example
 * const [goals, setGoals, { status, flush }] = useSyncedState({
 *   key: 'goals',
 *   saveFn: saveGoals,
 *   localStorageKey: 'timespent-goals',
 *   enabled: !!userEmail
 * })
 */
export function useSyncedState<T>(
  initialValue: T,
  options: UseSyncedStateOptions<T>
): UseSyncedStateReturn<T> {
  const { key, saveFn, localStorageKey, debounceMs = 500, enabled = true } = options

  const [state, setState] = useState<T>(initialValue)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const isInitialMount = useRef(true)

  // Save to localStorage immediately (backup)
  useEffect(() => {
    if (!localStorageKey || !enabled) return

    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(state))
    } catch (err) {
      console.error(`Failed to save to localStorage: ${localStorageKey}`, err)
    }
  }, [state, localStorageKey, enabled])

  // Queue save to database with debouncing
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (!enabled) return

    syncQueue.enqueue(key, state, saveFn)
  }, [state, key, saveFn, enabled])

  // Listen to sync status changes
  useEffect(() => {
    if (!enabled) return

    const unsubscribe = syncQueue.onStatusChange(key, (newStatus, err) => {
      setStatus(newStatus)
      if (newStatus === 'error') {
        setError(err || new Error('Save failed'))
      } else if (newStatus === 'saved') {
        setError(null)
      }
    })

    return unsubscribe
  }, [key, enabled])

  // Manually flush (save immediately)
  const flush = useCallback(async () => {
    if (!enabled) return
    await syncQueue.flush(key, saveFn)
  }, [key, saveFn, enabled])

  // Check if save is pending
  const isPending = syncQueue.isPending(key)

  return [state, setState, { status, error, isPending, flush }]
}
