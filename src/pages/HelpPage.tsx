import React, { useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  BookOpen, 
  Archive, 
  Image, 
  Network, 
  Map, 
  FolderTree,
  Clock,
  Upload,
  Download,
  Search,
  UserPlus,
  Link as LinkIcon,
  FileText,
  HelpCircle,
  ArrowRight,
  Eye,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

const HelpPage = () => {
  const navigate = useNavigate();
  const { isEditor, isAdmin, isViewer, role } = useAuth();
  const { canAddFamilyMember, canCreateStory, canUploadMedia, canManageUsers } = usePermissions();

  // Filter sections based on user role
  const helpSections = useMemo(() => {
    const allSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <HelpCircle className="h-6 w-6 text-heritage-purple" />,
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Kinship Atlas is a comprehensive platform for preserving and sharing your family history. 
            You can document family members, their relationships, stories, artifacts, and media all in one place.
          </p>
          <div className="bg-heritage-purple-light/10 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Your Role</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Viewer:</strong> Can view all family information, stories, and media</li>
              <li><strong>Editor:</strong> Can add, edit, and manage family members, stories, artifacts, and media</li>
              <li><strong>Admin:</strong> Full access including user management and data import/export</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'family-members',
      title: 'Family Members',
      icon: <Users className="h-6 w-6 text-heritage-purple" />,
      route: '/add-family-member',
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Family members are the foundation of your family tree. Each member can have:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Basic Information:</strong> First name, last name, birth date, death date, and gender</li>
            <li><strong>Location Data:</strong> Birth place, death place, and current residence</li>
            <li><strong>Biography:</strong> Personal history and background information</li>
            <li><strong>Profile Photo:</strong> Upload an avatar image for each family member</li>
          </ul>
          {isViewer ? (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Viewing Family Members</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Browse all family members from the Home page or Family Tree</li>
                <li>Click on any family member to view their profile</li>
                <li>See relationships, stories, and media associated with each member</li>
                <li>Use the search bar to find specific family members</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">How to Add a Family Member</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click the "+" button in the bottom right corner</li>
                  <li>Select "Add Family Member"</li>
                  <li>Fill in the required information (name is required)</li>
                  <li>Optionally add birth date, location, and biography</li>
                  <li>Upload a profile photo if available</li>
                  <li>Click "Create Family Member"</li>
                </ol>
              </div>
              {canAddFamilyMember() && (
                <Button 
                  onClick={() => navigate('/add-family-member')}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Try Adding a Family Member
                </Button>
              )}
            </>
          )}
        </div>
      )
    },
    {
      id: 'relationships',
      title: 'Relationships',
      icon: <LinkIcon className="h-6 w-6 text-heritage-purple" />,
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Family members are connected through relationships. You can see these relationship types:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Parent:</strong> Parent-child relationships</li>
            <li><strong>Child:</strong> Child-parent relationships</li>
            <li><strong>Spouse:</strong> Married or partnered individuals</li>
            <li><strong>Sibling:</strong> Brothers and sisters</li>
          </ul>
          {isViewer ? (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Viewing Relationships</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>View relationships on family member profile pages</li>
                <li>See relationship connections in the Family Tree view</li>
                <li>Navigate between related family members</li>
              </ul>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">How to Add a Relationship</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Navigate to a family member's profile page</li>
                <li>Click on the relationship section</li>
                <li>Select the type of relationship you want to add</li>
                <li>Choose an existing family member or create a new one</li>
                <li>Optionally add a date (e.g., marriage date)</li>
                <li>Save the relationship</li>
              </ol>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'stories',
      title: 'Stories',
      icon: <BookOpen className="h-6 w-6 text-heritage-purple" />,
      route: '/add-story',
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Stories help preserve your family's memories and history. You can {isViewer ? 'view' : 'document'}:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Family Events:</strong> Weddings, holidays, reunions, and celebrations</li>
            <li><strong>Personal Memories:</strong> Anecdotes, achievements, and life experiences</li>
            <li><strong>Historical Events:</strong> Family involvement in historical moments</li>
            <li><strong>Legacy Stories:</strong> Important family traditions and values</li>
          </ul>
          {isViewer ? (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Viewing Stories</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Browse all stories from the Stories page or Home page</li>
                <li>Click on any story to read the full content</li>
                <li>View photos and media attached to stories</li>
                <li>See which family members are linked to each story</li>
                <li>Use the search bar to find specific stories</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">How to Create a Story</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click the "+" button and select "Add Story"</li>
                  <li>Enter a title for your story</li>
                  <li>Write the story content (supports rich text formatting)</li>
                  <li>Add a date when the event occurred</li>
                  <li>Link the story to relevant family members</li>
                  <li>Upload photos or documents to accompany the story</li>
                  <li>Click "Create Story" to save</li>
                </ol>
              </div>
              {canCreateStory() && (
                <Button 
                  onClick={() => navigate('/add-story')}
                  className="w-full"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Try Creating a Story
                </Button>
              )}
            </>
          )}
        </div>
      )
    },
    {
      id: 'artifacts',
      title: 'Artifacts',
      icon: <Archive className="h-6 w-6 text-heritage-purple" />,
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Artifacts are physical items that hold family significance. {isViewer ? 'You can view' : 'You can document'}:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Heirlooms:</strong> Jewelry, furniture, and family treasures</li>
            <li><strong>Documents:</strong> Certificates, letters, and important papers</li>
            <li><strong>Photographs:</strong> Physical photos and albums</li>
            <li><strong>Other Items:</strong> Any object with family meaning</li>
          </ul>
          {isViewer ? (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Viewing Artifacts</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>View artifacts linked to stories on story detail pages</li>
                <li>See artifact photos and descriptions</li>
                <li>Learn about artifact history and significance</li>
              </ul>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">How to Add an Artifact</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>When creating or editing a story, look for the "Artifacts" section</li>
                <li>Click "Add Artifact" or "Create New Artifact"</li>
                <li>Enter the artifact name and description</li>
                <li>Select the artifact type (document, heirloom, photo, etc.)</li>
                <li>Add dates (when created, when acquired)</li>
                <li>Upload photos of the artifact</li>
                <li>Link the artifact to relevant stories or family members</li>
              </ol>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'media',
      title: 'Media & Photos',
      icon: <Image className="h-6 w-6 text-heritage-purple" />,
      route: '/albums',
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            {isViewer ? 'View and browse' : 'Upload and organize'} photos, videos, audio recordings, and documents:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Photos:</strong> Family pictures, portraits, and event photos</li>
            <li><strong>Videos:</strong> Recorded memories and events</li>
            <li><strong>Audio:</strong> Voice recordings and interviews</li>
            <li><strong>Documents:</strong> Scanned letters, certificates, and records</li>
          </ul>
          {isViewer ? (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Viewing Media</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Browse all media from the Albums page</li>
                <li>View photos and videos attached to stories</li>
                <li>See media linked to family members</li>
                <li>View artifact photos</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">How to Upload Media</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Navigate to the Albums page or when creating a story</li>
                  <li>Click "Upload" or drag and drop files</li>
                  <li>Select your media files (images, videos, audio, or documents)</li>
                  <li>Add captions or descriptions</li>
                  <li>Files are automatically organized by type</li>
                  <li>Link media to family members, stories, or artifacts</li>
                </ol>
                <p className="text-xs mt-2 text-muted-foreground">
                  <strong>Note:</strong> Maximum file size is 5MB per file. Supported formats: JPG, PNG, GIF, MP4, MP3, PDF, and more.
                </p>
              </div>
              {canUploadMedia() && (
                <Button 
                  onClick={() => navigate('/albums')}
                  className="w-full"
                >
                  <Image className="h-4 w-4 mr-2" />
                  View Albums
                </Button>
              )}
            </>
          )}
          {isViewer && (
            <Button 
              onClick={() => navigate('/albums')}
              variant="outline"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Albums
            </Button>
          )}
        </div>
      )
    },
    {
      id: 'family-tree',
      title: 'Family Tree',
      icon: <Network className="h-6 w-6 text-heritage-purple" />,
      route: '/family-tree',
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            The Family Tree provides a visual representation of your family relationships:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Interactive View:</strong> Navigate and explore your family tree</li>
            <li><strong>Relationship Lines:</strong> See how family members are connected</li>
            <li><strong>Member Profiles:</strong> Click on any member to view their details</li>
            <li><strong>Filtering:</strong> Filter by family groups or search for specific members</li>
            <li><strong>Focus Mode:</strong> Focus on a specific branch of the family</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Using the Family Tree</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Click on any family member node to view their profile</li>
              <li>Use zoom controls to adjust the view</li>
              <li>Drag nodes to reorganize the layout</li>
              <li>Use the search bar to find specific members</li>
              <li>Filter by family groups to see specific branches</li>
              <li>Toggle legend and minimap for better navigation</li>
            </ul>
          </div>
          <Button 
            onClick={() => navigate('/family-tree')}
            className="w-full"
          >
            <Network className="h-4 w-4 mr-2" />
            View Family Tree
          </Button>
        </div>
      )
    },
    {
      id: 'family-groups',
      title: 'Family Groups',
      icon: <FolderTree className="h-6 w-6 text-heritage-purple" />,
      route: '/family-groups',
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Family groups help organize your family into branches for easier {isViewer ? 'viewing' : 'management and filtering'}:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            {!isViewer && (
              <>
                <li><strong>Create Groups:</strong> Organize by family branches (e.g., "Mother's Side", "Father's Side")</li>
                <li><strong>Assign Members:</strong> Add family members to specific groups</li>
              </>
            )}
            <li><strong>Filter Views:</strong> Use groups to filter family tree and member lists</li>
            <li><strong>Group Stories:</strong> Link stories to specific family groups</li>
          </ul>
          {isViewer ? (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Using Family Groups</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>View family groups on the Family Groups page</li>
                <li>Filter the family tree by specific groups</li>
                <li>See which members belong to each group</li>
              </ul>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">How to Use Family Groups</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Navigate to the Family Groups page</li>
                <li>Click "Create New Group"</li>
                <li>Enter a group name and description</li>
                <li>Add family members to the group</li>
                <li>Use groups to filter views in the family tree</li>
              </ol>
            </div>
          )}
          <Button 
            onClick={() => navigate('/family-groups')}
            variant={isViewer ? "outline" : "default"}
            className="w-full"
          >
            <FolderTree className="h-4 w-4 mr-2" />
            View Family Groups
          </Button>
        </div>
      )
    },
    {
      id: 'map',
      title: 'Family Map',
      icon: <Map className="h-6 w-6 text-heritage-purple" />,
      route: '/map',
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Visualize family locations on an interactive map:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Birth Places:</strong> See where family members were born</li>
            <li><strong>Current Locations:</strong> Track where family members live now</li>
            <li><strong>Story Locations:</strong> View where family events occurred</li>
            <li><strong>Migration Patterns:</strong> Understand family movement over time</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Using the Map</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Click on map markers to see family member details</li>
              <li>Zoom in/out to explore different regions</li>
              <li>Filter by family groups to see specific branches</li>
              <li>View timeline of locations over time</li>
            </ul>
          </div>
          <Button 
            onClick={() => navigate('/map')}
            className="w-full"
          >
            <Map className="h-4 w-4 mr-2" />
            View Family Map
          </Button>
        </div>
      )
    },
    {
      id: 'timeline',
      title: 'Timeline',
      icon: <Clock className="h-6 w-6 text-heritage-purple" />,
      route: '/timeline',
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            View a chronological timeline of family events and stories:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Stories:</strong> All family stories organized by date</li>
            <li><strong>Events:</strong> Important family events and milestones</li>
            <li><strong>Member Timeline:</strong> View timeline for a specific family member</li>
            <li><strong>Filtering:</strong> Filter by date range or family member</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Using the Timeline</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Navigate to the Timeline page</li>
              <li>Scroll through chronological events</li>
              <li>Click on any item to view details</li>
              <li>Filter by family member or date range</li>
            </ul>
          </div>
          <Button 
            onClick={() => navigate('/timeline')}
            className="w-full"
          >
            <Clock className="h-4 w-4 mr-2" />
            View Timeline
          </Button>
        </div>
      )
    },
    {
      id: 'search',
      title: 'Search',
      icon: <Search className="h-6 w-6 text-heritage-purple" />,
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Quickly find family members, stories, and information:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Search Bar:</strong> Located at the top of the home page</li>
            <li><strong>Family Members:</strong> Search by name</li>
            <li><strong>Stories:</strong> Search by title or content</li>
            <li><strong>Real-time Results:</strong> See results as you type</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Search Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Type any part of a name to find family members</li>
              <li>Search for keywords in story titles or content</li>
              <li>Results update automatically as you type</li>
              <li>Click on any result to view details</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'import-export',
      title: 'Import & Export',
      icon: <Upload className="h-6 w-6 text-heritage-purple" />,
      showForRoles: ['editor', 'admin'],
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Import existing family data or export your family tree:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Import:</strong> Upload Excel or JSON files with family data</li>
            <li><strong>Export:</strong> Download your family tree as Excel or JSON</li>
            <li><strong>Backup:</strong> Export your data for backup purposes</li>
            <li><strong>Migration:</strong> Import data from other genealogy tools</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Import/Export Features</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Supported Formats:</strong> Excel (.xlsx) and JSON</li>
              <li><strong>Import Data:</strong> Family members, relationships, stories, and locations</li>
              <li><strong>Export Data:</strong> Complete family tree with all relationships</li>
              <li><strong>Templates:</strong> Download import templates for easy data entry</li>
            </ul>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button 
                onClick={() => navigate('/import-family-data')}
                variant="outline"
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            )}
            {(isEditor || isAdmin) && (
              <Button 
                onClick={() => navigate('/export-family-data')}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Tips & Best Practices',
      icon: <FileText className="h-6 w-6 text-heritage-purple" />,
      showForRoles: ['viewer', 'editor', 'admin'],
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-green-800">Getting Started</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                <li>Start with yourself or a known ancestor</li>
                <li>Add relationships as you add family members</li>
                <li>Upload photos as you go - they bring stories to life</li>
                <li>Document stories while memories are fresh</li>
              </ul>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-blue-800">Organization</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                <li>Use family groups to organize large families</li>
                <li>Add dates to stories for better timeline organization</li>
                <li>Link artifacts to relevant stories and members</li>
                <li>Use consistent naming conventions</li>
              </ul>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-purple-800">Data Quality</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
                <li>Verify information before adding it</li>
                <li>Add sources or notes when information is uncertain</li>
                <li>Regularly backup your data using export</li>
                <li>Keep media files organized with descriptive names</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

    // Filter sections based on user role
    return allSections.filter(section => {
      if (!section.showForRoles) return true;
      return section.showForRoles.includes(role || 'viewer');
    });
  }, [role, isViewer, isEditor, isAdmin]);

  return (
    <MobileLayout title="Help & Guide" icon={<HelpCircle className="h-6 w-6" />}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-heritage-dark mb-2">Help & User Guide</h1>
          <p className="text-muted-foreground">
            Learn how to use Kinship Atlas to preserve and share your family history
          </p>
        </div>

        <div className="space-y-6">
          {helpSections.map((section, index) => (
            <Card key={section.id} className="border-heritage-purple/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {section.icon}
                  <div className="flex-1">
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.content}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links Section */}
        <Card className="mt-8 border-heritage-purple/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-heritage-purple" />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/family-tree')}
                className="justify-start"
              >
                <Network className="h-4 w-4 mr-2" />
                Family Tree
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/stories')}
                className="justify-start"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Stories
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/albums')}
                className="justify-start"
              >
                <Image className="h-4 w-4 mr-2" />
                Albums
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/map')}
                className="justify-start"
              >
                <Map className="h-4 w-4 mr-2" />
                Map
              </Button>
              {!isViewer && canAddFamilyMember() && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/add-family-member')}
                  className="justify-start"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Family Member
                </Button>
              )}
              {!isViewer && canCreateStory() && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/add-story')}
                  className="justify-start"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Add Story
                </Button>
              )}
              {isAdmin && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/admin')}
                  className="justify-start"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="mt-8 bg-heritage-purple-light/10 border-heritage-purple/20">
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you need additional assistance or have questions about using Kinship Atlas, 
              please contact your administrator or refer to the onboarding tutorial in your profile settings.
            </p>
            {isEditor && (
              <Button 
                variant="outline"
                onClick={() => navigate('/profile')}
                className="w-full"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                View Onboarding Tutorial
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default HelpPage;
