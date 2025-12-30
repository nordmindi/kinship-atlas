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
import { familyMemberService } from '@/services/familyMemberService';
import { storyService } from '@/services/storyService';
import { supabase } from '@/integrations/supabase/client';

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

      // Fetch stories
      const stories = await storyService.getAllStories();

      // Format relationships with member names
      const formattedRelations = (relations || []).map((rel: any) => ({
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

      setExportData({
        familyMembers: members,
        relationships: formattedRelations,
        stories: stories
      });

      toast({
        title: "Data Loaded",
        description: `Found ${members.length} members, ${formattedRelations.length} relationships, and ${stories.length} stories.`
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
          authorId: story.authorId || null
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
        ['first_name', 'last_name', 'birth_date', 'death_date', 'birth_place', 'bio', 'gender', 'lat', 'lng', 'location_description'],
        ...exportData.familyMembers.map(member => [
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
        ['from_member', 'to_member', 'relationship_type'],
        ...exportData.relationships.map(rel => [
          rel.fromMemberName,
          rel.toMemberName,
          rel.relationshipType
        ])
      ];
      
      const relationshipsSheet = XLSX.utils.aoa_to_sheet(relationshipsData);
      XLSX.utils.book_append_sheet(workbook, relationshipsSheet, 'Relationships');
      
      // Stories sheet
      const storiesData = [
        ['story_title', 'story_content', 'story_date', 'author_id'],
        ...exportData.stories.map(story => [
          story.title,
          story.content,
          story.date || '',
          story.authorId || ''
        ])
      ];
      
      const storiesSheet = XLSX.utils.aoa_to_sheet(storiesData);
      XLSX.utils.book_append_sheet(workbook, storiesSheet, 'Stories');
      
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
                  {exportData.relationships.length} relationships, and {exportData.stories.length} stories.
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

