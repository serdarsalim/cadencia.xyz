// Sync queue manager for reliable, batched data persistence

type SyncTask<T> = {
  id: string
  key: string
  data: T
  timestamp: number
  retries: number
  maxRetries: number
}

type SyncQueueConfig = {
  debounceMs: number
  maxRetries: number
  retryDelayMs: number
}

class SyncQueue {
  private queue: Map<string, SyncTask<any>> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private config: SyncQueueConfig = {
    debounceMs: 500,
    maxRetries: 3,
    retryDelayMs: 1000
  }
  private saveInProgress: Set<string> = new Set()
  private listeners: Map<string, Set<(status: 'saving' | 'saved' | 'error', error?: Error) => void>> = new Map()

  constructor(config?: Partial<SyncQueueConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Queue data for saving with debouncing
   */
  enqueue<T>(key: string, data: T, saveFn: (data: T) => Promise<any>): void {
    // Clear existing timer
    const existingTimer = this.timers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Add/update task in queue
    const task: SyncTask<T> = {
      id: `${key}-${Date.now()}`,
      key,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.config.maxRetries
    }
    this.queue.set(key, task)

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.flush(key, saveFn)
    }, this.config.debounceMs)

    this.timers.set(key, timer)
  }

  /**
   * Immediately flush a specific key or all keys
   */
  async flush<T>(key?: string, saveFn?: (data: T) => Promise<any>): Promise<void> {
    if (key) {
      await this.processSingle(key, saveFn!)
    } else {
      // Flush all
      const promises = Array.from(this.queue.keys()).map(k => {
        const task = this.queue.get(k)!
        return this.processSingle(k, async (data) => {
          // For flush all, we need the save function from somewhere
          // This is mainly for single-key flush
          throw new Error('Save function required for flush all')
        })
      })
      await Promise.allSettled(promises)
    }
  }

  /**
   * Process a single queued task
   */
  private async processSingle<T>(key: string, saveFn: (data: T) => Promise<any>): Promise<void> {
    const task = this.queue.get(key) as SyncTask<T> | undefined
    if (!task || this.saveInProgress.has(key)) {
      return
    }

    this.saveInProgress.add(key)
    this.notifyListeners(key, 'saving')

    try {
      await saveFn(task.data)
      this.queue.delete(key)
      this.timers.delete(key)
      this.notifyListeners(key, 'saved')
    } catch (error) {
      console.error(`Failed to save ${key}:`, error)

      // Retry logic
      if (task.retries < task.maxRetries) {
        task.retries++
        const delay = this.config.retryDelayMs * Math.pow(2, task.retries - 1) // Exponential backoff

        setTimeout(() => {
          this.processSingle(key, saveFn)
        }, delay)
      } else {
        // Max retries exceeded
        this.queue.delete(key)
        this.timers.delete(key)
        this.notifyListeners(key, 'error', error as Error)
      }
    } finally {
      this.saveInProgress.delete(key)
    }
  }

  /**
   * Check if a key has pending saves
   */
  isPending(key: string): boolean {
    return this.queue.has(key) || this.saveInProgress.has(key)
  }

  /**
   * Get all pending keys
   */
  getPendingKeys(): string[] {
    return Array.from(this.queue.keys())
  }

  /**
   * Listen to save status changes
   */
  onStatusChange(key: string, listener: (status: 'saving' | 'saved' | 'error', error?: Error) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(listener)
    }
  }

  /**
   * Notify all listeners for a key
   */
  private notifyListeners(key: string, status: 'saving' | 'saved' | 'error', error?: Error): void {
    const listeners = this.listeners.get(key)
    if (listeners) {
      listeners.forEach(listener => listener(status, error))
    }
  }

  /**
   * Clear all pending saves
   */
  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    this.queue.clear()
    this.saveInProgress.clear()
  }
}

// Global singleton instance
export const syncQueue = new SyncQueue()
