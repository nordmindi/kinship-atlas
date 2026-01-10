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
import { Album, StoryCategory } from '@/types/albums';
import { familyMemberService } from '@/services/familyMemberService';
import { storyService } from '@/services/storyService';
import { albumService } from '@/services/albumService';
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
  storyArtifacts: Array<{
    storyId: string;
    storyTitle: string;
    artifactId: string;
    artifactName: string;
  }>;
  albums: Album[];
  storyCategories: StoryCategory[];
  albumMedia: Array<{
    albumId: string;
    albumName: string;
    mediaId: string;
    displayOrder: number;
  }>;
  albumFamilyGroups: Array<{
    albumId: string;
    albumName: string;
    familyGroupId: string;
    familyGroupName: string;
  }>;
  albumFamilyMembers: Array<{
    albumId: string;
    albumName: string;
    familyMemberId: string;
    familyMemberName: string;
  }>;
  albumStoryCategories: Array<{
    albumId: string;
    albumName: string;
    storyCategoryId: string;
    storyCategoryName: string;
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
          family_stories!inner(title),
          family_members!inner(first_name, last_name)
        `);

      if (storyMembersError) {
        console.error('Error fetching story-members links:', storyMembersError);
      }

      // Fetch story-artifacts links
      const { data: storyArtifactsLinks, error: storyArtifactsError } = await supabase
        .from('story_artifacts')
        .select(`
          story_id,
          artifact_id,
          family_stories!inner(title),
          artifacts!inner(name)
        `);

      if (storyArtifactsError) {
        console.error('Error fetching story-artifacts links:', storyArtifactsError);
      }

      // Format relationships with member names, deduplicating reciprocals
      // We only want to export one direction per relationship to avoid confusion during import
      interface RelationWithMembers {
        id: string;
        from_member_id: string;
        to_member_id: string;
        relation_type: string;
        from_member: { first_name: string; last_name: string } | null;
        to_member: { first_name: string; last_name: string } | null;
      }
      
      // Track which relationship pairs we've already exported to avoid duplicates
      const exportedPairs = new Set<string>();
      
      const formattedRelations = (relations || [])
        .filter((rel: RelationWithMembers) => {
          // Create a normalized key for this relationship pair
          // For parent/child, we normalize to parent direction
          // For spouse/sibling, we use sorted IDs
          let normalizedKey: string;
          
          if (rel.relation_type === 'parent') {
            // Parent relationship: from_member is parent of to_member
            normalizedKey = `${rel.from_member_id}-parent-${rel.to_member_id}`;
          } else if (rel.relation_type === 'child') {
            // Child relationship: from_member is child of to_member
            // Normalize to parent direction: to_member is parent of from_member
            normalizedKey = `${rel.to_member_id}-parent-${rel.from_member_id}`;
          } else {
            // Spouse/sibling: use sorted IDs
            const sortedIds = [rel.from_member_id, rel.to_member_id].sort();
            normalizedKey = `${sortedIds[0]}-${rel.relation_type}-${sortedIds[1]}`;
          }
          
          if (exportedPairs.has(normalizedKey)) {
            return false; // Skip this duplicate
          }
          
          exportedPairs.add(normalizedKey);
          return true;
        })
        .map((rel: RelationWithMembers) => ({
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
        role: 'participant' // Default role since story_members table doesn't have a role column
      }));

      // Format story-artifacts
      const formattedStoryArtifacts = (storyArtifactsLinks || []).map((sa: any) => ({
        storyId: sa.story_id,
        storyTitle: sa.family_stories?.title || 'Unknown Story',
        artifactId: sa.artifact_id,
        artifactName: sa.artifacts?.name || 'Unknown Artifact'
      }));

      // Fetch all albums with relationships
      const albums = await albumService.getAllAlbums();

      // Fetch story categories
      const { data: storyCategoriesData, error: categoriesError } = await (supabase
        .from('story_categories' as any)
        .select('*')
        .order('name', { ascending: true }) as any);

      if (categoriesError) {
        console.error('Error fetching story categories:', categoriesError);
      }

      // Fetch album-media relationships
      const { data: albumMediaData, error: albumMediaError } = await (supabase
        .from('album_media' as any)
        .select(`
          album_id,
          media_id,
          display_order,
          albums!inner(name)
        `) as any);

      if (albumMediaError) {
        console.error('Error fetching album-media links:', albumMediaError);
      }

      // Format album-media relationships
      const formattedAlbumMedia = (albumMediaData || []).map((am: any) => ({
        albumId: am.album_id,
        albumName: am.albums?.name || 'Unknown Album',
        mediaId: am.media_id,
        displayOrder: am.display_order || 0
      }));

      // Fetch album-family group relationships
      const { data: albumFamilyGroupsData, error: albumFamilyGroupsError } = await (supabase
        .from('album_family_groups' as any)
        .select(`
          album_id,
          family_group_id,
          albums!inner(name),
          family_groups!inner(name)
        `) as any);

      if (albumFamilyGroupsError) {
        console.error('Error fetching album-family group links:', albumFamilyGroupsError);
      }

      // Format album-family group relationships
      const formattedAlbumFamilyGroups = (albumFamilyGroupsData || []).map((afg: any) => ({
        albumId: afg.album_id,
        albumName: afg.albums?.name || 'Unknown Album',
        familyGroupId: afg.family_group_id,
        familyGroupName: afg.family_groups?.name || 'Unknown Group'
      }));

      // Fetch album-family member relationships
      const { data: albumFamilyMembersData, error: albumFamilyMembersError } = await (supabase
        .from('album_family_members' as any)
        .select(`
          album_id,
          family_member_id,
          albums!inner(name),
          family_members!inner(first_name, last_name)
        `) as any);

      if (albumFamilyMembersError) {
        console.error('Error fetching album-family member links:', albumFamilyMembersError);
      }

      // Format album-family member relationships
      const formattedAlbumFamilyMembers = (albumFamilyMembersData || []).map((afm: any) => ({
        albumId: afm.album_id,
        albumName: afm.albums?.name || 'Unknown Album',
        familyMemberId: afm.family_member_id,
        familyMemberName: afm.family_members
          ? `${afm.family_members.first_name} ${afm.family_members.last_name}`
          : 'Unknown'
      }));

      // Fetch album-story category relationships
      const { data: albumStoryCategoriesData, error: albumStoryCategoriesError } = await (supabase
        .from('album_story_categories' as any)
        .select(`
          album_id,
          story_category_id,
          albums!inner(name),
          story_categories!inner(name)
        `) as any);

      if (albumStoryCategoriesError) {
        console.error('Error fetching album-story category links:', albumStoryCategoriesError);
      }

      // Format album-story category relationships
      const formattedAlbumStoryCategories = (albumStoryCategoriesData || []).map((asc: any) => ({
        albumId: asc.album_id,
        albumName: asc.albums?.name || 'Unknown Album',
        storyCategoryId: asc.story_category_id,
        storyCategoryName: asc.story_categories?.name || 'Unknown Category'
      }));

      // Format story categories
      const formattedStoryCategories: StoryCategory[] = (storyCategoriesData || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || undefined,
        createdAt: cat.created_at || new Date().toISOString()
      }));

      setExportData({
        familyMembers: members,
        relationships: formattedRelations,
        stories: stories,
        locations: formattedLocations,
        media: mediaReferences,
        artifacts: artifacts,
        storyMembers: formattedStoryMembers,
        storyArtifacts: formattedStoryArtifacts,
        albums: albums,
        storyCategories: formattedStoryCategories,
        albumMedia: formattedAlbumMedia,
        albumFamilyGroups: formattedAlbumFamilyGroups,
        albumFamilyMembers: formattedAlbumFamilyMembers,
        albumStoryCategories: formattedAlbumStoryCategories
      });

      toast({
        title: "Data Loaded",
        description: `Found ${members.length} members, ${formattedRelations.length} relationships, ${stories.length} stories, ${formattedLocations.length} locations, ${mediaReferences.length} media references, ${artifacts.length} artifacts, ${formattedStoryMembers.length} story-member connections, ${formattedStoryArtifacts.length} story-artifact connections, ${albums.length} albums, ${formattedStoryCategories.length} story categories, ${formattedAlbumMedia.length} album-media links, ${formattedAlbumFamilyGroups.length} album-family group links, ${formattedAlbumFamilyMembers.length} album-family member links, and ${formattedAlbumStoryCategories.length} album-story category links.`
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
          id: story.id,
          title: story.title,
          content: story.content,
          date: story.date || null,
          location: story.location || null,
          lat: story.lat || null,
          lng: story.lng || null,
          authorId: story.authorId || null,
          category: (story as any).category || null,
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
        })),
        storyArtifacts: exportData.storyArtifacts.map(sa => ({
          storyId: sa.storyId,
          artifactId: sa.artifactId
        })),
        albums: exportData.albums.map(album => ({
          id: album.id,
          name: album.name,
          description: album.description || null,
          coverMediaId: album.coverMediaId || null
        })),
        storyCategories: exportData.storyCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || null
        })),
        albumMedia: exportData.albumMedia.map(am => ({
          albumId: am.albumId,
          mediaId: am.mediaId,
          displayOrder: am.displayOrder
        })),
        albumFamilyGroups: exportData.albumFamilyGroups.map(afg => ({
          albumId: afg.albumId,
          familyGroupId: afg.familyGroupId
        })),
        albumFamilyMembers: exportData.albumFamilyMembers.map(afm => ({
          albumId: afm.albumId,
          familyMemberId: afm.familyMemberId
        })),
        albumStoryCategories: exportData.albumStoryCategories.map(asc => ({
          albumId: asc.albumId,
          storyCategoryId: asc.storyCategoryId
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
        ['story_id', 'story_title', 'story_content', 'story_date', 'location', 'lat', 'lng', 'author_id', 'category'],
        ...exportData.stories.map(story => [
          story.id,
          story.title,
          story.content,
          story.date || '',
          story.location || '',
          story.lat || '',
          story.lng || '',
          story.authorId || '',
          (story as any).category || ''
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

      // Story-Artifacts sheet
      const storyArtifactsData = [
        ['story_id', 'story_title', 'artifact_id', 'artifact_name'],
        ...exportData.storyArtifacts.map(sa => [
          sa.storyId,
          sa.storyTitle,
          sa.artifactId,
          sa.artifactName
        ])
      ];
      
      const storyArtifactsSheet = XLSX.utils.aoa_to_sheet(storyArtifactsData);
      XLSX.utils.book_append_sheet(workbook, storyArtifactsSheet, 'Story Artifacts');
      
      // Albums sheet
      const albumsData = [
        ['album_id', 'name', 'description', 'cover_media_id'],
        ...exportData.albums.map(album => [
          album.id,
          album.name,
          album.description || '',
          album.coverMediaId || ''
        ])
      ];
      
      const albumsSheet = XLSX.utils.aoa_to_sheet(albumsData);
      XLSX.utils.book_append_sheet(workbook, albumsSheet, 'Albums');
      
      // Story Categories sheet
      const storyCategoriesData = [
        ['category_id', 'name', 'description'],
        ...exportData.storyCategories.map(cat => [
          cat.id,
          cat.name,
          cat.description || ''
        ])
      ];
      
      const storyCategoriesSheet = XLSX.utils.aoa_to_sheet(storyCategoriesData);
      XLSX.utils.book_append_sheet(workbook, storyCategoriesSheet, 'Story Categories');
      
      // Album-Media sheet
      const albumMediaData = [
        ['album_id', 'album_name', 'media_id', 'display_order'],
        ...exportData.albumMedia.map(am => [
          am.albumId,
          am.albumName,
          am.mediaId,
          am.displayOrder
        ])
      ];
      
      const albumMediaSheet = XLSX.utils.aoa_to_sheet(albumMediaData);
      XLSX.utils.book_append_sheet(workbook, albumMediaSheet, 'Album Media');
      
      // Album-Family Groups sheet
      const albumFamilyGroupsData = [
        ['album_id', 'album_name', 'family_group_id', 'family_group_name'],
        ...exportData.albumFamilyGroups.map(afg => [
          afg.albumId,
          afg.albumName,
          afg.familyGroupId,
          afg.familyGroupName
        ])
      ];
      
      const albumFamilyGroupsSheet = XLSX.utils.aoa_to_sheet(albumFamilyGroupsData);
      XLSX.utils.book_append_sheet(workbook, albumFamilyGroupsSheet, 'Album Family Groups');
      
      // Album-Family Members sheet
      const albumFamilyMembersData = [
        ['album_id', 'album_name', 'family_member_id', 'family_member_name'],
        ...exportData.albumFamilyMembers.map(afm => [
          afm.albumId,
          afm.albumName,
          afm.familyMemberId,
          afm.familyMemberName
        ])
      ];
      
      const albumFamilyMembersSheet = XLSX.utils.aoa_to_sheet(albumFamilyMembersData);
      XLSX.utils.book_append_sheet(workbook, albumFamilyMembersSheet, 'Album Family Members');
      
      // Album-Story Categories sheet
      const albumStoryCategoriesData = [
        ['album_id', 'album_name', 'story_category_id', 'story_category_name'],
        ...exportData.albumStoryCategories.map(asc => [
          asc.albumId,
          asc.albumName,
          asc.storyCategoryId,
          asc.storyCategoryName
        ])
      ];
      
      const albumStoryCategoriesSheet = XLSX.utils.aoa_to_sheet(albumStoryCategoriesData);
      XLSX.utils.book_append_sheet(workbook, albumStoryCategoriesSheet, 'Album Categories');
      
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
                  {exportData.artifacts.length} artifacts, {exportData.storyMembers.length} story-member connections,
                  {exportData.albums.length} albums, {exportData.storyCategories.length} story categories,
                  {exportData.albumMedia.length} album-media links, {exportData.albumFamilyGroups.length} album-family group links,
                  {exportData.albumFamilyMembers.length} album-family member links, and {exportData.albumStoryCategories.length} album-story category links.
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
                      <span className="font-medium">Story-Member Connections</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.storyMembers.length}</p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Story-Artifact Connections</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.storyArtifacts.length}</p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Albums</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.albums.length}</p>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {exportData.albums.slice(0, 5).map((album, index) => (
                        <div key={index} className="text-sm text-gray-600 truncate">
                          {album.name}
                        </div>
                      ))}
                      {exportData.albums.length > 5 && (
                        <div className="text-xs text-gray-400">
                          +{exportData.albums.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Story Categories</span>
                    </div>
                    <p className="text-2xl font-bold text-heritage-purple">{exportData.storyCategories.length}</p>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {exportData.storyCategories.slice(0, 5).map((cat, index) => (
                        <div key={index} className="text-sm text-gray-600 truncate">
                          {cat.name}
                        </div>
                      ))}
                      {exportData.storyCategories.length > 5 && (
                        <div className="text-xs text-gray-400">
                          +{exportData.storyCategories.length - 5} more
                        </div>
                      )}
                    </div>
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

