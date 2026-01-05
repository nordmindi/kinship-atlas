import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Search, Filter, X } from 'lucide-react';
import { FamilyMember, UserProfile } from '@/types';

interface FamilyMembersTabProps {
  members: FamilyMember[];
  users: UserProfile[];
  searchQuery: string;
  onDelete: (memberId: string, memberName: string) => Promise<void>;
}

interface MemberFilters {
  gender: 'all' | 'male' | 'female' | 'other';
  rootMembers: 'all' | 'root' | 'non-root';
  relations: 'all' | 'has-relations' | 'no-relations';
  createdBy: string; // 'all' or userId
}

/**
 * Helper function to get creator display name
 */
const getCreatorName = (createdById: string | undefined, users: UserProfile[]): string => {
  if (!createdById) return 'Unknown';
  const creator = users.find(user => user.id === createdById);
  return creator?.displayName || creator?.id.substring(0, 8) || 'Unknown';
};

/**
 * Family members management tab component
 */
export const FamilyMembersTab: React.FC<FamilyMembersTabProps> = ({
  members,
  users,
  searchQuery,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MemberFilters>({
    gender: 'all',
    rootMembers: 'all',
    relations: 'all',
    createdBy: 'all',
  });

  // Combine global and local search queries
  const effectiveSearchQuery = localSearchQuery || searchQuery;

  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Apply search filter
    if (effectiveSearchQuery) {
      const query = effectiveSearchQuery.toLowerCase();
      filtered = filtered.filter(member => 
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query) ||
        member.birthPlace?.toLowerCase().includes(query) ||
        member.deathPlace?.toLowerCase().includes(query) ||
        member.bio?.toLowerCase().includes(query) ||
        member.currentLocation?.description?.toLowerCase().includes(query)
      );
    }

    // Apply gender filter
    if (filters.gender !== 'all') {
      filtered = filtered.filter(member => member.gender === filters.gender);
    }

    // Apply root members filter
    if (filters.rootMembers === 'root') {
      filtered = filtered.filter(member => member.isRootMember === true);
    } else if (filters.rootMembers === 'non-root') {
      filtered = filtered.filter(member => !member.isRootMember);
    }

    // Apply relations filter
    if (filters.relations === 'has-relations') {
      filtered = filtered.filter(member => (member.relations?.length || 0) > 0);
    } else if (filters.relations === 'no-relations') {
      filtered = filtered.filter(member => (member.relations?.length || 0) === 0);
    }

    // Apply creator filter
    if (filters.createdBy !== 'all') {
      filtered = filtered.filter(member => member.createdBy === filters.createdBy);
    }

    return filtered;
  }, [members, effectiveSearchQuery, filters]);

  const resetFilters = () => {
    setFilters({
      gender: 'all',
      rootMembers: 'all',
      relations: 'all',
      createdBy: 'all',
    });
    setLocalSearchQuery('');
  };

  const hasActiveFilters = filters.gender !== 'all' || 
    filters.rootMembers !== 'all' || 
    filters.relations !== 'all' || 
    filters.createdBy !== 'all' ||
    localSearchQuery !== '';

  // Get unique creators for filter dropdown
  const uniqueCreators = useMemo(() => {
    const creatorIds = new Set(members.map(m => m.createdBy).filter(Boolean));
    return Array.from(creatorIds).map(id => {
      const user = users.find(u => u.id === id);
      return { id: id!, name: user?.displayName || id!.substring(0, 8) || 'Unknown' };
    });
  }, [members, users]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family Members Management</CardTitle>
        <CardDescription>
          View and manage all family members
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, birth place, death place, bio, or location..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-8"
                  aria-label="Search family members"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {[
                      filters.gender !== 'all' && 1,
                      filters.rootMembers !== 'all' && 1,
                      filters.relations !== 'all' && 1,
                      filters.createdBy !== 'all' && 1,
                    ].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Gender Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="gender-filter">Gender</Label>
                    <Select
                      value={filters.gender}
                      onValueChange={(value: MemberFilters['gender']) =>
                        setFilters(prev => ({ ...prev, gender: value }))
                      }
                    >
                      <SelectTrigger id="gender-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Root Members Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="root-filter">Root Members</Label>
                    <Select
                      value={filters.rootMembers}
                      onValueChange={(value: MemberFilters['rootMembers']) =>
                        setFilters(prev => ({ ...prev, rootMembers: value }))
                      }
                    >
                      <SelectTrigger id="root-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        <SelectItem value="root">Root Members Only</SelectItem>
                        <SelectItem value="non-root">Non-Root Members</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Relations Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="relations-filter">Relations</Label>
                    <Select
                      value={filters.relations}
                      onValueChange={(value: MemberFilters['relations']) =>
                        setFilters(prev => ({ ...prev, relations: value }))
                      }
                    >
                      <SelectTrigger id="relations-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        <SelectItem value="has-relations">Has Relations</SelectItem>
                        <SelectItem value="no-relations">No Relations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Creator Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="creator-filter">Created By</Label>
                    <Select
                      value={filters.createdBy}
                      onValueChange={(value) =>
                        setFilters(prev => ({ ...prev, createdBy: value }))
                      }
                    >
                      <SelectTrigger id="creator-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Creators</SelectItem>
                        {uniqueCreators.map(creator => (
                          <SelectItem key={creator.id} value={creator.id}>
                            {creator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredMembers.length} of {members.length} family members
              {hasActiveFilters && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={resetFilters}
                  className="h-auto p-0 ml-2 text-primary"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters 
                ? 'No family members found matching your search and filters.' 
                : 'No family members found.'}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Birth Date</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Relations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">
                      {member.firstName} {member.lastName}
                    </div>
                    {member.isRootMember && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Branch Root
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.birthDate ? new Date(member.birthDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getCreatorName(member.createdBy, users)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {member.relations?.length || 0} relations
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/edit-family-member/${member.id}`)}
                        aria-label={`Edit ${member.firstName} ${member.lastName}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            aria-label={`Delete ${member.firstName} ${member.lastName}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {member.firstName} {member.lastName}? 
                              This will also delete all their relationships. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(member.id, `${member.firstName} ${member.lastName}`)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

