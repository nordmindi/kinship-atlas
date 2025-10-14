import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanMergeNodes() {
  console.log('🧹 Cleaning up merge nodes...');

  try {
    // Find all family members that have emoji in their name
    const { data: allMembers, error: fetchError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name');
    
    if (fetchError) {
      console.error('❌ Error fetching members:', fetchError);
      return;
    }
    
    // Filter for merge nodes (those with emoji or "merge" in ID)
    const members = allMembers?.filter(m => 
      m.first_name?.includes('👥') || 
      m.first_name?.includes('👨‍👩‍👧‍👦') ||
      m.first_name?.includes('👨‍👩‍👦') ||
      m.first_name?.includes('👨‍👩‍👧') ||
      m.first_name?.includes('👨‍👨‍👦') ||
      m.first_name?.includes('👩‍👩‍👧') ||
      m.first_name?.includes('👨‍👨‍👧‍👦') ||
      m.first_name?.includes('👩‍👩‍👧‍👦') ||
      m.id?.toString().includes('merge') ||
      m.first_name === '👥'
    ) || [];

    if (!members || members.length === 0) {
      console.log('✅ No merge nodes found. Database is clean!');
      return;
    }

    console.log(`Found ${members.length} merge node(s) to delete:`);
    members.forEach(member => {
      console.log(`  - ID: ${member.id}, Name: ${member.first_name} ${member.last_name}`);
    });

    // Delete these members
    const idsToDelete = members.map(m => m.id);
    
    // First, delete any relations involving these members
    const { error: relationsError } = await supabase
      .from('relations')
      .delete()
      .or(`from_member_id.in.(${idsToDelete.join(',')}),to_member_id.in.(${idsToDelete.join(',')})`);

    if (relationsError) {
      console.error('❌ Error deleting relations:', relationsError);
      return;
    }

    console.log('✅ Deleted relations involving merge nodes');

    // Then delete the family members
    const { error: deleteError } = await supabase
      .from('family_members')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('❌ Error deleting merge nodes:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${members.length} merge node(s)`);
    console.log('🎉 Database cleanup complete!');

  } catch (error) {
    console.error('❌ Error in cleanup:', error);
  }
}

cleanMergeNodes();

