-- Add sibling_type column to relations table
-- This column stores whether siblings are 'full' (share both parents) or 'half' (share one parent)
-- NULL means the sibling type hasn't been determined yet (for existing relationships)

ALTER TABLE public.relations
ADD COLUMN IF NOT EXISTS sibling_type TEXT CHECK (sibling_type IN ('full', 'half')) DEFAULT NULL;

-- Create index for faster queries on sibling relationships
CREATE INDEX IF NOT EXISTS idx_relations_sibling_type ON public.relations(relation_type, sibling_type) 
WHERE relation_type = 'sibling';

-- Add comment to document the column
COMMENT ON COLUMN public.relations.sibling_type IS 'For sibling relationships: "full" if siblings share both parents, "half" if they share one parent. NULL if not determined.';
