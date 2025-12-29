import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Users,
  Link,
  BookOpen,
  X,
  Eye,
  Play
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FamilyMember, Relation, FamilyStory } from '@/types';
import { familyMemberService } from '@/services/familyMemberService';
import { familyRelationshipManager } from '@/services/familyRelationshipManager';
import { supabase } from '@/integrations/supabase/client';

interface ImportData {
  familyMembers: FamilyMember[];
  relationships: Relation[];
  stories: FamilyStory[];
}

interface ImportResult {
  success: boolean;
  imported: {
    members: number;
    relationships: number;
    stories: number;
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
  const [previewMode, setPreviewMode] = useState<'members' | 'relationships' | 'stories'>('members');

  // File parsing functions
  const parseExcelFile = useCallback(async (file: File): Promise<ImportData> => {
    const familyMembers: FamilyMember[] = [];
    const relationships: Relation[] = [];
    const stories: FamilyStory[] = [];

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

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('No data found in file'));
            return;
          }

          // Parse Excel file
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            reject(new Error('File must contain at least a header row and one data row'));
            return;
          }

          const headers = (jsonData[0] as string[]).map(h => h?.toString().toLowerCase().trim() || '');
          
          // Parse each row
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as unknown[];
            if (!row || row.length === 0) continue;

            const rowData: Record<string, string> = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index]?.toString().trim() || '';
            });

            // Parse family member data
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

            // Parse relationship data (if present)
            if (rowData.from_member && rowData.to_member && rowData.relationship_type) {
              const relationship: Relation = {
                id: `temp_rel_${i}`,
                type: rowData.relationship_type as 'parent' | 'child' | 'spouse' | 'sibling',
                personId: rowData.to_member
              };
              relationships.push(relationship);
            }

            // Parse story data (if present)
            if (rowData.story_title && rowData.story_content) {
              const story: FamilyStory = {
                id: `temp_story_${i}`,
                title: rowData.story_title,
                content: rowData.story_content,
                date: rowData.story_date || undefined,
                authorId: rowData.author_id || undefined,
                relatedMembers: []
              };
              stories.push(story);
            }
          }

          resolve({ familyMembers, relationships, stories });
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
      stories: data.stories || []
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
        description: `Found ${data.familyMembers.length} members, ${data.relationships.length} relationships, and ${data.stories.length} stories.`
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

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
      imported: { members: 0, relationships: 0, stories: 0 },
      errors: [],
      warnings: []
    };

    // Check for duplicates within the import data
    const duplicateCheck = checkImportDuplicates(importData);
    result.warnings.push(...duplicateCheck.warnings);

    try {
      const totalItems = importData.familyMembers.length + 
                        importData.relationships.length + 
                        importData.stories.length;
      let processedItems = 0;

      // Import family members
      for (const member of importData.familyMembers) {
        try {
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

          if (response.success) {
            result.imported.members++;
            // Update the member ID for relationship creation
            member.id = response.member!.id;
          } else {
            console.log('❌ Import failed for', member.firstName, member.lastName, ':', response.error);
            result.errors.push(`Failed to import ${member.firstName} ${member.lastName}: ${response.error}`);
          }
        } catch (error) {
          result.errors.push(`Error importing ${member.firstName} ${member.lastName}: ${error}`);
        }

        processedItems++;
        setImportProgress((processedItems / totalItems) * 100);
      }

      // Import relationships
      for (const relationship of importData.relationships) {
        try {
          const response = await familyRelationshipManager.createRelationship({
            fromMemberId: relationship.personId,
            toMemberId: relationship.id,
            relationshipType: relationship.type
          });

          if (response.success) {
            result.imported.relationships++;
          } else {
            result.errors.push(`Failed to import relationship: ${response.error}`);
          }
        } catch (error) {
          result.errors.push(`Error importing relationship: ${error}`);
        }

        processedItems++;
        setImportProgress((processedItems / totalItems) * 100);
      }

      // Import stories
      for (const story of importData.stories) {
        try {
          const { error } = await supabase
            .from('family_stories')
            .insert({
              title: story.title,
              content: story.content,
              date: story.date,
              author_id: story.authorId
            });

          if (!error) {
            result.imported.stories++;
          } else {
            result.errors.push(`Failed to import story "${story.title}": ${error.message}`);
          }
        } catch (error) {
          result.errors.push(`Error importing story "${story.title}": ${error}`);
        }

        processedItems++;
        setImportProgress((processedItems / totalItems) * 100);
      }

      result.success = result.errors.length === 0;
      setImportResult(result);
      setIsImporting(false);

      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${result.imported.members} members, ${result.imported.relationships} relationships, and ${result.imported.stories} stories.`
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
  }, [importData, onImportComplete]);

  // Download template
  const downloadTemplate = useCallback((type: 'excel' | 'json') => {
    if (type === 'json') {
      const template = {
        familyMembers: [
          {
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
            authorId: "user_id"
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
        ['first_name', 'last_name', 'birth_date', 'death_date', 'birth_place', 'bio', 'gender', 'lat', 'lng', 'location_description'],
        ['John', 'Smith', '1950-03-15', '', 'New York, NY', 'Family patriarch and loving father', 'male', '40.7128', '-74.0060', 'New York City, NY, USA'],
        ['Mary', 'Smith', '1952-07-22', '', 'Boston, MA', 'Devoted mother and grandmother', 'female', '42.3601', '-71.0589', 'Boston, MA, USA'],
        ['David', 'Smith', '1975-11-08', '', 'New York, NY', 'Software engineer and family man', 'male', '37.7749', '-122.4194', 'San Francisco, CA, USA']
      ];
      
      const membersSheet = XLSX.utils.aoa_to_sheet(membersData);
      XLSX.utils.book_append_sheet(workbook, membersSheet, 'Family Members');
      
      // Relationships sheet
      const relationshipsData = [
        ['from_member', 'to_member', 'relationship_type'],
        ['John Smith', 'Mary Smith', 'spouse'],
        ['John Smith', 'David Smith', 'parent'],
        ['Mary Smith', 'David Smith', 'parent']
      ];
      
      const relationshipsSheet = XLSX.utils.aoa_to_sheet(relationshipsData);
      XLSX.utils.book_append_sheet(workbook, relationshipsSheet, 'Relationships');
      
      // Stories sheet
      const storiesData = [
        ['story_title', 'story_content', 'story_date', 'author_id'],
        ['Family Reunion 2023', 'We had a wonderful family gathering at the lake house. Everyone came together to celebrate our heritage and create new memories.', '2023-07-15', 'user_id'],
        ['Wedding Day', 'The beautiful ceremony brought our families together in celebration of love and commitment.', '2020-06-20', 'user_id']
      ];
      
      const storiesSheet = XLSX.utils.aoa_to_sheet(storiesData);
      XLSX.utils.book_append_sheet(workbook, storiesSheet, 'Stories');
      
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
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-heritage-purple bg-heritage-purple-light' 
                    : 'border-gray-300 hover:border-heritage-purple'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">
                  {isDragActive ? 'Drop your file here' : 'Upload Family Data'}
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop your file here, or click to select
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    JSON
                  </div>
                  <div className="flex items-center gap-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel/CSV
                  </div>
                </div>
              </div>

              {importData && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      File parsed successfully! Found {importData.familyMembers.length} family members, 
                      {importData.relationships.length} relationships, and {importData.stories.length} stories.
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
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Importing data...</span>
                        <span>{Math.round(importProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-heritage-purple h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${importProgress}%` }}
                        ></div>
                      </div>
                    </div>
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
                        Complete JSON format including members, relationships, and stories.
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
                  <div className="flex gap-2">
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
                  </div>

                  <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
                    {previewMode === 'members' && (
                      <div className="space-y-2">
                        {importData.familyMembers.map((member, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                            <Badge variant="outline">{member.gender}</Badge>
                            <span className="font-medium">{member.firstName} {member.lastName}</span>
                            {member.birthDate && <span className="text-sm text-gray-500">Born: {member.birthDate}</span>}
                            {member.currentLocation && <span className="text-sm text-gray-500">📍 {member.currentLocation.description}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {previewMode === 'relationships' && (
                      <div className="space-y-2">
                        {importData.relationships.map((rel, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                            <Badge variant="outline">{rel.type}</Badge>
                            <span className="text-sm">Relationship between members</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {previewMode === 'stories' && (
                      <div className="space-y-2">
                        {importData.stories.map((story, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded">
                            <h4 className="font-medium">{story.title}</h4>
                            <p className="text-sm text-gray-600">{story.content.substring(0, 100)}...</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {importResult && (
            <div className="mt-6 space-y-4">
              <Alert variant={importResult.success ? "default" : "destructive"}>
                {importResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  Import completed! {importResult.imported.members} members, {importResult.imported.relationships} relationships, 
                  and {importResult.imported.stories} stories imported.
                  {importResult.errors.length > 0 && ` ${importResult.errors.length} errors occurred.`}
                </AlertDescription>
              </Alert>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Errors:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportFamilyData;
