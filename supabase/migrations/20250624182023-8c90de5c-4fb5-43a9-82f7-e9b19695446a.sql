
-- Agregar campos bancarios a la tabla employees
ALTER TABLE public.employees 
ADD COLUMN banco TEXT,
ADD COLUMN tipo_cuenta TEXT CHECK (tipo_cuenta IN ('ahorros', 'corriente')) DEFAULT 'ahorros',
ADD COLUMN numero_cuenta TEXT,
ADD COLUMN titular_cuenta TEXT;

-- Crear índice para búsquedas por número de cuenta
CREATE INDEX idx_employees_numero_cuenta ON public.employees(numero_cuenta);
