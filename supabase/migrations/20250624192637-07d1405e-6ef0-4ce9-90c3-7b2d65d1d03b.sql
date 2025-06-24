
-- Crear tabla para registrar las importaciones
CREATE TABLE public.employee_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_details JSONB,
  mapping_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.employee_imports ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus importaciones de su empresa
CREATE POLICY "Users can view their company imports" 
  ON public.employee_imports 
  FOR SELECT 
  USING (company_id IN (
    SELECT p.company_id 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  ));

-- Política para crear importaciones
CREATE POLICY "Users can create imports for their company" 
  ON public.employee_imports 
  FOR INSERT 
  WITH CHECK (
    company_id IN (
      SELECT p.company_id 
      FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

-- Índices para mejor rendimiento
CREATE INDEX idx_employee_imports_company_id ON public.employee_imports(company_id);
CREATE INDEX idx_employee_imports_user_id ON public.employee_imports(user_id);
CREATE INDEX idx_employee_imports_created_at ON public.employee_imports(created_at DESC);
