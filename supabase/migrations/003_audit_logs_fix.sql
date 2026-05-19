ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ DEFAULT now();
