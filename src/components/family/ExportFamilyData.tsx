import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  X,
  Users,
  Link,
  BookOpen,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FamilyMember, Relation, FamilyStory } from '@/types';
import { Artifact, Media } from '@/types/stories';
import { familyMemberService } from '@/services/familyMemberService';
import { storyService } from '@/services/storyService';
import { supabase } from '@/integrations/supabase/client';

interface Location {
  id: string;
  familyMemberId: string;
  familyMemberName: string;
  description: string;
  lat?: number;
  lng?: number;
  currentResidence: boolean;
}

interface MediaReference {
  id: string;
  url: string;
  mediaType: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
  userId: string;
  createdAt: string;
  linkedToType: 'story' | 'artifact' | 'member';
  linkedToId: string;
}

interface ExportData {
  familyMembers: FamilyMember[];
  relationships: Array<{
    fromMemberId: string;
    fromMemberName: string;
    toMemberId: string;
    toMemberName: string;
    relationshipType: string;
  }>;
  stories: FamilyStory[];
  locations: Location[];
  media: MediaReference[];
  artifacts: Artifact[];
  storyMembers: Array<{
    storyId: string;
    storyTitle: string;
    familyMemberId: string;
    familyMemberName: string;
    role: string;
  }>;
}

interface ExportFamilyDataProps {
  onClose: () => void;
}

