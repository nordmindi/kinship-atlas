# Root Cause Analysis: Family Member Card Buttons Not Working

## Problem Statement
The buttons (Edit, View, Timeline, Add) inside the expanded family member cards in the family tree are not responding to clicks.

## Investigation Methodology
1. Trace the complete data flow from callback definition to button click
2. Identify all points where callbacks could be lost
3. Verify event handling chain
4. Check React Flow's node property preservation behavior

## Data Flow Analysis

### Step 1: Callback Definition
**Location**: `src/pages/FamilyTreeViewPage.tsx` (lines 240-255)
- ✅ Callbacks are defined:
  - `onEditMember`: Navigates to `/edit-family-member/${memberId}`
  - `onViewMemberProfile`: Navigates to `/family-member/${memberId}`
  - `onViewMemberTimeline`: Navigates to `/family-member/${memberId}#timeline`
  - `onAddMemberRelation`: Navigates to `/add-relation/${memberId}/child`

### Step 2: Callback Propagation to FamilyTreeGraph
**Location**: `src/components/family/FamilyTreeGraph.tsx` (lines 89-92)
- ✅ Callbacks are passed to `buildTreeNodes`:
  ```typescript
  const nodes = buildTreeNodes(
    members, 
    generations, 
    memberGenerations, 
    memberPositions, 
    minGeneration, 
    currentUserId,
    onEditMember,        // ✅ Passed
    onViewMemberProfile, // ✅ Passed
    onAddMemberRelation, // ✅ Passed
    onViewMemberTimeline,// ✅ Passed
    draggedNodeId,
    relatedMembers
  );
  ```

### Step 3: Node Creation with Callbacks
**Location**: `src/components/family/tree/utils/treeDataBuilder.ts` (lines 69-72)
- ✅ Callbacks are attached to node objects:
  ```typescript
  const memberNode: FamilyMemberNode = {
    id: memberId,
    type: 'familyMember',
    position: pos,
    data: { /* ... */ },
    onEdit,           // ✅ Set on node
    onViewProfile,    // ✅ Set on node
    onAddRelation,     // ✅ Set on node
    onViewTimeline,   // ✅ Set on node
  };
  ```

### Step 4: Nodes Passed to FamilyTreeRenderer
**Location**: `src/components/family/tree/FamilyTreeRenderer.tsx` (line 95)
- ✅ Nodes prop received with callbacks attached

### Step 5: useNodesState Hook
**Location**: `src/components/family/tree/FamilyTreeRenderer.tsx` (line 133)
```typescript
const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
```

**CRITICAL FINDING #1**: 
- `useNodesState` initializes with nodes that have callbacks
- However, React Flow's internal `onNodesChange` handler uses `applyNodeChanges`
- `applyNodeChanges` may only preserve standard Node properties (id, type, position, data, style, etc.)
- Custom properties like `onEdit`, `onViewProfile`, etc. may be stripped during node updates

### Step 6: Node Updates in useEffect
**Location**: `src/components/family/tree/FamilyTreeRenderer.tsx` (lines 268-315)
```typescript
useEffect(() => {
  const nodesWithLayout = layoutService.applyLayoutToNodes(nodes);
  const nodesWithCollapseData = nodesWithLayout.map(node => {
    const nodeWithCallbacks = node as FamilyMemberNodeType;
    return {
      ...node, // Preserves callbacks from original node
      onEdit: nodeWithCallbacks.onEdit,        // Explicitly set
      onViewProfile: nodeWithCallbacks.onViewProfile,
      onAddRelation: nodeWithCallbacks.onAddRelation,
      onViewTimeline: nodeWithCallbacks.onViewTimeline,
      data: {
        ...node.data,
        onEdit: nodeWithCallbacks.onEdit,       // Also in data
        onViewProfile: nodeWithCallbacks.onViewProfile,
        // ...
      }
    };
  });
  setNodes(visibleNodes);
}, [nodes, /* ... */]);
```

**CRITICAL FINDING #2**:
- Callbacks are preserved in useEffect
- BUT: This useEffect only runs when `nodes` prop changes
- If `onNodesChange` is called (during drag operations), it may update nodes WITHOUT triggering this useEffect
- Result: Callbacks could be lost after any drag operation

### Step 7: Node Updates During Drag Operations
**Location**: `src/components/family/tree/FamilyTreeRenderer.tsx`

**handleSmartDrag** (lines 254-264):
```typescript
setNodes((nds) => 
  nds.map((n) => {
    if (n.id === nodeId) {
      return {
        ...n,  // Should preserve callbacks
        position: newPosition
      };
    }
    return n;
  })
);
```
- ✅ Uses spread operator `...n` which should preserve callbacks

**handleNodeDrag (multi-drag)** (lines 1388-1391):
```typescript
return {
  ...n,  // Should preserve callbacks
  position: updatedPosition
};
```
- ✅ Uses spread operator `...n` which should preserve callbacks

