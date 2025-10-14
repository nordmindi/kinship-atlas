
import { FamilyMember } from '@/types';

export const mockFamilyMembers: FamilyMember[] = [
  // Grandparents Generation
  {
    id: 'grandpa-john',
    firstName: 'John',
    lastName: 'Smith',
    birthDate: '1940-03-15',
    deathDate: '2018-11-20',
    gender: 'male',
    bio: 'Patriarch of the Smith family. Worked as a carpenter for 40 years.',
    avatar: '/placeholder.svg',
    relations: [
      { id: 'rel-1', type: 'spouse', personId: 'grandma-mary' },
      { id: 'rel-2', type: 'child', personId: 'dad-mike' },
      { id: 'rel-3', type: 'child', personId: 'aunt-sarah' }
    ]
  },
  {
    id: 'grandma-mary',
    firstName: 'Mary',
    lastName: 'Smith',
    birthDate: '1942-07-22',
    deathDate: '2020-05-10',
    gender: 'female',
    bio: 'Loving grandmother who taught school for 35 years.',
    avatar: '/placeholder.svg',
    relations: [
      { id: 'rel-4', type: 'spouse', personId: 'grandpa-john' },
      { id: 'rel-5', type: 'child', personId: 'dad-mike' },
      { id: 'rel-6', type: 'child', personId: 'aunt-sarah' }
    ]
  },
  
  // Parents Generation
  {
    id: 'dad-mike',
    firstName: 'Michael',
    lastName: 'Smith',
    birthDate: '1970-09-12',
    gender: 'male',
    bio: 'Software engineer and devoted father.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 40.7128,
      lng: -74.0060,
      description: 'New York, NY'
    },
    relations: [
      { id: 'rel-7', type: 'parent', personId: 'grandpa-john' },
      { id: 'rel-8', type: 'parent', personId: 'grandma-mary' },
      { id: 'rel-9', type: 'spouse', personId: 'mom-lisa' },
      { id: 'rel-10', type: 'sibling', personId: 'aunt-sarah' },
      { id: 'rel-11', type: 'child', personId: 'current-user' },
      { id: 'rel-12', type: 'child', personId: 'sister-emma' }
    ]
  },
  {
    id: 'mom-lisa',
    firstName: 'Lisa',
    lastName: 'Smith',
    birthDate: '1972-04-18',
    gender: 'female',
    bio: 'Marketing manager and amazing cook.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 40.7128,
      lng: -74.0060,
      description: 'New York, NY'
    },
    relations: [
      { id: 'rel-13', type: 'spouse', personId: 'dad-mike' },
      { id: 'rel-14', type: 'child', personId: 'current-user' },
      { id: 'rel-15', type: 'child', personId: 'sister-emma' }
    ]
  },
  {
    id: 'aunt-sarah',
    firstName: 'Sarah',
    lastName: 'Johnson',
    birthDate: '1968-01-30',
    gender: 'female',
    bio: 'Doctor and world traveler.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 34.0522,
      lng: -118.2437,
      description: 'Los Angeles, CA'
    },
    relations: [
      { id: 'rel-16', type: 'parent', personId: 'grandpa-john' },
      { id: 'rel-17', type: 'parent', personId: 'grandma-mary' },
      { id: 'rel-18', type: 'sibling', personId: 'dad-mike' },
      { id: 'rel-19', type: 'spouse', personId: 'uncle-tom' },
      { id: 'rel-20', type: 'child', personId: 'cousin-alex' }
    ]
  },
  {
    id: 'uncle-tom',
    firstName: 'Thomas',
    lastName: 'Johnson',
    birthDate: '1965-11-08',
    gender: 'male',
    bio: 'Architect and photography enthusiast.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 34.0522,
      lng: -118.2437,
      description: 'Los Angeles, CA'
    },
    relations: [
      { id: 'rel-21', type: 'spouse', personId: 'aunt-sarah' },
      { id: 'rel-22', type: 'child', personId: 'cousin-alex' }
    ]
  },
  
  // Current Generation
  {
    id: 'current-user',
    firstName: 'Alex',
    lastName: 'Smith',
    birthDate: '1995-06-25',
    gender: 'male',
    bio: 'Web developer and tech enthusiast.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 40.7128,
      lng: -74.0060,
      description: 'New York, NY'
    },
    relations: [
      { id: 'rel-23', type: 'parent', personId: 'dad-mike' },
      { id: 'rel-24', type: 'parent', personId: 'mom-lisa' },
      { id: 'rel-25', type: 'sibling', personId: 'sister-emma' },
      { id: 'rel-26', type: 'spouse', personId: 'spouse-jessica' },
      { id: 'rel-27', type: 'child', personId: 'son-charlie' }
    ]
  },
  {
    id: 'sister-emma',
    firstName: 'Emma',
    lastName: 'Smith',
    birthDate: '1998-12-03',
    gender: 'female',
    bio: 'Graphic designer and artist.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 40.7128,
      lng: -74.0060,
      description: 'New York, NY'
    },
    relations: [
      { id: 'rel-28', type: 'parent', personId: 'dad-mike' },
      { id: 'rel-29', type: 'parent', personId: 'mom-lisa' },
      { id: 'rel-30', type: 'sibling', personId: 'current-user' }
    ]
  },
  {
    id: 'cousin-alex',
    firstName: 'Alexandra',
    lastName: 'Johnson',
    birthDate: '1993-08-14',
    gender: 'female',
    bio: 'Environmental lawyer and activist.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 34.0522,
      lng: -118.2437,
      description: 'Los Angeles, CA'
    },
    relations: [
      { id: 'rel-31', type: 'parent', personId: 'aunt-sarah' },
      { id: 'rel-32', type: 'parent', personId: 'uncle-tom' }
    ]
  },
  {
    id: 'spouse-jessica',
    firstName: 'Jessica',
    lastName: 'Smith',
    birthDate: '1996-02-14',
    gender: 'female',
    bio: 'Teacher and volunteer coordinator.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 40.7128,
      lng: -74.0060,
      description: 'New York, NY'
    },
    relations: [
      { id: 'rel-33', type: 'spouse', personId: 'current-user' },
      { id: 'rel-34', type: 'child', personId: 'son-charlie' }
    ]
  },
  
  // Next Generation
  {
    id: 'son-charlie',
    firstName: 'Charlie',
    lastName: 'Smith',
    birthDate: '2020-09-10',
    gender: 'male',
    bio: 'Energetic toddler who loves building blocks.',
    avatar: '/placeholder.svg',
    currentLocation: {
      lat: 40.7128,
      lng: -74.0060,
      description: 'New York, NY'
    },
    relations: [
      { id: 'rel-35', type: 'parent', personId: 'current-user' },
      { id: 'rel-36', type: 'parent', personId: 'spouse-jessica' }
    ]
  }
];

// Helper function to get mock data
export const getMockFamilyMembers = (): Promise<FamilyMember[]> => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      resolve(mockFamilyMembers);
    }, 500);
  });
};

// Find current user in mock data
export const getCurrentUserFromMockData = (): FamilyMember | undefined => {
  return mockFamilyMembers.find(member => member.id === 'current-user');
};
