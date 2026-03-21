-- Migration: employee_salary_history
-- Adds salary history tracking for legal compliance (annual salary increase wizard)

create table if not exists public.employee_salary_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  salario_base numeric(12,2) not null,
  fecha_vigencia date not null,
  motivo text not null check (motivo in (
    'incremento_anual',
    'ajuste_minimo_legal',
    'merito',
    'promocion',
    'correccion',
    'ingreso'
  )),
  porcentaje_incremento numeric(5,2),
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- RLS
alter table public.employee_salary_history enable row level security;

create policy "company_isolation" on public.employee_salary_history
  using (
    company_id in (
      select company_id from public.profiles where user_id = auth.uid() limit 1
    )
  );

-- Indexes
create index if not exists employee_salary_history_employee_date_idx
  on public.employee_salary_history(employee_id, fecha_vigencia desc);

create index if not exists employee_salary_history_company_idx
  on public.employee_salary_history(company_id);

-- Migrate existing salary data: seed history with current salary, effective 2024-01-01
insert into public.employee_salary_history (employee_id, company_id, salario_base, fecha_vigencia, motivo)
select id, company_id, salario_base, '2024-01-01'::date, 'ingreso'
from public.employees
where salario_base > 0
on conflict do nothing;
