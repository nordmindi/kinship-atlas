import { supabase } from '@/integrations/supabase/client';
import { FamilyMember, Relation, FamilyStory, FamilyEvent, GeoLocation } from '@/types';
import { toast } from '@/hooks/use-toast';

/**
 * Validates and refreshes the current session
 * Returns the user if authenticated, null if not
 */
const validateAndRefreshSession = async (): Promise<{ id: string; email?: string } | null> => {
  try {
    console.log('🔐 Validating and refreshing session...');
    
    // First, try to get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError);
      return null;
    }
    
    if (!session) {
      console.log('❌ No session found');
      return null;
    }
    
    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at * 1000);
    
    if (now >= expiresAt) {
      console.log('⚠️ Session expired, attempting refresh...');
      
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.log('❌ Session refresh failed:', refreshError);
        return null;
      }
      
      if (!refreshData.session) {
        console.log('❌ No session after refresh');
        return null;
      }
      
      console.log('✅ Session refreshed successfully');
      return refreshData.session.user;
    }
    
    // Session is valid, get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ User error:', userError);
      return null;
    }
    
    if (!user) {
      console.log('❌ No user found');
      return null;
    }
    
    console.log('✅ Session validated successfully');
    return user;
    
  } catch (error) {
    console.error('❌ Error validating session:', error);
    return null;
  }
};

/**
 * Fetch family members for the current user
 */
