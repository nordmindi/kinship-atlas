import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugEdgeCreation() {
  console.log('🔍 Debugging edge creation for Said Ahmed relationships...');

  try {
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

    // Simulate the getFamilyMembers processing
    const transformedMembers = allMembers.map(member => {
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
                reversedType = 'spouse';
                break;
              case 'sibling':
                reversedType = 'sibling';
                break;
              default:
                reversedType = 'parent';
            }
            return {
              id: rel.id,
              type: reversedType,
              personId: rel.from_member_id,
            };
          }
        });

      // Deduplicate relationships by personId
      const memberRelations = allRelations.reduce((acc, rel) => {
        const existingRel = acc.find(existing => existing.personId === rel.personId);
        if (!existingRel) {
          acc.push(rel);
        } else {
          if (rel.type === 'spouse' || rel.type === 'sibling') {
            return acc;
          } else {
            const thisMemberIsSource = relationsData.find(r => 
              r.id === rel.id && r.from_member_id === member.id
            );
            if (thisMemberIsSource) {
              const index = acc.findIndex(existing => existing.personId === rel.personId);
              acc[index] = rel;
            }
          }
        }
        return acc;
      }, []);

      return {
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        relations: memberRelations
      };
    });

    // Find Said Ahmed
    const saidAhmed = transformedMembers.find(m => m.firstName === 'Said Ahmed');
    if (!saidAhmed) {
      console.error('❌ Said Ahmed not found');
      return;
    }

    console.log(`\n👤 Said Ahmed's processed relationships:`);
    saidAhmed.relations.forEach(rel => {
      const person = transformedMembers.find(m => m.id === rel.personId);
      console.log(`  → ${person?.firstName} ${person?.lastName} (${rel.type})`);
    });

    // Simulate edge creation
    console.log(`\n🔗 Simulating edge creation:`);
    const processed = new Set();
    const edges = [];

    transformedMembers.forEach(member => {
      member.relations.forEach(relation => {
        // Create a consistent edge ID regardless of direction
        const edgeId = member.id < relation.personId 
          ? `${member.id}-${relation.personId}` 
          : `${relation.personId}-${member.id}`;
        
        // Only process relationships where both members are in our node list
        if (processed.has(edgeId)) {
          console.log(`  ⏭️  Skipped duplicate edge: ${edgeId}`);
          return;
        }
        processed.add(edgeId);
        
        const sourceMember = transformedMembers.find(m => m.id === member.id);
        const targetMember = transformedMembers.find(m => m.id === relation.personId);
        
        if (sourceMember && targetMember) {
          const edge = {
            id: `e-${edgeId}`,
            source: member.id,
            target: relation.personId,
            sourceHandle: relation.type === 'child' ? 'child' : 'parent',
            targetHandle: relation.type === 'child' ? 'parent' : 'child',
            relationshipType: relation.type
          };
          
          edges.push(edge);
          console.log(`  ✅ Created edge: ${sourceMember.firstName} → ${targetMember.firstName} (${relation.type})`);
          console.log(`     Edge ID: ${edgeId}`);
          console.log(`     Source Handle: ${edge.sourceHandle}, Target Handle: ${edge.targetHandle}`);
        }
      });
    });

    // Check edges involving Said Ahmed
    console.log(`\n🎯 Edges involving Said Ahmed:`);
    const saidAhmedEdges = edges.filter(edge => 
      edge.source === saidAhmed.id || edge.target === saidAhmed.id
    );

    saidAhmedEdges.forEach(edge => {
      const sourceMember = transformedMembers.find(m => m.id === edge.source);
      const targetMember = transformedMembers.find(m => m.id === edge.target);
      console.log(`  ${sourceMember?.firstName} → ${targetMember?.firstName} (${edge.relationshipType})`);
      console.log(`    Source Handle: ${edge.sourceHandle}, Target Handle: ${edge.targetHandle}`);
    });

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugEdgeCreation();
