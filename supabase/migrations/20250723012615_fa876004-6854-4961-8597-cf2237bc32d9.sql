
-- Create function to get period adjustments with employee information
CREATE OR REPLACE FUNCTION public.get_period_adjustments(period_id uuid)
RETURNS TABLE(
  id uuid,
  employee_id uuid,
  employee_name text,
  concept text,
  amount numeric,
  observations text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.id,
    pa.employee_id,
    CONCAT(e.nombre, ' ', e.apellido) as employee_name,
    pa.concept,
    pa.amount,
    pa.observations,
    pa.created_at
  FROM public.payroll_adjustments pa
  JOIN public.employees e ON pa.employee_id = e.id
  WHERE pa.period_id = $1
  ORDER BY pa.created_at DESC;
END;
$$;

-- Create function to create payroll adjustment
CREATE OR REPLACE FUNCTION public.create_payroll_adjustment(
  p_period_id uuid,
  p_employee_id uuid,
  p_concept text,
  p_amount numeric,
  p_observations text,
  p_created_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.payroll_adjustments (
    period_id,
    employee_id,
    concept,
    amount,
    observations,
    created_by
  ) VALUES (
    p_period_id,
    p_employee_id,
    p_concept,
    p_amount,
    p_observations,
    p_created_by
  );
END;
$$;
