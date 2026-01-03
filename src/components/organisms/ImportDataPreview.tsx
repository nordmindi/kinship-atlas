import React from 'react';
import { Badge } from '@/components/ui/badge';
import { sanitizeText } from '@/utils/sanitize';
import { FamilyMember, Relation, FamilyStory } from '@/types';
import { Artifact } from '@/types/stories';

interface ImportLocation {
  familyMemberId?: string;
  familyMemberName?: string;
  description: string;
  lat?: number;
  lng?: number;
  currentResidence?: boolean;
}

interface ImportMedia {
  url: string;
  mediaType: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
  linkedToType: 'story' | 'artifact' | 'member';
  linkedToId: string;
}

interface ImportArtifact {
  name: string;
  description?: string;
  artifactType: 'document' | 'heirloom' | 'photo' | 'letter' | 'certificate' | 'other';
  dateCreated?: string;
  dateAcquired?: string;
  condition?: string;
  locationStored?: string;
  mediaIds?: string[];
}

type PreviewMode =
  | 'members'
  | 'relationships'
  | 'stories'
  | 'locations'
  | 'media'
  | 'artifacts';

interface ImportDataPreviewProps {
  mode: PreviewMode;
  members?: FamilyMember[];
  relationships?: Relation[];
  stories?: FamilyStory[];
  locations?: ImportLocation[];
  media?: ImportMedia[];
  artifacts?: ImportArtifact[];
}

export const ImportDataPreview: React.FC<ImportDataPreviewProps> = ({
  mode,
  members = [],
  relationships = [],
  stories = [],
  locations = [],
  media = [],
  artifacts = [],
}) => {
  if (mode === 'members') {
    return (
      <div className="space-y-2">
        {members.map((member, index) => (
          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
            <Badge variant="outline">{member.gender}</Badge>
            <span className="font-medium">
              {member.firstName} {member.lastName}
            </span>
            {member.birthDate && (
              <span className="text-sm text-gray-500">Born: {member.birthDate}</span>
            )}
            {member.currentLocation && (
              <span className="text-sm text-gray-500">
                📍 {member.currentLocation.description}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'relationships') {
    return (
      <div className="space-y-2">
        {relationships.map((rel, index) => (
          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
            <Badge variant="outline">{rel.type}</Badge>
            <span className="text-sm">Relationship between members</span>
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'stories') {
    return (
      <div className="space-y-2">
        {stories.map((story, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded">
            <h4 className="font-medium">{story.title}</h4>
            <p className="text-sm text-gray-600">
              {sanitizeText(story.content).substring(0, 100)}...
            </p>
            {story.location && (
              <span className="text-xs text-gray-500">📍 {story.location}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'locations') {
    return (
      <div className="space-y-2">
        {locations.map((loc, index) => (
          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
            <span className="font-medium">{loc.description}</span>
            {loc.familyMemberName && (
              <span className="text-sm text-gray-500">({loc.familyMemberName})</span>
            )}
            {loc.lat && loc.lng && (
              <span className="text-xs text-gray-400">
                📍 {loc.lat}, {loc.lng}
              </span>
            )}
            {loc.currentResidence && <Badge variant="outline">Current</Badge>}
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'media') {
    return (
      <div className="space-y-2">
        {media.map((item, index) => (
          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
            <Badge variant="outline">{item.mediaType}</Badge>
            <span className="text-sm font-medium">{item.fileName || 'Media'}</span>
            {item.caption && (
              <span className="text-xs text-gray-500">{item.caption}</span>
            )}
            <span className="text-xs text-gray-400">→ {item.linkedToType}</span>
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'artifacts') {
    return (
      <div className="space-y-2">
        {artifacts.map((artifact, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{artifact.artifactType}</Badge>
              <span className="font-medium">{artifact.name}</span>
            </div>
            {artifact.description && (
              <p className="text-sm text-gray-600 mt-1">{artifact.description}</p>
            )}
            {artifact.locationStored && (
              <span className="text-xs text-gray-500">📍 {artifact.locationStored}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
};

