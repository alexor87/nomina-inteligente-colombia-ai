-- Base schema: tablas creadas en el dashboard de Supabase (no tienen migración CREATE TABLE)
-- Este archivo garantiza que las tablas existan antes de que las migraciones posteriores las modifiquen

-- payroll_novedades: creada originalmente en el dashboard
-- Nota: tipo_novedad (novedad_type enum) se agrega en 20250625000513 después de crearse el enum
CREATE TABLE IF NOT EXISTS public.payroll_novedades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    empleado_id uuid NOT NULL,
    periodo_id uuid NOT NULL,
    tipo_novedad text,
    fecha_inicio date,
    fecha_fin date,
    dias integer,
    horas numeric,
    valor numeric DEFAULT 0,
    base_calculo text,
    subtipo text,
    observacion text,
    adjunto_url text,
    constitutivo_salario boolean DEFAULT false,
    creado_por uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- usuarios_empresa: creada en el dashboard, eliminada en migración 20250625232729
-- Solo necesita existir para que las migraciones intermedias puedan crear/eliminar políticas
CREATE TABLE IF NOT EXISTS public.usuarios_empresa (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.usuarios_empresa ENABLE ROW LEVEL SECURITY;

-- period_edit_sessions: creada originalmente en el dashboard
CREATE TABLE IF NOT EXISTS public.period_edit_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id uuid NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'active',
    changes jsonb NOT NULL DEFAULT '{}',
    composition_changes jsonb DEFAULT '{"added_employees": [], "removed_employees": []}',
    original_snapshot jsonb DEFAULT '{}',
    error_message text,
    is_composition_edit boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone
);
