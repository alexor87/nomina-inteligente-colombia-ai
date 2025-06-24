
-- Agregar columna base_calculo a la tabla payroll_novedades
ALTER TABLE public.payroll_novedades 
ADD COLUMN base_calculo TEXT;

-- Agregar también la columna subtipo que está siendo usada pero podría no existir
ALTER TABLE public.payroll_novedades 
ADD COLUMN subtipo TEXT;
