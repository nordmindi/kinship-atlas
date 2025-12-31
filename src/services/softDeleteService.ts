/**
 * Soft Delete Service
 * 
 * Provides functions for soft deleting and restoring records
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Soft delete a record (marks as deleted instead of removing)
 */
export async function softDeleteRecord(
  tableName: string,
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('soft_delete_record', {
      p_table_name: tableName,
      p_record_id: recordId,
    });

    if (error) {
      console.error('Error soft deleting record:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete record',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error soft deleting record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Restore a soft-deleted record
 */
export async function restoreDeletedRecord(
  tableName: string,
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('restore_deleted_record', {
      p_table_name: tableName,
      p_record_id: recordId,
    });

    if (error) {
      console.error('Error restoring record:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore record',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error restoring record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Permanently delete a record (admin only)
 */
export async function permanentDeleteRecord(
  tableName: string,
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('permanent_delete_record', {
      p_table_name: tableName,
      p_record_id: recordId,
    });

    if (error) {
      console.error('Error permanently deleting record:', error);
      return {
        success: false,
        error: error.message || 'Failed to permanently delete record',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get deleted records for a table
 */
export async function getDeletedRecords(
  tableName: string,
  limit: number = 50
): Promise<unknown[]> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching deleted records:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching deleted records:', error);
    return [];
  }
}

