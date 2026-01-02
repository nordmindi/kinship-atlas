export interface FamilyStory {
  id: string;
  title: string;
  content: string;
  date?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  attrs?: Record<string, any>;
  location?: string;
  lat?: number;
  lng?: number;
  relatedMembers: StoryMember[];
  media?: Media[];
  artifacts?: Artifact[];
  groups?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export interface StoryMember {
  id: string;
  storyId: string;
  familyMemberId: string;
  role: 'protagonist' | 'witness' | 'narrator' | 'participant';
  familyMember?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface FamilyEvent {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  lat?: number;
  lng?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attrs?: Record<string, any>;
  participants: EventParticipant[];
  media?: Media[];
}

export interface EventParticipant {
  id: string;
  eventId: string;
  familyMemberId: string;
  role: 'organizer' | 'attendee' | 'witness' | 'participant';
  familyMember?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Media {
  id: string;
  url: string;
  media_type: string;
  caption?: string;
  file_name?: string;
  file_size?: number;
  user_id: string;
  created_at: string;
}

export interface StoryMedia {
  id: string;
  storyId: string;
  mediaId: string;
  createdAt: string;
}

export interface EventMedia {
  id: string;
  eventId: string;
  mediaId: string;
  createdAt: string;
}

export interface TimelineItem {
  memberId: string;
  itemType: 'event' | 'story';
  itemId: string;
  title: string;
  date: string;
  location?: string;
  lat?: number;
  lng?: number;
  description?: string;
  content?: string;
  groupIds?: string[]; // Groups assigned to stories (for stories only)
}

export interface CreateStoryRequest {
  title: string;
  content: string;
  date?: string;
  location?: string;
  lat?: number;
  lng?: number;
  relatedMembers: {
    familyMemberId: string;
    role: 'protagonist' | 'witness' | 'narrator' | 'participant';
  }[];
  mediaIds?: string[];
  artifactIds?: string[];
  groupIds?: string[];
  attrs?: Record<string, any>;
}

export interface UpdateStoryRequest {
  id: string;
  title?: string;
  content?: string;
  date?: string;
  location?: string;
  lat?: number;
  lng?: number;
  relatedMembers?: {
    familyMemberId: string;
    role: 'protagonist' | 'witness' | 'narrator' | 'participant';
  }[];
  mediaIds?: string[];
  artifactIds?: string[];
  groupIds?: string[];
  attrs?: Record<string, any>;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  lat?: number;
  lng?: number;
  participants: {
    familyMemberId: string;
    role: 'organizer' | 'attendee' | 'witness' | 'participant';
  }[];
  mediaIds?: string[];
  attrs?: Record<string, any>;
}

export interface UpdateEventRequest {
  id: string;
  title?: string;
  description?: string;
  eventDate?: string;
  location?: string;
  lat?: number;
  lng?: number;
  participants?: {
    familyMemberId: string;
    role: 'organizer' | 'attendee' | 'witness' | 'participant';
  }[];
  mediaIds?: string[];
  attrs?: Record<string, any>;
}

export interface UploadMediaRequest {
  file: File;
  altText?: string;
  attrs?: Record<string, any>;
}

export interface StoryWithPeople {
  id: string;
  title: string;
  content: string;
  date?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  attrs?: Record<string, any>;
  people: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface EventWithPeople {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  lat?: number;
  lng?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attrs?: Record<string, any>;
  people: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface Artifact {
  id: string;
  name: string;
  description?: string;
  artifactType: 'document' | 'heirloom' | 'photo' | 'letter' | 'certificate' | 'other';
  dateCreated?: string;
  dateAcquired?: string;
  condition?: string;
  locationStored?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  attrs?: Record<string, any>;
  media?: Media[];
}

export interface CreateArtifactRequest {
  name: string;
  description?: string;
  artifactType: 'document' | 'heirloom' | 'photo' | 'letter' | 'certificate' | 'other';
  dateCreated?: string;
  dateAcquired?: string;
  condition?: string;
  locationStored?: string;
  mediaIds?: string[];
  attrs?: Record<string, any>;
}

export interface UpdateArtifactRequest {
  id: string;
  name?: string;
  description?: string;
  artifactType?: 'document' | 'heirloom' | 'photo' | 'letter' | 'certificate' | 'other';
  dateCreated?: string;
  dateAcquired?: string;
  condition?: string;
  locationStored?: string;
  mediaIds?: string[];
  attrs?: Record<string, any>;
}
