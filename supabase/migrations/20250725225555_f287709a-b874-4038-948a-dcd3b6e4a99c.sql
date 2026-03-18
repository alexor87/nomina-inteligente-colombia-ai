-- Create helper function to calculate period intersection days
CREATE OR REPLACE FUNCTION public.calculate_period_intersection_days(
  start_date1 DATE,
  end_date1 DATE,
  start_date2 DATE,
  end_date2 DATE
) RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Calculate intersection of two date ranges
  RETURN GREATEST(0, 
    LEAST(end_date1, end_date2) - GREATEST(start_date1, start_date2) + 1
  );
END;
$$;