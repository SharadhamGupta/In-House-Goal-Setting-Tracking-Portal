ALTER TABLE public.achievement_updates
  ADD COLUMN IF NOT EXISTS synced_from_owner BOOLEAN DEFAULT false;
