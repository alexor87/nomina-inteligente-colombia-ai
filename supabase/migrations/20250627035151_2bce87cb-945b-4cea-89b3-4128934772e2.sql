
-- Crear tabla para centros de costo
CREATE TABLE public.cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Crear tabla para sucursales/sedes
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  department TEXT,
  phone TEXT,
  manager_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Habilitar RLS en ambas tablas
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para centros de costo
CREATE POLICY "Users can view cost centers from their company" 
  ON public.cost_centers 
  FOR SELECT 
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can insert cost centers for their company" 
  ON public.cost_centers 
  FOR INSERT 
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can update cost centers from their company" 
  ON public.cost_centers 
  FOR UPDATE 
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can delete cost centers from their company" 
  ON public.cost_centers 
  FOR DELETE 
  USING (company_id = public.get_current_user_company_id());

-- Políticas RLS para sucursales
CREATE POLICY "Users can view branches from their company" 
  ON public.branches 
  FOR SELECT 
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can insert branches for their company" 
  ON public.branches 
  FOR INSERT 
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can update branches from their company" 
  ON public.branches 
  FOR UPDATE 
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can delete branches from their company" 
  ON public.branches 
  FOR DELETE 
  USING (company_id = public.get_current_user_company_id());

-- Triggers para actualizar updated_at
CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
