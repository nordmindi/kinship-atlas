/**
 * Debug Said Ahmed Relationships - Detailed Analysis
 * 
 * This script provides a detailed analysis of Said Ahmed's relationships
 * to understand why the family tree rendering is incorrect.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSaidAhmedRelationships() {
  console.log('🔍 Debug Said Ahmed Relationships - Detailed Analysis');
  console.log('=' .repeat(60));

  try {
    const saidAhmedId = '4c870460-c7af-4224-8a6c-1a14d2ff6b21';
    const aliAhmedId = '06bc5b0b-07d4-47b5-9a97-b9f33ab5ae30';
    const shafieId = '2ad67022-c0e5-4f85-9069-2bec5b3b04c0';

    // Get all relations involving Said Ahmed
    const { data: allRelations, error: relationsError } = await supabase
      .from('relations')
      .select('*')
      .or(`from_member_id.eq.${saidAhmedId},to_member_id.eq.${saidAhmedId}`);

    if (relationsError) {
      console.error('❌ Error fetching relations:', relationsError);
      return;
    }

    console.log('📊 Raw database relationships involving Said Ahmed:');
    allRelations?.forEach(rel => {
      const fromName = rel.from_member_id === saidAhmedId ? 'Said Ahmed' : 
                      rel.from_member_id === aliAhmedId ? 'Ali Ahmed' : 
                      rel.from_member_id === shafieId ? 'Shafie Said Nurani' : rel.from_member_id;
      const toName = rel.to_member_id === saidAhmedId ? 'Said Ahmed' : 
                    rel.to_member_id === aliAhmedId ? 'Ali Ahmed' : 
                    rel.to_member_id === shafieId ? 'Shafie Said Nurani' : rel.to_member_id;
      
      console.log(`  ${fromName} → ${toName} (${rel.relation_type})`);
    });

    // Simulate the relationship processing logic
    console.log('\n🔄 Processing relationships from Said Ahmed\'s perspective:');
    
    const processedRelations = allRelations
      .filter(rel => rel.from_member_id === saidAhmedId || rel.to_member_id === saidAhmedId)
      .map(rel => {
        const fromName = rel.from_member_id === saidAhmedId ? 'Said Ahmed' : 
                        rel.from_member_id === aliAhmedId ? 'Ali Ahmed' : 
                        rel.from_member_id === shafieId ? 'Shafie Said Nurani' : rel.from_member_id;
        const toName = rel.to_member_id === saidAhmedId ? 'Said Ahmed' : 
                      rel.to_member_id === aliAhmedId ? 'Ali Ahmed' : 
                      rel.to_member_id === shafieId ? 'Shafie Said Nurani' : rel.to_member_id;
        
        console.log(`\n  Processing: ${fromName} → ${toName} (${rel.relation_type})`);
        
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
          console.log(`    Said Ahmed is FROM person, relation_type="${rel.relation_type}"`);
          console.log(`    Transformed to perspectiveType="${perspectiveType}"`);
          console.log(`    Result: Said Ahmed sees ${toName} as ${perspectiveType}`);
          
          return {
            id: rel.id,
            type: perspectiveType,
            personId: rel.to_member_id,
            direction: 'from'
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
          console.log(`    Said Ahmed is TO person, relation_type="${rel.relation_type}"`);
          console.log(`    Transformed to reversedType="${reversedType}"`);
          console.log(`    Result: Said Ahmed sees ${fromName} as ${reversedType}`);
          
          return {
            id: rel.id,
            type: reversedType,
            personId: rel.from_member_id,
            direction: 'to'
          };
        }
      });

    console.log('\n📋 All processed relationships:');
    processedRelations.forEach(rel => {
      const personName = rel.personId === aliAhmedId ? 'Ali Ahmed' : 
                        rel.personId === shafieId ? 'Shafie Said Nurani' : rel.personId;
      console.log(`  Said Ahmed → ${personName} (${rel.type}) [${rel.direction}]`);
    });

    // Apply deduplication logic
    console.log('\n🔄 Applying deduplication logic:');
    const deduplicatedRelations = processedRelations.reduce((acc, rel) => {
      const existingRel = acc.find(existing => existing.personId === rel.personId);
      if (!existingRel) {
        console.log(`  Adding: Said Ahmed → ${rel.personId === aliAhmedId ? 'Ali Ahmed' : 'Shafie Said Nurani'} (${rel.type})`);
        acc.push(rel);
      } else {
        console.log(`  Duplicate found for ${rel.personId === aliAhmedId ? 'Ali Ahmed' : 'Shafie Said Nurani'}`);
        if (rel.type === 'spouse' || rel.type === 'sibling') {
          console.log(`    Keeping first one (spouse/sibling)`);
          return acc;
        } else {
          const thisMemberIsSource = allRelations.find(r => 
            r.id === rel.id && r.from_member_id === saidAhmedId
          );
          if (thisMemberIsSource) {
            console.log(`    Replacing with source relationship: ${rel.type}`);
            const index = acc.findIndex(existing => existing.personId === rel.personId);
            acc[index] = rel;
          } else {
            console.log(`    Keeping existing relationship`);
          }
        }
      }
      return acc;
    }, []);

    console.log('\n📊 Final deduplicated relationships:');
    deduplicatedRelations.forEach(rel => {
      const personName = rel.personId === aliAhmedId ? 'Ali Ahmed' : 
                        rel.personId === shafieId ? 'Shafie Said Nurani' : rel.personId;
      console.log(`  Said Ahmed → ${personName} (${rel.type})`);
    });

    // Test edge creation logic
    console.log('\n🔗 Testing edge creation logic:');
    deduplicatedRelations.forEach(rel => {
      const personName = rel.personId === aliAhmedId ? 'Ali Ahmed' : 
                        rel.personId === shafieId ? 'Shafie Said Nurani' : rel.personId;
      
      let relationshipType = rel.type;
      
      // The relationship type from the current member's perspective determines the edge type
      if (rel.type === 'child') {
        relationshipType = 'parent';
      } else if (rel.type === 'parent') {
        relationshipType = 'child';
      }
      
      console.log(`  Said Ahmed → ${personName}`);
      console.log(`    Processed relationship type: ${rel.type}`);
      console.log(`    Edge relationship type: ${relationshipType}`);
      console.log(`    Expected: Said Ahmed should be parent of ${personName}`);
      
      if (relationshipType === 'parent') {
        console.log(`    ✅ CORRECT: Edge shows Said Ahmed as parent`);
      } else {
        console.log(`    ❌ INCORRECT: Edge shows Said Ahmed as child`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugSaidAhmedRelationships();