export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
  try {
    console.log('🔍 Fetching family members from Supabase...');
    
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        id,
        first_name,
        last_name,
        birth_date,
        death_date,
        birth_place,
        bio,
        avatar_url,
        gender,
        created_by,
        branch_root,
        is_root_member,
        locations(id, lat, lng, description, current_residence)
      `)
      .order('first_name');

    console.log('📊 Family members query result:', { data, error });

    if (error) {
      console.error('❌ Error fetching family members:', error);
      throw error;
    }

    // Get relations for all family members
    console.log('🔗 Fetching relations...');
    const { data: relationsData, error: relationsError } = await supabase
      .from('relations')
      .select('id, from_member_id, to_member_id, relation_type');
    
    console.log('📊 Relations query result:', { relationsData, relationsError });
    
    if (relationsError) {
      console.error('❌ Error fetching relations:', relationsError);
      throw relationsError;
    }

    // Transform the data into our FamilyMember type
    const transformedMembers = (data || []).map(member => {
      const currentLocation = member.locations?.find(loc => loc.current_residence);
      
      // Find all relations where this member is involved (both directions)
      const allRelations = relationsData
        .filter(rel => rel.from_member_id === member.id || rel.to_member_id === member.id)
        .map(rel => {
          // If this member is the "from" person, reverse the relation type to get the perspective
          if (rel.from_member_id === member.id) {
            let perspectiveType: 'parent' | 'child' | 'spouse' | 'sibling';
            switch (rel.relation_type) {
              case 'parent':
                perspectiveType = 'child'; // If I'm the parent, they are my child
                break;
              case 'child':
                perspectiveType = 'parent'; // If I'm the child, they are my parent
                break;
              case 'spouse':
                perspectiveType = 'spouse'; // spouse is bidirectional
                break;
              case 'sibling':
                perspectiveType = 'sibling'; // sibling is bidirectional
                break;
              default:
                perspectiveType = 'parent';
            }
            return {
              id: rel.id,
              type: perspectiveType,
              personId: rel.to_member_id,
            };
          } else {
            // If this member is the "to" person, reverse the relation type
            let reversedType: 'parent' | 'child' | 'spouse' | 'sibling';
            switch (rel.relation_type) {
              case 'parent':
                reversedType = 'child';
                break;
              case 'child':
                reversedType = 'parent';
                break;
              case 'spouse':
                reversedType = 'spouse'; // spouse is bidirectional
                break;
              case 'sibling':
                reversedType = 'sibling'; // sibling is bidirectional
                break;
              default:
                reversedType = 'parent';
            }
            return {
              id: rel.id,
              type: reversedType,
              personId: rel.from_member_id,
            };
          }
        });

      // Deduplicate relationships by personId to avoid showing the same person twice
      const memberRelations = allRelations.reduce((acc, rel) => {
        // Check if we already have a relationship with this person
        const existingRel = acc.find(existing => existing.personId === rel.personId);
        if (!existingRel) {
          acc.push(rel);
        } else {
          // For bidirectional relationships (spouse, sibling), keep the first one
          // For directional relationships (parent, child), prefer the one where this member is the "from" person
          if (rel.type === 'spouse' || rel.type === 'sibling') {
            // Keep the first one (already in acc)
            return acc;
          } else {
            // For parent/child, prefer the relationship where this member is the source
            const thisMemberIsSource = relationsData.find(r => 
              r.id === rel.id && r.from_member_id === member.id
            );
            if (thisMemberIsSource) {
              // Replace the existing relationship with this one
              const index = acc.findIndex(existing => existing.personId === rel.personId);
              acc[index] = rel;
            }
          }
        }
        return acc;
      }, [] as typeof allRelations);
      
      return {
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        birthDate: member.birth_date,
        deathDate: member.death_date,
        birthPlace: member.birth_place,
        bio: member.bio,
        avatar: member.avatar_url,
        gender: member.gender as 'male' | 'female' | 'other',
        createdBy: member.created_by,
        branchRoot: member.branch_root,
        isRootMember: member.is_root_member,
        currentLocation: currentLocation ? {
          lat: currentLocation.lat ? Number(currentLocation.lat) : 0,
          lng: currentLocation.lng ? Number(currentLocation.lng) : 0,
          description: currentLocation.description
        } : undefined,
        relations: memberRelations
      };
    });
    
    console.log('✅ Successfully transformed family members:', transformedMembers.length, transformedMembers);
    return transformedMembers;
  } catch (error) {
    console.error('Error fetching family members:', error);
    toast({
      title: "Error",
      description: "Could not load family members.",
      variant: "destructive"
    });
    return [];
  }
};

/**
 * Add a new family member with improved error handling and data persistence
 */
export const addFamilyMember = async (member: Omit<FamilyMember, 'id' | 'relations'>, location?: GeoLocation): Promise<FamilyMember | null> => {
  let createdMemberId: string | null = null;
  
  try {
    console.log('🚀 Starting family member creation...');
    
    // Get current user with session validation and refresh
    const user = await validateAndRefreshSession();
    if (!user) {
      throw new Error('User not authenticated. Please log in again.');
    }
    
    console.log('👤 Current user for family member creation:', user.id);

    // Validate input data
    if (!member.firstName || !member.lastName) {
      throw new Error('First name and last name are required');
    }

    // Check if this is the first family member for this user to determine branch root
    let branchRoot: string | null = null;
    let isRootMember = true;

    if (user.id) {
      console.log('🔍 Checking for existing family members...');
      const { data: existingMembers, error: checkError } = await supabase
        .from('family_members')
        .select('id, branch_root, is_root_member')
        .eq('created_by', user.id)
        .limit(1);

      if (checkError) {
        console.warn('⚠️  Error checking existing members:', checkError);
        // Continue anyway - will default to root member
      } else if (existingMembers && existingMembers.length > 0) {
        // Find the root member of the existing branch
        const rootMember = existingMembers.find(m => m.is_root_member && m.branch_root === m.id);
        if (rootMember) {
          branchRoot = rootMember.branch_root;
          isRootMember = false;
        } else {
          // Use the first member's branch_root if no explicit root found
          branchRoot = existingMembers[0].branch_root || existingMembers[0].id;
          isRootMember = false;
        }
      }
    }

    // Insert the family member
    console.log('📝 Inserting family member into database...');
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .insert({
        first_name: member.firstName,
        last_name: member.lastName,
        birth_date: member.birthDate || null,
        death_date: member.deathDate || null,
        birth_place: member.birthPlace || null,
        bio: member.bio || null,
        avatar_url: member.avatar || null,
        gender: member.gender || null,
        created_by: user.id,
        branch_root: branchRoot, // Will be set to self if null by trigger
        is_root_member: isRootMember
      })
      .select('id, branch_root, is_root_member')
      .single();
    
    if (memberError) {
      console.error('❌ Error inserting family member:', memberError);
      throw new Error(`Failed to create family member: ${memberError.message}`);
    }
    
    if (!memberData || !memberData.id) {
      throw new Error('Family member was created but no ID was returned');
    }

    createdMemberId = memberData.id;
    console.log('✅ Family member inserted successfully:', createdMemberId);

    // Update branch_root if it wasn't set (should be handled by trigger, but ensure it)
    if (!memberData.branch_root) {
      console.log('🔄 Setting branch_root to self...');
      const { error: updateError } = await supabase
        .from('family_members')
        .update({
          branch_root: createdMemberId,
          is_root_member: true
        })
        .eq('id', createdMemberId);

      if (updateError) {
        console.warn('⚠️  Error updating branch_root:', updateError);
        // Non-critical, continue
      }
    }

    // Add location if provided
    if (location && createdMemberId) {
      console.log('📍 Adding location...');
      
      // Validate location data
      const lat = Number(location.lat);
      const lng = Number(location.lng);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.warn('⚠️  Invalid location coordinates, skipping location');
      } else {
        // First, mark any existing current residence as false
        await supabase
          .from('locations')
          .update({ current_residence: false })
          .eq('family_member_id', createdMemberId)
          .eq('current_residence', true);

        // Insert new location
        const { error: locationError } = await supabase
          .from('locations')
          .insert({
            family_member_id: createdMemberId,
            lat: lat,
            lng: lng,
            description: location.description || 'Current residence',
            current_residence: true
          });
        
        if (locationError) {
          console.error('❌ Error adding location:', locationError);
          // Non-critical error - member was created successfully
          // Location can be added later
        } else {
          console.log('✅ Location added successfully');
        }
      }
    }

    // Fetch the complete member data to return
    const { data: completeMember, error: fetchError } = await supabase
      .from('family_members')
      .select(`
        id,
        first_name,
        last_name,
        birth_date,
        death_date,
        birth_place,
        bio,
        avatar_url,
        gender,
        created_by,
        branch_root,
        is_root_member,
        locations(id, lat, lng, description, current_residence)
      `)
      .eq('id', createdMemberId)
      .single();

    if (fetchError) {
      console.warn('⚠️  Error fetching complete member data:', fetchError);
      // Return what we have
    }

    const currentLocation = completeMember?.locations?.find((loc: any) => loc.current_residence);

    toast({
      title: "Success",
      description: `Added ${member.firstName} ${member.lastName} to your family tree.`
    });
    
    return {
      ...member,
      id: createdMemberId,
      relations: [],
      currentLocation: currentLocation ? {
        lat: Number(currentLocation.lat) || 0,
        lng: Number(currentLocation.lng) || 0,
        description: currentLocation.description
      } : location
    };
  } catch (error) {
    console.error('❌ Error adding family member:', error);
    
    // If member was created but something else failed, log it for manual cleanup
    if (createdMemberId) {
      console.error(`⚠️  Family member ${createdMemberId} was created but operation failed. Manual cleanup may be needed.`);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Could not add family member.';
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive"
    });
    return null;
  }
};


/**
 * Fetch family stories
 */
export const getFamilyStories = async (): Promise<FamilyStory[]> => {
  try {
    const { data, error } = await supabase
      .from('family_stories')
      .select(`
        id,
        title,
        content,
        date,
        author_id,
        created_at,
        updated_at,
        story_members(id, family_member_id),
        story_media(media_id)
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    // Fetch media for stories
    const mediaIds = (data || [])
      .flatMap(story => story.story_media || [])
      .map((media: any) => media?.media_id)
      .filter(Boolean);

    let mediaData: Record<string, any> = {};
    if (mediaIds.length > 0) {
      const { data: media } = await supabase
        .from('media')
        .select('id, url, media_type, caption, file_name, file_size, user_id, created_at')
        .in('id', mediaIds);
      
      if (media) {
        mediaData = Object.fromEntries(media.map(m => [m.id, m]));
      }
    }

    return (data || []).map(story => ({
      id: story.id,
      title: story.title,
      content: story.content,
      authorId: story.author_id,
      date: story.date || undefined,
      createdAt: story.created_at || new Date().toISOString(),
      updatedAt: story.updated_at || new Date().toISOString(),
      relatedMembers: (story.story_members || []).map((sm: any) => ({
        id: sm.id || '',
        storyId: story.id,
        familyMemberId: sm.family_member_id,
        role: 'participant' as const
      })),
      media: (story.story_media || [])
        .map((sm: any) => sm.media_id ? mediaData[sm.media_id] : null)
        .filter(Boolean)
    }));
  } catch (error) {
    console.error('Error fetching family stories:', error);
    toast({
      title: "Error",
      description: "Could not load family stories.",
      variant: "destructive"
    });
    return [];
  }
};

