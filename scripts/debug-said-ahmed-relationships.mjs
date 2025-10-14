import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSaidAhmedRelationships() {
  console.log('🔍 Debugging Said Ahmed relationships...');

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

    console.log('👤 Said Ahmed:', saidAhmed);

    // Get all relationships involving Said Ahmed
    const { data: relations, error: relError } = await supabase
      .from('relations')
      .select('*')
      .or(`from_member_id.eq.${saidAhmed.id},to_member_id.eq.${saidAhmed.id}`);

    if (relError) {
      console.error('❌ Error fetching relations:', relError);
      return;
    }

    console.log('🔗 All relationships involving Said Ahmed:');
    relations.forEach(rel => {
      console.log(`  ${rel.from_member_id === saidAhmed.id ? 'Said Ahmed' : 'Other'} → ${rel.to_member_id === saidAhmed.id ? 'Said Ahmed' : 'Other'} (${rel.relation_type})`);
    });

    // Get family member names for better readability
    const { data: allMembers, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name');

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    const memberMap = new Map();
    allMembers.forEach(member => {
      memberMap.set(member.id, `${member.first_name} ${member.last_name}`);
    });

    console.log('\n📋 Detailed relationship analysis:');
    relations.forEach(rel => {
      const fromName = memberMap.get(rel.from_member_id) || rel.from_member_id;
      const toName = memberMap.get(rel.to_member_id) || rel.to_member_id;
      
      console.log(`  ${fromName} → ${toName} (${rel.relation_type})`);
      
      // Analyze from Said Ahmed's perspective
      if (rel.from_member_id === saidAhmed.id) {
        console.log(`    From Said Ahmed's perspective: ${rel.relation_type} relationship to ${toName}`);
      } else if (rel.to_member_id === saidAhmed.id) {
        // Reverse the relationship type
        let reversedType;
        switch (rel.relation_type) {
          case 'parent': reversedType = 'child'; break;
          case 'child': reversedType = 'parent'; break;
          case 'spouse': reversedType = 'spouse'; break;
          case 'sibling': reversedType = 'sibling'; break;
          default: reversedType = 'parent';
        }
        console.log(`    From Said Ahmed's perspective: ${reversedType} relationship from ${fromName}`);
      }
    });

    // Check for potential duplicates
    console.log('\n🔍 Checking for duplicate relationships...');
    const relationshipPairs = new Map();
    
    relations.forEach(rel => {
      const pair = [rel.from_member_id, rel.to_member_id].sort();
      const pairKey = `${pair[0]}-${pair[1]}`;
      
      if (!relationshipPairs.has(pairKey)) {
        relationshipPairs.set(pairKey, []);
      }
      relationshipPairs.get(pairKey).push(rel);
    });

    relationshipPairs.forEach((rels, pairKey) => {
      if (rels.length > 2) {
        console.log(`⚠️  Multiple relationships for pair ${pairKey}:`, rels.length);
        rels.forEach(rel => {
          const fromName = memberMap.get(rel.from_member_id) || rel.from_member_id;
          const toName = memberMap.get(rel.to_member_id) || rel.to_member_id;
          console.log(`    ${fromName} → ${toName} (${rel.relation_type})`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugSaidAhmedRelationships();
