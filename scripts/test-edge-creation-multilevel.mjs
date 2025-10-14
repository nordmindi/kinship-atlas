import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEdgeCreationMultilevel() {
  console.log('🧪 Testing edge creation for multi-level scenarios...');

  try {
    // Get all family members
    const { data: allMembers, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name, birth_date');

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
      const allRelations = relationsData
        .filter(rel => rel.from_member_id === member.id || rel.to_member_id === member.id)
        .map(rel => {
          if (rel.from_member_id === member.id) {
            let perspectiveType;
            switch (rel.relation_type) {
              case 'parent':
                perspectiveType = 'child';
                break;
              case 'child':
                perspectiveType = 'parent';
                break;
              case 'spouse':
                perspectiveType = 'spouse';
                break;
              case 'sibling':
                perspectiveType = 'sibling';
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
        birthDate: member.birth_date,
        relations: memberRelations
      };
    });

    // Simulate edge creation logic
    const buildTreeEdges = (members) => {
      const edges = [];
      const processedEdges = new Set();

      members.forEach(member => {
        member.relations.forEach(relation => {
          const relatedMember = members.find(m => m.id === relation.personId);
          if (!relatedMember) return;

          // Create consistent edge ID
          const edgeId = [member.id, relation.personId].sort().join('-');
          if (processedEdges.has(edgeId)) return;
          processedEdges.add(edgeId);

          // Determine relationship type for edge creation
          let relationshipType = relation.type;
          
          // For bidirectional relationships, ensure we use the same relationship type
          if (relation.type === 'parent' || relation.type === 'child') {
            const originalRelation = member.relations.find(r => r.personId === relation.personId);
            if (originalRelation) {
              if (originalRelation.type === 'child') {
                relationshipType = 'parent'; // Current member is parent, related person is child
              } else if (originalRelation.type === 'parent') {
                relationshipType = 'child'; // Current member is child, related person is parent
              }
            }
          }

          // Determine source and target handles
          let sourceHandle;
          let targetHandle;
          
          switch (relationshipType) {
            case 'parent':
              sourceHandle = 'child-source';
              targetHandle = 'parent-target';
              break;
            case 'child':
              sourceHandle = 'child-source';
              targetHandle = 'parent-target';
              break;
            case 'spouse':
              sourceHandle = 'spouse';
              targetHandle = 'spouse-target';
              break;
            case 'sibling':
              sourceHandle = 'sibling';
              targetHandle = 'sibling-target';
              break;
            default:
              sourceHandle = 'child-source';
              targetHandle = 'parent-target';
          }

          const edge = {
            id: edgeId,
            source: member.id,
            target: relation.personId,
            sourceHandle,
            targetHandle,
            data: {
              relationshipType: relationshipType
            }
          };

          edges.push(edge);
        });
      });

      return edges;
    };

    const edges = buildTreeEdges(transformedMembers);

    console.log('🔗 Generated edges:');
    edges.forEach(edge => {
      const sourceMember = transformedMembers.find(m => m.id === edge.source);
      const targetMember = transformedMembers.find(m => m.id === edge.target);
      console.log(`  ${sourceMember?.firstName} ${sourceMember?.lastName} → ${targetMember?.firstName} ${targetMember?.lastName}`);
      console.log(`    Type: ${edge.data.relationshipType}`);
      console.log(`    Source Handle: ${edge.sourceHandle}`);
      console.log(`    Target Handle: ${edge.targetHandle}`);
      console.log('');
    });

    // Check for Said Ahmed's edges specifically
    console.log('🔍 Said Ahmed\'s edges:');
    const saidAhmedEdges = edges.filter(edge => 
      edge.source === '4c870460-c7af-4224-8a6c-1a14d2ff6b21' || 
      edge.target === '4c870460-c7af-4224-8a6c-1a14d2ff6b21'
    );

    saidAhmedEdges.forEach(edge => {
      const sourceMember = transformedMembers.find(m => m.id === edge.source);
      const targetMember = transformedMembers.find(m => m.id === edge.target);
      const isSource = edge.source === '4c870460-c7af-4224-8a6c-1a14d2ff6b21';
      const otherMember = isSource ? targetMember : sourceMember;
      
      console.log(`  Said Ahmed → ${otherMember?.firstName} ${otherMember?.lastName}`);
      console.log(`    Relationship Type: ${edge.data.relationshipType}`);
      console.log(`    Source Handle: ${edge.sourceHandle}`);
      console.log(`    Target Handle: ${edge.targetHandle}`);
      
      if (edge.data.relationshipType === 'parent') {
        console.log(`    ✅ CORRECT: Said Ahmed is parent of ${otherMember?.firstName}`);
      } else if (edge.data.relationshipType === 'child') {
        console.log(`    ❌ INCORRECT: Said Ahmed is child of ${otherMember?.firstName} (should be parent)`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testEdgeCreationMultilevel();
