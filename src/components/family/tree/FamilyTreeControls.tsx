
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { FamilyMember } from '@/types';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Plus, 
  Download, 
  Share2, 
  Search,
  ArrowRight as ArrowRightIcon, 
  ArrowDown as ArrowDownIcon,
  Focus,
  Eye,
  EyeOff,
  Map
} from 'lucide-react';

interface FamilyTreeControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAddMember: () => void;
  onExportImage: () => void;
  onShareTree: () => void;
  onChangeLayout: (layout: 'horizontal' | 'vertical') => void;
  onSearchMember: (query: string) => void;
  currentLayout: 'horizontal' | 'vertical';
  membersCount: number;
  familyMembers?: FamilyMember[];
  selectedMemberId?: string;
  onSelectMember?: (memberId: string) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  showMinimap?: boolean;
  onToggleMinimap?: () => void;
}

const FamilyTreeControls: React.FC<FamilyTreeControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddMember,
  onExportImage,
  onShareTree,
  onChangeLayout,
  onSearchMember,
  currentLayout,
  membersCount,
  familyMembers = [],
  selectedMemberId,
  onSelectMember,
  focusMode = false,
  onToggleFocusMode,
  showMinimap = true,
  onToggleMinimap
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearchMember(query);
  };

  const handleFocusPersonChange = (memberId: string) => {
    if (onSelectMember) {
      onSelectMember(memberId);
    }
  };

  const selectedMember = familyMembers.find(member => member.id === selectedMemberId);

  return (
    <div className="flex flex-col space-y-4 p-4 bg-white border rounded-lg shadow-sm">
      {/* Header with member count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Family Tree</h3>
          <Badge variant="secondary" className="text-xs">
            {membersCount} members
          </Badge>
        </div>
      </div>

      {/* Focus Person Selection */}
      {familyMembers.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Focus Person</label>
          <Select value={selectedMemberId || ''} onValueChange={handleFocusPersonChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select focus person">
                {selectedMember && (
                  <span className="flex items-center gap-2">
                    <span>{selectedMember.firstName} {selectedMember.lastName}</span>
                    {selectedMember.id === 'current-user' && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        You
                      </Badge>
                    )}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {familyMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{member.firstName} {member.lastName}</span>
                    {member.id === 'current-user' && (
                      <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                        You
                      </Badge>
                    )}
                    {member.deathDate && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Deceased
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Search Members</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
      </div>

      {/* Layout Controls */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Layout</label>
        <ToggleGroup 
          type="single" 
          value={currentLayout} 
          onValueChange={(value) => {
            if (value) onChangeLayout(value as 'horizontal' | 'vertical');
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="vertical" aria-label="Vertical Layout" className="flex items-center gap-2">
            <ArrowDownIcon className="h-4 w-4" />
            <span className="text-xs">Vertical</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="horizontal" aria-label="Horizontal Layout" className="flex items-center gap-2">
            <ArrowRightIcon className="h-4 w-4" />
            <span className="text-xs">Horizontal</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* View Controls */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onZoomIn} className="flex items-center gap-1">
          <ZoomIn className="h-4 w-4" />
          <span className="text-xs">Zoom In</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onZoomOut} className="flex items-center gap-1">
          <ZoomOut className="h-4 w-4" />
          <span className="text-xs">Zoom Out</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onFitView} className="flex items-center gap-1">
          <Maximize className="h-4 w-4" />
          <span className="text-xs">Fit View</span>
        </Button>
      </div>

      {/* Feature Toggles */}
      <div className="flex flex-wrap gap-2">
        {onToggleFocusMode && (
          <Button 
            variant={focusMode ? "default" : "outline"} 
            size="sm" 
            onClick={onToggleFocusMode}
            className="flex items-center gap-1"
          >
            <Focus className="h-4 w-4" />
            <span className="text-xs">Focus Mode</span>
          </Button>
        )}
        {onToggleMinimap && (
          <Button 
            variant={showMinimap ? "default" : "outline"} 
            size="sm" 
            onClick={onToggleMinimap}
            className="flex items-center gap-1"
          >
            {showMinimap ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="text-xs">Minimap</span>
          </Button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button size="sm" onClick={onAddMember} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          <span className="text-xs">Add Member</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onExportImage} className="flex items-center gap-1">
          <Download className="h-4 w-4" />
          <span className="text-xs">Export</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onShareTree} className="flex items-center gap-1">
          <Share2 className="h-4 w-4" />
          <span className="text-xs">Share</span>
        </Button>
      </div>

      {/* Focus Mode Info */}
      {focusMode && selectedMember && (
        <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <div className="flex items-center gap-2">
            <Focus className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-800">
              Focusing on {selectedMember.firstName} {selectedMember.lastName}
            </span>
          </div>
          <p className="text-xs text-purple-600 mt-1">
            Only direct family connections are highlighted
          </p>
        </div>
      )}
    </div>
  );
};

export default FamilyTreeControls;
