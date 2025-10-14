import React, { useState } from 'react';
import { Search, Users, MapPin, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FamilyMember } from '@/types';

interface FamilyTreeHeaderProps {
  familyMembers: FamilyMember[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  isLoading: boolean;
  showLegend: boolean;
  onToggleLegend: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onSearch?: (query: string) => void;
}

const FamilyTreeHeader: React.FC<FamilyTreeHeaderProps> = ({
  familyMembers,
  selectedMemberId,
  onSelectMember,
  isLoading,
  showLegend,
  onToggleLegend,
  showMinimap,
  onToggleMinimap,
  focusMode,
  onToggleFocusMode,
  onSearch
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSearch && searchQuery) {
      onSearch(searchQuery);
    }
  };

  const handleSelectMember = (id: string) => {
    onSelectMember(id);
    // Clear search after selection
    setSearchQuery('');
  };
  
  // Get member name for display
  const getSelectedMemberName = () => {
    const member = familyMembers.find(m => m.id === selectedMemberId);
    return member ? `${member.firstName} ${member.lastName}` : 'Select a member';
  };

  return (
    <div className="bg-white p-4 border-b space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="text-heritage-purple h-5 w-5" />
          <h2 className="font-semibold text-lg">Family Tree</h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showLegend ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleLegend}
                  className="h-9"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Legend
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showLegend ? 'Hide relationship legend' : 'Show relationship legend'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showMinimap ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleMinimap}
                  className="h-9"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Minimap
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showMinimap ? 'Hide minimap' : 'Show minimap'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={focusMode ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleFocusMode}
                  className="h-9"
                >
                  {focusMode ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Exit Focus
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Focus Mode
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {focusMode 
                  ? 'Show all family members' 
                  : 'Focus on direct connections of selected member'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Select
            value={selectedMemberId}
            onValueChange={handleSelectMember}
            disabled={isLoading || familyMembers.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {isLoading ? 'Loading...' : getSelectedMemberName()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {familyMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search family members..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" className="h-9">
            Search
          </Button>
        </form>
      </div>
    </div>
  );
};

export default FamilyTreeHeader;
