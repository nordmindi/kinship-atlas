import { Node } from '@xyflow/react';

export interface LayoutState {
  nodePositions: Record<string, { x: number; y: number }>;
  lastUpdated: string;
  userId?: string;
}

class LayoutService {
  private readonly STORAGE_KEY = 'kinship-atlas-family-tree-layout';

  /**
   * Save the current layout state to localStorage
   */
  saveLayout(nodes: Node[], userId?: string): void {
    try {
      const nodePositions: Record<string, { x: number; y: number }> = {};
      
      nodes.forEach(node => {
        nodePositions[node.id] = {
          x: node.position.x,
          y: node.position.y
        };
      });

      const layoutState: LayoutState = {
        nodePositions,
        lastUpdated: new Date().toISOString(),
        userId
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layoutState));
      console.log('Layout state saved:', layoutState);
    } catch (error) {
      console.error('Failed to save layout state:', error);
    }
  }

  /**
   * Load the saved layout state from localStorage
   */
  loadLayout(): LayoutState | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;

      const layoutState: LayoutState = JSON.parse(saved);
      
      // Check if the layout is not too old (e.g., within 30 days)
      const lastUpdated = new Date(layoutState.lastUpdated);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (lastUpdated < thirtyDaysAgo) {
        console.log('Layout state is too old, clearing...');
        this.clearLayout();
        return null;
      }

      console.log('Layout state loaded:', layoutState);
      return layoutState;
    } catch (error) {
      console.error('Failed to load layout state:', error);
      return null;
    }
  }

  /**
   * Apply saved positions to nodes
   */
  applyLayoutToNodes(nodes: Node[]): Node[] {
    const savedLayout = this.loadLayout();
    if (!savedLayout) return nodes;

    return nodes.map(node => {
      const savedPosition = savedLayout.nodePositions[node.id];
      if (savedPosition) {
        return {
          ...node,
          position: savedPosition
        };
      }
      return node;
    });
  }

  /**
   * Clear the saved layout state
   */
  clearLayout(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('Layout state cleared');
    } catch (error) {
      console.error('Failed to clear layout state:', error);
    }
  }

  /**
   * Check if there's a saved layout
   */
  hasSavedLayout(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  /**
   * Get layout metadata
   */
  getLayoutInfo(): { lastUpdated: string; nodeCount: number } | null {
    const savedLayout = this.loadLayout();
    if (!savedLayout) return null;

    return {
      lastUpdated: savedLayout.lastUpdated,
      nodeCount: Object.keys(savedLayout.nodePositions).length
    };
  }

  /**
   * Clear all layout data (useful for testing)
   */
  clearAllLayoutData(): void {
    try {
      // Clear layout state
      this.clearLayout();
      
      // Clear any other related localStorage data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kinship-atlas-')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('All layout data cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear layout data:', error);
    }
  }
}

export const layoutService = new LayoutService();
