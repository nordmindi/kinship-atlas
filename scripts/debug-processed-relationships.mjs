import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugProcessedRelationships() {
  console.log('🔍 Debugging processed relationships for Said Ahmed...');

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

    // Get all family members
    const { data: allMembers, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name');

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    // Get all relations
    const { data: relationsData, error: relationsError } = await supabase
      .from('relations')
      .select('id, from_member_id, to_member_id, relation_type');

    if (relationsError) {
      console.error('❌ Error fetching relations:', relationsError);
      return;
    }

    // Simulate the getFamilyMembers processing for Said Ahmed
    const member = saidAhmed;
    console.log(`\n👤 Processing relationships for: ${member.first_name} ${member.last_name}`);

    // Find all relations where this member is involved (both directions)
    const allRelations = relationsData
      .filter(rel => rel.from_member_id === member.id || rel.to_member_id === member.id)
      .map(rel => {
        // If this member is the "from" person, reverse the relation type to get the perspective
        if (rel.from_member_id === member.id) {
          let perspectiveType;
          switch (rel.relation_type) {
            case 'parent':
              perspectiveType = 'child'; // If I'm the parent, they are my child
              break;
            case 'child':
              perspectiveType = 'parent'; // If I'm the child, they are my parent
              break;
            case 'spouse':
              perspectiveType = 'spouse'; // spouse is bidirectional
              break;
            case 'sibling':
              perspectiveType = 'sibling'; // sibling is bidirectional
              break;
            default:
              perspectiveType = 'parent';
          }
          return {
            id: rel.id,
            type: perspectiveType,
            personId: rel.to_member_id,
            direction: 'from'
          };
        } else {
          // If this member is the "to" person, reverse the relation type
          let reversedType;
          switch (rel.relation_type) {
            case 'parent':
              reversedType = 'child';
              break;
            case 'child':
              reversedType = 'parent';
              break;
            case 'spouse':
              reversedType = 'spouse'; // spouse is bidirectional
              break;
            case 'sibling':
              reversedType = 'sibling'; // sibling is bidirectional
              break;
            default:
              reversedType = 'parent';
          }
          return {
            id: rel.id,
            type: reversedType,
            personId: rel.from_member_id,
            direction: 'to'
          };
        }
      });

    console.log('\n📋 All relations before deduplication:');
    allRelations.forEach(rel => {
      const personName = allMembers.find(m => m.id === rel.personId);
      console.log(`  ${rel.direction === 'from' ? 'FROM' : 'TO'} ${member.first_name} → ${personName?.first_name} ${personName?.last_name} (${rel.type})`);
    });

    // Deduplicate relationships by personId
    const memberRelations = allRelations.reduce((acc, rel) => {
      // Check if we already have a relationship with this person
      const existingRel = acc.find(existing => existing.personId === rel.personId);
      if (!existingRel) {
        acc.push(rel);
        console.log(`  ✅ Added: ${rel.type} relationship to ${allMembers.find(m => m.id === rel.personId)?.first_name}`);
      } else {
        // For bidirectional relationships (spouse, sibling), keep the first one
        // For directional relationships (parent, child), prefer the one where this member is the "from" person
        if (rel.type === 'spouse' || rel.type === 'sibling') {
          // Keep the first one (already in acc)
          console.log(`  ⏭️  Skipped (bidirectional): ${rel.type} relationship to ${allMembers.find(m => m.id === rel.personId)?.first_name}`);
          return acc;
        } else {
          // For parent/child, prefer the relationship where this member is the source
          const thisMemberIsSource = relationsData.find(r => 
            r.id === rel.id && r.from_member_id === member.id
          );
          if (thisMemberIsSource) {
            // Replace the existing relationship with this one
            const index = acc.findIndex(existing => existing.personId === rel.personId);
            const oldRel = acc[index];
            acc[index] = rel;
            console.log(`  🔄 Replaced: ${oldRel.type} → ${rel.type} relationship to ${allMembers.find(m => m.id === rel.personId)?.first_name}`);
          } else {
            console.log(`  ⏭️  Skipped (not source): ${rel.type} relationship to ${allMembers.find(m => m.id === rel.personId)?.first_name}`);
          }
        }
      }
      return acc;
    }, []);

    console.log('\n🎯 Final processed relationships:');
    memberRelations.forEach(rel => {
      const personName = allMembers.find(m => m.id === rel.personId);
      console.log(`  ${member.first_name} → ${personName?.first_name} ${personName?.last_name} (${rel.type})`);
    });

    // Check if both children have the same relationship type
    const childRelations = memberRelations.filter(rel => rel.type === 'child');
    console.log(`\n👶 Child relationships found: ${childRelations.length}`);
    
    if (childRelations.length === 2) {
      console.log('✅ Both children have the same relationship type (child)');
    } else {
      console.log('❌ Children have different relationship types!');
      childRelations.forEach(rel => {
        const personName = allMembers.find(m => m.id === rel.personId);
        console.log(`  - ${personName?.first_name}: ${rel.type}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugProcessedRelationships();
