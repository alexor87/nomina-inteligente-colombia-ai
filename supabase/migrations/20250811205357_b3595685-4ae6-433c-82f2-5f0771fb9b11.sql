
-- 1) Función + trigger para completar registro al crear perfiles nuevos
create or replace function public.auto_complete_registration_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text;
begin
  if new.company_id is null then
    select email into v_email from auth.users where id = new.user_id;
    if v_email is not null then
      -- Crea empresa, asigna company_id al perfil y rol 'administrador'
      perform public.complete_incomplete_registration(
        v_email,
        'Mi Empresa',
        '900' || lpad((trunc(random()*100000000))::text, 8, '0') || '-0'
      );
      -- Sincronizar NEW con el company_id ya actualizado por la función
      select company_id into new.company_id from public.profiles where user_id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_auto_complete_registration on public.profiles;
create trigger trg_profiles_auto_complete_registration
after insert on public.profiles
for each row execute function public.auto_complete_registration_on_profile_insert();

-- 2) Trigger para asegurar rol admin cuando se asigne/cambie la empresa
drop trigger if exists trg_profiles_admin_on_update on public.profiles;
create trigger trg_profiles_admin_on_update
after update of company_id on public.profiles
for each row execute function public.ensure_admin_role_on_profile_update();

-- 3) Backfill: completar registro para perfiles existentes sin empresa (incluye tu cuenta)
with users_to_fix as (
  select au.email
  from public.profiles p
  join auth.users au on au.id = p.user_id
  where p.company_id is null
)
select public.complete_incomplete_registration(
  email,
  'Mi Empresa',
  '900' || lpad((trunc(random()*100000000))::text, 8, '0') || '-0'
)
from users_to_fix;

-- 4) Asegurar roles admin donde haya empresa pero falte el rol
select public.ensure_admin_role_for_company_users();

-- 5) Último refuerzo: arreglar roles admin faltantes
select public.fix_missing_admin_roles();
