import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRelationships() {
  console.log('🔧 Fixing parent-child relationships...');

  try {
    // Get all family members with their birth dates
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name, birth_date');

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    console.log('📊 Family members:', members);

    // Delete all existing parent-child relationships
    const { error: deleteError } = await supabase
      .from('relations')
      .delete()
      .in('relation_type', ['parent', 'child']);

    if (deleteError) {
      console.error('❌ Error deleting relationships:', deleteError);
      return;
    }

    console.log('🗑️ Deleted all parent-child relationships');

    // Based on birth dates, determine correct relationships:
    // Ali Ahmed: 1983 (parent)
    // Sadia Farah: 1986 (parent) 
    // Aisha Ahmed: 2010 (child)
    // Adam Ahmed: 2015 (child)

    const aliAhmed = members.find(m => m.first_name === 'Ali' && m.last_name === 'Ahmed');
    const sadiaFarah = members.find(m => m.first_name === 'Sadia' && m.last_name === 'Farah');
    const aishaAhmed = members.find(m => m.first_name === 'Aisha' && m.last_name === 'Ahmed');
    const adamAhmed = members.find(m => m.first_name === 'Adam' && m.last_name === 'Ahmed');

    if (!aliAhmed || !sadiaFarah || !aishaAhmed || !adamAhmed) {
      console.error('❌ Could not find all family members');
      return;
    }

    // Create correct relationships
    const relationships = [
      // Ali is parent of Aisha
      { from_member_id: aliAhmed.id, to_member_id: aishaAhmed.id, relation_type: 'parent' },
      { from_member_id: aishaAhmed.id, to_member_id: aliAhmed.id, relation_type: 'child' },
      
      // Ali is parent of Adam
      { from_member_id: aliAhmed.id, to_member_id: adamAhmed.id, relation_type: 'parent' },
      { from_member_id: adamAhmed.id, to_member_id: aliAhmed.id, relation_type: 'child' },
      
      // Sadia is parent of Aisha
      { from_member_id: sadiaFarah.id, to_member_id: aishaAhmed.id, relation_type: 'parent' },
      { from_member_id: aishaAhmed.id, to_member_id: sadiaFarah.id, relation_type: 'child' },
      
      // Sadia is parent of Adam
      { from_member_id: sadiaFarah.id, to_member_id: adamAhmed.id, relation_type: 'parent' },
      { from_member_id: adamAhmed.id, to_member_id: sadiaFarah.id, relation_type: 'child' }
    ];

    // Insert correct relationships
    const { error: insertError } = await supabase
      .from('relations')
      .insert(relationships);

    if (insertError) {
      console.error('❌ Error inserting relationships:', insertError);
      return;
    }

    console.log('✅ Successfully fixed all parent-child relationships!');
    console.log('📋 Created relationships:');
    relationships.forEach(rel => {
      const fromMember = members.find(m => m.id === rel.from_member_id);
      const toMember = members.find(m => m.id === rel.to_member_id);
      console.log(`   ${fromMember.first_name} ${fromMember.last_name} → ${toMember.first_name} ${toMember.last_name} (${rel.relation_type})`);
    });

  } catch (error) {
    console.error('❌ Error during relationship fix:', error);
  }
}

fixRelationships();
