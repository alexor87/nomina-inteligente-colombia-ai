-- Fix data type casting in get_period_adjustments function
DROP FUNCTION IF EXISTS public.get_period_adjustments(uuid);

CREATE OR REPLACE FUNCTION public.get_period_adjustments(p_period_id uuid)
RETURNS TABLE(
  id uuid,
  employee_name text,
  concept text,
  amount numeric,
  observations text,
  novedad_type text,
  created_by_email text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pn.id,
    CONCAT(e.nombre, ' ', e.apellido) as employee_name,
    CASE 
      WHEN pn.tipo_novedad = 'horas_extra' THEN 'Horas Extra'
      WHEN pn.tipo_novedad = 'recargo_nocturno' THEN 'Recargo Nocturno'
      WHEN pn.tipo_novedad = 'vacaciones' THEN 'Vacaciones'
      WHEN pn.tipo_novedad = 'licencia_remunerada' THEN 'Licencia Remunerada'
      WHEN pn.tipo_novedad = 'licencia_no_remunerada' THEN 'Licencia No Remunerada'
      WHEN pn.tipo_novedad = 'incapacidad' THEN 'Incapacidad'
      WHEN pn.tipo_novedad = 'bonificacion' THEN 'Bonificación'
      WHEN pn.tipo_novedad = 'comision' THEN 'Comisión'
      WHEN pn.tipo_novedad = 'prima' THEN 'Prima'
      WHEN pn.tipo_novedad = 'otros_ingresos' THEN 'Otros Ingresos'
      WHEN pn.tipo_novedad = 'salud' THEN 'Descuento Salud'
      WHEN pn.tipo_novedad = 'pension' THEN 'Descuento Pensión'
      WHEN pn.tipo_novedad = 'fondo_solidaridad' THEN 'Fondo Solidaridad'
      WHEN pn.tipo_novedad = 'retencion_fuente' THEN 'Retención en la Fuente'
      WHEN pn.tipo_novedad = 'libranza' THEN 'Libranza'
      WHEN pn.tipo_novedad = 'ausencia' THEN 'Ausencia'
      WHEN pn.tipo_novedad = 'multa' THEN 'Multa'
      WHEN pn.tipo_novedad = 'descuento_voluntario' THEN 'Descuento Voluntario'
      ELSE pn.tipo_novedad::text
    END as concept,
    pn.valor as amount,
    COALESCE(pn.observacion, '') as observations,
    pn.tipo_novedad::text as novedad_type,
    COALESCE(au.email::text, 'Usuario desconocido') as created_by_email,
    pn.created_at
  FROM payroll_novedades pn
  LEFT JOIN employees e ON pn.empleado_id = e.id
  LEFT JOIN auth.users au ON pn.creado_por = au.id
  WHERE pn.periodo_id = p_period_id
  AND pn.company_id = get_current_user_company_id()
  ORDER BY pn.created_at DESC;
END;
$function$;