/**
 * Add a new family story
 */
export const addFamilyStory = async (
  story: Omit<FamilyStory, 'id' | 'authorId' | 'images'>, 
  imageFiles?: File[]
): Promise<FamilyStory | null> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    // Insert story
    const { data, error } = await supabase
      .from('family_stories')
      .insert({
        title: story.title,
        content: story.content,
        date: story.date,
        author_id: user.id
      })
      .select('id')
      .single();
      
    if (error) throw error;
    
    // Link related members
    if (story.relatedMembers && story.relatedMembers.length > 0) {
      const storyMembers = story.relatedMembers.map((member: any) => ({
        story_id: data.id,
        family_member_id: typeof member === 'string' ? member : member.familyMemberId
      }));
      
      const { error: membersError } = await supabase
        .from('story_members')
        .insert(storyMembers);
      
      if (membersError) {
        console.error('Error linking story members:', membersError);
        // Non-critical, continue
      }
    }
    
    // Handle image uploads
    const mediaRecords: any[] = [];
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        try {
          // Upload to storage
          const fileName = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('family-media')
            .upload(fileName, file);
            
          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue; // Skip this file but continue with others
          }
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('family-media')
            .getPublicUrl(uploadData.path);
          
          // Add to media table
          const { data: mediaData, error: mediaError } = await supabase
            .from('media')
            .insert({
              url: urlData.publicUrl,
              user_id: user.id,
              media_type: 'image',
              caption: story.title,
              file_name: file.name,
              file_size: file.size
            })
            .select('id, url, media_type, caption, file_name, file_size, user_id, created_at')
            .single();
          
          if (mediaError) {
            console.error('Error creating media record:', mediaError);
            continue;
          }
          
          // Link media to story
          const { error: linkError } = await supabase
            .from('story_media')
            .insert({
              story_id: data.id,
              media_id: mediaData.id
            });
          
          if (linkError) {
            console.error('Error linking media to story:', linkError);
            continue;
          }
          
          if (mediaData) {
            mediaRecords.push(mediaData);
          }
        } catch (fileError) {
          console.error('Error processing file:', fileError);
          // Continue with next file
        }
      }
    }
    
    // Fetch the complete story to return
    const { data: completeStory, error: fetchError } = await supabase
      .from('family_stories')
      .select(`
        id,
        title,
        content,
        date,
        author_id,
        created_at,
        updated_at
      `)
      .eq('id', data.id)
      .single();
    
    if (fetchError) {
      console.warn('Error fetching complete story:', fetchError);
    }
    
    toast({
      title: "Success",
      description: "Your family story has been added."
    });
    
    return {
      id: data.id,
      title: story.title,
      content: story.content,
      authorId: user.id,
      date: story.date,
      createdAt: completeStory?.created_at || new Date().toISOString(),
      updatedAt: completeStory?.updated_at || new Date().toISOString(),
      relatedMembers: story.relatedMembers || [],
      media: mediaRecords
    };
  } catch (error) {
    console.error('Error adding family story:', error);
    toast({
      title: "Error",
      description: "Could not save your family story.",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Get the accessible URL for a storage file
 * In local development, we use signed URLs. In production, we can use public URLs.
 */
const getStorageUrl = async (filePath: string, retries: number = 2): Promise<string | null> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        console.log(`🔄 Retrying URL generation (attempt ${attempt + 1}/${retries + 1}) for:`, filePath);
      }
      
      // Try signed URL first (works in both local and production)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('family-media')
        .createSignedUrl(filePath, 31536000); // Valid for 1 year
      
      if (!signedUrlError && signedUrlData?.signedUrl) {
        console.log('✅ Signed URL generated for:', filePath);
        return signedUrlData.signedUrl;
      }
      
      // Log the error for debugging
      if (signedUrlError) {
        console.warn(`⚠️  Signed URL generation failed (attempt ${attempt + 1}):`, {
          error: signedUrlError,
          message: signedUrlError.message,
          filePath
        });
      }
      
      // Fallback to public URL
      console.log('🔄 Attempting public URL fallback for:', filePath);
      const { data: urlData } = supabase.storage
        .from('family-media')
        .getPublicUrl(filePath);
      
      if (urlData?.publicUrl) {
        console.log('✅ Public URL generated for:', filePath);
        return urlData.publicUrl;
      }
      
      // If we're on the last attempt, log the failure
      if (attempt === retries) {
        console.error('❌ Failed to generate any URL after all attempts:', {
          filePath,
          signedUrlError,
          publicUrlData: urlData
        });
      }
    } catch (error) {
      console.error(`❌ Error getting storage URL (attempt ${attempt + 1}):`, error);
      if (attempt === retries) {
        return null;
      }
    }
  }
  
  return null;
};