**BUT**: These updates go through `setNodes`, which is from `useNodesState`. The nodes are stored in React Flow's internal state, and when React Flow processes changes via `onNodesChange`, it may strip custom properties.

### Step 8: React Flow Node Rendering
**Location**: `src/components/family/tree/FamilyTreeRenderer.tsx` (lines 69-71)
```typescript
const nodeTypes = {
  familyMember: FamilyMemberNode,
};
```

React Flow passes props to custom node components. According to React Flow documentation:
- Standard props: `id`, `data`, `selected`, `position`, `type`, `style`
- Custom props: Any additional properties on the node object should be passed through
- **HOWEVER**: React Flow may not reliably pass custom properties that aren't part of the standard Node interface

### Step 9: FamilyMemberNode Component
**Location**: `src/components/family/tree/FamilyMemberNode.tsx` (lines 68-74)
```typescript
const FamilyMemberNode = ({ 
  data, selected, isDragging, isBeingDragged, 
  onEdit: propOnEdit, 
  onViewProfile: propOnViewProfile, 
  onAddRelation: propOnAddRelation, 
  onViewTimeline: propOnViewTimeline, 
  onToggleCollapse: propToggleCollapse 
}: FamilyMemberNodeProps) => {
  const onEdit = propOnEdit || (data as any).onEdit;
  const onViewProfile = propOnViewProfile || (data as any).onViewProfile;
  // ...
}
```

**CRITICAL FINDING #3**:
- Component tries to get callbacks from props first, then falls back to data
- If React Flow doesn't pass custom props, it should fall back to data
- But if callbacks are missing from both, buttons won't work

### Step 10: Button Click Handlers
**Location**: `src/components/family/tree/FamilyMemberNode.tsx` (lines 428-436)
```typescript
<Button
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEdit) {
      onEdit(data.id);
    } else {
      console.warn('onEdit callback not available for node:', data.id);
    }
  }}
>
```

**CRITICAL FINDING #4**:
- Buttons call `e.stopPropagation()` and `e.preventDefault()`
- This should prevent the card's onClick from firing
- But if `onEdit` is undefined/null, the callback won't execute
- Console warning should appear if callback is missing

### Step 11: Event Handling Chain
**Location**: `src/components/family/tree/FamilyTreeRenderer.tsx` (lines 1249-1271)
```typescript
const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
  const target = event.target as HTMLElement;
  const isButtonClick = target.closest('button') !== null;
  
  if (isButtonClick) {
    console.log('Button click detected, skipping relationship finder logic');
    return; // Should allow button to handle its own click
  }
  // ...
}, [/* ... */]);
```

**CRITICAL FINDING #5**:
- `handleNodeClick` checks if click is on a button and returns early
- This should allow button's onClick to execute
- BUT: If button's onClick handler has `e.stopPropagation()`, the event won't bubble to `handleNodeClick` anyway
- So this shouldn't be the issue

## Root Cause Hypotheses

### Hypothesis 1: React Flow Strips Custom Properties
**Evidence**:
- `useNodesState` uses React Flow's internal state management
- `onNodesChange` uses `applyNodeChanges` which may only preserve standard properties
- After any drag operation, callbacks may be lost

**Test Required**: Check if callbacks exist after a drag operation

### Hypothesis 2: Callbacks Not Passed Through React Flow Props
**Evidence**:
- React Flow may not pass custom properties as props to custom node components
- We tried to work around this by putting callbacks in `data` as well
- But if both props and data are missing, buttons won't work

**Test Required**: Log what props are actually received by FamilyMemberNode

### Hypothesis 3: Pointer Events Blocked
**Evidence**:
- Web search suggests React Flow's `isInteractive` or pointer-events CSS can block clicks
- But `nodesDraggable={true}` is set, which should allow interactions

**Test Required**: Check computed styles on node wrapper and buttons

### Hypothesis 4: Event Handler Order/Prevention
**Evidence**:
- Card's `handleCardClick` may be preventing button clicks
- But buttons call `e.stopPropagation()` which should prevent card click

**Test Required**: Verify event propagation chain

## Required Diagnostic Tests

1. **Console Logging in FamilyMemberNode**:
   - Log all received props when component renders
   - Log callback values when buttons are clicked
   - Check if console warnings appear

2. **Verify Callbacks After Drag**:
   - Log node properties before and after drag operation
   - Check if callbacks are preserved

3. **Check React Flow Node State**:
   - Inspect `nodesState` to see if callbacks are present
   - Compare initial nodes vs nodesState

4. **Event Listener Test**:
   - Add direct event listeners to buttons to verify they receive clicks
   - Check if React Flow wrapper is blocking events

5. **CSS Inspection**:
   - Check computed `pointer-events` on node wrapper and buttons
   - Verify no CSS is blocking interactions

## Next Steps

1. Add comprehensive logging to identify exact failure point
2. Test each hypothesis systematically
3. Once root cause is confirmed, implement targeted fix
4. Verify fix doesn't break other functionality
