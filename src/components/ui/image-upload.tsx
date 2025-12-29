import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Camera, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { uploadFile } from '@/services/supabaseService';

interface ImageUploadProps {
  currentImage?: string;
  onImageUploaded: (imageUrl: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageUploaded,
  className = '',
  size = 'md'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update previewUrl when currentImage prop changes (e.g., when navigating back to page)
  // Only update if we're not currently uploading (to avoid interrupting upload preview)
  useEffect(() => {
    if (!isUploading) {
      if (currentImage) {
        console.log('🖼️  ImageUpload: currentImage prop changed, updating preview:', currentImage);
        // Only update if the URL actually changed to avoid unnecessary re-renders
        setPreviewUrl(prev => {
          if (prev !== currentImage) {
            // Clear any blob URL when setting a new image URL
            if (blobUrl) {
              URL.revokeObjectURL(blobUrl);
            }
            return currentImage;
          }
          return prev;
        });
      } else if (!blobUrl) {
        // Only clear if there's no blob URL (upload preview) active
        console.log('🖼️  ImageUpload: currentImage cleared, clearing preview');
        setPreviewUrl(null);
      }
    }
  }, [currentImage, isUploading, blobUrl]);

  // Cleanup blob URL when component unmounts or blobUrl changes
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-32 w-32', 
    lg: 'h-48 w-48'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (3MB max for avatars - more reasonable for profile images)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        title: 'File too large',
        description: `Image is ${fileSizeMB}MB. Please select an image under 3MB. You can compress it using an online tool.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);

      // Create preview with blob URL
      const objectUrl = URL.createObjectURL(file);
      setBlobUrl(objectUrl);
      setPreviewUrl(objectUrl);

      console.log('Starting image upload...', { fileName: file.name, fileSize: file.size });
      
      // Upload file
      const uploadedUrl = await uploadFile(file, 'avatars');
      
      console.log('Upload result:', uploadedUrl);
      
      if (uploadedUrl) {
        // Clean up blob URL and use the uploaded URL
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          setBlobUrl(null);
        }
        setPreviewUrl(uploadedUrl);
        onImageUploaded(uploadedUrl);
        toast({
          title: 'Image uploaded',
          description: 'Profile image updated successfully'
        });
      } else {
        throw new Error('Upload failed - no URL returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Clean up blob URL on error
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      // Revert to current image or clear
      setPreviewUrl(currentImage || null);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="relative">
        <div 
          className={`${sizeClasses[size]} rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-gray-400 transition-colors`}
          onClick={handleUploadClick}
        >
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover rounded-full"
              onError={async (e) => {
                console.error('❌ Image failed to load:', previewUrl);
                console.error('   Error event:', e);
                
                // If it's a public URL that failed, try to get a signed URL as fallback
                // Extract the path from the URL
                try {
                  if (!previewUrl) return;
                  
                  const url = new URL(previewUrl);
                  // Match both public and signed URL formats
                  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign\/family-media)\/family-media\/(.+)/) ||
                                   url.pathname.match(/\/storage\/v1\/object\/public\/family-media\/(.+)/);
                  
                  if (pathMatch) {
                    const filePath = decodeURIComponent(pathMatch[1]);
                    console.log('🔄 Attempting to get signed URL for path:', filePath);
                    
                    // Import supabase client
                    const { supabase } = await import('@/integrations/supabase/client');
                    const { data: signedData, error: signedError } = await supabase.storage
                      .from('family-media')
                      .createSignedUrl(filePath, 31536000); // 1 year validity
                    
                    if (!signedError && signedData?.signedUrl) {
                      console.log('✅ Got signed URL, updating image source');
                      setPreviewUrl(signedData.signedUrl);
                      return; // Don't clear, try the signed URL instead
                    } else {
                      console.error('❌ Failed to get signed URL:', signedError);
                    }
                  } else {
                    console.warn('⚠️  Could not extract file path from URL:', previewUrl);
                  }
                } catch (urlError) {
                  console.error('❌ Error parsing URL:', urlError);
                }
                
                // Fallback to placeholder if all attempts fail
                setPreviewUrl(null);
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', previewUrl);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <Camera className="h-8 w-8 mb-2" />
              <span className="text-xs text-center">Add Photo</span>
            </div>
          )}
          
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {previewUrl && !isUploading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveImage();
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="text-xs"
        >
          <Upload className="h-3 w-3 mr-1" />
          {previewUrl ? 'Change' : 'Upload'}
        </Button>
        
        {previewUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveImage}
            disabled={isUploading}
            className="text-xs text-red-600 hover:text-red-700"
          >
            <X className="h-3 w-3 mr-1" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;