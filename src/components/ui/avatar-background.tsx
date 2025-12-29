import React from 'react';
import { useStorageUrl } from '@/hooks/useStorageUrl';
import { cn } from '@/lib/utils';

interface AvatarBackgroundProps {
  avatar?: string | null;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Component that displays an avatar using background-image style
 * Automatically converts storage URLs to signed URLs for local development
 */
export const AvatarBackground: React.FC<AvatarBackgroundProps> = ({ 
  avatar, 
  className,
  children 
}) => {
  const accessibleUrl = useStorageUrl(avatar);
  
  return (
    <div 
      className={cn("bg-cover bg-center", className)}
      style={{ 
        backgroundImage: accessibleUrl ? `url(${accessibleUrl})` : undefined 
      }}
    >
      {children}
    </div>
  );
};

