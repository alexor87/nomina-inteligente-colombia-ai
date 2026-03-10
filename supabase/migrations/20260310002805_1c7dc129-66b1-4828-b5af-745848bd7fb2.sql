-- Phase 3: Notifications & Billing

CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'info',
  target_plans text[] DEFAULT NULL,
  target_statuses text[] DEFAULT NULL,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage admin_notifications"
  ON public.admin_notifications FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "Users can read active admin_notifications"
  ON public.admin_notifications FOR SELECT TO authenticated
  USING (expires_at IS NULL OR expires_at > now());

CREATE TABLE public.admin_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own notification reads"
  ON public.admin_notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own notification reads"
  ON public.admin_notification_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Superadmins can view all notification reads"
  ON public.admin_notification_reads FOR SELECT TO authenticated
  USING (is_superadmin());

CREATE TABLE public.company_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period text NOT NULL,
  plan_type text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendiente',
  due_date date NOT NULL,
  paid_at timestamptz,
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, period)
);

ALTER TABLE public.company_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage company_billing"
  ON public.company_billing FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "Users can view own company billing"
  ON public.company_billing FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE INDEX idx_admin_notifications_expires ON public.admin_notifications(expires_at);
CREATE INDEX idx_admin_notification_reads_user ON public.admin_notification_reads(user_id);
CREATE INDEX idx_admin_notification_reads_notif ON public.admin_notification_reads(notification_id);
CREATE INDEX idx_company_billing_period ON public.company_billing(period);
CREATE INDEX idx_company_billing_status ON public.company_billing(status);
CREATE INDEX idx_company_billing_company ON public.company_billing(company_id);

CREATE OR REPLACE FUNCTION validate_notification_priority()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.priority NOT IN ('info', 'warning', 'critical') THEN
    RAISE EXCEPTION 'Invalid priority value';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_notification_priority
  BEFORE INSERT OR UPDATE ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION validate_notification_priority();

CREATE OR REPLACE FUNCTION validate_billing_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pendiente', 'pagado', 'vencido') THEN
    RAISE EXCEPTION 'Invalid billing status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_billing_status
  BEFORE INSERT OR UPDATE ON public.company_billing
  FOR EACH ROW EXECUTE FUNCTION validate_billing_status();