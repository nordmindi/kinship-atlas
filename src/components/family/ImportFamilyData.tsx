import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  CheckCircle, 
  X,
  Play,
  FileSpreadsheet,
  Download,
  FileText,
  Users,
  Link,
  BookOpen,
  Image,
  Package
} from 'lucide-react';
// Atomic Design Components
import { FileDropzone } from '@/components/molecules/FileDropzone';
import { ImportProgressBar } from '@/components/molecules/ImportProgressBar';
import { TemplateDownloadCard } from '@/components/molecules/TemplateDownloadCard';
import { ImportDataPreview } from '@/components/organisms/ImportDataPreview';
import { ImportResultDisplay } from '@/components/organisms/ImportResultDisplay';
import { toast } from '@/hooks/use-toast';
import { FamilyMember, Relation, FamilyStory } from '@/types';
import { Artifact } from '@/types/stories';
import { familyMemberService } from '@/services/familyMemberService';
import { familyRelationshipManager } from '@/services/familyRelationshipManager';
import { storyService } from '@/services/storyService';
import { supabase } from '@/integrations/supabase/client';

interface ImportLocation {
  familyMemberId?: string;
  familyMemberName?: string;
  description: string;
  lat?: number;
  lng?: number;
  currentResidence?: boolean;
}

interface ImportMedia {
  url: string;
  mediaType: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
  linkedToType: 'story' | 'artifact' | 'member';
  linkedToId: string;
}

interface ImportArtifact {
  name: string;
  description?: string;
  artifactType: 'document' | 'heirloom' | 'photo' | 'letter' | 'certificate' | 'other';
  dateCreated?: string;
  dateAcquired?: string;
  condition?: string;
  locationStored?: string;
  mediaIds?: string[];
}

interface ImportStoryMember {
  storyId?: string;
  storyTitle?: string;
  familyMemberId?: string;
  familyMemberName?: string;
  role: string;
}

interface ImportData {
  familyMembers: FamilyMember[];
  relationships: Relation[];
  stories: FamilyStory[];
  locations?: ImportLocation[];
  media?: ImportMedia[];
  artifacts?: ImportArtifact[];
  storyMembers?: ImportStoryMember[];
}

interface ImportResult {
  success: boolean;
  imported: {
    members: number;
    relationships: number;
    stories: number;
    locations: number;
    media: number;
    artifacts: number;
    storyMembers: number;
  };
  errors: string[];
  warnings: string[];
}

interface ImportFamilyDataProps {
  onImportComplete: (result: ImportResult) => void;
  onClose: () => void;
}

