
# Legacy Stories Module Design
### Purpose: Capturing migration, resilience, and heritage within the family graph

---

## 1. Overview
**Module Name:** `stories`  
**Purpose:** The Legacy Stories module captures biographical narratives, migration journeys, and historical memories connected to family members in the genealogy system.

It extends the core family database with a **narrative layer**—integrating stories, events, participants, media, and places—to preserve human experiences alongside genealogical data.

---

## 2. Core Entities (as in your schema)

| Table | Description |
|--------|--------------|
| `family_members` | Individuals in the family tree |
| `relations` | Graph edges (parent, sibling, partner, etc.) |
| `family_stories` | Top-level narratives (title, content, date, author) |
| `story_members` | Links stories ↔ people (roles like protagonist, witness) |
| `family_events` | Chronological life events |
| `event_participants` | Links events ↔ people |
| `media` | Uploaded images, audio, video, or documents |
| `story_media`, `event_media` | Links stories or events to media |
| `locations` | Geographical data for events and residences |

---

## 3. Folder Structure (Example for Next.js/React + Supabase)

```
/modules/stories/
  domain/
    Story.ts
    Graph.ts
  data/
    stories.repo.ts
    events.repo.ts
    media.repo.ts
    members.repo.ts
    views.sql
  services/
    StoryService.ts
    TimelineService.ts
    SuggestService.ts
  ui/
    StoryList.tsx
    StoryEditor.tsx
    EventForm.tsx
    ParticipantPicker.tsx
    MediaUploader.tsx
    Timeline.tsx
    MapView.tsx
  hooks/
    useStories.ts
    useStory.ts
    useMemberTimeline.ts
    useSuggestedParticipants.ts
```

---

## 4. Core Workflows

### A. Create a Story (Biography or Journey)
1. Create record in `family_stories` (author_id, title, content, date).
2. Add participants in `story_members` (family_member_id, role).
3. Add related `family_events` if needed and connect via `event_participants`.
4. Attach images or documents using `media` → `story_media`.
5. Mark visibility in `attrs` (private, family-only, public).

### B. Build a Member’s Timeline
- Query all `events` and `stories` connected to a member.
- Merge and sort by date.
- Show on a unified interactive timeline with links to map and media.

### C. Smart Participant Suggestion
- Traverse `relations` to depth 1–2 for likely participants.
- Suggest family members who appear in previous shared stories/events.

---

## 5. Key SQL Queries

**Stories for a Family Member**
```sql
SELECT s.*
FROM family_stories s
JOIN story_members sm ON sm.story_id = s.id
WHERE sm.family_member_id = :member_id
ORDER BY COALESCE(s.date, s.created_at);
```

**Events for a Member**
```sql
SELECT e.*, json_agg(json_build_object('id', fm.id, 'name', fm.first_name || ' ' || fm.last_name)) AS participants
FROM family_events e
JOIN event_participants ep ON ep.event_id = e.id
JOIN family_members fm ON fm.id = ep.family_member_id
WHERE e.id IN (
  SELECT event_id FROM event_participants WHERE family_member_id = :member_id
)
GROUP BY e.id;
```

**Media for a Story (direct + via events)**
```sql
SELECT m.* FROM media m
JOIN story_media sm ON sm.media_id = m.id
WHERE sm.story_id = :story_id

UNION ALL

SELECT m.* FROM media m
JOIN event_media em ON em.media_id = m.id
WHERE em.event_id IN (
  SELECT e.id FROM family_events e
  JOIN event_participants ep ON ep.event_id = e.id
  JOIN story_members sm ON sm.family_member_id = ep.family_member_id
  WHERE sm.story_id = :story_id
);
```

---

## 6. SQL Views

```sql
CREATE OR REPLACE VIEW v_story_with_people AS
SELECT s.*, json_agg(DISTINCT jsonb_build_object(
  'id', fm.id,
  'name', fm.first_name || ' ' || fm.last_name
)) AS people
FROM family_stories s
LEFT JOIN story_members sm ON sm.story_id = s.id
LEFT JOIN family_members fm ON fm.id = sm.family_member_id
GROUP BY s.id;

CREATE OR REPLACE VIEW v_event_with_people AS
SELECT e.*, json_agg(DISTINCT jsonb_build_object(
  'id', fm.id,
  'name', fm.first_name || ' ' || fm.last_name
)) AS people
FROM family_events e
LEFT JOIN event_participants ep ON ep.event_id = e.id
LEFT JOIN family_members fm ON fm.id = ep.family_member_id
GROUP BY e.id;

CREATE OR REPLACE VIEW v_member_timeline AS
SELECT fm.id AS member_id, 'event' AS item_type, e.id AS item_id,
       e.title, e.event_date::date AS date, e.location, e.lat, e.lng
FROM family_members fm
JOIN event_participants ep ON ep.family_member_id = fm.id
JOIN family_events e ON e.id = ep.event_id
UNION ALL
SELECT fm.id AS member_id, 'story' AS item_type, s.id AS item_id,
       s.title, s.date::date AS date, NULL::text AS location, NULL::float AS lat, NULL::float AS lng
FROM family_members fm
JOIN story_members sm ON sm.family_member_id = fm.id
JOIN family_stories s ON s.id = sm.story_id;
```

---

## 7. API Endpoints

| Endpoint | Description |
|-----------|--------------|
| `GET /api/stories?memberId=` | Get all stories for a family member |
| `POST /api/stories` | Create new story with participants and media |
| `POST /api/events` | Create event and link participants |
| `GET /api/members/:id/timeline` | Unified timeline feed |
| `GET /api/members/:id/graph` | Relation graph for participant suggestions |

---

## 8. UX Components

- **StoryEditor** – Markdown + participants + media + consent checkbox  
- **Timeline** – Combines events and stories chronologically  
- **MapView** – Shows journey path or migration route  
- **ParticipantPicker** – Suggests relatives via relations graph  
- **Privacy Control** – Toggle visibility (private, family-only, public)

---

## 9. Enhancement Ideas

- Sentiment analysis or tagging for migration/emotion themes  
- Voice or video story uploads  
- Auto-generate a printable PDF “Life Story”  
- AI-assisted summary or timeline reconstruction

---

## 10. Checklist to Ship

- [ ] Add SQL views (`v_story_with_people`, `v_event_with_people`, `v_member_timeline`)  
- [ ] Build StoryService + TimelineService  
- [ ] Implement StoryEditor UI  
- [ ] Connect /members/:id/timeline route  
- [ ] Test participant suggestions via relations traversal  
- [ ] Add consent & visibility fields in `family_stories.attrs`

---

## 11. Summary
**Legacy Stories** transforms your genealogy system from static lineage data into a living archive of memories.  
Every story becomes a bridge between generations — tying human experience to the family graph, events, and geography.
