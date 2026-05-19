CREATE TABLE IF NOT EXISTS public.goal_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  label TEXT NOT NULL,               -- e.g. "FY 2025-26"
  goal_setting_opens_at TIMESTAMPTZ NOT NULL,
  goal_setting_closes_at TIMESTAMPTZ NOT NULL,
  q1_opens_at TIMESTAMPTZ NOT NULL,
  q1_closes_at TIMESTAMPTZ NOT NULL,
  q2_opens_at TIMESTAMPTZ NOT NULL,
  q2_closes_at TIMESTAMPTZ NOT NULL,
  q3_opens_at TIMESTAMPTZ NOT NULL,
  q3_closes_at TIMESTAMPTZ NOT NULL,
  q4_opens_at TIMESTAMPTZ NOT NULL,
  q4_closes_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one cycle active at a time
CREATE UNIQUE INDEX IF NOT EXISTS goal_cycles_one_active
  ON public.goal_cycles (is_active) WHERE is_active = true;

-- RLS: admins can do everything; all authenticated users can read
ALTER TABLE public.goal_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage cycles" ON public.goal_cycles
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "authenticated read cycles" ON public.goal_cycles
  FOR SELECT TO authenticated USING (true);

-- Seed one active cycle for the current fiscal year
INSERT INTO public.goal_cycles (year, label, is_active,
  goal_setting_opens_at, goal_setting_closes_at,
  q1_opens_at, q1_closes_at, q2_opens_at, q2_closes_at,
  q3_opens_at, q3_closes_at, q4_opens_at, q4_closes_at)
VALUES (2025, 'FY 2025-26', true,
  '2025-05-01', '2025-06-30',
  '2025-07-01', '2025-08-31',
  '2025-10-01', '2025-11-30',
  '2026-01-01', '2026-02-28',
  '2026-03-01', '2026-04-30'
) ON CONFLICT DO NOTHING;
