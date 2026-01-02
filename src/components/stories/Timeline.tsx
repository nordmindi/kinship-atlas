import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  MapPin, 
  User, 
  Search,
  Filter,
  BookOpen,
  Clock,
  Users
} from 'lucide-react';
import { TimelineItem } from '@/types/stories';
import { FamilyMember } from '@/types';
import { getYearRange } from '@/utils/dateUtils';
import { sanitizeHtml } from '@/utils/sanitize';
import { FamilyGroupFilter } from '@/components/family/FamilyGroupFilter';
import { familyGroupService } from '@/services/familyGroupService';
import { supabase } from '@/integrations/supabase/client';

interface TimelineProps {
  timeline: TimelineItem[];
  isLoading: boolean;
  onItemClick?: (item: TimelineItem) => void;
  familyMembers?: FamilyMember[];
  selectedGroupIds?: string[];
  onGroupSelectionChange?: (groupIds: string[]) => void;
  selectedMemberIds?: string[];
  onMemberSelectionChange?: (memberIds: string[]) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  timeline,
  isLoading,
  onItemClick,
  familyMembers = [],
  selectedGroupIds = [],
  onGroupSelectionChange,
  selectedMemberIds = [],
  onMemberSelectionChange
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'story' | 'event'>('all');
  const [filteredMemberIdsFromGroups, setFilteredMemberIdsFromGroups] = useState<string[]>([]);
  const [storyGroupMap, setStoryGroupMap] = useState<Record<string, string[]>>({});

  // Filter timeline by family groups if groups are selected
  React.useEffect(() => {
    const filterByGroups = async () => {
      if (selectedGroupIds.length === 0) {
        setFilteredMemberIdsFromGroups([]);
        setStoryGroupMap({});
        return;
      }

      try {
        // Get member IDs that belong to selected groups
        const memberIds = await familyGroupService.filterMembersByGroups(selectedGroupIds);
        setFilteredMemberIdsFromGroups(memberIds);

        // Get story IDs that are assigned to selected groups
        const { data: storyGroupsData, error: storyGroupsError } = await (supabase as any)
          .from('story_groups')
          .select('story_id, family_group_id')
          .in('family_group_id', selectedGroupIds);

        if (!storyGroupsError && storyGroupsData) {
          const map: Record<string, string[]> = {};
          storyGroupsData.forEach((sg: any) => {
            if (!map[sg.story_id]) {
              map[sg.story_id] = [];
            }
            map[sg.story_id].push(sg.family_group_id);
          });
          setStoryGroupMap(map);
        }
      } catch (error) {
        console.error('Error filtering by groups:', error);
        setFilteredMemberIdsFromGroups([]);
        setStoryGroupMap({});
      }
    };

    filterByGroups();
  }, [selectedGroupIds]);

  const getMemberName = (memberId: string): string => {
    const member = familyMembers.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}`.trim() : 'Unknown Member';
  };

  const filteredTimeline = timeline.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterType === 'all' || item.itemType === filterType;

    // Filter by selected members if any are selected
    const matchesMember = selectedMemberIds.length === 0 || selectedMemberIds.includes(item.memberId);

    // Filter by family groups if groups are selected
    // For stories: check if story is assigned to selected groups OR if the member in this timeline entry belongs to selected groups
    // For events: check if participant belongs to selected groups
    let matchesGroup = true;
    if (selectedGroupIds.length > 0) {
      if (item.itemType === 'story') {
        // Check if story is directly assigned to any selected group
        // If story is in a selected group, show it regardless of member
        const storyGroupIds = storyGroupMap[item.itemId] || [];
        const storyMatchesDirectGroup = storyGroupIds.some(gid => selectedGroupIds.includes(gid));
        
        // Also check if the member in this timeline entry belongs to selected groups
        const memberMatchesGroup = filteredMemberIdsFromGroups.includes(item.memberId);
        
        matchesGroup = storyMatchesDirectGroup || memberMatchesGroup;
      } else {
        // For events, check if participant belongs to selected groups
        matchesGroup = filteredMemberIdsFromGroups.includes(item.memberId);
      }
    }

    return matchesSearch && matchesFilter && matchesMember && matchesGroup;
  });

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'story':
        return <BookOpen className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getItemColor = (itemType: string) => {
    switch (itemType) {
      case 'story':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'event':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-4 h-4 bg-gray-200 rounded-full mt-2"></div>
            <div className="flex-1">
              <Card>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No timeline items yet
          </h3>
          <p className="text-gray-600">
            Stories and events will appear here as they are added to the family archive.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Family Timeline
          </h2>
          <p className="text-gray-600">
            {timeline.length} {timeline.length === 1 ? 'item' : 'items'} in chronological order
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search timeline items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'story' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('story')}
            >
              Stories
            </Button>
            <Button
              variant={filterType === 'event' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('event')}
            >
              Events
            </Button>
          </div>
        </div>
        
        {/* Family Members Filter */}
        {onMemberSelectionChange && familyMembers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Filter by Member:</span>
              <Button
                variant={selectedMemberIds.length === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => onMemberSelectionChange([])}
              >
                All Members
              </Button>
              {familyMembers.map(member => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <Button
                    key={member.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (isSelected) {
                        onMemberSelectionChange(selectedMemberIds.filter(id => id !== member.id));
                      } else {
                        onMemberSelectionChange([...selectedMemberIds, member.id]);
                      }
                    }}
                  >
                    {member.firstName} {member.lastName}
                  </Button>
                );
              })}
            </div>
            {selectedMemberIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing timeline for {selectedMemberIds.length} {selectedMemberIds.length === 1 ? 'member' : 'members'}
              </p>
            )}
          </div>
        )}

        {/* Family Groups Filter */}
        {onGroupSelectionChange && (
          <div>
            <FamilyGroupFilter
              selectedGroupIds={selectedGroupIds}
              onSelectionChange={onGroupSelectionChange}
            />
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-6">
          {filteredTimeline.map((item, index) => (
            <div key={`${item.itemType}-${item.itemId}`} className="flex gap-4">
              {/* Timeline dot */}
              <div className="relative z-10">
                <div className={`w-4 h-4 rounded-full border-2 ${getItemColor(item.itemType)} flex items-center justify-center`}>
                  {getItemIcon(item.itemType)}
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-6">
                <Card 
                  className={`hover:shadow-md transition-shadow cursor-pointer ${onItemClick ? 'hover:border-gray-300' : ''}`}
                  onClick={() => onItemClick?.(item)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {getYearRange(item.date)}
                          </div>
                          <Badge variant="secondary" className={getItemColor(item.itemType)}>
                            {item.itemType}
                          </Badge>
                          {item.memberId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/family-member/${item.memberId}`);
                              }}
                              className="flex items-center gap-1 hover:text-heritage-purple transition-colors"
                            >
                              <User className="h-4 w-4" />
                              {getMemberName(item.memberId)}
                            </button>
                          )}
                          {item.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {item.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(item.content || item.description) && (
                      <div 
                        className="text-gray-700 prose prose-sm max-w-none overflow-hidden"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.5'
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: sanitizeHtml(item.content || item.description || '') 
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredTimeline.length === 0 && timeline.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No items found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Timeline;
