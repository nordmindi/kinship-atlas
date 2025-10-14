-- Seed data for Kinship Atlas local development
-- This file is automatically run when you reset your local database

-- Note: This seed file will only work if you have a user in the auth.users table
-- For local development, you can create a user through the Supabase Studio or sign up through the app

-- To create an admin user:
-- 1. Sign up through the app or create a user in Supabase Studio
-- 2. Run this SQL to make them an admin:
-- UPDATE public.user_profiles SET role = 'admin' WHERE id = 'your-user-id-here';

-- Insert sample family members (without user_id for now - will be set when user signs up)
INSERT INTO public.family_members (id, first_name, last_name, birth_date, death_date, birth_place, bio, gender, avatar_url, created_at, updated_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'John', 'Smith', '1950-03-15', NULL, 'New York, NY', 'Family patriarch and loving father.', 'male', NULL, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'Mary', 'Smith', '1952-07-22', NULL, 'Boston, MA', 'Devoted mother and grandmother.', 'female', NULL, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'David', 'Smith', '1975-11-08', NULL, 'New York, NY', 'Software engineer and family man.', 'male', NULL, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440004', 'Sarah', 'Johnson', '1978-04-12', NULL, 'Chicago, IL', 'Teacher and mother of two.', 'female', NULL, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440005', 'Emma', 'Smith', '2005-09-03', NULL, 'San Francisco, CA', 'Bright young student with a love for art.', 'female', NULL, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440006', 'James', 'Smith', '2008-12-18', NULL, 'San Francisco, CA', 'Energetic boy who loves sports and video games.', 'male', NULL, NOW(), NOW());

-- Insert sample relationships
INSERT INTO public.relations (id, from_member_id, to_member_id, relation_type, created_at) VALUES
  -- John and Mary are married
  ('550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'spouse', NOW()),
  ('550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'spouse', NOW()),
  
  -- David is John and Mary's child
  ('550e8400-e29b-41d4-a716-446655440039', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'parent', NOW()),
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'parent', NOW()),
  ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'child', NOW()),
  ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'child', NOW()),
  
  -- David and Sarah are married
  ('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'spouse', NOW()),
  ('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'spouse', NOW()),
  
  -- Emma and James are David and Sarah's children
  ('550e8400-e29b-41d4-a716-446655440045', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'parent', NOW()),
  ('550e8400-e29b-41d4-a716-446655440046', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'parent', NOW()),
  ('550e8400-e29b-41d4-a716-446655440047', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'parent', NOW()),
  ('550e8400-e29b-41d4-a716-446655440048', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 'parent', NOW()),
  ('550e8400-e29b-41d4-a716-446655440049', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'child', NOW()),
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'child', NOW()),
  ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'child', NOW()),
  ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004', 'child', NOW()),
  
  -- Emma and James are siblings
  ('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006', 'sibling', NOW()),
  ('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440005', 'sibling', NOW());

-- Insert sample locations
INSERT INTO public.locations (id, family_member_id, description, lat, lng, current_residence, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440055', '550e8400-e29b-41d4-a716-446655440001', 'New York, NY', 40.7128, -74.0060, true, NOW()),
  ('550e8400-e29b-41d4-a716-446655440056', '550e8400-e29b-41d4-a716-446655440002', 'New York, NY', 40.7128, -74.0060, true, NOW()),
  ('550e8400-e29b-41d4-a716-446655440057', '550e8400-e29b-41d4-a716-446655440003', 'San Francisco, CA', 37.7749, -122.4194, true, NOW()),
  ('550e8400-e29b-41d4-a716-446655440058', '550e8400-e29b-41d4-a716-446655440004', 'San Francisco, CA', 37.7749, -122.4194, true, NOW()),
  ('550e8400-e29b-41d4-a716-446655440059', '550e8400-e29b-41d4-a716-446655440005', 'San Francisco, CA', 37.7749, -122.4194, true, NOW()),
  ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440006', 'San Francisco, CA', 37.7749, -122.4194, true, NOW());

-- Insert sample family stories (without author_id for now - will be set when user signs up)
INSERT INTO public.family_stories (id, title, content, date, created_at, updated_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440007', 'The Smith Family Reunion 2023', 'What a wonderful time we had at the annual Smith family reunion! Everyone gathered at the old family home in New York. The kids played in the backyard while the adults shared stories and memories. Grandma Mary made her famous apple pie, and Grandpa John told his legendary fishing stories. It was a day filled with laughter, love, and the warmth of family bonds that have only grown stronger over the years.', '2023-08-15', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440008', 'Emma''s First Art Show', 'We are so proud of Emma! She had her first art show at the local community center. Her paintings were absolutely beautiful - she has such a natural talent for capturing emotions and colors. The whole family came to support her, and she was beaming with pride. This is just the beginning of what we know will be an amazing artistic journey for our talented daughter.', '2024-03-10', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440009', 'James''s Soccer Championship', 'What an incredible season! James''s soccer team made it to the championship game, and the whole family was there to cheer him on. The game went into overtime, and James scored the winning goal! The look on his face when he realized they had won was priceless. We celebrated with ice cream and pizza, and James couldn''t stop talking about the game for days. We''re so proud of his dedication and teamwork.', '2024-05-20', NOW(), NOW());

-- Link stories to family members
INSERT INTO public.story_members (id, story_id, family_member_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440006'),
  ('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440006'),
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440004');

-- Insert sample family events (without creator_id for now - will be set when user signs up)
INSERT INTO public.family_events (id, title, description, event_date, location, lat, lng, created_at, updated_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440022', 'Smith Family Reunion 2023', 'Annual family gathering at the old family home', '2023-08-15', 'New York, NY', 40.7128, -74.0060, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440023', 'Emma''s Art Show', 'Emma''s first public art exhibition', '2024-03-10', 'San Francisco, CA', 37.7749, -122.4194, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440024', 'James''s Soccer Championship', 'Championship game for James''s soccer team', '2024-05-20', 'San Francisco, CA', 37.7749, -122.4194, NOW(), NOW());

-- Link events to participants
INSERT INTO public.event_participants (id, event_id, family_member_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440006'),
  ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440006'),
  ('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440004');
