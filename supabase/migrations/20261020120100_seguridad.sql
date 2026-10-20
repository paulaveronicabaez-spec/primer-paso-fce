-- Primer Paso FCE · Sprint 2
-- Seguridad: Row Level Security por perfil (HU11 · "quién ve qué").
--   Estudiante:     ve su perfil y sus postulaciones.
--   Organización:   ve sus búsquedas y las postulaciones activas, anónimas;
--                   el perfil del estudiante recién cuando la Prosecretaría lo envía.
--   Prosecretaría:  ve todo y recibe los correos.
-- Nunca se usa la service_role desde la aplicación.

-- ===== Funciones auxiliares (security definer para evitar recursión entre políticas) =====
create or replace function public.es_prosecretaria()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from prosecretaria where user_id = auth.uid())
$$;

create or replace function public.mi_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from organizaciones where user_id = auth.uid()
$$;

create or replace function public.mi_est_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from estudiantes where user_id = auth.uid()
$$;

create or replace function public.org_ve_estudiante(p_est uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from postulaciones p join busquedas b on b.id = p.busqueda_id
     where p.estudiante_id = p_est and p.enviada and b.organizacion_id = mi_org_id()
  )
$$;

-- Perfil de quien ingresó: { rol: 'est' | 'org' | 'pro', ref: id }
create or replace function public.mi_rol()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(
    (select json_build_object('rol', 'est', 'ref', id) from estudiantes    where user_id = auth.uid()),
    (select json_build_object('rol', 'org', 'ref', id) from organizaciones where user_id = auth.uid()),
    (select json_build_object('rol', 'pro', 'ref', null) from prosecretaria where user_id = auth.uid())
  )
$$;

-- Controles de duplicados antes de crear la cuenta (HU9 y HU10)
create or replace function public.datos_disponibles(p_dni text default null, p_legajo text default null, p_cuit text default null, p_email text default null)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'dni',    p_dni    is null or not exists (select 1 from estudiantes where dni = p_dni),
    'legajo', p_legajo is null or not exists (select 1 from estudiantes where lower(legajo) = lower(p_legajo)),
    'cuit',   p_cuit   is null or not exists (select 1 from organizaciones where cuit = p_cuit),
    'email',  p_email  is null or not exists (
                select 1 from estudiantes where lower(email) = lower(p_email)
                union all select 1 from organizaciones where lower(email) = lower(p_email)
                union all select 1 from prosecretaria where lower(email) = lower(p_email))
  )
$$;

-- Contadores públicos de la portada
create or replace function public.estadisticas()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'busquedas',      (select count(*) from busquedas where estado = 'publicada'),
    'pasantias',      (select count(*) from busquedas where estado = 'publicada' and tipo = 'pasantia'),
    'organizaciones', (select count(*) from organizaciones),
    'postulaciones',  (select count(*) from postulaciones)
  )
$$;

-- ===== Row Level Security =====
alter table public.prosecretaria  enable row level security;
alter table public.organizaciones enable row level security;
alter table public.busquedas      enable row level security;
alter table public.estudiantes    enable row level security;
alter table public.postulaciones  enable row level security;
alter table public.correos        enable row level security;

-- Organizaciones: datos de contacto institucionales, visibles para mostrar quién publica
drop policy if exists org_select on public.organizaciones;
create policy org_select on public.organizaciones for select to anon, authenticated using (true);
drop policy if exists org_insert on public.organizaciones;
create policy org_insert on public.organizaciones for insert to authenticated with check (user_id = auth.uid());

-- Búsquedas: las publicadas son públicas; cada organización ve y carga las suyas
drop policy if exists bus_select on public.busquedas;
create policy bus_select on public.busquedas for select to anon, authenticated
  using (estado = 'publicada' or organizacion_id = mi_org_id() or es_prosecretaria());
drop policy if exists bus_insert on public.busquedas;
create policy bus_insert on public.busquedas for insert to authenticated
  with check (organizacion_id = mi_org_id());

-- Estudiantes: cada uno ve el suyo; la organización solo los enviados por la Prosecretaría
drop policy if exists est_select on public.estudiantes;
create policy est_select on public.estudiantes for select to authenticated
  using (user_id = auth.uid() or es_prosecretaria() or org_ve_estudiante(id));
drop policy if exists est_insert on public.estudiantes;
create policy est_insert on public.estudiantes for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists est_update on public.estudiantes;
create policy est_update on public.estudiantes for update to authenticated
  using (user_id = auth.uid() or es_prosecretaria()) with check (user_id = auth.uid() or es_prosecretaria());

