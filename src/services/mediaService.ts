import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface MediaItem {
  id: string;
  url: string;
  caption?: string;
  mediaType: 'image' | 'document' | 'audio' | 'video';
  createdAt: string;
  userId: string;
  fileSize?: number;
  fileName?: string;
}

export interface MediaUpload {
  file: File;
  caption?: string;
  mediaType: 'image' | 'document' | 'audio' | 'video';
}

/**
 * Upload a file to Supabase Storage
 */
export const uploadMedia = async (upload: MediaUpload): Promise<MediaItem | null> => {
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('User not authenticated:', authError);
      toast({
        title: "Authentication required",
        description: "Please sign in to upload media.",
        variant: "destructive"
      });
      return null;
    }
    
    // Validate file size (5MB max for media library)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (upload.file.size > maxSize) {
      const fileSizeMB = (upload.file.size / (1024 * 1024)).toFixed(2);
      toast({
        title: "File too large",
        description: `File "${upload.file.name}" is ${fileSizeMB}MB. Maximum file size is 5MB. Please compress or resize the file.`,
        variant: "destructive"
      });
      return null;
    }

    // Enhanced file type validation
    const allowedMimeTypes = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'],
      video: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm']
    };

    const allowedTypes = allowedMimeTypes[upload.mediaType] || [];
    if (!allowedTypes.includes(upload.file.type) && upload.file.type !== '') {
      // Also check file extension as fallback
      const extension = upload.file.name.split('.').pop()?.toLowerCase();
      const extensionMap: Record<string, string[]> = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        document: ['pdf', 'doc', 'docx', 'txt'],
        audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
        video: ['mp4', 'avi', 'mov', 'wmv', 'webm']
      };
      
      const allowedExtensions = extensionMap[upload.mediaType] || [];
      if (!extension || !allowedExtensions.includes(extension)) {
        toast({
          title: "Invalid file type",
          description: `File "${upload.file.name}" is not a valid ${upload.mediaType} file. Allowed types: ${allowedExtensions.join(', ')}`,
          variant: "destructive"
        });
        return null;
      }
    }

    // Validate file name (prevent path traversal and special characters)
    const sanitizedFileName = upload.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (sanitizedFileName !== upload.file.name) {
      console.warn('File name sanitized:', upload.file.name, '->', sanitizedFileName);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = upload.file.name.split('.').pop();
    const fileName = `${timestamp}-${upload.file.name}`;
    const filePath = `${user.id}/${upload.mediaType}/${fileName}`;
    
    console.log('Uploading file:', { filePath, bucket: 'family-media', userId: user.id, fileSize: upload.file.size });
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('family-media')
      .upload(filePath, upload.file);
      
    if (uploadError) {
      console.error('Storage upload error:', {
        error: uploadError,
        message: uploadError.message,
        filePath,
        fileName: upload.file.name,
        fileSize: upload.file.size,
        fileSizeMB: (upload.file.size / (1024 * 1024)).toFixed(2)
      });
      
      // Handle file too large error (413)
      if (uploadError.message?.includes('413') || 
          uploadError.message?.includes('Request Entity Too Large') ||
          uploadError.message?.includes('too large') ||
          uploadError.message?.includes('size limit')) {
        const fileSizeMB = (upload.file.size / (1024 * 1024)).toFixed(2);
        throw new Error(`File is too large (${fileSizeMB}MB). Maximum file size is 5MB. Please compress or resize your file.`);
      }
      
      throw uploadError;
    }
    
    console.log('Upload successful:', uploadData);
    
    // Try to get signed URL first (more reliable, works even if bucket isn't public)
    let finalUrl: string;
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('family-media')
      .createSignedUrl(uploadData.path, 31536000); // Valid for 1 year
    
    if (!signedUrlError && signedUrlData?.signedUrl) {
      console.log('Signed URL generated:', signedUrlData.signedUrl);
      finalUrl = signedUrlData.signedUrl;
    } else {
      // Fallback to public URL if signed URL fails
      console.warn('Signed URL generation failed, falling back to public URL:', signedUrlError);
      const { data: urlData } = supabase.storage
        .from('family-media')
        .getPublicUrl(uploadData.path);
      finalUrl = urlData.publicUrl;
      console.log('Public URL generated:', finalUrl);
    }
    
    // Save media record to database
    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .insert({
        url: finalUrl,
        user_id: user.id,
        media_type: upload.mediaType,
        caption: upload.caption,
        file_name: upload.file.name,
        file_size: upload.file.size
      })
      .select('*')
      .single();
      
    if (mediaError) {
      console.error('Database insert error:', mediaError);
      throw mediaError;
    }
    
    toast({
      title: "Success",
      description: "Media uploaded successfully."
    });
    
    return {
      id: mediaData.id,
      url: mediaData.url,
      caption: mediaData.caption,
      mediaType: mediaData.media_type as 'image' | 'document' | 'audio' | 'video',
      createdAt: mediaData.created_at,
      userId: mediaData.user_id,
      fileSize: mediaData.file_size,
      fileName: mediaData.file_name
    };
  } catch (error) {
    console.error('Error uploading media:', error);
    
    // Handle different error types
    let errorMessage = 'Could not upload file.';
    let errorTitle = 'Upload Error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error patterns
      if (error.message.includes('too large') || error.message.includes('size limit') || error.message.includes('413')) {
        errorTitle = 'File Too Large';
      } else if (error.message.includes('SyntaxError') || error.message.includes('Unexpected token')) {
        // This usually means we got HTML instead of JSON (like a 413 error page)
        errorTitle = 'Upload Failed';
        errorMessage = 'The file is too large or the server rejected the upload. Please try a smaller file (under 5MB).';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorTitle = 'Network Error';
        errorMessage = 'Failed to connect to the server. Please check your internet connection and try again.';
      }
    } else if (typeof error === 'object' && error !== null) {
      // Try to extract error message from error object
      const errorObj = error as any;
      if (errorObj.message) {
        errorMessage = errorObj.message;
      } else if (errorObj.error?.message) {
        errorMessage = errorObj.error.message;
      }
    }
    
    toast({
      title: errorTitle,
      description: errorMessage,
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Get all media for the current user
 */
export const getUserMedia = async (): Promise<MediaItem[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      url: item.url,
      caption: item.caption,
      mediaType: item.media_type as 'image' | 'document' | 'audio' | 'video',
      createdAt: item.created_at,
      userId: item.user_id,
      fileSize: item.file_size,
      fileName: item.file_name
    }));
  } catch (error) {
    console.error('Error fetching user media:', error);
    toast({
      title: "Error",
      description: "Could not load media.",
      variant: "destructive"
    });
    return [];
  }
};

