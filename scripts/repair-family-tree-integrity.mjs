/**
 * Family Tree Integrity Repair Script
 * 
 * This script repairs all relationship inconsistencies in the database
 * and ensures proper bidirectional relationships.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function repairFamilyTreeIntegrity() {
  console.log('🔧 Starting family tree integrity repair...');

  try {
    // Step 1: Validate current integrity
    console.log('\n📊 Step 1: Validating current family tree integrity...');
    const { data: validationResults, error: validationError } = await supabase
      .rpc('validate_family_tree_integrity');

    if (validationError) {
      console.error('❌ Error validating family tree:', validationError);
      return;
    }

    if (validationResults && validationResults.length > 0) {
      console.log(`⚠️ Found ${validationResults.length} integrity issues:`);
      validationResults.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.issue_type}: ${issue.issue_description}`);
        console.log(`     Member IDs: ${issue.member_id_1} ↔ ${issue.member_id_2}`);
        console.log(`     Relationship ID: ${issue.relationship_id}`);
      });
    } else {
      console.log('✅ No integrity issues found');
    }

    // Step 2: Repair integrity issues
    console.log('\n🔧 Step 2: Repairing integrity issues...');
    const { data: repairResults, error: repairError } = await supabase
      .rpc('repair_family_tree_integrity');

    if (repairError) {
      console.error('❌ Error repairing family tree:', repairError);
      return;
    }

    if (repairResults && repairResults.length > 0) {
      console.log('🔧 Repair operations completed:');
      repairResults.forEach((repair, index) => {
        console.log(`  ${index + 1}. ${repair.repair_type}: ${repair.repair_description}`);
        console.log(`     Created: ${repair.relationships_created} relationships`);
        console.log(`     Deleted: ${repair.relationships_deleted} relationships`);
      });
    } else {
      console.log('✅ No repairs were needed');
    }

    // Step 3: Validate integrity after repair
    console.log('\n📊 Step 3: Validating integrity after repair...');
    const { data: postRepairValidation, error: postRepairError } = await supabase
      .rpc('validate_family_tree_integrity');

    if (postRepairError) {
      console.error('❌ Error validating after repair:', postRepairError);
      return;
    }

    if (postRepairValidation && postRepairValidation.length > 0) {
      console.log(`⚠️ Still found ${postRepairValidation.length} integrity issues after repair:`);
      postRepairValidation.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.issue_type}: ${issue.issue_description}`);
      });
    } else {
      console.log('✅ All integrity issues have been resolved!');
    }

    // Step 4: Display current relationship structure
    console.log('\n📋 Step 4: Current relationship structure:');
    const { data: allRelations, error: relationsError } = await supabase
      .from('relations')
      .select(`
        id,
        from_member_id,
        to_member_id,
        relation_type,
        family_members!relations_from_member_id_fkey(first_name, last_name),
        family_members!relations_to_member_id_fkey(first_name, last_name)
      `)
      .order('relation_type, from_member_id');

    if (relationsError) {
      console.error('❌ Error fetching relationships:', relationsError);
      return;
    }

    if (allRelations && allRelations.length > 0) {
      console.log(`📊 Total relationships: ${allRelations.length}`);
      
      // Group by relationship type
      const byType = allRelations.reduce((acc, rel) => {
        if (!acc[rel.relation_type]) acc[rel.relation_type] = [];
        acc[rel.relation_type].push(rel);
        return acc;
      }, {});

      Object.entries(byType).forEach(([type, relations]) => {
        console.log(`\n${type.toUpperCase()} relationships (${relations.length}):`);
        relations.forEach(rel => {
          const fromName = rel.family_members?.first_name + ' ' + rel.family_members?.last_name;
          const toName = rel.family_members?.first_name + ' ' + rel.family_members?.last_name;
          console.log(`  ${fromName} → ${toName}`);
        });
      });
    } else {
      console.log('📊 No relationships found');
    }

    console.log('\n🎉 Family tree integrity repair completed successfully!');

  } catch (error) {
    console.error('❌ Error during repair process:', error);
  }
}

// Run the repair
repairFamilyTreeIntegrity();
