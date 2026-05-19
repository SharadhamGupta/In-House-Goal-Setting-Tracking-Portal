ALTER TABLE public.achievement_updates
  ADD COLUMN IF NOT EXISTS manager_checkin_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS manager_checkin_completed_at TIMESTAMPTZ;
