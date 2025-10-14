/**
 * Test Family Tree Rendering
 * 
 * This script tests the family tree edge creation logic to ensure
 * the visual connections match the database relationships.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFamilyTreeRendering() {
  console.log('🧪 Testing Family Tree Rendering Logic');
  console.log('=' .repeat(50));

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

    // Simulate the getFamilyMembers processing (same as supabaseService.ts)
    const transformedMembers = allMembers.map(member => {
      const allRelations = relationsData
        .filter(rel => rel.from_member_id === member.id || rel.to_member_id === member.id)
        .map(rel => {
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
            };
          }
        });

      // Deduplicate relationships
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

    // Test Said Ahmed's relationships specifically
    const saidAhmedId = '4c870460-c7af-4224-8a6c-1a14d2ff6b21';
    const aliAhmedId = '06bc5b0b-07d4-47b5-9a97-b9f33ab5ae30';
    const shafieId = '2ad67022-c0e5-4f85-9069-2bec5b3b04c0';

    const saidAhmed = transformedMembers.find(m => m.id === saidAhmedId);
    if (!saidAhmed) {
      console.error('❌ Said Ahmed not found');
      return;
    }

    console.log('👤 Said Ahmed\'s processed relationships:');
    saidAhmed.relations.forEach(rel => {
      const person = transformedMembers.find(m => m.id === rel.personId);
      console.log(`  → ${person?.firstName} ${person?.lastName} (${rel.type})`);
    });

    // Simulate the buildTreeEdges logic
    console.log('\n🔗 Simulating buildTreeEdges logic:');
    
    const memberMap = new Map();
    transformedMembers.forEach(member => memberMap.set(member.id, member));

    const processed = new Set();
    const edges = [];

    memberMap.forEach((member, memberId) => {
      member.relations.forEach(relation => {
        // Create a consistent edge ID regardless of direction
        const edgeId = memberId < relation.personId 
          ? `${memberId}-${relation.personId}` 
          : `${relation.personId}-${memberId}`;
        
        // Only process relationships where both members are in our node list
        if (processed.has(edgeId)) return;
        processed.add(edgeId);
        
        // Use the relationship type as-is since it's already been processed correctly
        const relationshipType = relation.type;
        
        // Determine source and target handles based on relationship type
        let sourceHandle, targetHandle;
        
        switch (relationshipType) {
          case 'parent':
            // Parent relationship: current member is parent of related person
            sourceHandle = 'child-source'; // Parent is source, uses child-source handle (bottom of parent card)
            targetHandle = 'parent-target'; // Child is target, uses parent-target handle (top of child card)
            break;
          case 'child':
            // Child relationship: current member is child of related person
            sourceHandle = 'child-source'; // Child is source, uses child-source handle (bottom of child card)
            targetHandle = 'parent-target'; // Parent is target, uses parent-target handle (top of parent card)
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
          id: `e-${edgeId}`,
          source: memberId,
          target: relation.personId,
          sourceHandle,
          targetHandle,
          relationshipType
        };

        edges.push(edge);
      });
    });

    // Filter edges for Said Ahmed
    const saidAhmedEdges = edges.filter(edge => 
      edge.source === saidAhmedId || edge.target === saidAhmedId
    );

    console.log('\n🔗 Generated edges for Said Ahmed:');
    saidAhmedEdges.forEach(edge => {
      const sourceMember = transformedMembers.find(m => m.id === edge.source);
      const targetMember = transformedMembers.find(m => m.id === edge.target);
      const isSource = edge.source === saidAhmedId;
      const otherMember = isSource ? targetMember : sourceMember;
      
      console.log(`  Said Ahmed → ${otherMember?.firstName} ${otherMember?.lastName}`);
      console.log(`    Relationship Type: ${edge.relationshipType}`);
      console.log(`    Source Handle: ${edge.sourceHandle}`);
      console.log(`    Target Handle: ${edge.targetHandle}`);
      
      if (edge.relationshipType === 'parent') {
        console.log(`    ✅ CORRECT: Said Ahmed is parent of ${otherMember?.firstName}`);
      } else if (edge.relationshipType === 'child') {
        console.log(`    ❌ INCORRECT: Said Ahmed is child of ${otherMember?.firstName} (should be parent)`);
      }
      console.log('');
    });

    // Check the specific relationships mentioned by the user
    console.log('🎯 User-reported issues validation:');
    
    const aliEdge = saidAhmedEdges.find(edge => 
      (edge.source === saidAhmedId && edge.target === aliAhmedId) ||
      (edge.source === aliAhmedId && edge.target === saidAhmedId)
    );
    
    const shafieEdge = saidAhmedEdges.find(edge => 
      (edge.source === saidAhmedId && edge.target === shafieId) ||
      (edge.source === shafieId && edge.target === saidAhmedId)
    );

    console.log('🔍 Ali Ahmed relationship:');
    if (aliEdge) {
      if (aliEdge.relationshipType === 'parent' && aliEdge.source === saidAhmedId) {
        console.log('  ✅ CORRECT: Said Ahmed is parent of Ali Ahmed');
      } else {
        console.log(`  ❌ INCORRECT: ${aliEdge.relationshipType} relationship, source: ${aliEdge.source === saidAhmedId ? 'Said Ahmed' : 'Ali Ahmed'}`);
      }
    } else {
      console.log('  ❌ No edge found between Said Ahmed and Ali Ahmed');
    }

    console.log('🔍 Shafie Said Nurani relationship:');
    if (shafieEdge) {
      if (shafieEdge.relationshipType === 'parent' && shafieEdge.source === saidAhmedId) {
        console.log('  ✅ CORRECT: Said Ahmed is parent of Shafie Said Nurani');
      } else {
        console.log(`  ❌ INCORRECT: ${shafieEdge.relationshipType} relationship, source: ${shafieEdge.source === saidAhmedId ? 'Said Ahmed' : 'Shafie Said Nurani'}`);
      }
    } else {
      console.log('  ❌ No edge found between Said Ahmed and Shafie Said Nurani');
    }

    console.log('\n🎉 Family tree rendering test completed!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testFamilyTreeRendering();
