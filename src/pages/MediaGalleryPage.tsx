import React from 'react';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import MediaManager from '@/components/media/MediaManager';
import { ImageIcon } from 'lucide-react';

const MediaGalleryPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-heritage-purple">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MobileLayout 
      currentUser={{ 
        name: user.email?.split('@')[0] || 'User', 
        email: user.email || ''
      }}
      showBackButton
      title="Media Gallery"
      icon={<ImageIcon className="h-5 w-5" />}
    >
      <div className="p-4 h-full">
        <MediaManager />
      </div>
    </MobileLayout>
  );
};

export default MediaGalleryPage;
