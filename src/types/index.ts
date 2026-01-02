
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  displayName?: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  currentLocation?: GeoLocation;
  bio?: string;
  avatar?: string;
  gender: 'male' | 'female' | 'other';
  relations: Relation[];
  createdBy?: string;
  branchRoot?: string;
  isRootMember?: boolean;
  familyGroups?: FamilyGroup[]; // Groups this member belongs to
}

export interface FamilyGroup {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number; // Optional count of members in this group
}

export interface Relation {
  id: string; // Added ID to enable relation deletion
  type: 'parent' | 'child' | 'spouse' | 'sibling';
  personId: string;
  date?: string; // Marriage date or other relationship date
}

export interface GeoLocation {
  lat: number;
  lng: number;
  description: string;
}

// Legacy types - keeping for backward compatibility
export interface LegacyFamilyStory {
  id: string;
  title: string;
  content: string;
  authorId: string;
  date: string;
  images?: string[];
  relatedMembers: string[]; // IDs of family members related to the story
}

export interface LegacyFamilyEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  location?: GeoLocation;
  participants: string[]; // IDs of family members who participated
  images?: string[];
}

// Export all stories types
export * from './stories';
