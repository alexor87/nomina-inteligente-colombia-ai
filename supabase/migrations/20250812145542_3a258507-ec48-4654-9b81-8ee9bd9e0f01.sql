
-- 1) Columna para rastrear el creador de la empresa
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2) Función/trigger para setear created_by con auth.uid()
CREATE OR REPLACE FUNCTION public.set_company_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_company_created_by ON public.companies;

CREATE TRIGGER trg_set_company_created_by
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.set_company_created_by();

-- 3) Política RLS para permitir INSERT
CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 4) Política RLS para permitir SELECT de la empresa recién creada
CREATE POLICY "Users can view companies they created"
ON public.companies
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
