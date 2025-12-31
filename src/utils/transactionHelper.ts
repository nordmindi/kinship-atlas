/**
 * Transaction Helper Utilities
 * 
 * Provides utilities for executing database operations in transactions
 * Note: Supabase doesn't support explicit transactions via the client,
 * but we can structure operations to be atomic where possible
 */

import { supabase } from '@/integrations/supabase/client';

export interface TransactionOperation {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data?: Record<string, unknown>;
  id?: string;
}

/**
 * Execute multiple operations in a transaction-like manner
 * 
 * Note: Supabase client doesn't support explicit transactions,
 * but we can use database functions that run in transactions
 * or structure operations to minimize partial failures
 */
export async function executeTransaction(
  operations: TransactionOperation[]
): Promise<{ success: boolean; error?: string; results?: unknown[] }> {
  try {
    // For now, execute operations sequentially
    // In the future, we can create a database function that runs all in a transaction
    const results: unknown[] = [];

    for (const op of operations) {
      if (op.operation === 'insert') {
        const { data, error } = await supabase
          .from(op.table)
          .insert(op.data || {})
          .select()
          .single();

        if (error) {
          // Rollback would happen here in a real transaction
          return {
            success: false,
            error: `Failed to insert into ${op.table}: ${error.message}`,
          };
        }

        results.push(data);
      } else if (op.operation === 'update') {
        if (!op.id) {
          return {
            success: false,
            error: `Update operation requires an id for ${op.table}`,
          };
        }

        const { data, error } = await supabase
          .from(op.table)
          .update(op.data || {})
          .eq('id', op.id)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: `Failed to update ${op.table}: ${error.message}`,
          };
        }

        results.push(data);
      } else if (op.operation === 'delete') {
        if (!op.id) {
          return {
            success: false,
            error: `Delete operation requires an id for ${op.table}`,
          };
        }

        const { error } = await supabase
          .from(op.table)
          .delete()
          .eq('id', op.id);

        if (error) {
          return {
            success: false,
            error: `Failed to delete from ${op.table}: ${error.message}`,
          };
        }

        results.push({ id: op.id, deleted: true });
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error('Transaction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a database function wrapper for true transactions
 * This should be called from a database function that uses BEGIN/COMMIT
 */
export async function callTransactionFunction(
  functionName: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      return {
        success: false,
        error: error.message || 'Transaction failed',
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Transaction function error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

