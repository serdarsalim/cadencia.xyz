# Data Persistence Migration Guide

## Overview

The new data persistence system provides:

- **Debounced saves**: Batches changes and saves 500ms after last edit
- **Retry logic**: Automatic retries with exponential backoff on network errors
- **Type safety**: Zod validation on all data before save
- **Better error handling**: Specific error messages and status tracking
- **Transaction safety**: Improved transaction handling with timeouts
- **Save status**: Track if data is saving, saved, or errored

## Migration Steps

### 1. Replace API imports in `app/page.tsx`

**OLD:**
```typescript
import {
  loadAllData,
  saveGoals,
  saveSchedule,
  // ...
} from "@/lib/api";
```

**NEW:**
```typescript
import {
  loadAllData,
  saveGoals,
  saveSchedule,
  // ...
} from "@/lib/api-improved";
```

### 2. Replace `useState` with `useSyncedState` for database-backed state

**OLD:**
```typescript
const [goals, setGoals] = useState<Goal[]>([])

useEffect(() => {
  if (!isHydrated) return
  if (userEmail) {
    saveGoals(goals)
  }
}, [goals, isHydrated, userEmail])
```

**NEW:**
```typescript
import { useSyncedState } from '@/lib/use-synced-state'

const [goals, setGoals, { status: goalsStatus, error: goalsError }] = useSyncedState([], {
  key: 'goals',
  saveFn: saveGoals,
  localStorageKey: 'timespent-goals',
  enabled: !!userEmail
})
```

### 3. Add Toast Provider to root layout

In `app/layout.tsx`:

```typescript
import { ToastProvider } from '@/lib/toast'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
```

### 4. Show save status to user

```typescript
import { useToast } from '@/lib/toast'

const { addToast } = useToast()

// Watch for save errors
useEffect(() => {
  if (goalsStatus === 'error' && goalsError) {
    addToast(`Failed to save goals: ${goalsError.message}`, 'error')
  }
}, [goalsStatus, goalsError])
```

## Benefits

### Before (State of the Fart 💩)
- ❌ Saves on EVERY keystroke → race conditions
- ❌ DELETE ALL + CREATE ALL → data loss if CREATE fails
- ❌ No retry on network errors
- ❌ Silent failures
- ❌ No type validation
- ❌ Multiple tabs can overwrite each other

### After (State of the Art ✨)
- ✅ Debounced saves (500ms after last change)
- ✅ Creates goals one-by-one with proper relationships
- ✅ Automatic retry with exponential backoff (up to 3 times)
- ✅ User notifications on save errors
- ✅ Zod validation before save
- ✅ Transaction timeouts to prevent hanging
- ✅ Save status tracking (saving/saved/error)

## Full Example

```typescript
import { useSyncedState } from '@/lib/use-synced-state'
import { saveGoals } from '@/lib/api-improved'
import { useToast } from '@/lib/toast'

function MyComponent() {
  const { addToast } = useToast()
  const userEmail = '...' // from auth

  const [goals, setGoals, { status, error, isPending, flush }] = useSyncedState([], {
    key: 'goals',
    saveFn: saveGoals,
    localStorageKey: 'timespent-goals',
    enabled: !!userEmail,
    debounceMs: 500 // optional, default is 500
  })

  // Show error toast
  useEffect(() => {
    if (status === 'error' && error) {
      addToast(`Failed to save: ${error.message}`, 'error')
    }
  }, [status, error])

  // Show unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isPending) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes'
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isPending])

  return (
    <div>
      <button onClick={() => setGoals([...goals, newGoal])}>
        Add Goal
      </button>

      {status === 'saving' && <span>Saving...</span>}
      {status === 'saved' && <span>✓ Saved</span>}
      {status === 'error' && <span>✗ Error</span>}

      <button onClick={flush}>Save Now</button>
    </div>
  )
}
```

## Rollback Plan

If issues occur, you can easily rollback:

1. Change imports back to `@/lib/api`
2. Replace `useSyncedState` with `useState` + `useEffect`
3. Remove ToastProvider

The old files are kept as `.old.ts` for reference.
