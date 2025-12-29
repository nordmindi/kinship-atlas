import { supabase } from '@/integrations/supabase/client';

/**
 * Extract the file path from a Supabase storage URL
 * Handles both public and signed URL formats
 */
export const extractFilePathFromUrl = (url: string): string | null => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    // Match patterns like:
    // /storage/v1/object/public/family-media/path/to/file.jpg
    // /storage/v1/object/sign/family-media/path/to/file.jpg?token=...
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/family-media\/(.+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
};

/**
 * Convert a storage URL to a signed URL if needed
 * This is useful for local development where public URLs don't work
 */
export const getAccessibleStorageUrl = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) return null;
  
  // If it's already a signed URL (contains a token parameter), return as-is
  try {
    const urlObj = new URL(url);
    if (urlObj.searchParams.has('token')) {
      return url; // Already a signed URL
    }
  } catch {
    // Invalid URL, try to extract path anyway
  }
  
  // Extract file path from URL
  const filePath = extractFilePathFromUrl(url);
  if (!filePath) {
    console.warn('Could not extract file path from URL:', url);
    return url; // Return original URL as fallback
  }
  
  try {
    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('family-media')
      .createSignedUrl(filePath, 31536000); // Valid for 1 year
    
    if (!signedUrlError && signedUrlData?.signedUrl) {
      return signedUrlData.signedUrl;
    }
    
    // If signed URL fails, return original URL
    console.warn('Failed to generate signed URL, using original:', signedUrlError);
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return url; // Return original URL as fallback
  }
};

