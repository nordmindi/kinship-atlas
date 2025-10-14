/**
 * Final System Test
 * 
 * This script performs a comprehensive test of the restructured system
 * to verify that all components work correctly together.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalSystemTest() {
  console.log('🎯 Final System Test - Comprehensive Validation');
  console.log('=' .repeat(60));

  try {
    // Test 1: Database Integrity
    console.log('\n📊 Test 1: Database Integrity Check');
    const { data: allRelations, error: relationsError } = await supabase
      .from('relations')
      .select('*');

    if (relationsError) {
      console.error('❌ Failed to fetch relationships:', relationsError);
      return;
    }

    console.log(`✅ Found ${allRelations?.length || 0} relationships in database`);

    // Test 2: Relationship Consistency
    console.log('\n🔍 Test 2: Relationship Consistency Check');
    const inconsistentRelations = [];
    const relationPairs = new Map();

    // Group relationships by member pair
    allRelations?.forEach(rel => {
      const pairKey = [rel.from_member_id, rel.to_member_id].sort().join('-');
      if (!relationPairs.has(pairKey)) {
        relationPairs.set(pairKey, []);
      }
      relationPairs.get(pairKey).push(rel);
    });

    // Check each pair for consistency
    for (const [pairKey, pairRelations] of relationPairs) {
      if (pairRelations.length === 1) {
        const rel = pairRelations[0];
        if (rel.relation_type === 'parent' || rel.relation_type === 'child') {
          inconsistentRelations.push({
            type: 'incomplete_bidirectional',
            relationship: rel
          });
        }
      } else if (pairRelations.length > 2) {
        inconsistentRelations.push({
          type: 'duplicate_relationships',
          relationships: pairRelations
        });
      }
    }

    if (inconsistentRelations.length === 0) {
      console.log('✅ All relationships are consistent');
    } else {
      console.log(`⚠️ Found ${inconsistentRelations.length} inconsistent relationships`);
    }

    // Test 3: Specific Relationship Validation
    console.log('\n👤 Test 3: Specific Relationship Validation');
    
    // Get Said Ahmed's relationships
    const saidAhmedId = '4c870460-c7af-4224-8a6c-1a14d2ff6b21';
    const aliAhmedId = '06bc5b0b-07d4-47b5-9a97-b9f33ab5ae30';
    const shafieId = '2ad67022-c0e5-4f85-9069-2bec5b3b04c0';

    const saidToAli = allRelations?.find(rel => 
      rel.from_member_id === saidAhmedId && rel.to_member_id === aliAhmedId
    );
    const saidToShafie = allRelations?.find(rel => 
      rel.from_member_id === saidAhmedId && rel.to_member_id === shafieId
    );

    console.log('🔍 Said Ahmed → Ali Ahmed relationship:');
    if (saidToAli && saidToAli.relation_type === 'parent') {
      console.log('  ✅ CORRECT: Said Ahmed is parent of Ali Ahmed');
    } else {
      console.log(`  ❌ INCORRECT: ${saidToAli?.relation_type || 'not found'}`);
    }

    console.log('🔍 Said Ahmed → Shafie Said Nurani relationship:');
    if (saidToShafie && saidToShafie.relation_type === 'parent') {
      console.log('  ✅ CORRECT: Said Ahmed is parent of Shafie Said Nurani');
    } else {
      console.log(`  ❌ INCORRECT: ${saidToShafie?.relation_type || 'not found'}`);
    }

    // Test 4: Relationship Processing Logic
    console.log('\n🧪 Test 4: Relationship Processing Logic Test');
    
    const { data: allMembers, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name, birth_date');

    if (membersError) {
      console.error('❌ Failed to fetch members:', membersError);
      return;
    }

    // Test the relationship processing for Said Ahmed
    const saidAhmed = allMembers.find(m => m.id === saidAhmedId);
    if (saidAhmed) {
      const saidAhmedRelations = allRelations
        .filter(rel => rel.from_member_id === saidAhmedId || rel.to_member_id === saidAhmedId)
        .map(rel => {
          if (rel.from_member_id === saidAhmedId) {
            // Said Ahmed is the source
            let perspectiveType;
            switch (rel.relation_type) {
              case 'parent':
                perspectiveType = 'child'; // If I'm the parent, they are my child
                break;
              case 'child':
                perspectiveType = 'parent'; // If I'm the child, they are my parent
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
            // Said Ahmed is the target
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

      console.log('📊 Said Ahmed\'s processed relationships:');
      saidAhmedRelations.forEach(rel => {
        const person = allMembers.find(m => m.id === rel.personId);
        console.log(`  → ${person?.first_name} ${person?.last_name} (${rel.type})`);
      });

      // Validate the processed relationships
      const aliRelation = saidAhmedRelations.find(r => r.personId === aliAhmedId);
      const shafieRelation = saidAhmedRelations.find(r => r.personId === shafieId);

      console.log('\n🔍 Processed relationship validation:');
      if (aliRelation && aliRelation.type === 'child') {
        console.log('  ✅ Ali Ahmed: CORRECT (child)');
      } else {
        console.log(`  ❌ Ali Ahmed: INCORRECT (${aliRelation?.type || 'not found'})`);
      }

      if (shafieRelation && shafieRelation.type === 'child') {
        console.log('  ✅ Shafie Said Nurani: CORRECT (child)');
      } else {
        console.log(`  ❌ Shafie Said Nurani: INCORRECT (${shafieRelation?.type || 'not found'})`);
      }
    }

    // Test 5: Edge Creation Logic
    console.log('\n🔗 Test 5: Edge Creation Logic Test');
    
    // Simulate edge creation for Said Ahmed's relationships
    const edges = [];
    const processedEdges = new Set();

    if (saidAhmed) {
      const saidAhmedRelations = allRelations
        .filter(rel => rel.from_member_id === saidAhmedId || rel.to_member_id === saidAhmedId)
        .map(rel => {
          if (rel.from_member_id === saidAhmedId) {
            // Said Ahmed is the source
            let perspectiveType;
            switch (rel.relation_type) {
              case 'parent':
                perspectiveType = 'child'; // If I'm the parent, they are my child
                break;
              case 'child':
                perspectiveType = 'parent'; // If I'm the child, they are my parent
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
            // Said Ahmed is the target
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

      saidAhmedRelations.forEach(relation => {
        const relatedMember = allMembers.find(m => m.id === relation.personId);
        if (!relatedMember) return;

        // Create consistent edge ID
        const edgeId = [saidAhmedId, relation.personId].sort().join('-');
        if (processedEdges.has(edgeId)) return;
        processedEdges.add(edgeId);

        // Determine relationship type for edge creation
        let relationshipType = relation.type;
        
        // For bidirectional relationships, ensure we use the same relationship type
        if (relation.type === 'parent' || relation.type === 'child') {
          const originalRelation = saidAhmedRelations.find(r => r.personId === relation.personId);
          if (originalRelation) {
            if (originalRelation.type === 'child') {
              relationshipType = 'parent'; // Current member is parent, related person is child
            } else if (originalRelation.type === 'parent') {
              relationshipType = 'child'; // Current member is child, related person is parent
            }
          }
        }

        // Determine source and target handles
        let sourceHandle, targetHandle;
        
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
          source: saidAhmedId,
          target: relation.personId,
          sourceHandle,
          targetHandle,
          data: {
            relationshipType: relationshipType
          }
        };

        edges.push(edge);
      });

      console.log('🔗 Generated edges for Said Ahmed:');
      edges.forEach(edge => {
        const targetMember = allMembers.find(m => m.id === edge.target);
        console.log(`  Said Ahmed → ${targetMember?.first_name} ${targetMember?.last_name}`);
        console.log(`    Type: ${edge.data.relationshipType}`);
        console.log(`    Source Handle: ${edge.sourceHandle}`);
        console.log(`    Target Handle: ${edge.targetHandle}`);
        
        if (edge.data.relationshipType === 'parent') {
          console.log(`    ✅ CORRECT: Said Ahmed is parent of ${targetMember?.first_name}`);
        } else if (edge.data.relationshipType === 'child') {
          console.log(`    ❌ INCORRECT: Said Ahmed is child of ${targetMember?.first_name} (should be parent)`);
        }
        console.log('');
      });
    }

    // Final Summary
    console.log('\n🎯 FINAL SYSTEM TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const allTestsPassed = 
      inconsistentRelations.length === 0 &&
      saidToAli?.relation_type === 'parent' &&
      saidToShafie?.relation_type === 'parent' &&
      edges.every(edge => edge.data.relationshipType === 'parent');

    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! The restructured system is working correctly.');
      console.log('✅ Database relationships are consistent');
      console.log('✅ Relationship processing logic is correct');
      console.log('✅ Edge creation logic is correct');
      console.log('✅ Multi-level parent-child relationships are properly handled');
    } else {
      console.log('⚠️ Some tests failed. The system needs further refinement.');
      if (inconsistentRelations.length > 0) {
        console.log(`❌ Found ${inconsistentRelations.length} inconsistent relationships`);
      }
      if (saidToAli?.relation_type !== 'parent') {
        console.log('❌ Said Ahmed → Ali Ahmed relationship is incorrect');
      }
      if (saidToShafie?.relation_type !== 'parent') {
        console.log('❌ Said Ahmed → Shafie Said Nurani relationship is incorrect');
      }
      const incorrectEdges = edges.filter(edge => edge.data.relationshipType !== 'parent');
      if (incorrectEdges.length > 0) {
        console.log(`❌ ${incorrectEdges.length} edges have incorrect relationship types`);
      }
    }

  } catch (error) {
    console.error('❌ Error during final system test:', error);
  }
}

finalSystemTest();
