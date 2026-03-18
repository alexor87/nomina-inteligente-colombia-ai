-- Crear usuarios_empresa (tabla creada en dashboard, eliminada en 20250625232729)
-- Solo necesita existir para que migraciones intermedias puedan gestionar sus políticas
CREATE TABLE IF NOT EXISTS public.usuarios_empresa (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.usuarios_empresa ENABLE ROW LEVEL SECURITY;