/**
 * Delete media item
 */
export const deleteMedia = async (mediaId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get media info to delete from storage
    const { data: mediaData, error: fetchError } = await supabase
      .from('media')
      .select('url, file_name')
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Delete from database first
    const { error: deleteError } = await supabase
      .from('media')
      .delete()
      .eq('id', mediaId)
      .eq('user_id', user.id);
      
    if (deleteError) throw deleteError;
    
    // Try to delete from storage (extract path from URL)
    try {
      const url = new URL(mediaData.url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'family-media');
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        await supabase.storage
          .from('family-media')
          .remove([filePath]);
      }
    } catch (storageError) {
      console.warn('Could not delete from storage:', storageError);
      // Don't fail the operation if storage deletion fails
    }
    
    toast({
      title: "Success",
      description: "Media deleted successfully."
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting media:', error);
    toast({
      title: "Error",
      description: "Could not delete media.",
      variant: "destructive"
    });
    return false;
  }
};

/**
 * Update media caption
 */
export const updateMediaCaption = async (mediaId: string, caption: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('media')
      .update({ caption })
      .eq('id', mediaId)
      .eq('user_id', user.id);
      
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Media caption updated."
    });
    
    return true;
  } catch (error) {
    console.error('Error updating media caption:', error);
    toast({
      title: "Error",
      description: "Could not update media caption.",
      variant: "destructive"
    });
    return false;
  }
};

/**
 * Attach media to a family member
 */
export const attachMediaToMember = async (mediaId: string, memberId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Check if media belongs to user
    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .select('id')
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .single();
      
    if (mediaError || !mediaData) {
      throw new Error('Media not found or access denied');
    }
    
    // For now, we'll store this in the family_members table as avatar_url
    // In a more complex system, you might have a separate member_media table
    const { error: updateError } = await supabase
      .from('family_members')
      .update({ avatar_url: mediaData.url })
      .eq('id', memberId);
      
    if (updateError) throw updateError;
    
    toast({
      title: "Success",
      description: "Media attached to family member."
    });
    
    return true;
  } catch (error) {
    console.error('Error attaching media to member:', error);
    toast({
      title: "Error",
      description: "Could not attach media to family member.",
      variant: "destructive"
    });
    return false;
  }
};

/**
 * Get media attached to a family member
 */
export const getMemberMedia = async (memberId: string): Promise<MediaItem[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get member's avatar and any other media
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('avatar_url')
      .eq('id', memberId)
      .single();
      
    if (memberError) throw memberError;
    
    const mediaItems: MediaItem[] = [];
    
    // If member has an avatar, include it
    if (memberData.avatar_url) {
      // Find the media record for this avatar
      const { data: avatarMedia } = await supabase
        .from('media')
        .select('*')
        .eq('url', memberData.avatar_url)
        .eq('user_id', user.id)
        .single();
        
      if (avatarMedia) {
        mediaItems.push({
          id: avatarMedia.id,
          url: avatarMedia.url,
          caption: avatarMedia.caption,
          mediaType: avatarMedia.media_type as 'image' | 'document' | 'audio' | 'video',
          createdAt: avatarMedia.created_at,
          userId: avatarMedia.user_id,
          fileSize: avatarMedia.file_size,
          fileName: avatarMedia.file_name
        });
      }
    }
    
    return mediaItems;
  } catch (error) {
    console.error('Error fetching member media:', error);
    return [];
  }
};
