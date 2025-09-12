-- Update period_edit_sessions table to support composition changes
ALTER TABLE public.period_edit_sessions 
ADD COLUMN IF NOT EXISTS composition_changes JSONB DEFAULT '{"added_employees": [], "removed_employees": []}',
ADD COLUMN IF NOT EXISTS original_snapshot JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_composition_edit BOOLEAN DEFAULT false;