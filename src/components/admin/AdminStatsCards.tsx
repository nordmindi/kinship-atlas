import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, BookOpen, Image } from 'lucide-react';
import { UserProfile } from '@/types';

interface AdminStatsCardsProps {
  users: UserProfile[];
  totalMembers: number;
  totalStories: number;
  totalMedia: number;
}

/**
 * Displays statistics cards for the admin dashboard
 */
export const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({
  users,
  totalMembers,
  totalStories,
  totalMedia,
}) => {
  const adminCount = users.filter(user => user.role === 'admin').length;
  const editorCount = users.filter(user => user.role === 'editor').length;
  const viewerCount = users.filter(user => user.role === 'viewer').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{users.length}</div>
          <p className="text-xs text-muted-foreground">
            {adminCount} admins, {editorCount} editors, {viewerCount} viewers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Family Members</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMembers}</div>
          <p className="text-xs text-muted-foreground">
            Total family members
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stories</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStories}</div>
          <p className="text-xs text-muted-foreground">
            Total stories
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Media</CardTitle>
          <Image className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMedia}</div>
          <p className="text-xs text-muted-foreground">
            Total media items
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

