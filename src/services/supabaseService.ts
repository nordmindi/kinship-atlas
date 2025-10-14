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
 * Add a new family member
 */
export const addFamilyMember = async (member: Omit<FamilyMember, 'id' | 'relations'>, location?: GeoLocation): Promise<FamilyMember | null> => {
  try {
    console.log('🚀 Starting family member creation...');
    
    // Get current user with session validation and refresh
    const user = await validateAndRefreshSession();
    if (!user) {
      throw new Error('User not authenticated. Please log in again.');
    }
    
    console.log('👤 Current user for family member creation:', user.id);

    // Insert the family member with timeout
    console.log('📝 Inserting family member into database...');
    const insertPromise = supabase
      .from('family_members')
      .insert({
        first_name: member.firstName,
        last_name: member.lastName,
        birth_date: member.birthDate,
        death_date: member.deathDate,
        birth_place: member.birthPlace,
        bio: member.bio,
        avatar_url: member.avatar,
        gender: member.gender,
        created_by: user?.id || null, // Allow null if user not authenticated
        branch_root: null, // Will be set after creation
        is_root_member: false
      })
      .select('id')
      .single();

    const insertTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database insert timeout')), 15000)
    );
    
    const { data: memberData, error: memberError } = await Promise.race([insertPromise, insertTimeoutPromise]) as { data: { id: string } | null; error: Error | null };
    
    if (memberError) {
      console.error('❌ Error inserting family member:', memberError);
      throw memberError;
    }
    
    console.log('✅ Family member inserted successfully:', memberData.id);

    // Set branch_root to the member's own ID if it's the first member, or find the appropriate branch root
    let branchRoot = memberData.id; // Default to self
    let isRootMember = true; // Default to true

    // Check if this is the first family member for this user (if user is authenticated)
    if (user?.id) {
      console.log('🔍 Checking for existing family members...');
      const { data: existingMembers } = await supabase
        .from('family_members')
        .select('id, branch_root')
        .eq('created_by', user.id)
        .neq('id', memberData.id);

      if (existingMembers && existingMembers.length > 0) {
        // Find the root member of the existing branch
        const rootMember = existingMembers.find(m => m.branch_root === m.id);
        if (rootMember) {
          branchRoot = rootMember.id;
          isRootMember = false;
        }
      }
    }

    // Update the member with the correct branch_root and is_root_member
    console.log('🔄 Updating branch info...');
    const updatePromise = supabase
      .from('family_members')
      .update({
        branch_root: branchRoot,
        is_root_member: isRootMember
      })
      .eq('id', memberData.id);
    
    const updateTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Branch update timeout')), 10000)
    );
    
    const { error: updateError } = await Promise.race([updatePromise, updateTimeoutPromise]) as { error: Error | null };

    if (updateError) {
      console.error('❌ Error updating branch info:', updateError);
      // Don't throw here, as the member was created successfully
    } else {
      console.log('✅ Branch info updated successfully');
    }

    // Add location if provided
    if (location && memberData) {
      console.log('📍 Adding location...');
      const locationPromise = supabase
        .from('locations')
        .insert({
          family_member_id: memberData.id,
          lat: Number(location.lat),
          lng: Number(location.lng),
          description: location.description,
          current_residence: true
        });
      
      const locationTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Location insert timeout')), 10000)
      );
      
      const { error: locationError } = await Promise.race([locationPromise, locationTimeoutPromise]) as { error: Error | null };
        
      if (locationError) {
        console.error('❌ Error adding location:', locationError);
        // Don't throw here, as the member was created successfully
      } else {
        console.log('✅ Location added successfully');
      }
    }

    // Return the newly added member
    toast({
      title: "Success",
      description: `Added ${member.firstName} ${member.lastName} to your family tree.`
    });
    
    return {
      ...member,
      id: memberData.id,
      relations: [],
      currentLocation: location
    };
  } catch (error) {
    console.error('Error adding family member:', error);
    toast({
      title: "Error",
      description: "Could not add family member.",
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
        story_members(family_member_id),
        story_media(media_id)
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    // Fetch media for stories
    const mediaIds = data
      .flatMap(story => story.story_media)
      .map(media => media?.media_id)
      .filter(Boolean);

    let mediaData: Record<string, string> = {};
    if (mediaIds.length > 0) {
      const { data: media } = await supabase
        .from('media')
        .select('id, url')
        .in('id', mediaIds);
      
      mediaData = Object.fromEntries((media || []).map(m => [m.id, m.url]));
    }

    return (data || []).map(story => ({
      id: story.id,
      title: story.title,
      content: story.content,
      authorId: story.author_id,
      date: story.date,
      relatedMembers: story.story_members.map(sm => sm.family_member_id),
      images: story.story_media
        .map(sm => sm.media_id ? mediaData[sm.media_id] : null)
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
    if (story.relatedMembers.length > 0) {
      const storyMembers = story.relatedMembers.map(memberId => ({
        story_id: data.id,
        family_member_id: memberId
      }));
      
      await supabase
        .from('story_members')
        .insert(storyMembers);
    }
    
    // Handle image uploads
    const images: string[] = [];
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        // Upload to storage
        const fileName = `${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('family-media')
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;
        
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
            caption: story.title
          })
          .select('id')
          .single();
          
        if (mediaError) throw mediaError;
        
        // Link media to story
        await supabase
          .from('story_media')
          .insert({
            story_id: data.id,
            media_id: mediaData.id
          });
          
        images.push(urlData.publicUrl);
      }
    }
    
    toast({
      title: "Success",
      description: "Your family story has been added."
    });
    
    return {
      ...story,
      id: data.id,
      authorId: user.id,
      images
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
      .upload(filePath, file);
      
    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
    
    console.log('Upload successful:', data);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('family-media')
      .getPublicUrl(data.path);
      
    console.log('Public URL generated:', urlData.publicUrl);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Could not upload file.';
    toast({
      title: "Upload Error",
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
    const { error } = await supabase
      .from('family_members')
      .update({ avatar_url: avatarUrl })
      .eq('id', memberId);

    if (error) throw error;

    toast({
      title: "Success",
      description: "Profile image updated successfully."
    });
    return true;
  } catch (error) {
    console.error('Error updating avatar:', error);
    toast({
      title: "Error", 
      description: "Could not update profile image.",
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
