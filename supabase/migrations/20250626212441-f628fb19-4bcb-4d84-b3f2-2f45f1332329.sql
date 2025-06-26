
-- Crear tabla para tipos de cotizante
CREATE TABLE public.tipos_cotizante (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crear tabla para subtipos de cotizante
CREATE TABLE public.subtipos_cotizante (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  tipo_cotizante_id uuid NOT NULL REFERENCES public.tipos_cotizante(id) ON DELETE CASCADE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(codigo, tipo_cotizante_id)
);

-- Insertar datos iniciales de tipos de cotizante según normativa colombiana
INSERT INTO public.tipos_cotizante (codigo, nombre, descripcion) VALUES
('01', 'Empleado', 'Trabajador dependiente con contrato de trabajo'),
('02', 'Pensionado', 'Persona que recibe pensión'),
('03', 'Beneficiario', 'Beneficiario de pensión de sobrevivientes'),
('12', 'Independiente', 'Trabajador independiente'),
('17', 'Trabajador de alto riesgo', 'Trabajador con alto riesgo pensional'),
('18', 'Trabajador de alto riesgo pensionado', 'Trabajador de alto riesgo que recibe pensión'),
('19', 'Estudiante', 'Estudiante que cotiza al sistema'),
('20', 'Extranjero no residente', 'Extranjero que no reside en Colombia'),
('21', 'Beneficiario en el exterior', 'Beneficiario que reside en el exterior'),
('22', 'Trabajador servicio doméstico', 'Trabajador del servicio doméstico'),
('23', 'Trabajador UNP', 'Trabajador de la Unidad Nacional de Protección');

-- Insertar subtipos de cotizante
INSERT INTO public.subtipos_cotizante (codigo, nombre, descripcion, tipo_cotizante_id) VALUES
-- Subtipos para Empleado (01)
('00', 'Empleado común', 'Empleado común sin particularidades', (SELECT id FROM public.tipos_cotizante WHERE codigo = '01')),
('10', 'Empleado alto riesgo', 'Empleado con actividad de alto riesgo', (SELECT id FROM public.tipos_cotizante WHERE codigo = '01')),
('11', 'Empleado integral', 'Empleado con salario integral', (SELECT id FROM public.tipos_cotizante WHERE codigo = '01')),

-- Subtipos para Independiente (12)
('00', 'Independiente común', 'Trabajador independiente común', (SELECT id FROM public.tipos_cotizante WHERE codigo = '12')),
('07', 'Independiente alto riesgo', 'Independiente con actividad de alto riesgo', (SELECT id FROM public.tipos_cotizante WHERE codigo = '12')),
('08', 'Madre comunitaria', 'Madre comunitaria del ICBF', (SELECT id FROM public.tipos_cotizante WHERE codigo = '12')),

-- Subtipos para Trabajador de alto riesgo (17)
('00', 'Alto riesgo común', 'Trabajador común de alto riesgo', (SELECT id FROM public.tipos_cotizante WHERE codigo = '17')),

-- Subtipos para Estudiante (19)
('00', 'Estudiante común', 'Estudiante que cotiza', (SELECT id FROM public.tipos_cotizante WHERE codigo = '19')),

-- Subtipos para Trabajador servicio doméstico (22)
('00', 'Servicio doméstico común', 'Trabajador del servicio doméstico', (SELECT id FROM public.tipos_cotizante WHERE codigo = '22'));

-- Crear índices para optimizar consultas
CREATE INDEX idx_tipos_cotizante_codigo ON public.tipos_cotizante(codigo);
CREATE INDEX idx_tipos_cotizante_activo ON public.tipos_cotizante(activo);
CREATE INDEX idx_subtipos_cotizante_tipo_id ON public.subtipos_cotizante(tipo_cotizante_id);
CREATE INDEX idx_subtipos_cotizante_activo ON public.subtipos_cotizante(activo);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tipos_cotizante_updated_at BEFORE UPDATE ON public.tipos_cotizante FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_subtipos_cotizante_updated_at BEFORE UPDATE ON public.subtipos_cotizante FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Actualizar tabla employees para incluir los nuevos campos
ALTER TABLE public.employees 
ADD COLUMN tipo_cotizante_id uuid REFERENCES public.tipos_cotizante(id),
ADD COLUMN subtipo_cotizante_id uuid REFERENCES public.subtipos_cotizante(id);

-- Crear índices en la tabla employees
CREATE INDEX idx_employees_tipo_cotizante ON public.employees(tipo_cotizante_id);
CREATE INDEX idx_employees_subtipo_cotizante ON public.employees(subtipo_cotizante_id);
