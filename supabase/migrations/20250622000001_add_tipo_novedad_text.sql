-- Agregar tipo_novedad como TEXT a payroll_novedades
-- (será convertida a enum novedad_type en migración 20250625000512)
ALTER TABLE public.payroll_novedades
ADD COLUMN IF NOT EXISTS tipo_novedad text;