-- Postulaciones: se crean solo con la función postular(); la organización las ve sin datos personales
drop policy if exists pos_select on public.postulaciones;
create policy pos_select on public.postulaciones for select to authenticated
  using (
    estudiante_id = mi_est_id()
    or es_prosecretaria()
    or busqueda_id in (select id from busquedas where organizacion_id = mi_org_id())
  );
-- HU6: la organización registra el resultado de las postulaciones que recibió
drop policy if exists pos_update_org on public.postulaciones;
create policy pos_update_org on public.postulaciones for update to authenticated
  using (enviada and busqueda_id in (select id from busquedas where organizacion_id = mi_org_id()))
  with check (enviada and busqueda_id in (select id from busquedas where organizacion_id = mi_org_id()));
drop policy if exists pos_update_pro on public.postulaciones;
create policy pos_update_pro on public.postulaciones for update to authenticated
  using (es_prosecretaria()) with check (es_prosecretaria());

-- Correos: solo la Prosecretaría
drop policy if exists cor_select on public.correos;
create policy cor_select on public.correos for select to authenticated using (es_prosecretaria());
drop policy if exists cor_update on public.correos;
create policy cor_update on public.correos for update to authenticated using (es_prosecretaria()) with check (es_prosecretaria());

-- ===== Permisos (sin delete en ninguna tabla) =====
revoke all on public.prosecretaria from anon, authenticated;
grant select on public.organizaciones, public.busquedas to anon;
grant select, insert on public.organizaciones, public.busquedas to authenticated;
grant select, insert, update on public.estudiantes to authenticated;
grant select, update on public.postulaciones, public.correos to authenticated;

-- Al enviar, la base registra la fecha (la evaluación la hace solo la Prosecretaría por la política pos_update_pro)
create or replace function public.fecha_envio()
returns trigger language plpgsql as $$
begin
  -- La organización solo puede cambiar el resultado
  if not es_prosecretaria() then
    new.enviada := old.enviada; new.enviada_at := old.enviada_at;
    new.descartada := old.descartada; new.motivo_descarte := old.motivo_descarte;
    new.cumple_requisitos := old.cumple_requisitos; new.motivos := old.motivos; new.estado := old.estado;
  end if;
  if new.resultado is distinct from old.resultado then new.resultado_at := case when new.resultado is null then null else now() end; end if;
  if new.resultado is not null and not new.enviada then raise exception 'NO_ENVIADA: Solo se registra el resultado de postulaciones enviadas.'; end if;
  if new.enviada and not old.enviada then new.enviada_at := now(); new.descartada := false; end if;
  if new.enviada and not old.cumple_requisitos then raise exception 'NO_CUMPLE: Solo se envían las postulaciones que cumplen requisitos.'; end if;
  return new;
end $$;
drop trigger if exists trg_fecha_envio on public.postulaciones;
create trigger trg_fecha_envio before update on public.postulaciones for each row execute function public.fecha_envio();

revoke execute on function public.postular(uuid) from public, anon;
grant execute on function public.postular(uuid) to authenticated;
grant execute on function public.mi_rol(), public.mi_est_id(), public.org_ve_estudiante(uuid) to authenticated;
-- las políticas de búsquedas las evalúa también el rol anon
grant execute on function public.es_prosecretaria(), public.mi_org_id() to anon, authenticated;
grant execute on function public.datos_disponibles(text, text, text, text), public.estadisticas(), public.cupo_pasantes(int) to anon, authenticated;

-- ===== Afinidad por competencias (base del spike de HU8) =====
-- La organización ve el porcentaje de cada postulación sin ver el perfil del estudiante.
create or replace function public.afinidades()
returns table (postulacion_id uuid, pct int)
language sql stable security definer set search_path = public as $$
  select p.id,
         round(100 * (
           0.8 * (select count(*) from unnest(b.competencias) c
                   where c in (select jsonb_array_elements_text(coalesce(e.brod -> 'competencias', '[]'::jsonb))))::numeric
               / greatest(cardinality(b.competencias), 1)
           + case when b.area_riasec in (e.brod ->> 'riasec1', e.brod ->> 'riasec2') then 0.2 else 0 end
         ))::int
    from postulaciones p
    join busquedas b   on b.id = p.busqueda_id
    join estudiantes e on e.id = p.estudiante_id
   where e.brod is not null
     and (b.organizacion_id = mi_org_id() or es_prosecretaria() or e.user_id = auth.uid())
$$;
revoke execute on function public.afinidades() from public, anon;
grant execute on function public.afinidades() to authenticated;