/**
 * Upload a file to Supabase Storage
 */
export const uploadFile = async (file: File, folder: string = ''): Promise<string | null> => {
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('User not authenticated:', authError);
      toast({
        title: "Authentication required",
        description: "Please sign in to upload images.",
        variant: "destructive"
      });
      return null;
    }
    
    const filePath = folder 
      ? `${folder}/${Date.now()}-${file.name}` 
      : `${Date.now()}-${file.name}`;
    
    console.log('Uploading file:', { filePath, bucket: 'family-media', userId: user.id });
    
    const { data, error } = await supabase.storage
      .from('family-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });
      
    if (error) {
      console.error('Storage upload error:', {
        error,
        message: error.message,
        filePath,
        fileName: file.name,
        fileSize: file.size,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2)
      });
      
      // Handle file too large error (413)
      if (error.message?.includes('413') || 
          error.message?.includes('Request Entity Too Large') ||
          error.message?.includes('too large') ||
          error.message?.includes('size limit')) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        throw new Error(`File is too large (${fileSizeMB}MB). Maximum file size is 5MB. Please compress or resize your image.`);
      }
      
      // Handle specific error cases
      if (error.message?.includes('already exists') || error.message?.includes('duplicate') || error.message?.includes('409')) {
        // File already exists, try to get URL for existing file
        console.log('⚠️  File already exists, attempting to get URL for existing file:', filePath);
        const existingUrl = await getStorageUrl(filePath);
        if (existingUrl) {
          console.log('✅ Retrieved URL for existing file:', existingUrl);
          return existingUrl;
        }
      }
      
      throw error;
    }
    
    if (!data || !data.path) {
      console.error('❌ Upload succeeded but no data/path returned:', { data, error });
      throw new Error('Upload completed but no file path was returned');
    }
    
    console.log('Upload successful:', data);
    
    // Small delay to ensure file is fully available (helps with race conditions)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get accessible URL (signed URL for local, public URL as fallback)
    const url = await getStorageUrl(data.path);
    
    if (!url) {
      // Provide more detailed error information
      const errorDetails = {
        filePath: data.path,
        fileName: file.name,
        fileSize: file.size,
        userId: user.id
      };
      console.error('❌ Failed to generate file URL after upload:', errorDetails);
      throw new Error(`Failed to generate accessible URL for uploaded file. The file was uploaded successfully but we couldn't retrieve its URL. Please try again.`);
    }
    
    console.log('✅ File URL generated:', url);
    return url;
  } catch (error) {
    console.error('Error uploading file:', error);
    
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
 * Update family member avatar
 */
export const updateFamilyMemberAvatar = async (memberId: string, avatarUrl: string): Promise<boolean> => {
  try {
    console.log('🖼️  Updating avatar for member:', memberId, 'URL:', avatarUrl);
    
    // Validate input
    if (!memberId) {
      throw new Error('Member ID is required');
    }
    
    // Update the avatar URL in the database
    const { data, error } = await supabase
      .from('family_members')
      .update({ 
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select('id, avatar_url')
      .single();

    if (error) {
      console.error('❌ Database error updating avatar:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ No data returned from update');
      throw new Error('Update returned no data');
    }

    console.log('✅ Avatar updated successfully:', data.avatar_url);

    toast({
      title: "Success",
      description: "Profile image updated successfully."
    });
    return true;
  } catch (error) {
    console.error('❌ Error updating avatar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Could not update profile image.';
    toast({
      title: "Error", 
      description: errorMessage,
      variant: "destructive"
    });
    return false;
  }
};

/**
 * Update an existing family member
 */
export const updateFamilyMember = async (
  memberId: string, 
  updates: Partial<Omit<FamilyMember, 'id' | 'relations'>>, 
  location?: GeoLocation
): Promise<FamilyMember | null> => {
  try {
    // Update the family member
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        birth_date: updates.birthDate,
        death_date: updates.deathDate,
        birth_place: updates.birthPlace,
        bio: updates.bio,
        avatar_url: updates.avatar,
        gender: updates.gender,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select('*')
      .single();

    if (memberError) throw memberError;

    // Update location if provided
    if (location) {
      // First, remove existing current residence locations
      await supabase
        .from('locations')
        .update({ current_residence: false })
        .eq('family_member_id', memberId);

      // Add new location
      const { error: locationError } = await supabase
        .from('locations')
        .insert({
          family_member_id: memberId,
          lat: Number(location.lat),
          lng: Number(location.lng),
          description: location.description,
          current_residence: true
        });
        
      if (locationError) {
        console.error('Error updating location:', locationError);
      }
    }

    // Get updated member with relations
    const updatedMember = await getFamilyMembers();
    const member = updatedMember.find(m => m.id === memberId);

    if (member) {
      toast({
        title: "Success",
        description: `${member.firstName} ${member.lastName} has been updated.`
      });
      
      return member;
    }

    return null;
  } catch (error) {
    console.error('Error updating family member:', error);
    toast({
      title: "Error",
      description: "Could not update family member.",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Delete a family member and all their relationships
 */
export const deleteFamilyMember = async (memberId: string): Promise<boolean> => {
  try {
    // Get member name for confirmation message
    const { data: memberData } = await supabase
      .from('family_members')
      .select('first_name, last_name')
      .eq('id', memberId)
      .single();

    // Delete all relationships involving this member
    await supabase
      .from('relations')
      .delete()
      .or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`);

    // Delete all locations for this member
    await supabase
      .from('locations')
      .delete()
      .eq('family_member_id', memberId);

    // Delete the family member
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    const memberName = memberData ? `${memberData.first_name} ${memberData.last_name}` : 'Family member';
    toast({
      title: "Success",
      description: `${memberName} has been removed from your family tree.`
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting family member:', error);
    toast({
      title: "Error",
      description: "Could not delete family member.",
      variant: "destructive"
    });
    return false;
  }
};

/**
 * Fetch current user data
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};
