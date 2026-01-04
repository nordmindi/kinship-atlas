export interface Album {
  id: string;
  name: string;
  description?: string;
  coverMediaId?: string;
  coverMedia?: {
    id: string;
    url: string;
    media_type: string;
  };
  userId: string;
  createdAt: string;
  updatedAt: string;
  mediaCount?: number;
  // Relationships
  familyGroups?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  familyMembers?: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  storyCategories?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  media?: Array<{
    id: string;
    url: string;
    media_type: string;
    caption?: string;
    file_name?: string;
    display_order?: number;
  }>;
}

export interface StoryCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface CreateAlbumRequest {
  name: string;
  description?: string;
  coverMediaId?: string;
  familyGroupIds?: string[];
  familyMemberIds?: string[];
  storyCategoryIds?: string[];
  mediaIds?: string[];
}

export interface UpdateAlbumRequest {
  id: string;
  name?: string;
  description?: string;
  coverMediaId?: string;
  familyGroupIds?: string[];
  familyMemberIds?: string[];
  storyCategoryIds?: string[];
  mediaIds?: string[];
}

export interface AlbumFilters {
  familyGroupId?: string;
  familyMemberId?: string;
  storyCategoryId?: string;
  searchTerm?: string;
}

