import React, { useState } from 'react';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import MediaManager from '@/components/media/MediaManager';
import AlbumManager from '@/components/albums/AlbumManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageIcon, FolderOpen } from 'lucide-react';

/**
 * Media Gallery page.
 * 
 * Note: Authentication is handled by ProtectedRoute in App.tsx.
 */
const MediaGalleryPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'media' | 'albums'>('albums');

  return (
    <MobileLayout 
      currentUser={{ 
        name: user?.email?.split('@')[0] || 'User', 
        email: user?.email || ''
      }}
      showBackButton
      title="Media & Albums"
      icon={<ImageIcon className="h-5 w-5" />}
    >
      <div className="p-4 h-full">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'media' | 'albums')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="albums">
              <FolderOpen className="h-4 w-4 mr-2" />
              Albums
            </TabsTrigger>
            <TabsTrigger value="media">
              <ImageIcon className="h-4 w-4 mr-2" />
              All Media
            </TabsTrigger>
          </TabsList>
          <TabsContent value="albums" className="mt-4">
            <AlbumManager />
          </TabsContent>
          <TabsContent value="media" className="mt-4">
            <MediaManager />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default MediaGalleryPage;
