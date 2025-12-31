# Global State Management Analysis

## Current Implementation

### ✅ What's Working

1. **React Context API** - Properly implemented for:
   - **AuthContext**: Authentication state (user, session, profile, isAdmin)
     - ✅ Proper error handling
     - ✅ Session persistence
     - ✅ Auth state listeners
     - ✅ Cleanup on unmount
   
   - **FamilyTreeContext**: Selected member state
     - ✅ SessionStorage persistence
     - ✅ User-specific storage keys
     - ✅ Memoized values to prevent re-renders
     - ✅ Proper cleanup
   
   - **TreeViewContext**: Tree visualization state
     - ✅ Local component state management

2. **Custom Hooks** - Manual state management:
   - `useStories` - Stories state with manual loading/error handling
   - `usePermissions` - Permission caching with Map-based cache
   - `useTimeline` - Timeline data fetching
   - `useStorageUrl` - Storage URL management

### ❌ Critical Issues

1. **TanStack Query Not Being Used**
   - ✅ Installed and configured (`QueryClientProvider` in App.tsx)
   - ❌ **NOT USED ANYWHERE** - No `useQuery` or `useMutation` calls found
   - ❌ Manual state management everywhere with `useState` + `useEffect`
   - ❌ No automatic caching, refetching, or request deduplication
   - ❌ Potential for stale data and unnecessary re-renders

2. **Manual State Management Problems**
   - **No request deduplication**: Multiple components fetching same data
   - **No automatic refetching**: Data can become stale
   - **No optimistic updates**: UI doesn't update immediately on mutations
   - **Manual cache invalidation**: Must manually update state after mutations
   - **No background refetching**: Data doesn't refresh when window regains focus
   - **Inconsistent error handling**: Each hook implements error handling differently

3. **State Management Patterns**
   - **useStories**: Manual `useState` + `useEffect` pattern
   - **usePermissions**: Custom Map-based caching (not shared across components)
   - **Pages**: Direct service calls with local state (e.g., `Index.tsx`)

## Recommendations

### High Priority: Implement TanStack Query

**Why**: The app already has TanStack Query installed but isn't using it. This is a significant missed opportunity.

**Benefits**:
- Automatic caching and request deduplication
- Background refetching and stale-while-revalidate
- Optimistic updates
- Automatic error retry
- DevTools for debugging
- Better performance and UX

**Implementation Plan**:

1. **Create Query Keys Factory**:
```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  familyMembers: {
    all: ['familyMembers'] as const,
    lists: () => [...queryKeys.familyMembers.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.familyMembers.lists(), filters] as const,
    details: () => [...queryKeys.familyMembers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.familyMembers.details(), id] as const,
  },
  stories: {
    all: ['stories'] as const,
    lists: () => [...queryKeys.stories.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.stories.lists(), filters] as const,
    details: () => [...queryKeys.stories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.stories.details(), id] as const,
    member: (memberId: string) => [...queryKeys.stories.all, 'member', memberId] as const,
  },
  media: {
    all: ['media'] as const,
    lists: () => [...queryKeys.media.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.media.lists(), filters] as const,
    details: () => [...queryKeys.media.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.media.details(), id] as const,
  },
  userProfile: {
    all: ['userProfile'] as const,
    detail: (userId: string) => [...queryKeys.userProfile.all, userId] as const,
  },
};
```

2. **Configure QueryClient with sensible defaults**:
```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

3. **Migrate Custom Hooks to useQuery/useMutation**:
   - Replace `useStories` with `useQuery` + `useMutation`
   - Replace manual family member fetching with `useQuery`
   - Replace permission checks with `useQuery` (cacheable)

4. **Add React Query DevTools** (development only):
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In App.tsx
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

### Medium Priority: Improve Context Usage

1. **Keep Context for UI State Only**:
   - ✅ AuthContext - Keep (authentication is global UI state)
   - ✅ FamilyTreeContext - Keep (UI selection state)
   - ✅ TreeViewContext - Keep (UI configuration)
   - ❌ Don't use Context for server data (use TanStack Query instead)

2. **Optimize Context Providers**:
   - Already using `useMemo` for values ✅
   - Consider splitting large contexts if they grow

### Low Priority: Permission Caching

The `usePermissions` hook uses a Map-based cache, but it's component-scoped. Consider:
- Moving permission checks to TanStack Query for shared cache
- Or keeping current approach if permissions are rarely checked

## Migration Strategy

### Phase 1: Setup (1-2 hours)
1. Create query keys factory
2. Configure QueryClient with defaults
3. Add React Query DevTools

### Phase 2: Migrate Queries (4-6 hours)
1. Start with `useStories` hook
2. Migrate family member fetching
3. Migrate media fetching
4. Migrate timeline fetching

### Phase 3: Migrate Mutations (3-4 hours)
1. Add mutations for create/update/delete operations
2. Implement optimistic updates where appropriate
3. Add proper cache invalidation

### Phase 4: Cleanup (1-2 hours)
1. Remove old manual state management hooks
2. Update components to use new hooks
3. Test thoroughly

## Current State Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **React Context** | ✅ Good | Properly implemented for UI state |
| **TanStack Query** | ❌ Not Used | Installed but unused - major opportunity |
| **Server State** | ⚠️ Manual | Using useState + useEffect everywhere |
| **Caching** | ⚠️ Partial | Custom caching in some hooks, not shared |
| **Error Handling** | ⚠️ Inconsistent | Each hook handles errors differently |
| **Performance** | ⚠️ Suboptimal | No request deduplication, potential over-fetching |

## Conclusion

The app has **basic global state management** working, but it's **not optimally implemented**. The biggest issue is that TanStack Query is installed but completely unused, leading to:

- Manual state management everywhere
- No automatic caching or request deduplication
- Potential for stale data
- More code to maintain
- Worse user experience

**Recommendation**: Implement TanStack Query for all server state management. This will significantly improve the app's performance, maintainability, and user experience.

