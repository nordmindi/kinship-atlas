import { Node } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';

export interface LayoutState {
  nodePositions: Record<string, { x: number; y: number }>;
  lastUpdated: string;
  userId?: string;
}

class LayoutService {
  private readonly STORAGE_KEY = 'kinship-atlas-family-tree-layout';

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Save the current layout state to database (with localStorage fallback)
   */
  async saveLayout(nodes: Node[], userId?: string): Promise<void> {
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

      // Try to save to database first
      const currentUserId = userId || await this.getCurrentUserId();
      if (currentUserId) {
        try {
          const { error: dbError } = await supabase
            .from('user_tree_layouts' as any)
            .upsert({
              user_id: currentUserId,
              node_positions: nodePositions,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });

          if (!dbError) {
            console.log('✅ Layout saved to database');
            // Also save to localStorage as backup
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layoutState));
            return;
          } else {
            console.warn('⚠️ Failed to save to database, falling back to localStorage:', dbError);
          }
        } catch (dbError) {
          console.warn('⚠️ Database save failed, falling back to localStorage:', dbError);
        }
      }

      // Fallback to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layoutState));
      console.log('Layout state saved to localStorage:', layoutState);
    } catch (error) {
      console.error('Failed to save layout state:', error);
    }
  }

  /**
   * Load the saved layout state from database (with localStorage fallback)
   */
  async loadLayout(): Promise<LayoutState | null> {
    try {
      // Try to load from database first
      const currentUserId = await this.getCurrentUserId();
      if (currentUserId) {
        try {
          const { data, error: dbError } = await supabase
            .from('user_tree_layouts' as any)
            .select('node_positions, updated_at')
            .eq('user_id', currentUserId)
            .single();

          if (!dbError && data) {
            const layoutData = data as unknown as { node_positions: Record<string, { x: number; y: number }>; updated_at: string | null };
            const layoutState: LayoutState = {
              nodePositions: layoutData.node_positions,
              lastUpdated: layoutData.updated_at || new Date().toISOString(),
              userId: currentUserId
            };
            console.log('✅ Layout loaded from database');
            // Also sync to localStorage as backup
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layoutState));
            return layoutState;
          } else if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.warn('⚠️ Database load failed, falling back to localStorage:', dbError);
          }
        } catch (dbError) {
          console.warn('⚠️ Database load failed, falling back to localStorage:', dbError);
        }
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;

      const layoutState: LayoutState = JSON.parse(saved);
      
      // Check if the layout is not too old (e.g., within 30 days)
      const lastUpdated = new Date(layoutState.lastUpdated);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (lastUpdated < thirtyDaysAgo) {
        console.log('Layout state is too old, clearing...');
        await this.clearLayout();
        return null;
      }

      console.log('Layout state loaded from localStorage:', layoutState);
      return layoutState;
    } catch (error) {
      console.error('Failed to load layout state:', error);
      return null;
    }
  }

  /**
   * Apply saved positions to nodes
   */
  async applyLayoutToNodes(nodes: Node[]): Promise<Node[]> {
    const savedLayout = await this.loadLayout();
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
   * Clear the saved layout state (from both database and localStorage)
   */
  async clearLayout(): Promise<void> {
    try {
      // Try to clear from database first
      const currentUserId = await this.getCurrentUserId();
      if (currentUserId) {
        try {
          const { error: dbError } = await supabase
            .from('user_tree_layouts' as any)
            .delete()
            .eq('user_id', currentUserId);

          if (!dbError) {
            console.log('✅ Layout cleared from database');
          } else {
            console.warn('⚠️ Failed to clear from database:', dbError);
          }
        } catch (dbError) {
          console.warn('⚠️ Database clear failed:', dbError);
        }
      }

      // Also clear from localStorage
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('Layout state cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear layout state:', error);
    }
  }

  /**
   * Check if there's a saved layout
   */
  async hasSavedLayout(): Promise<boolean> {
    try {
      // Check database first
      const currentUserId = await this.getCurrentUserId();
      if (currentUserId) {
        try {
          const { data, error } = await supabase
            .from('user_tree_layouts' as any)
            .select('id')
            .eq('user_id', currentUserId)
            .single();

          if (!error && data) {
            return true;
          }
        } catch (error) {
          // Fall through to localStorage check
        }
      }

      // Fallback to localStorage
      return localStorage.getItem(this.STORAGE_KEY) !== null;
    } catch (error) {
      return localStorage.getItem(this.STORAGE_KEY) !== null;
    }
  }

  /**
   * Get layout metadata
   */
  async getLayoutInfo(): Promise<{ lastUpdated: string; nodeCount: number } | null> {
    const savedLayout = await this.loadLayout();
    if (!savedLayout) return null;

    return {
      lastUpdated: savedLayout.lastUpdated,
      nodeCount: Object.keys(savedLayout.nodePositions).length
    };
  }

  /**
   * Clear all layout data (useful for testing)
   */
  async clearAllLayoutData(): Promise<void> {
    try {
      // Clear layout state (from both database and localStorage)
      await this.clearLayout();
      
      // Clear any other related localStorage data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kinship-atlas-')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('All layout data cleared');
    } catch (error) {
      console.error('Failed to clear layout data:', error);
    }
  }
}

export const layoutService = new LayoutService();
