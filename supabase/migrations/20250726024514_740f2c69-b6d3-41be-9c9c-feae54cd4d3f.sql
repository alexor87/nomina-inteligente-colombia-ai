-- Fix get_period_adjustments function to query payroll_novedades instead of payroll_adjustments
CREATE OR REPLACE FUNCTION public.get_period_adjustments(period_id uuid)
RETURNS TABLE(id uuid, employee_id uuid, employee_name text, concept text, amount numeric, observations text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pn.id,
    pn.empleado_id as employee_id,
    CONCAT(e.nombre, ' ', e.apellido) as employee_name,
    CASE 
      WHEN pn.tipo_novedad = 'horas_extra_diurnas' THEN 'Horas extra diurnas'
      WHEN pn.tipo_novedad = 'horas_extra_nocturnas' THEN 'Horas extra nocturnas'
      WHEN pn.tipo_novedad = 'recargo_nocturno' THEN 'Recargo nocturno'
      WHEN pn.tipo_novedad = 'festivo_trabajado' THEN 'Festivo trabajado'
      WHEN pn.tipo_novedad = 'comision' THEN 'Comisión'
      WHEN pn.tipo_novedad = 'bonificacion' THEN 'Bonificación'
      WHEN pn.tipo_novedad = 'auxilio_transporte' THEN 'Auxilio de transporte'
      WHEN pn.tipo_novedad = 'vacaciones' THEN 'Vacaciones'
      WHEN pn.tipo_novedad = 'incapacidad' THEN 'Incapacidad'
      WHEN pn.tipo_novedad = 'licencia_remunerada' THEN 'Licencia remunerada'
      WHEN pn.tipo_novedad = 'licencia_no_remunerada' THEN 'Licencia no remunerada'
      WHEN pn.tipo_novedad = 'ausencia' THEN 'Ausencia'
      WHEN pn.tipo_novedad = 'deduccion_prestamo' THEN 'Deducción préstamo'
      WHEN pn.tipo_novedad = 'deduccion_disciplinaria' THEN 'Deducción disciplinaria'
      WHEN pn.tipo_novedad = 'embargo_judicial' THEN 'Embargo judicial'
      WHEN pn.tipo_novedad = 'descuento_varios' THEN 'Descuento varios'
      ELSE pn.tipo_novedad::text
    END as concept,
    pn.valor as amount,
    COALESCE(pn.observacion, '') as observations,
    pn.created_at
  FROM public.payroll_novedades pn
  JOIN public.employees e ON pn.empleado_id = e.id
  WHERE pn.periodo_id = $1
  ORDER BY pn.created_at DESC;
END;
$function$