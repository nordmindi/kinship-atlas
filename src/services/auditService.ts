/**
 * Audit Service
 * 
 * Provides functions for accessing audit logs and restoring data
 */

import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE';
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: string;
}

export interface AuditHistory {
  entries: AuditLogEntry[];
  total: number;
}

/**
 * Get audit history for a specific record
 */
export async function getAuditHistory(
  tableName: string,
  recordId: string
): Promise<AuditHistory> {
  try {
    const { data, error } = await supabase.rpc('get_audit_history', {
      p_table_name: tableName,
      p_record_id: recordId,
    });

    if (error) {
      console.error('Error fetching audit history:', error);
      return { entries: [], total: 0 };
    }

    return {
      entries: (data || []) as AuditLogEntry[],
      total: data?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return { entries: [], total: 0 };
  }
}

/**
 * Restore a record from audit log
 */
export async function restoreFromAudit(
  auditLogId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('restore_from_audit', {
      p_audit_log_id: auditLogId,
    });

    if (error) {
      console.error('Error restoring from audit:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore record',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error restoring from audit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recent audit logs for the current user
 */
export async function getRecentAuditLogs(
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return (data || []) as AuditLogEntry[];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

