
-- Crear tabla de empresas
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nit TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  representante_legal TEXT,
  actividad_economica TEXT,
  plan TEXT CHECK (plan IN ('basico', 'profesional', 'empresarial')) DEFAULT 'basico',
  estado TEXT CHECK (estado IN ('activa', 'suspendida', 'inactiva')) DEFAULT 'activa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de empleados
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cedula TEXT NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  salario_base DECIMAL(15,2) NOT NULL DEFAULT 0,
  tipo_contrato TEXT CHECK (tipo_contrato IN ('indefinido', 'fijo', 'obra', 'aprendizaje')) DEFAULT 'indefinido',
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT CHECK (estado IN ('activo', 'inactivo', 'vacaciones', 'incapacidad')) DEFAULT 'activo',
  eps TEXT,
  afp TEXT,
  arl TEXT,
  caja_compensacion TEXT,
  cargo TEXT,
  estado_afiliacion TEXT CHECK (estado_afiliacion IN ('completa', 'pendiente', 'inconsistente')) DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, cedula)
);

-- Crear tabla de alertas del dashboard
CREATE TABLE public.dashboard_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('warning', 'error', 'info')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  icon TEXT DEFAULT '⚠️',
  action_required BOOLEAN DEFAULT false,
  due_date DATE,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de actividad del dashboard
CREATE TABLE public.dashboard_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  type TEXT CHECK (type IN ('payroll', 'employee', 'report', 'payment')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de nóminas
CREATE TABLE public.payrolls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL, -- formato YYYY-MM
  salario_base DECIMAL(15,2) NOT NULL DEFAULT 0,
  dias_trabajados INTEGER DEFAULT 30,
  horas_extra DECIMAL(8,2) DEFAULT 0,
  recargo_nocturno DECIMAL(15,2) DEFAULT 0,
  recargo_dominical DECIMAL(15,2) DEFAULT 0,
  auxilio_transporte DECIMAL(15,2) DEFAULT 0,
  bonificaciones DECIMAL(15,2) DEFAULT 0,
  cesantias DECIMAL(15,2) DEFAULT 0,
  intereses_cesantias DECIMAL(15,2) DEFAULT 0,
  prima DECIMAL(15,2) DEFAULT 0,
  vacaciones DECIMAL(15,2) DEFAULT 0,
  salud_empleado DECIMAL(15,2) DEFAULT 0,
  pension_empleado DECIMAL(15,2) DEFAULT 0,
  retencion_fuente DECIMAL(15,2) DEFAULT 0,
  otras_deducciones DECIMAL(15,2) DEFAULT 0,
  total_devengado DECIMAL(15,2) DEFAULT 0,
  total_deducciones DECIMAL(15,2) DEFAULT 0,
  neto_pagado DECIMAL(15,2) DEFAULT 0,
  estado TEXT CHECK (estado IN ('borrador', 'procesada', 'pagada')) DEFAULT 'borrador',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, periodo)
);

-- Habilitar Row Level Security en todas las tablas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

-- Insertar datos de ejemplo para una empresa
INSERT INTO public.companies (nit, razon_social, email, telefono, direccion, ciudad, representante_legal)
VALUES ('900123456-7', 'Empresa Demo S.A.S', 'admin@empresademo.com', '3001234567', 'Calle 123 #45-67', 'Bogotá', 'Juan Pérez');

-- Insertar empleados de ejemplo
INSERT INTO public.employees (company_id, cedula, nombre, apellido, email, salario_base, cargo, eps, afp, arl, estado_afiliacion)
SELECT 
  c.id,
  '12345678',
  'María',
  'García',
  'maria.garcia@empresademo.com',
  2500000,
  'Desarrolladora',
  'Compensar',
  'Porvenir',
  'SURA',
  'completa'
FROM public.companies c WHERE c.nit = '900123456-7';

INSERT INTO public.employees (company_id, cedula, nombre, apellido, email, salario_base, cargo, eps, afp, arl, estado_afiliacion)
SELECT 
  c.id,
  '87654321',
  'Carlos',
  'López',
  'carlos.lopez@empresademo.com',
  3000000,
  'Contador',
  'Nueva EPS',
  'Colfondos',
  'SURA',
  'completa'
FROM public.companies c WHERE c.nit = '900123456-7';

INSERT INTO public.employees (company_id, cedula, nombre, apellido, email, salario_base, cargo, eps, afp, arl, estado_afiliacion)
SELECT 
  c.id,
  '11223344',
  'Ana',
  'Rodríguez',
  'ana.rodriguez@empresademo.com',
  2200000,
  'Diseñadora',
  'Sanitas',
  'Protección',
  'Colpatria',
  'pendiente'
FROM public.companies c WHERE c.nit = '900123456-7';

-- Insertar alertas de ejemplo
INSERT INTO public.dashboard_alerts (company_id, type, title, description, priority, icon, action_required, due_date)
SELECT 
  c.id,
  'warning',
  '3 empleados sin afiliación ARL',
  'Revisa y actualiza las afiliaciones',
  'high',
  '⚠️',
  true,
  NULL
FROM public.companies c WHERE c.nit = '900123456-7';

INSERT INTO public.dashboard_alerts (company_id, type, title, description, priority, icon, action_required, due_date)
SELECT 
  c.id,
  'error',
  '2 contratos vencen este mes',
  'Renueva antes del 25 de enero',
  'high',
  '🚨',
  true,
  '2025-01-25'
FROM public.companies c WHERE c.nit = '900123456-7';

-- Insertar actividad de ejemplo
INSERT INTO public.dashboard_activity (company_id, user_email, action, type)
SELECT 
  c.id,
  'admin@empresademo.com',
  'Procesó nómina de enero',
  'payroll'
FROM public.companies c WHERE c.nit = '900123456-7';

INSERT INTO public.dashboard_activity (company_id, user_email, action, type)
SELECT 
  c.id,
  'rrhh@empresademo.com',
  'Agregó nuevo empleado',
  'employee'
FROM public.companies c WHERE c.nit = '900123456-7';
