import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminStatsCards } from '../AdminStatsCards';
import { UserProfile } from '@/types';

const mockUsers: UserProfile[] = [
  {
    id: 'user-1',
    role: 'admin',
    displayName: 'Admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    role: 'editor',
    displayName: 'Editor',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'user-3',
    role: 'viewer',
    displayName: 'Viewer',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

describe('AdminStatsCards', () => {
  it('should render all stat cards', () => {
    render(
      <AdminStatsCards
        users={mockUsers}
        totalMembers={10}
        totalStories={5}
        totalMedia={20}
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Family Members')).toBeInTheDocument();
    expect(screen.getByText('Stories')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('should display correct user counts', () => {
    render(
      <AdminStatsCards
        users={mockUsers}
        totalMembers={10}
        totalStories={5}
        totalMedia={20}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument(); // Total users
    expect(screen.getByText(/1 admins, 1 editors, 1 viewers/)).toBeInTheDocument();
  });

  it('should display correct counts for all stats', () => {
    render(
      <AdminStatsCards
        users={mockUsers}
        totalMembers={10}
        totalStories={5}
        totalMedia={20}
      />
    );

    const stats = screen.getAllByText(/^\d+$/);
    expect(stats.some(el => el.textContent === '3')).toBe(true); // Users
    expect(stats.some(el => el.textContent === '10')).toBe(true); // Members
    expect(stats.some(el => el.textContent === '5')).toBe(true); // Stories
    expect(stats.some(el => el.textContent === '20')).toBe(true); // Media
  });

  it('should handle empty users array', () => {
    render(
      <AdminStatsCards
        users={[]}
        totalMembers={0}
        totalStories={0}
        totalMedia={0}
      />
    );

    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText(/0 admins, 0 editors, 0 viewers/)).toBeInTheDocument();
  });
});