const ExportFamilyData: React.FC<ExportFamilyDataProps> = ({ onClose }) => {
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all data for export
  const fetchExportData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to export data.",
          variant: "destructive"
        });
        return;
      }

      // Fetch family members
      const members = await familyMemberService.getAllFamilyMembers();
      
      // Fetch relationships
      const { data: relations, error: relationsError } = await supabase
        .from('relations')
        .select(`
          id,
          from_member_id,
          to_member_id,
          relation_type,
          from_member:family_members!from_member_id(first_name, last_name),
          to_member:family_members!to_member_id(first_name, last_name)
        `);

      if (relationsError) {
        console.error('Error fetching relationships:', relationsError);
        toast({
          title: "Error",
          description: "Failed to fetch relationships.",
          variant: "destructive"
        });
      }

      // Fetch stories with all related data
      const stories = await storyService.getAllStories();

      // Fetch all locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select(`
          id,
          family_member_id,
          description,
          lat,
          lng,
          current_residence,
          family_members!inner(first_name, last_name)
        `);

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
      }

      // Fetch all media
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (mediaError) {
        console.error('Error fetching media:', mediaError);
      }

      // Fetch story-media links
      const { data: storyMediaLinks, error: storyMediaError } = await supabase
        .from('story_media')
        .select('story_id, media_id');

      if (storyMediaError) {
        console.error('Error fetching story-media links:', storyMediaError);
      }

      // Fetch artifact-media links
      const { data: artifactMediaLinks, error: artifactMediaError } = await supabase
        .from('artifact_media')
        .select('artifact_id, media_id');

      if (artifactMediaError) {
        console.error('Error fetching artifact-media links:', artifactMediaError);
      }

      // Fetch all artifacts
      const artifacts = await storyService.getAllArtifacts();

      // Fetch story-members links
      const { data: storyMembersData, error: storyMembersError } = await supabase
        .from('story_members')
        .select(`
          story_id,
          family_member_id,
          role,
          family_stories!inner(title),
          family_members!inner(first_name, last_name)
        `);

      if (storyMembersError) {
        console.error('Error fetching story-members links:', storyMembersError);
      }

      // Format relationships with member names
      interface RelationWithMembers {
        id: string;
        from_member_id: string;
        to_member_id: string;
        relation_type: string;
        from_member: { first_name: string; last_name: string } | null;
        to_member: { first_name: string; last_name: string } | null;
      }
      const formattedRelations = (relations || []).map((rel: RelationWithMembers) => ({
        fromMemberId: rel.from_member_id,
        fromMemberName: rel.from_member 
          ? `${rel.from_member.first_name} ${rel.from_member.last_name}`
          : 'Unknown',
        toMemberId: rel.to_member_id,
        toMemberName: rel.to_member
          ? `${rel.to_member.first_name} ${rel.to_member.last_name}`
          : 'Unknown',
        relationshipType: rel.relation_type
      }));

      // Format locations
      const formattedLocations: Location[] = (locationsData || []).map((loc: any) => ({
        id: loc.id,
        familyMemberId: loc.family_member_id,
        familyMemberName: loc.family_members 
          ? `${loc.family_members.first_name} ${loc.family_members.last_name}`
          : 'Unknown',
        description: loc.description,
        lat: loc.lat,
        lng: loc.lng,
        currentResidence: loc.current_residence || false
      }));

      // Format media with references
      const mediaReferences: MediaReference[] = [];
      
      // Add story-media links
      (storyMediaLinks || []).forEach((link: any) => {
        const media = (mediaData || []).find((m: any) => m.id === link.media_id);
        if (media) {
          const story = stories.find(s => s.id === link.story_id);
          mediaReferences.push({
            id: media.id,
            url: media.url,
            mediaType: media.media_type,
            caption: media.caption,
            fileName: media.file_name,
            fileSize: media.file_size,
            userId: media.user_id,
            createdAt: media.created_at,
            linkedToType: 'story',
            linkedToId: link.story_id
          });
        }
      });

      // Add artifact-media links
      (artifactMediaLinks || []).forEach((link: any) => {
        const media = (mediaData || []).find((m: any) => m.id === link.media_id);
        if (media) {
          mediaReferences.push({
            id: media.id,
            url: media.url,
            mediaType: media.media_type,
            caption: media.caption,
            fileName: media.file_name,
            fileSize: media.file_size,
            userId: media.user_id,
            createdAt: media.created_at,
            linkedToType: 'artifact',
            linkedToId: link.artifact_id
          });
        }
      });

      // Add member avatars as media references
      members.forEach(member => {
        if (member.avatar) {
          const media = (mediaData || []).find((m: any) => m.url === member.avatar);
          if (media) {
            mediaReferences.push({
              id: media.id,
              url: media.url,
              mediaType: media.media_type,
              caption: media.caption,
              fileName: media.file_name,
              fileSize: media.file_size,
              userId: media.user_id,
              createdAt: media.created_at,
              linkedToType: 'member',
              linkedToId: member.id
            });
          }
        }
      });

      // Format story-members
      const formattedStoryMembers = (storyMembersData || []).map((sm: any) => ({
        storyId: sm.story_id,
        storyTitle: sm.family_stories?.title || 'Unknown Story',
        familyMemberId: sm.family_member_id,
        familyMemberName: sm.family_members
          ? `${sm.family_members.first_name} ${sm.family_members.last_name}`
          : 'Unknown',
        role: sm.role
      }));

      setExportData({
        familyMembers: members,
        relationships: formattedRelations,
        stories: stories,
        locations: formattedLocations,
        media: mediaReferences,
        artifacts: artifacts,
        storyMembers: formattedStoryMembers
      });

      toast({
        title: "Data Loaded",
        description: `Found ${members.length} members, ${formattedRelations.length} relationships, ${stories.length} stories, ${formattedLocations.length} locations, ${mediaReferences.length} media references, ${artifacts.length} artifacts, and ${formattedStoryMembers.length} story-member connections.`
      });
    } catch (error) {
      console.error('Error fetching export data:', error);
      toast({
        title: "Error",
        description: "Failed to load data for export.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchExportData();
  }, [fetchExportData]);

  // Export to JSON
  const exportToJson = useCallback(() => {
    if (!exportData) return;

    setIsExporting(true);
    try {
      // Format data for JSON export (matching import format)
      const jsonData = {
        familyMembers: exportData.familyMembers.map(member => ({
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          birthDate: member.birthDate || null,
          deathDate: member.deathDate || null,
          birthPlace: member.birthPlace || null,
          bio: member.bio || null,
          gender: member.gender,
          currentLocation: member.currentLocation || null
        })),
        relationships: exportData.relationships.map(rel => ({
          fromMemberId: rel.fromMemberId,
          toMemberId: rel.toMemberId,
          relationshipType: rel.relationshipType
        })),
        stories: exportData.stories.map(story => ({
          title: story.title,
          content: story.content,
          date: story.date || null,
          location: story.location || null,
          lat: story.lat || null,
          lng: story.lng || null,
          authorId: story.authorId || null,
          relatedMemberIds: story.relatedMembers?.map(rm => rm.familyMemberId) || []
        })),
        locations: exportData.locations.map(loc => ({
          familyMemberId: loc.familyMemberId,
          description: loc.description,
          lat: loc.lat || null,
          lng: loc.lng || null,
          currentResidence: loc.currentResidence
        })),
        media: exportData.media.map(media => ({
          url: media.url,
          mediaType: media.mediaType,
          caption: media.caption || null,
          fileName: media.fileName || null,
          fileSize: media.fileSize || null,
          linkedToType: media.linkedToType,
          linkedToId: media.linkedToId
        })),
        artifacts: exportData.artifacts.map(artifact => ({
          name: artifact.name,
          description: artifact.description || null,
          artifactType: artifact.artifactType,
          dateCreated: artifact.dateCreated || null,
          dateAcquired: artifact.dateAcquired || null,
          condition: artifact.condition || null,
          locationStored: artifact.locationStored || null,
          mediaIds: artifact.media?.map(m => m.id) || []
        })),
        storyMembers: exportData.storyMembers.map(sm => ({
          storyId: sm.storyId,
          familyMemberId: sm.familyMemberId,
          role: sm.role
        }))
      };

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `family_data_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Family data exported to JSON file."
      });
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data to JSON.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportData]);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    if (!exportData) return;

    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      // Family Members sheet
      const membersData = [
        ['id', 'first_name', 'last_name', 'birth_date', 'death_date', 'birth_place', 'bio', 'gender', 'lat', 'lng', 'location_description'],
        ...exportData.familyMembers.map(member => [
          member.id,
          member.firstName,
          member.lastName,
          member.birthDate || '',
          member.deathDate || '',
          member.birthPlace || '',
          member.bio || '',
          member.gender,
          member.currentLocation?.lat || '',
          member.currentLocation?.lng || '',
          member.currentLocation?.description || ''
        ])
      ];
      
      const membersSheet = XLSX.utils.aoa_to_sheet(membersData);
      XLSX.utils.book_append_sheet(workbook, membersSheet, 'Family Members');
      
      // Relationships sheet
      const relationshipsData = [
        ['from_member_id', 'from_member_name', 'to_member_id', 'to_member_name', 'relationship_type'],
        ...exportData.relationships.map(rel => [
          rel.fromMemberId,
          rel.fromMemberName,
          rel.toMemberId,
          rel.toMemberName,
          rel.relationshipType
        ])
      ];
      
      const relationshipsSheet = XLSX.utils.aoa_to_sheet(relationshipsData);
      XLSX.utils.book_append_sheet(workbook, relationshipsSheet, 'Relationships');
      
      // Stories sheet
      const storiesData = [
        ['story_id', 'story_title', 'story_content', 'story_date', 'location', 'lat', 'lng', 'author_id'],
        ...exportData.stories.map(story => [
          story.id,
          story.title,
          story.content,
          story.date || '',
          story.location || '',
          story.lat || '',
          story.lng || '',
          story.authorId || ''
        ])
      ];
      
      const storiesSheet = XLSX.utils.aoa_to_sheet(storiesData);
      XLSX.utils.book_append_sheet(workbook, storiesSheet, 'Stories');
      
      // Locations sheet
      const locationsData = [
        ['family_member_id', 'family_member_name', 'description', 'lat', 'lng', 'current_residence'],
        ...exportData.locations.map(loc => [
          loc.familyMemberId,
          loc.familyMemberName,
          loc.description,
          loc.lat || '',
          loc.lng || '',
          loc.currentResidence ? 'Yes' : 'No'
        ])
      ];
      
      const locationsSheet = XLSX.utils.aoa_to_sheet(locationsData);
      XLSX.utils.book_append_sheet(workbook, locationsSheet, 'Locations');
      
      // Media sheet
      const mediaData = [
        ['media_id', 'url', 'media_type', 'caption', 'file_name', 'file_size', 'linked_to_type', 'linked_to_id'],
        ...exportData.media.map(media => [
          media.id,
          media.url,
          media.mediaType,
          media.caption || '',
          media.fileName || '',
          media.fileSize || '',
          media.linkedToType,
          media.linkedToId
        ])
      ];
      
      const mediaSheet = XLSX.utils.aoa_to_sheet(mediaData);
      XLSX.utils.book_append_sheet(workbook, mediaSheet, 'Media');
      
      // Artifacts sheet
      const artifactsData = [
        ['artifact_id', 'name', 'description', 'artifact_type', 'date_created', 'date_acquired', 'condition', 'location_stored'],
        ...exportData.artifacts.map(artifact => [
          artifact.id,
          artifact.name,
          artifact.description || '',
          artifact.artifactType,
          artifact.dateCreated || '',
          artifact.dateAcquired || '',
          artifact.condition || '',
          artifact.locationStored || ''
        ])
      ];
      
      const artifactsSheet = XLSX.utils.aoa_to_sheet(artifactsData);
      XLSX.utils.book_append_sheet(workbook, artifactsSheet, 'Artifacts');
      
      // Story-Members sheet
      const storyMembersData = [
        ['story_id', 'story_title', 'family_member_id', 'family_member_name', 'role'],
        ...exportData.storyMembers.map(sm => [
          sm.storyId,
          sm.storyTitle,
          sm.familyMemberId,
          sm.familyMemberName,
          sm.role
        ])
      ];
      
      const storyMembersSheet = XLSX.utils.aoa_to_sheet(storyMembersData);
      XLSX.utils.book_append_sheet(workbook, storyMembersSheet, 'Story Members');
      
      // Generate and download
      const fileName = `family_data_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Successful",
        description: "Family data exported to Excel file."
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportData]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Family Data
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-heritage-purple mb-4" />
              <p className="text-muted-foreground">Loading family data...</p>
            </div>
          ) : exportData ? (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Ready to export {exportData.familyMembers.length} family members, 
                  {exportData.relationships.length} relationships, {exportData.stories.length} stories, 
                  {exportData.locations.length} locations, {exportData.media.length} media references, 
                  {exportData.artifacts.length} artifacts, and {exportData.storyMembers.length} story-member connections.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      JSON Format
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Complete structured data format including all members, relationships, and stories.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToJson}
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Export as JSON
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel Format
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Spreadsheet format with separate sheets for members, relationships, and stories.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToExcel}
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Export as Excel
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Export Preview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-heritage-purple" />
                      <span className="font-medium">Family Members</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.familyMembers.length}</p>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {exportData.familyMembers.slice(0, 5).map((member, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {member.firstName} {member.lastName}
                        </div>
                      ))}
                      {exportData.familyMembers.length > 5 && (
                        <div className="text-xs text-gray-400">
                          +{exportData.familyMembers.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Link className="h-4 w-4 text-heritage-purple" />
                      <span className="font-medium">Relationships</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.relationships.length}</p>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {exportData.relationships.slice(0, 5).map((rel, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          <Badge variant="outline" className="mr-1">{rel.relationshipType}</Badge>
                          {rel.fromMemberName} → {rel.toMemberName}
                        </div>
                      ))}
                      {exportData.relationships.length > 5 && (
                        <div className="text-xs text-gray-400">
                          +{exportData.relationships.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-heritage-purple" />
                      <span className="font-medium">Stories</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.stories.length}</p>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {exportData.stories.slice(0, 5).map((story, index) => (
                        <div key={index} className="text-sm text-gray-600 truncate">
                          {story.title}
                        </div>
                      ))}
                      {exportData.stories.length > 5 && (
                        <div className="text-xs text-gray-400">
                          +{exportData.stories.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Locations</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.locations.length}</p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Media</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.media.length}</p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Artifacts</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.artifacts.length}</p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Story Connections</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.storyMembers.length}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load data. Please try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportFamilyData;

