
-- Crear tabla para EPS en Colombia
CREATE TABLE public.eps_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para AFP en Colombia
CREATE TABLE public.afp_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para ARL en Colombia
CREATE TABLE public.arl_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para Cajas de Compensación en Colombia
CREATE TABLE public.compensation_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar datos de EPS principales en Colombia
INSERT INTO public.eps_entities (code, name) VALUES
('EPS001', 'Nueva EPS'),
('EPS002', 'Sanitas'),
('EPS003', 'Sura'),
('EPS004', 'Salud Total'),
('EPS005', 'Compensar'),
('EPS006', 'Famisanar'),
('EPS007', 'Medimás'),
('EPS008', 'Coosalud'),
('EPS009', 'Mutual Ser'),
('EPS010', 'Cruz Blanca'),
('EPS011', 'Golden Group'),
('EPS012', 'Cajacopi'),
('EPS013', 'Comfenalco Valle'),
('EPS014', 'Aliansalud'),
('EPS015', 'Ambuq'),
('EPS016', 'Asmet Salud'),
('EPS017', 'Capital Salud'),
('EPS018', 'Comfamiliar Huila'),
('EPS019', 'EPS Convida'),
('EPS020', 'Dusakawi');

-- Insertar datos de AFP principales en Colombia
INSERT INTO public.afp_entities (code, name) VALUES
('AFP001', 'Porvenir'),
('AFP002', 'Protección'),
('AFP003', 'Colfondos'),
('AFP004', 'Old Mutual'),
('AFP005', 'Skandia'),
('AFP006', 'Colpensiones');

-- Insertar datos de ARL principales en Colombia
INSERT INTO public.arl_entities (code, name) VALUES
('ARL001', 'Sura ARL'),
('ARL002', 'Positiva'),
('ARL003', 'Colmena'),
('ARL004', 'Liberty'),
('ARL005', 'Bolívar'),
('ARL006', 'Equidad'),
('ARL007', 'Mapfre');

-- Insertar datos de Cajas de Compensación principales en Colombia
INSERT INTO public.compensation_funds (code, name) VALUES
('CCF001', 'Compensar'),
('CCF002', 'Colsubsidio'),
('CCF003', 'Comfama'),
('CCF004', 'Comfenalco Antioquia'),
('CCF005', 'Comfenalco Valle'),
('CCF006', 'Cafam'),
('CCF007', 'Comfandi'),
('CCF008', 'Comfacauca'),
('CCF009', 'Comfaboy'),
('CCF010', 'Comfacesar'),
('CCF011', 'Comfacor'),
('CCF012', 'Comfaguajira'),
('CCF013', 'Comfahuila'),
('CCF014', 'Comfamiliar Risaralda'),
('CCF015', 'Comfanorte'),
('CCF016', 'Comfasucre'),
('CCF017', 'Comfatolima'),
('CCF018', 'Cajacopi'),
('CCF019', 'Comfenalco Santander'),
('CCF020', 'Comfaoriente');

-- Habilitar RLS para todas las tablas
ALTER TABLE public.eps_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afp_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arl_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensation_funds ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Allow read access to eps_entities" ON public.eps_entities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow read access to afp_entities" ON public.afp_entities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow read access to arl_entities" ON public.arl_entities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow read access to compensation_funds" ON public.compensation_funds FOR SELECT USING (auth.uid() IS NOT NULL);

-- Agregar columna segundo_nombre a la tabla employees
ALTER TABLE public.employees ADD COLUMN segundo_nombre TEXT;
