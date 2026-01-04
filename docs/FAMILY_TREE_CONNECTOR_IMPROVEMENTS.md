# Family Tree Connector Improvements

## 🎯 Overview

The family tree visualization has been enhanced with intelligent connector merging for spouse pairs with common children. This creates a cleaner, more traditional family tree appearance where parent lines merge before branching to children.

## ✨ Features Implemented

### Merged Connectors for Spouse Pairs

When two spouses have common children, the connector lines now follow the classic family tree pattern:

1. **Two vertical lines** descend from each parent
2. **Horizontal merge line** connects the two parent lines (centered between parents)
3. **Single vertical line** descends from the merge point
4. **Horizontal branch line** spans all children
5. **Individual vertical drops** from the branch line to each child
6. **Horizontal connections** to each child's connection point

This creates a clean, organized appearance instead of multiple overlapping lines.

### Technical Implementation

#### Edge Detection (`treeDataBuilder.ts`)

- **Spouse Pair Detection**: Identifies when two parents are spouses
- **Common Children Detection**: Finds all children shared by a spouse pair
- **Merge Info**: Adds metadata to edges indicating they should merge
- **All Children Tracking**: Tracks all children of a spouse pair for branch line calculation

#### Path Rendering (`FamilyRelationshipEdge.tsx`)

- **Shared Coordinates**: All edges use identical coordinates for shared segments
- **Merge Point Calculation**: Centers merge point horizontally between parents
- **Branch Line Calculation**: Calculates branch line based on all children's positions
- **Snapping**: Parallel lines snap together when they're close (within threshold)

### Visual Pattern

```
Parent1    Parent2
   |          |
   |          |
   └────┬─────┘  (horizontal merge line)
        |
        |  (vertical line from merge)
        |
    ────┼────  (horizontal branch line)
        |
    ┌───┼───┐
    |   |   |  (vertical drops to children)
   C1  C2  C3
```

## 🔧 Technical Details

### Merge Detection Logic

1. **Build Child-to-Parents Map**: Maps each child to their parents
2. **Identify Spouse Pairs**: Checks if parents are spouses
3. **Group Children**: Groups all children by spouse pair
4. **Add Merge Info**: Adds merge metadata to parent-child edges

### Path Calculation

For each parent-child edge with merge info:

1. Calculate merge point (centered between parents, ~25% down from parents)
2. Calculate branch line (horizontal line above children, centered on all children)
3. Create path: parent → merge Y → merge X → branch Y → branch X → drop Y → child X → child Y

### Shared Coordinates

All edges use the same coordinates for:
- **Merge point** (`mergeX`, `mergeY`): Where parent lines meet
- **Vertical segment** (`sharedVerticalX`): From merge to branch
- **Branch line** (`sharedBranchY`): Horizontal line spanning children
- **Drop segments** (`sharedDropY`): Vertical drops from branch

This ensures parallel lines snap together and appear as single lines.

## 📊 Benefits

### User Experience
- ✅ Cleaner, more organized family tree appearance
- ✅ Easier to follow relationships
- ✅ Traditional family tree aesthetic
- ✅ Reduced visual clutter

### Technical
- ✅ Automatic detection of spouse pairs
- ✅ Shared coordinate system for line snapping
- ✅ Efficient path calculation
- ✅ Backward compatible (non-merged edges still work)

## 🧪 Testing

Comprehensive tests have been added in `src/components/family/tree/utils/__tests__/treeDataBuilder.test.ts`:

- ✅ Merge detection for spouse pairs with common children
- ✅ No merge info when parents are not spouses
- ✅ No merge info when child has only one parent
- ✅ All children included in merge info
- ✅ Edge creation with correct relationship types

## 📝 Code Structure

### Key Files

- `src/components/family/tree/utils/treeDataBuilder.ts`: Edge building and merge detection
- `src/components/family/tree/FamilyRelationshipEdge.tsx`: Path rendering with merge support
- `src/components/family/tree/types.ts`: Type definitions with mergeInfo

### Type Definitions

```typescript
interface FamilyRelationshipEdge extends Edge {
  data?: {
    relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';
    mergeInfo?: {
      hasMerge: boolean;
      otherParentId?: string;
      childId: string;
      allChildrenIds?: string[];
    };
  };
}
```

## 🚀 Usage

The merged connectors work automatically - no configuration needed. When you:

1. Create two spouses
2. Add children to both spouses
3. View the family tree

The connectors will automatically merge and branch as described above.

## 🔮 Future Enhancements

Potential future improvements:

- [ ] Configurable merge point positioning
- [ ] Animation when connectors merge
- [ ] Support for multiple spouse relationships
- [ ] Customizable branch line styling
- [ ] Collapsible branch sections

## 📚 Related Documentation

- [Family System Redesign](./FAMILY_SYSTEM_REDESIGN.md)
- [Family Tree Implementation](./FAMILY_MAP_IMPLEMENTATION.md)
- [Testing Guide](./TESTING_GUIDE.md)

