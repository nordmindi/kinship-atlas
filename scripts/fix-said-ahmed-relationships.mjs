import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSaidAhmedRelationships() {
  console.log('🔧 Fixing Said Ahmed relationships...');

  try {
    // Get Said Ahmed's ID
    const { data: saidAhmed, error: saidError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name')
      .eq('first_name', 'Said Ahmed')
      .single();

    if (saidError) {
      console.error('❌ Error finding Said Ahmed:', saidError);
      return;
    }

    // Get Ali Ahmed's ID
    const { data: aliAhmed, error: aliError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name')
      .eq('first_name', 'Ali')
      .eq('last_name', 'Ahmed')
      .single();

    if (aliError) {
      console.error('❌ Error finding Ali Ahmed:', aliError);
      return;
    }

    // Get Shafie Said Nurani's ID
    const { data: shafie, error: shafieError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name')
      .eq('first_name', 'Shafie')
      .single();

    if (shafieError) {
      console.error('❌ Error finding Shafie Said Nurani:', shafieError);
      return;
    }

    console.log('👤 Family members found:');
    console.log(`  Said Ahmed: ${saidAhmed.id}`);
    console.log(`  Ali Ahmed: ${aliAhmed.id}`);
    console.log(`  Shafie Said Nurani: ${shafie.id}`);

    // Get all current relationships involving Said Ahmed
    const { data: currentRelations, error: relError } = await supabase
      .from('relations')
      .select('*')
      .or(`from_member_id.eq.${saidAhmed.id},to_member_id.eq.${saidAhmed.id}`);

    if (relError) {
      console.error('❌ Error fetching current relations:', relError);
      return;
    }

    console.log(`\n🗑️ Deleting ${currentRelations.length} incorrect relationships...`);
    
    // Delete all current relationships involving Said Ahmed
    const { error: deleteError } = await supabase
      .from('relations')
      .delete()
      .or(`from_member_id.eq.${saidAhmed.id},to_member_id.eq.${saidAhmed.id}`);

    if (deleteError) {
      console.error('❌ Error deleting relationships:', deleteError);
      return;
    }

    console.log('✅ Deleted incorrect relationships');

    // Create correct relationships
    console.log('\n➕ Creating correct relationships...');
    
    const correctRelationships = [
      // Said Ahmed is parent of Ali Ahmed
      { from_member_id: saidAhmed.id, to_member_id: aliAhmed.id, relation_type: 'parent' },
      { from_member_id: aliAhmed.id, to_member_id: saidAhmed.id, relation_type: 'child' },
      
      // Said Ahmed is parent of Shafie Said Nurani
      { from_member_id: saidAhmed.id, to_member_id: shafie.id, relation_type: 'parent' },
      { from_member_id: shafie.id, to_member_id: saidAhmed.id, relation_type: 'child' }
    ];

    const { error: insertError } = await supabase
      .from('relations')
      .insert(correctRelationships);

    if (insertError) {
      console.error('❌ Error inserting correct relationships:', insertError);
      return;
    }

    console.log('✅ Created correct relationships:');
    console.log(`  Said Ahmed → Ali Ahmed (parent)`);
    console.log(`  Ali Ahmed → Said Ahmed (child)`);
    console.log(`  Said Ahmed → Shafie Said Nurani (parent)`);
    console.log(`  Shafie Said Nurani → Said Ahmed (child)`);

    console.log('\n🎉 Relationships fixed successfully!');

  } catch (error) {
    console.error('❌ Error during relationship fixing:', error);
  }
}

fixSaidAhmedRelationships();