const ImportFamilyData: React.FC<ImportFamilyDataProps> = ({
  onImportComplete,
  onClose
}) => {
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewMode, setPreviewMode] = useState<'members' | 'relationships' | 'stories' | 'locations' | 'media' | 'artifacts'>('members');

  // File parsing functions
  const parseExcelFile = useCallback(async (file: File): Promise<ImportData> => {
    const familyMembers: FamilyMember[] = [];
    const relationships: Relation[] = [];
    const stories: FamilyStory[] = [];
    const locations: ImportLocation[] = [];
    const media: ImportMedia[] = [];
    const artifacts: ImportArtifact[] = [];
    const storyMembers: ImportStoryMember[] = [];

    // Helpers to normalize dates from Excel
    const toISODate = (d: Date) => {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    // Excel (1900-date-system) serial -> Date
    const excelSerialToDate = (serial: number): Date => {
      // 25569 days between 1899-12-30 and 1970-01-01 (Excel's epoch quirk)
      const ms = (serial - 25569) * 86400 * 1000;
      return new Date(ms);
    };

    const normalizeDateString = (value?: string): string | undefined => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (trimmed === '') return undefined;

      // If the cell was numeric in Excel, our generic reader turned it into a numeric-looking string
      if (/^\d+$/.test(trimmed)) {
        const serial = Number(trimmed);
        // Guardrails: Excel serials are typically in [1, ~60000] for modern dates
        if (Number.isFinite(serial) && serial > 0 && serial < 100000) {
          const d = excelSerialToDate(serial);
          if (!isNaN(d.getTime())) return toISODate(d);
        }
      }

      // Otherwise, try to parse as a recognizable date string and standardize to YYYY-MM-DD
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return toISODate(parsed);

      // Fallback: return original; downstream validation will handle invalid formats
      return trimmed;
    };

    const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string) => {
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length < 2) return;

      const headers = (jsonData[0] as string[]).map(h => h?.toString().toLowerCase().trim() || '');

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || row.length === 0) continue;

        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index]?.toString().trim() || '';
        });

        if (sheetName === 'Family Members' || sheetName.toLowerCase().includes('member')) {
          if (rowData.first_name && rowData.last_name) {
            const member: FamilyMember = {
              id: `temp_${i}`,
              firstName: rowData.first_name,
              lastName: rowData.last_name,
              birthDate: normalizeDateString(rowData.birth_date),
              deathDate: normalizeDateString(rowData.death_date),
              birthPlace: rowData.birth_place || undefined,
              bio: rowData.bio || undefined,
              gender: (rowData.gender as 'male' | 'female' | 'other') || 'other',
              relations: [],
              currentLocation: rowData.lat && rowData.lng ? {
                lat: parseFloat(rowData.lat),
                lng: parseFloat(rowData.lng),
                description: rowData.location_description || ''
              } : undefined
            };
            familyMembers.push(member);
          }
        } else if (sheetName === 'Relationships' || sheetName.toLowerCase().includes('relationship')) {
          if (rowData.from_member_id || rowData.from_member_name) {
            const relationship: Relation = {
              id: `temp_rel_${i}`,
              type: (rowData.relationship_type as 'parent' | 'child' | 'spouse' | 'sibling') || 'sibling',
              personId: rowData.to_member_id || ''
            };
            relationships.push(relationship);
          }
        } else if (sheetName === 'Stories' || sheetName.toLowerCase().includes('story')) {
          if (rowData.story_title || rowData.title) {
            const story: FamilyStory = {
              id: rowData.story_id || `temp_story_${i}`,
              title: rowData.story_title || rowData.title,
              content: rowData.story_content || rowData.content || '',
              date: normalizeDateString(rowData.story_date || rowData.date),
              location: rowData.location || undefined,
              lat: rowData.lat ? parseFloat(rowData.lat) : undefined,
              lng: rowData.lng ? parseFloat(rowData.lng) : undefined,
              authorId: rowData.author_id || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              relatedMembers: []
            };
            stories.push(story);
          }
        } else if (sheetName === 'Locations' || sheetName.toLowerCase().includes('location')) {
          if (rowData.description) {
            locations.push({
              familyMemberId: rowData.family_member_id,
              familyMemberName: rowData.family_member_name,
              description: rowData.description,
              lat: rowData.lat ? parseFloat(rowData.lat) : undefined,
              lng: rowData.lng ? parseFloat(rowData.lng) : undefined,
              currentResidence: rowData.current_residence?.toLowerCase() === 'yes' || rowData.current_residence === 'true'
            });
          }
        } else if (sheetName === 'Media' || sheetName.toLowerCase().includes('media')) {
          if (rowData.url) {
            media.push({
              url: rowData.url,
              mediaType: rowData.media_type || 'image',
              caption: rowData.caption,
              fileName: rowData.file_name,
              fileSize: rowData.file_size ? parseInt(rowData.file_size) : undefined,
              linkedToType: (rowData.linked_to_type as 'story' | 'artifact' | 'member') || 'member',
              linkedToId: rowData.linked_to_id || ''
            });
          }
        } else if (sheetName === 'Artifacts' || sheetName.toLowerCase().includes('artifact')) {
          if (rowData.name) {
            artifacts.push({
              name: rowData.name,
              description: rowData.description,
              artifactType: (rowData.artifact_type as any) || 'other',
              dateCreated: normalizeDateString(rowData.date_created),
              dateAcquired: normalizeDateString(rowData.date_acquired),
              condition: rowData.condition,
              locationStored: rowData.location_stored
            });
          }
        } else if (sheetName === 'Story Members' || sheetName.toLowerCase().includes('story member')) {
          if (rowData.story_id || rowData.family_member_id) {
            storyMembers.push({
              storyId: rowData.story_id,
              storyTitle: rowData.story_title,
              familyMemberId: rowData.family_member_id,
              familyMemberName: rowData.family_member_name,
              role: rowData.role || 'participant'
            });
          }
        }
      }
    };

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('No data found in file'));
            return;
          }

          let workbook: XLSX.WorkBook;
          
          if (file.name.endsWith('.csv')) {
            // Handle CSV files - convert text to workbook
            workbook = XLSX.read(data as string, { type: 'string' });
          } else {
            // Handle Excel files
            workbook = XLSX.read(data, { type: 'binary' });
          }
          
          // Parse each sheet
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            parseSheet(worksheet, sheetName);
          });

          resolve({ familyMembers, relationships, stories, locations, media, artifacts, storyMembers });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.name.endsWith('.csv')) {
        // Handle CSV files
        reader.readAsText(file);
      } else {
        // Handle Excel files
        reader.readAsBinaryString(file);
      }
    });
  }, []);

  const parseJsonFile = useCallback(async (file: File): Promise<ImportData> => {
    const text = await file.text();
    const data = JSON.parse(text);

    return {
      familyMembers: data.familyMembers || data.members || [],
      relationships: data.relationships || data.relations || [],
      stories: data.stories || [],
      locations: data.locations || [],
      media: data.media || [],
      artifacts: data.artifacts || [],
      storyMembers: data.storyMembers || []
    };
  }, []);

  // File drop handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      let data: ImportData;
      
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        data = await parseJsonFile(file);
      } else if (
        file.type === 'text/csv' || 
        file.name.endsWith('.csv') || 
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls')
      ) {
        data = await parseExcelFile(file);
      } else {
        toast({
          title: "Unsupported File Type",
          description: "Please upload a JSON, CSV, or Excel file.",
          variant: "destructive"
        });
        return;
      }

      setImportData(data);
      toast({
        title: "File Parsed Successfully",
        description: `Found ${data.familyMembers.length} members, ${data.relationships.length} relationships, ${data.stories.length} stories, ${data.locations?.length || 0} locations, ${data.media?.length || 0} media, ${data.artifacts?.length || 0} artifacts, and ${data.storyMembers?.length || 0} story-member connections.`
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Parse Error",
        description: "Could not parse the file. Please check the format.",
        variant: "destructive"
      });
    }
  }, [parseExcelFile, parseJsonFile]);

  // File upload handler
  const handleFileAccepted = useCallback(async (file: File) => {
    await onDrop([file]);
  }, [onDrop]);

  // Check for duplicates within import data
  const checkImportDuplicates = useCallback((data: ImportData): { duplicates: string[]; warnings: string[] } => {
    const duplicates: string[] = [];
    const warnings: string[] = [];
    const seen = new Set<string>();

    for (const member of data.familyMembers) {
      const key = `${member.firstName.toLowerCase().trim()}_${member.lastName.toLowerCase().trim()}_${member.birthDate || 'no_birth_date'}`;
      
      if (seen.has(key)) {
        duplicates.push(`${member.firstName} ${member.lastName} (${member.birthDate || 'no birth date'})`);
      } else {
        seen.add(key);
      }
    }

    if (duplicates.length > 0) {
      warnings.push(`Found ${duplicates.length} duplicate(s) within the import file: ${duplicates.join(', ')}`);
    }

    return { duplicates, warnings };
  }, []);

  // Import execution
  const executeImport = useCallback(async () => {
    if (!importData) return;

    setIsImporting(true);
    setImportProgress(0);
    const result: ImportResult = {
      success: true,
      imported: { members: 0, relationships: 0, stories: 0, locations: 0, media: 0, artifacts: 0, storyMembers: 0 },
      errors: [],
      warnings: []
    };

    // Check for duplicates within the import data
    const duplicateCheck = checkImportDuplicates(importData);
    result.warnings.push(...duplicateCheck.warnings);

    try {
      const totalItems = importData.familyMembers.length + 
                        importData.relationships.length + 
                        importData.stories.length +
                        (importData.locations?.length || 0) +
                        (importData.media?.length || 0) +
                        (importData.artifacts?.length || 0) +
                        (importData.storyMembers?.length || 0);
      let processedItems = 0;
      
      // Create maps for ID translation
      const memberNameToId: Record<string, string> = {};
      const oldMemberIdToNewId: Record<string, string> = {}; // Map old JSON IDs to new database IDs
      const storyTitleToId: Record<string, string> = {};
      const oldStoryIdToNewId: Record<string, string> = {}; // Map old JSON story IDs to new database IDs

      // Import family members
      // Get current user for duplicate checking
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentUserIdForMembers = currentUser?.id;

      for (const member of importData.familyMembers) {
        try {
          const oldMemberId = member.id; // Store the old ID from JSON before creating new member
          
          console.log('🔍 Importing member:', {
            firstName: member.firstName,
            lastName: member.lastName,
            birthDate: member.birthDate,
            birthDateType: typeof member.birthDate,
            deathDate: member.deathDate,
            birthPlace: member.birthPlace,
            bio: member.bio,
            gender: member.gender,
            location: member.currentLocation
          });

          // Try to create the member first
          const response = await familyMemberService.createFamilyMember({
            firstName: member.firstName,
            lastName: member.lastName,
            birthDate: member.birthDate,
            deathDate: member.deathDate,
            birthPlace: member.birthPlace,
            bio: member.bio,
            gender: member.gender,
            location: member.currentLocation
          });

          console.log('🔍 Import response:', response);

          let newMemberId: string;
          if (response.success) {
            newMemberId = response.member!.id;
            result.imported.members++;
          } else {
            console.log('❌ Import failed for', member.firstName, member.lastName, ':', response.error);
            // Check if error is about duplicate
            if (response.error?.includes('already exists') && currentUserIdForMembers) {
              // Try to find the existing member
              // @ts-expect-error - TypeScript has issues with conditional Supabase query chaining
              let findResult: any;
              if (member.birthDate) {
                // @ts-expect-error - TypeScript has issues with conditional Supabase query chaining
                findResult = await supabase
                  .from('family_members')
                  .select('id')
                  .eq('created_by', currentUserIdForMembers)
                  .ilike('first_name', member.firstName.trim())
                  .ilike('last_name', member.lastName.trim())
                  .eq('birth_date', member.birthDate)
                  .limit(1);
              } else {
                // @ts-expect-error - TypeScript has issues with conditional Supabase query chaining
                findResult = await supabase
                  .from('family_members')
                  .select('id')
                  .eq('created_by', currentUserIdForMembers)
                  .ilike('first_name', member.firstName.trim())
                  .ilike('last_name', member.lastName.trim())
                  .limit(1);
              }
              
              if (findResult.data && findResult.data.length > 0) {
                newMemberId = findResult.data[0].id;
                result.warnings.push(`Member ${member.firstName} ${member.lastName} already exists, using existing member`);
              } else {
                result.errors.push(`Failed to import ${member.firstName} ${member.lastName}: ${response.error}`);
                processedItems++;
                setImportProgress((processedItems / totalItems) * 100);
                continue;
              }
            } else {
              result.errors.push(`Failed to import ${member.firstName} ${member.lastName}: ${response.error}`);
              processedItems++;
              setImportProgress((processedItems / totalItems) * 100);
              continue;
            }
          }

          // Update the member ID for relationship creation
          member.id = newMemberId;
          // Store in name-to-ID map
          const nameKey = `${member.firstName} ${member.lastName}`;
          memberNameToId[nameKey] = newMemberId;
          // Map old ID to new ID if old ID exists
          if (oldMemberId) {
            oldMemberIdToNewId[oldMemberId] = newMemberId;
          }
        } catch (error) {
          result.errors.push(`Error importing ${member.firstName} ${member.lastName}: ${error}`);
        }

        processedItems++;
        setImportProgress((processedItems / totalItems) * 100);
      }

      // Import relationships
      // Track processed relationships to avoid duplicates
      const processedRelationships = new Set<string>();
      
      for (const relationship of importData.relationships) {
        try {
          // Handle both JSON format (fromMemberId/toMemberId) and Relation format (personId/id)
          let fromMemberId: string | undefined;
          let toMemberId: string | undefined;
          let relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';

          // Check if it's JSON format (fromMemberId/toMemberId)
          if ('fromMemberId' in relationship && 'toMemberId' in relationship) {
            const jsonRel = relationship as any;
            fromMemberId = oldMemberIdToNewId[jsonRel.fromMemberId] || jsonRel.fromMemberId;
            toMemberId = oldMemberIdToNewId[jsonRel.toMemberId] || jsonRel.toMemberId;
            relationshipType = jsonRel.relationshipType || jsonRel.type;
          } else {
            // It's Relation format (personId/id)
            fromMemberId = oldMemberIdToNewId[relationship.personId] || relationship.personId;
            toMemberId = oldMemberIdToNewId[relationship.id] || relationship.id;
            relationshipType = relationship.type;
          }

          // Skip if we can't find both members
          if (!fromMemberId || !toMemberId) {
            result.errors.push(`Failed to import relationship: Could not find both family members`);
            processedItems++;
            setImportProgress((processedItems / totalItems) * 100);
            continue;
          }

          // Create a unique key for this relationship (normalize direction for parent-child)
          // For parent-child relationships, we normalize to always use the parent as fromMemberId
          // For spouse and sibling, we use a sorted key to avoid duplicates
          let relationshipKey: string;
          if (relationshipType === 'parent' || relationshipType === 'child') {
            // Normalize parent-child: always use parent as from, child as to
            const normalizedType = relationshipType === 'parent' ? 'parent' : 'child';
            const parentId = normalizedType === 'parent' ? fromMemberId : toMemberId;
            const childId = normalizedType === 'parent' ? toMemberId : fromMemberId;
            relationshipKey = `${parentId}-parent-${childId}`;
          } else {
            // For spouse and sibling, use sorted IDs to avoid duplicates
            const sortedIds = [fromMemberId, toMemberId].sort();
            relationshipKey = `${sortedIds[0]}-${relationshipType}-${sortedIds[1]}`;
          }

          // Skip if we've already processed this relationship
          if (processedRelationships.has(relationshipKey)) {
            // Silently skip duplicate relationships (they're likely bidirectional entries)
            processedItems++;
            setImportProgress((processedItems / totalItems) * 100);
            continue;
          }

          const response = await familyRelationshipManager.createRelationship({
            fromMemberId,
            toMemberId,
            relationshipType
          });

          if (response.success) {
            result.imported.relationships++;
            processedRelationships.add(relationshipKey);
            // Also add the reverse key for parent-child relationships (since DB creates reciprocal)
            if (relationshipType === 'parent') {
              processedRelationships.add(`${toMemberId}-child-${fromMemberId}`);
            } else if (relationshipType === 'child') {
              processedRelationships.add(`${toMemberId}-parent-${fromMemberId}`);
            }
          } else {
            // Check if it's a duplicate relationship error
            if (response.error?.includes('Relationship already exists')) {
              // Treat as warning, not error, since it's likely a bidirectional entry
              result.warnings.push(`Skipped duplicate relationship: ${response.error}`);
              processedRelationships.add(relationshipKey);
            } else {
              result.errors.push(`Failed to import relationship: ${response.error}`);
            }
          }
        } catch (error) {
          result.errors.push(`Error importing relationship: ${error}`);
        }

        processedItems++;
        setImportProgress((processedItems / totalItems) * 100);
      }

      // Import stories
      // Get current user ID for author_id (always use current user for RLS compliance)
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      if (!currentUserId) {
        result.errors.push('Cannot import stories: User not authenticated');
        setIsImporting(false);
        return;
      }

      for (const story of importData.stories) {
        try {
          const oldStoryId = story.id; // Store the old ID from JSON before creating new story
          
          // Always use current user ID for author_id to ensure RLS compliance
          // (stories from export may have different author IDs)
          const authorId = currentUserId;
          
          const { data: storyData, error } = await supabase
            .from('family_stories')
            .insert({
              title: story.title,
              content: story.content,
              date: story.date,
              location: story.location,
              lat: story.lat,
              lng: story.lng,
              author_id: authorId
            })
            .select('id')
            .single();

          if (!error && storyData) {
            result.imported.stories++;
            const newStoryId = storyData.id;
            storyTitleToId[story.title] = newStoryId;
            // Map old story ID to new ID if old ID exists
            if (oldStoryId) {
              oldStoryIdToNewId[oldStoryId] = newStoryId;
            }
          } else {
            result.errors.push(`Failed to import story "${story.title}": ${error?.message || 'Unknown error'}`);
          }
        } catch (error) {
          result.errors.push(`Error importing story "${story.title}": ${error}`);
        }

        processedItems++;
        setImportProgress((processedItems / totalItems) * 100);
      }

      // Import locations
      if (importData.locations && importData.locations.length > 0) {
        for (const location of importData.locations) {
          try {
            let memberId = location.familyMemberId;
            
            // Map old member ID to new ID if it exists in the map
            if (memberId && oldMemberIdToNewId[memberId]) {
              memberId = oldMemberIdToNewId[memberId];
            }
            
            // If we have a name but no ID, try to find the member
            if (!memberId && location.familyMemberName) {
              memberId = memberNameToId[location.familyMemberName];
            }
            
            if (!memberId) {
              result.warnings.push(`Skipping location "${location.description}" - member not found`);
              processedItems++;
              setImportProgress((processedItems / totalItems) * 100);
              continue;
            }

            const { error } = await supabase
              .from('locations')
              .insert({
                family_member_id: memberId,
                description: location.description,
                lat: location.lat,
                lng: location.lng,
                current_residence: location.currentResidence || false
              });

            if (!error) {
              result.imported.locations++;
            } else {
              result.errors.push(`Failed to import location "${location.description}": ${error.message}`);
            }
          } catch (error) {
            result.errors.push(`Error importing location "${location.description}": ${error}`);
          }

          processedItems++;
          setImportProgress((processedItems / totalItems) * 100);
        }
      }

      // Import artifacts
      if (importData.artifacts && importData.artifacts.length > 0) {
        for (const artifact of importData.artifacts) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) continue;

            const { data: artifactData, error } = await supabase
              .from('artifacts')
              .insert({
                name: artifact.name,
                description: artifact.description,
                artifact_type: artifact.artifactType,
                date_created: artifact.dateCreated,
                date_acquired: artifact.dateAcquired,
                condition: artifact.condition,
                location_stored: artifact.locationStored,
                owner_id: user.id
              })
              .select('id')
              .single();

            if (!error && artifactData) {
              result.imported.artifacts++;
              
              // Link media if provided
              if (artifact.mediaIds && artifact.mediaIds.length > 0) {
                for (const mediaId of artifact.mediaIds) {
                  await supabase
                    .from('artifact_media')
                    .insert({
                      artifact_id: artifactData.id,
                      media_id: mediaId
                    });
                }
              }
            } else {
              result.errors.push(`Failed to import artifact "${artifact.name}": ${error?.message || 'Unknown error'}`);
            }
          } catch (error) {
            result.errors.push(`Error importing artifact "${artifact.name}": ${error}`);
          }

          processedItems++;
          setImportProgress((processedItems / totalItems) * 100);
        }
      }

      // Import story-members connections
      if (importData.storyMembers && importData.storyMembers.length > 0) {
        for (const storyMember of importData.storyMembers) {
          try {
            let storyId = storyMember.storyId;
            let memberId = storyMember.familyMemberId;
            
            // First, try to map old story ID to new ID if it exists in the map
            if (storyId && oldStoryIdToNewId[storyId]) {
              storyId = oldStoryIdToNewId[storyId];
            } else if (storyId) {
              // If we have a storyId but it's not in the map, it might be an old ID
              // Try to find by title instead to get the correct new ID
              if (storyMember.storyTitle) {
                const mappedId = storyTitleToId[storyMember.storyTitle];
                if (mappedId) {
                  storyId = mappedId;
                } else {
                  // Story ID doesn't exist in our maps, skip this connection
                  result.warnings.push(`Skipping story-member connection - story ID "${storyId}" not found in imported stories`);
                  processedItems++;
                  setImportProgress((processedItems / totalItems) * 100);
                  continue;
                }
              } else {
                // We have an ID but no title and it's not in the map - likely an old ID
                result.warnings.push(`Skipping story-member connection - story ID "${storyId}" not found in imported stories`);
                processedItems++;
                setImportProgress((processedItems / totalItems) * 100);
                continue;
              }
            } else if (storyMember.storyTitle) {
              // No storyId provided, try to find by title
              storyId = storyTitleToId[storyMember.storyTitle];
            }
            
            // Map old member ID to new ID if it exists in the map
            if (memberId && oldMemberIdToNewId[memberId]) {
              memberId = oldMemberIdToNewId[memberId];
            } else if (memberId) {
              // Member ID provided but not in map - might be an old ID, try name lookup
              if (storyMember.familyMemberName) {
                const mappedId = memberNameToId[storyMember.familyMemberName];
                if (mappedId) {
                  memberId = mappedId;
                } else {
                  result.warnings.push(`Skipping story-member connection - member ID "${memberId}" not found in imported members`);
                  processedItems++;
                  setImportProgress((processedItems / totalItems) * 100);
                  continue;
                }
              } else {
                result.warnings.push(`Skipping story-member connection - member ID "${memberId}" not found in imported members`);
                processedItems++;
                setImportProgress((processedItems / totalItems) * 100);
                continue;
              }
            } else if (storyMember.familyMemberName) {
              // No memberId provided, try to find by name
              memberId = memberNameToId[storyMember.familyMemberName];
            }
            
            if (!storyId || !memberId) {
              result.warnings.push(`Skipping story-member connection - story or member not found`);
              processedItems++;
              setImportProgress((processedItems / totalItems) * 100);
              continue;
            }

            const { error } = await supabase
              .from('story_members')
              .insert({
                story_id: storyId,
                family_member_id: memberId,
                role: storyMember.role || 'participant'
              });

            if (!error) {
              result.imported.storyMembers++;
            } else {
              result.errors.push(`Failed to import story-member connection: ${error.message}`);
            }
          } catch (error) {
            result.errors.push(`Error importing story-member connection: ${error}`);
          }

          processedItems++;
          setImportProgress((processedItems / totalItems) * 100);
        }
      }

      // Note: Media import is handled separately as it requires file uploads
      // Media references in the export are informational - actual media files
      // would need to be uploaded separately
      if (importData.media && importData.media.length > 0) {
        result.warnings.push(`Note: ${importData.media.length} media references found. Media files must be uploaded separately through the media gallery.`);
      }

      result.success = result.errors.length === 0;
      setImportResult(result);
      setIsImporting(false);

      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${result.imported.members} members, ${result.imported.relationships} relationships, ${result.imported.stories} stories, ${result.imported.locations} locations, ${result.imported.artifacts} artifacts, and ${result.imported.storyMembers} story-member connections.`
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `Imported successfully but encountered ${result.errors.length} errors.`,
          variant: "destructive"
        });
      }

      onImportComplete(result);
    } catch (error) {
      console.error('Import error:', error);
      setIsImporting(false);
      toast({
        title: "Import Failed",
        description: "An unexpected error occurred during import.",
        variant: "destructive"
      });
    }
  }, [importData, onImportComplete, checkImportDuplicates]);

  // Download template
  const downloadTemplate = useCallback((type: 'excel' | 'json') => {
    if (type === 'json') {
      const template = {
        familyMembers: [
          {
            id: "john_smith_id",
            firstName: "John",
            lastName: "Smith",
            birthDate: "1950-03-15",
            deathDate: null,
            birthPlace: "New York, NY",
            bio: "Family patriarch and loving father",
            gender: "male",
            currentLocation: {
              lat: 40.7128,
              lng: -74.0060,
              description: "New York City, NY, USA"
            }
          },
          {
            id: "mary_smith_id",
            firstName: "Mary",
            lastName: "Smith",
            birthDate: "1952-07-22",
            deathDate: null,
            birthPlace: "Boston, MA",
            bio: "Devoted mother and grandmother",
            gender: "female",
            currentLocation: {
              lat: 42.3601,
              lng: -71.0589,
              description: "Boston, MA, USA"
            }
          }
        ],
        relationships: [
          {
            fromMemberId: "john_smith_id",
            toMemberId: "mary_smith_id",
            relationshipType: "spouse"
          }
        ],
        stories: [
          {
            title: "Family Reunion 2023",
            content: "We had a wonderful family gathering at the lake house. Everyone came together to celebrate our heritage and create new memories.",
            date: "2023-07-15",
            location: "Lake House, NY",
            lat: 40.7128,
            lng: -74.0060,
            authorId: "user_id",
            relatedMemberIds: []
          }
        ],
        locations: [
          {
            familyMemberId: "john_smith_id",
            description: "Childhood home in New York",
            lat: 40.7128,
            lng: -74.0060,
            currentResidence: false
          }
        ],
        media: [
          {
            url: "https://example.com/photo.jpg",
            mediaType: "image",
            caption: "Family photo from 2023",
            fileName: "family_photo_2023.jpg",
            linkedToType: "story",
            linkedToId: "story_id"
          }
        ],
        artifacts: [
          {
            name: "Grandfather's Watch",
            description: "A gold pocket watch passed down through generations",
            artifactType: "heirloom",
            dateCreated: "1920-01-01",
            dateAcquired: "2020-05-15",
            condition: "Good",
            locationStored: "Home safe",
            mediaIds: []
          }
        ],
        storyMembers: [
          {
            storyId: "story_id",
            familyMemberId: "john_smith_id",
            role: "protagonist"
          }
        ]
      };

      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'family_data_template.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Create Excel template with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Family Members sheet
      const membersData = [
        ['id', 'first_name', 'last_name', 'birth_date', 'death_date', 'birth_place', 'bio', 'gender', 'lat', 'lng', 'location_description'],
        ['john_smith_id', 'John', 'Smith', '1950-03-15', '', 'New York, NY', 'Family patriarch and loving father', 'male', '40.7128', '-74.0060', 'New York City, NY, USA'],
        ['mary_smith_id', 'Mary', 'Smith', '1952-07-22', '', 'Boston, MA', 'Devoted mother and grandmother', 'female', '42.3601', '-71.0589', 'Boston, MA, USA'],
        ['david_smith_id', 'David', 'Smith', '1975-11-08', '', 'New York, NY', 'Software engineer and family man', 'male', '37.7749', '-122.4194', 'San Francisco, CA, USA']
      ];
      
      const membersSheet = XLSX.utils.aoa_to_sheet(membersData);
      XLSX.utils.book_append_sheet(workbook, membersSheet, 'Family Members');
      
      // Relationships sheet
      const relationshipsData = [
        ['from_member_id', 'from_member_name', 'to_member_id', 'to_member_name', 'relationship_type'],
        ['', 'John Smith', '', 'Mary Smith', 'spouse'],
        ['', 'John Smith', '', 'David Smith', 'parent'],
        ['', 'Mary Smith', '', 'David Smith', 'parent']
      ];
      
      const relationshipsSheet = XLSX.utils.aoa_to_sheet(relationshipsData);
      XLSX.utils.book_append_sheet(workbook, relationshipsSheet, 'Relationships');
      
      // Stories sheet
      const storiesData = [
        ['story_id', 'story_title', 'story_content', 'story_date', 'location', 'lat', 'lng', 'author_id'],
        ['', 'Family Reunion 2023', 'We had a wonderful family gathering at the lake house. Everyone came together to celebrate our heritage and create new memories.', '2023-07-15', 'Lake House, NY', '40.7128', '-74.0060', 'user_id'],
        ['', 'Wedding Day', 'The beautiful ceremony brought our families together in celebration of love and commitment.', '2020-06-20', '', '', '', 'user_id']
      ];
      
      const storiesSheet = XLSX.utils.aoa_to_sheet(storiesData);
      XLSX.utils.book_append_sheet(workbook, storiesSheet, 'Stories');
      
      // Locations sheet
      const locationsData = [
        ['family_member_id', 'family_member_name', 'description', 'lat', 'lng', 'current_residence'],
        ['', 'John Smith', 'Childhood home in New York', '40.7128', '-74.0060', 'No'],
        ['', 'Mary Smith', 'Current residence in Boston', '42.3601', '-71.0589', 'Yes']
      ];
      
      const locationsSheet = XLSX.utils.aoa_to_sheet(locationsData);
      XLSX.utils.book_append_sheet(workbook, locationsSheet, 'Locations');
      
      // Media sheet
      const mediaData = [
        ['media_id', 'url', 'media_type', 'caption', 'file_name', 'file_size', 'linked_to_type', 'linked_to_id'],
        ['', 'https://example.com/photo.jpg', 'image', 'Family photo from 2023', 'family_photo_2023.jpg', '2048000', 'story', ''],
        ['', 'https://example.com/document.pdf', 'document', 'Birth certificate', 'birth_cert.pdf', '512000', 'artifact', '']
      ];
      
      const mediaSheet = XLSX.utils.aoa_to_sheet(mediaData);
      XLSX.utils.book_append_sheet(workbook, mediaSheet, 'Media');
      
      // Artifacts sheet
      const artifactsData = [
        ['artifact_id', 'name', 'description', 'artifact_type', 'date_created', 'date_acquired', 'condition', 'location_stored'],
        ['', "Grandfather's Watch", 'A gold pocket watch passed down through generations', 'heirloom', '1920-01-01', '2020-05-15', 'Good', 'Home safe'],
        ['', 'Marriage Certificate', 'Original marriage certificate from 1950', 'certificate', '1950-06-10', '2020-05-15', 'Excellent', 'Filing cabinet']
      ];
      
      const artifactsSheet = XLSX.utils.aoa_to_sheet(artifactsData);
      XLSX.utils.book_append_sheet(workbook, artifactsSheet, 'Artifacts');
      
      // Story Members sheet
      const storyMembersData = [
        ['story_id', 'story_title', 'family_member_id', 'family_member_name', 'role'],
        ['', 'Family Reunion 2023', '', 'John Smith', 'protagonist'],
        ['', 'Family Reunion 2023', '', 'Mary Smith', 'participant']
      ];
      
      const storyMembersSheet = XLSX.utils.aoa_to_sheet(storyMembersData);
      XLSX.utils.book_append_sheet(workbook, storyMembersSheet, 'Story Members');
      
      // Generate and download
      XLSX.writeFile(workbook, 'family_data_template.xlsx');
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Family Data
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="preview" disabled={!importData}>Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <FileDropzone onFileAccepted={handleFileAccepted} />

              {importData && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      File parsed successfully! Found {importData.familyMembers.length} family members, 
                      {importData.relationships.length} relationships, {importData.stories.length} stories, 
                      {importData.locations?.length || 0} locations, {importData.media?.length || 0} media, 
                      {importData.artifacts?.length || 0} artifacts, and {importData.storyMembers?.length || 0} story-member connections.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button onClick={executeImport} disabled={isImporting}>
                      {isImporting ? (
                        <>
                          <Play className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Start Import
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setImportData(null)}>
                      Clear
                    </Button>
                  </div>

                  {isImporting && (
                    <ImportProgressBar progress={importProgress} />
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Download Templates</h3>
                <p className="text-gray-600">
                  Use these templates to format your data correctly before importing.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel/CSV Template
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        Simple spreadsheet format for family members with basic information.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadTemplate('excel')}
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV Template
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4" />
                        JSON Template
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        Complete JSON format including members, relationships, stories, locations, media, artifacts, and story-member connections.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadTemplate('json')}
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download JSON Template
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              {importData && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={previewMode === 'members' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('members')}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Members ({importData.familyMembers.length})
                    </Button>
                    <Button
                      variant={previewMode === 'relationships' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('relationships')}
                    >
                      <Link className="mr-2 h-4 w-4" />
                      Relationships ({importData.relationships.length})
                    </Button>
                    <Button
                      variant={previewMode === 'stories' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('stories')}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Stories ({importData.stories.length})
                    </Button>
                    {(importData.locations && importData.locations.length > 0) && (
                      <Button
                        variant={previewMode === 'locations' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewMode('locations')}
                      >
                        Locations ({importData.locations.length})
                      </Button>
                    )}
                    {(importData.media && importData.media.length > 0) && (
                      <Button
                        variant={previewMode === 'media' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewMode('media')}
                      >
                        Media ({importData.media.length})
                      </Button>
                    )}
                    {(importData.artifacts && importData.artifacts.length > 0) && (
                      <Button
                        variant={previewMode === 'artifacts' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewMode('artifacts')}
                      >
                        Artifacts ({importData.artifacts.length})
                      </Button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
                    <ImportDataPreview
                      mode={previewMode}
                      members={importData.familyMembers}
                      relationships={importData.relationships}
                      stories={importData.stories}
                      locations={importData.locations}
                      media={importData.media}
                      artifacts={importData.artifacts}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {importResult && <ImportResultDisplay result={importResult} />}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportFamilyData;
