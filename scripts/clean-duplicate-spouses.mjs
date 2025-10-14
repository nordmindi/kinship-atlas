import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanDuplicateSpouses() {
  console.log('🧹 Cleaning up duplicate spouse relationships...');

  try {
    // Get all spouse relationships
    const { data: spouseRelations, error: fetchError } = await supabase
      .from('relations')
      .select('*')
      .eq('relation_type', 'spouse');

    if (fetchError) {
      console.error('❌ Error fetching spouse relationships:', fetchError);
      return;
    }

    console.log(`📊 Found ${spouseRelations.length} spouse relationships`);

    // Group relationships by member pair (sorted to ensure consistent grouping)
    const relationshipGroups = new Map();
    
    spouseRelations.forEach(rel => {
      const pair = [rel.from_member_id, rel.to_member_id].sort();
      const pairKey = `${pair[0]}-${pair[1]}`;
      
      if (!relationshipGroups.has(pairKey)) {
        relationshipGroups.set(pairKey, []);
      }
      relationshipGroups.get(pairKey).push(rel);
    });

    console.log(`🔍 Found ${relationshipGroups.size} unique spouse pairs`);

    // Find and remove duplicates
    let duplicatesRemoved = 0;
    
    for (const [pairKey, relations] of relationshipGroups) {
      if (relations.length > 2) {
        console.log(`⚠️  Found ${relations.length} relationships for pair ${pairKey} (expected max 2)`);
        
        // Keep the first two relationships, remove the rest
        const toKeep = relations.slice(0, 2);
        const toRemove = relations.slice(2);
        
        console.log(`   Keeping relationships: ${toKeep.map(r => r.id).join(', ')}`);
        console.log(`   Removing relationships: ${toRemove.map(r => r.id).join(', ')}`);
        
        for (const rel of toRemove) {
          const { error: deleteError } = await supabase
            .from('relations')
            .delete()
            .eq('id', rel.id);
          
          if (deleteError) {
            console.error(`❌ Error deleting relationship ${rel.id}:`, deleteError);
          } else {
            console.log(`✅ Deleted duplicate relationship: ${rel.id}`);
            duplicatesRemoved++;
          }
        }
      } else if (relations.length === 2) {
        // Check if we have both directions (A->B and B->A)
        const [rel1, rel2] = relations;
        const isBidirectional = (
          rel1.from_member_id === rel2.to_member_id && 
          rel1.to_member_id === rel2.from_member_id
        );
        
        if (isBidirectional) {
          console.log(`✅ Pair ${pairKey} has correct bidirectional relationship`);
        } else {
          console.log(`⚠️  Pair ${pairKey} has 2 relationships but not bidirectional`);
        }
      } else if (relations.length === 1) {
        console.log(`⚠️  Pair ${pairKey} has only 1 relationship (should be bidirectional)`);
      }
    }

    console.log(`🎉 Cleanup complete! Removed ${duplicatesRemoved} duplicate relationships.`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanDuplicateSpouses();
