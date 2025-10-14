
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Info, Users, TrendingUp, Clock } from "lucide-react";

interface FamilyTreeTutorialProps {
  familyMembersCount?: number;
  recentChangesCount?: number;
}

const FamilyTreeTutorial: React.FC<FamilyTreeTutorialProps> = ({ 
  familyMembersCount = 0, 
  recentChangesCount = 0 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Keyboard shortcut to toggle tutorial (Ctrl/Cmd + I)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault();
        setIsCollapsed(!isCollapsed);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  // Don't render if dismissed
  if (isDismissed) {
    return (
      <div className="flex items-center justify-center py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3 w-3 mr-1" />
          Show Tree Insights
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-heritage-purple-light/5 to-heritage-peach/5 border-heritage-purple/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-heritage-purple" />
            <CardTitle className="text-heritage-purple text-sm">Tree Insights</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {familyMembersCount} members
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="h-6 w-6 p-0 hover:bg-heritage-purple/10"
              title="Dismiss insights"
            >
              ×
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 w-6 p-0 hover:bg-heritage-purple/10"
              title={isCollapsed ? "Expand insights (Ctrl/Cmd + I)" : "Collapse insights (Ctrl/Cmd + I)"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-heritage-purple" />
              ) : (
                <ChevronDown className="h-4 w-4 text-heritage-purple" />
              )}
            </Button>
          </div>
        </div>
        {!isCollapsed ? (
          <CardDescription className="text-xs">Family tree overview and quick tips</CardDescription>
        ) : (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {familyMembersCount} members
            </div>
            {recentChangesCount > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {recentChangesCount} recent changes
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        )}
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-2 text-heritage-purple">Quick Tips</h4>
              <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-1">
                <li>Click any person to see details</li>
                <li>Drag to pan, use zoom controls</li>
                <li>Right-click for more options</li>
                <li>Use pedigree types for different views</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2 text-heritage-purple">Tree Stats</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Total Members: {familyMembersCount}</div>
                <div>Generations: {Math.ceil(familyMembersCount / 3)}</div>
                <div>Relationships: {Math.floor(familyMembersCount * 1.5)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default FamilyTreeTutorial;
