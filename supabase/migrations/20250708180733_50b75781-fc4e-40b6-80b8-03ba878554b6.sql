
-- FASE 1: Agregar columna custom_fields a employees
ALTER TABLE public.employees 
ADD COLUMN custom_fields JSONB DEFAULT '{}';

-- Crear índice para búsquedas eficientes en custom_fields
CREATE INDEX idx_employees_custom_fields ON public.employees USING GIN (custom_fields);

-- FASE 2: Tabla de definiciones de campos personalizados por empresa
CREATE TABLE public.company_field_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'email', 'phone')),
  field_options JSONB DEFAULT NULL, -- Para opciones de select, validaciones, etc.
  is_required BOOLEAN DEFAULT false,
  default_value JSONB DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, field_key)
);

-- RLS para company_field_definitions
ALTER TABLE public.company_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company field definitions" 
ON public.company_field_definitions 
FOR ALL 
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- FASE 3: Tabla de historial de cambios de esquema
CREATE TABLE public.company_schema_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes_summary TEXT NOT NULL,
  field_definitions JSONB NOT NULL, -- Snapshot completo de definiciones
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para company_schema_versions
ALTER TABLE public.company_schema_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company schema versions" 
ON public.company_schema_versions 
FOR SELECT 
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create schema versions for their company" 
ON public.company_schema_versions 
FOR INSERT 
WITH CHECK (company_id = get_current_user_company_id() AND created_by = auth.uid());

-- Trigger para actualizar updated_at en field_definitions
CREATE OR REPLACE FUNCTION update_company_field_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_field_definitions_updated_at
    BEFORE UPDATE ON public.company_field_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_company_field_definitions_updated_at();

-- Función para obtener definiciones de campos activos de una empresa
CREATE OR REPLACE FUNCTION get_company_active_field_definitions(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  field_key TEXT,
  field_label TEXT,
  field_type TEXT,
  field_options JSONB,
  is_required BOOLEAN,
  default_value JSONB,
  sort_order INTEGER
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cfd.id,
    cfd.field_key,
    cfd.field_label,
    cfd.field_type,
    cfd.field_options,
    cfd.is_required,
    cfd.default_value,
    cfd.sort_order
  FROM public.company_field_definitions cfd
  WHERE cfd.company_id = p_company_id 
    AND cfd.is_active = true
  ORDER BY cfd.sort_order ASC, cfd.created_at ASC;
$$;
