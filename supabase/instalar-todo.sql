-- Primer Paso FCE · instalación completa en un solo archivo
-- Pegar en Supabase → SQL Editor → Run. Se puede volver a correr.

-- Primer Paso FCE · Sprint 2
-- Esquema: tablas, reglas de negocio y controles de la Ley 26.427 de Pasantías Educativas.
-- Todos los datos del proyecto son ficticios.

create extension if not exists pgcrypto with schema extensions;

-- ===== Tablas =====

create table if not exists public.prosecretaria (
  email   text primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  nombre  text not null default 'Prosecretaría de Inserción Laboral'
);

create table if not exists public.organizaciones (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users(id) on delete set null,
  nombre         text not null check (length(trim(nombre)) > 0),
  cuit           text not null unique check (cuit ~ '^\d{2}-\d{8}-\d$'),
  rubro          text not null,
  contacto       text not null,
  email          text not null unique,
  telefono       text not null,
  empleados      int  not null default 0 check (empleados >= 0),   -- planta permanente: define el cupo de pasantes
  convenio       boolean not null default false,                  -- convenio de pasantías con la FCE
  convenio_vence date,
  created_at     timestamptz not null default now()
);

create table if not exists public.busquedas (
  id                  uuid primary key default gen_random_uuid(),
  organizacion_id     uuid not null references public.organizaciones(id),
  titulo              text not null check (length(trim(titulo)) > 0),
  tipo                text not null check (tipo in ('pasantia','empleo')),
  modalidad           text not null default 'Presencial' check (modalidad in ('Presencial','Híbrida','Remota')),
  carrera             text not null check (carrera in ('Contador Público','Lic. en Administración','Lic. en Economía')),
  -- Perfil buscado: se cruza con el test de BrOD del estudiante (misma lista común)
  area_riasec         text not null,
  area2               text,
  competencias        text[] not null check (cardinality(competencias) between 3 and 5),
  avance_minimo       int  not null check (avance_minimo between 0 and 100),
  horas_semanales     int  not null check (horas_semanales > 0),
  dias_semana         int  check (dias_semana between 1 and 5),
  duracion_meses      int,
  vacantes            int  not null default 1 check (vacantes between 1 and 20),
  asignacion_estimulo numeric(12,2),
  cct                 text,          -- convenio colectivo de referencia para la asignación estímulo
  tutor               text,          -- tutor/a designado/a por la organización
  cobertura_art       boolean not null default false,
  descripcion         text,
  estado              text not null default 'publicada' check (estado in ('publicada','cerrada')),
  created_at          timestamptz not null default now(),
  -- Control de la Ley 26.427 sobre la búsqueda (se repite en la aplicación para avisar antes de guardar)
  constraint pasantia_ley_26427 check (
    tipo <> 'pasantia' or (
      horas_semanales <= 20
      and duracion_meses between 2 and 12
      and dias_semana is not null
      and horas_semanales::numeric / dias_semana <= 6.5
      and asignacion_estimulo > 0
      and coalesce(trim(cct), '') <> ''
      and coalesce(trim(tutor), '') <> ''
      and cobertura_art
    )
  )
);

create table if not exists public.estudiantes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid unique references auth.users(id) on delete set null,
  nombre                text not null check (length(trim(nombre)) > 0),
  apellido              text not null check (length(trim(apellido)) > 0),
  dni                   text not null unique check (dni ~ '^\d{7,8}$'),
  legajo                text not null unique,
  email                 text not null unique,
  fnac                  date not null,
  carrera               text check (carrera is null or carrera in ('Contador Público','Lic. en Administración','Lic. en Economía')),
  avance                int  check (avance between 0 and 100),
  regular               boolean not null default true,
  pasantia_vigente      boolean not null default false,
  academico_actualizado timestamptz,
  avance_verificado     boolean not null default false,   -- la Prosecretaría lo controló con SIU Guaraní
  verificado_at         timestamptz,
  ultimo_ingreso        timestamptz,
  brod                  jsonb,       -- resultados de BrOD cargados a mano (sin integración)
  consentimiento_at     timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

create table if not exists public.postulaciones (
  id                uuid primary key default gen_random_uuid(),
  busqueda_id       uuid not null references public.busquedas(id),
  estudiante_id     uuid not null references public.estudiantes(id),
  created_at        timestamptz not null default now(),
  cumple_requisitos boolean not null,
  motivos           text[] not null default '{}',
  estado            text not null check (estado in ('cumple requisitos','no cumple requisitos')),
  enviada           boolean not null default false,   -- la Prosecretaría la evaluó y la envió a la organización (HU5b)
  enviada_at        timestamptz,
  descartada        boolean not null default false,   -- la Prosecretaría decidió no enviarla
  motivo_descarte   text,
  resultado         text check (resultado in ('seleccionado','no seleccionado')),  -- HU6: lo registra la organización (o la Prosecretaría)
  resultado_at      timestamptz,
  unique (busqueda_id, estudiante_id)
);

create table if not exists public.correos (
  id     uuid primary key default gen_random_uuid(),
  fecha  timestamptz not null default now(),
  para   text not null default 'prosecretaria.insercion@fce.example',
  asunto text not null,
  cuerpo text not null,
  leido  boolean not null default false
);

-- ===== Ley 26.427: cupo de pasantes según la planta permanente =====
-- Res. Conj. 825/2009 y 338/2009: hasta 200 trabajadores, un pasante cada diez; más de 200, el 7 %.
-- Criterio del equipo a validar con la Prosecretaría: con menos de diez trabajadores se admite un pasante.
create or replace function public.cupo_pasantes(p_empleados int)
returns int language sql immutable as $$
  select case
    when p_empleados <= 0   then 0
    when p_empleados <= 200 then greatest(1, p_empleados / 10)
    else floor(p_empleados * 0.07)::int
  end
$$;

-- Control cruzado con la organización: convenio vigente.
-- El cupo de pasantes según la planta NO bloquea la publicación: la Prosecretaría lo evalúa al enviar postulantes.
create or replace function public.controlar_pasantia()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o organizaciones;
begin
  if new.tipo <> 'pasantia' or new.estado <> 'publicada' then
    return new;
  end if;
  select * into o from organizaciones where id = new.organizacion_id;
  if not o.convenio or (o.convenio_vence is not null and o.convenio_vence < current_date) then
    raise exception 'LEY26427_CONVENIO: La organización no tiene convenio de pasantías vigente con la FCE.';
  end if;
  return new;
end $$;

drop trigger if exists trg_controlar_pasantia on public.busquedas;
create trigger trg_controlar_pasantia
  before insert on public.busquedas
  for each row execute function public.controlar_pasantia();

-- ===== HU4: postulación con clasificación calculada en la base =====
create or replace function public.postular(p_busqueda uuid)
returns public.postulaciones language plpgsql security definer set search_path = public as $$
declare
  e estudiantes;
  b busquedas;
  m text[] := '{}';
  edad int;
  r postulaciones;
begin
  select * into e from estudiantes where user_id = auth.uid();
  if e.id is null then
    raise exception 'SIN_PERFIL: Ingresá como estudiante para postularte.';
  end if;
  select * into b from busquedas where id = p_busqueda and estado = 'publicada';
  if b.id is null then
    raise exception 'NO_DISPONIBLE: La búsqueda ya no está disponible.';
  end if;
  if exists (select 1 from postulaciones where busqueda_id = b.id and estudiante_id = e.id) then
    raise exception 'DUPLICADA: Ya te postulaste a esta búsqueda.';
  end if;

  if e.carrera is null then
    m := array_append(m, 'Cargá tu carrera en Mi perfil');
  elsif e.carrera <> b.carrera then
    m := array_append(m, 'Es para ' || b.carrera);
  end if;
  if coalesce(e.avance, 0) < b.avance_minimo then
    m := array_append(m, 'Te falta ' || (b.avance_minimo - coalesce(e.avance, 0)) || '% de avance (pide ' || b.avance_minimo || '%)');
  end if;
  if b.tipo = 'pasantia' then
    if not e.regular then m := array_append(m, 'Requiere ser alumno regular'); end if;
    edad := date_part('year', age(current_date, e.fnac));
    if edad < 18 then m := array_append(m, 'Requiere ser mayor de 18'); end if;
    if e.pasantia_vigente then m := array_append(m, 'Ya tenés una pasantía vigente'); end if;
  end if;

  insert into postulaciones (busqueda_id, estudiante_id, cumple_requisitos, motivos, estado)
  values (b.id, e.id, cardinality(m) = 0, m,
          case when cardinality(m) = 0 then 'cumple requisitos' else 'no cumple requisitos' end)
  returning * into r;
  return r;
end $$;

-- ===== HU12: correo a la Prosecretaría ante cada novedad =====
create or replace function public.notificar_prosecretaria()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o organizaciones;
begin
  if current_setting('app.seeding', true) = 'on' then
    return new;
  end if;
  if tg_table_name = 'organizaciones' then
    insert into correos (asunto, cuerpo) values (
      'Nueva organización registrada: ' || new.nombre,
      new.nombre || ' se registró en Primer Paso FCE.' || chr(10) ||
      'CUIT: ' || new.cuit || ' · Rubro: ' || new.rubro || ' · Planta: ' || new.empleados || ' personas (cupo de pasantes: ' || cupo_pasantes(new.empleados) || ').' || chr(10) ||
      'Contacto: ' || new.contacto || ' · ' || new.email || ' · ' || new.telefono || chr(10) ||
      'Convenio de pasantías: ' || case when new.convenio then 'declara convenio vigente' || coalesce(' hasta el ' || to_char(new.convenio_vence, 'DD/MM/YYYY'), '') else 'no declara convenio (no puede publicar pasantías)' end || '.'
    );
  elsif tg_table_name = 'postulaciones' then
    if new.resultado is not null and new.resultado is distinct from old.resultado then
      insert into correos (asunto, cuerpo)
      select 'Selección registrada: ' || b.titulo,
             og.nombre || ' registró el resultado de una postulación.' || chr(10) ||
             'Búsqueda: ' || b.titulo || ' (' || case when b.tipo = 'pasantia' then 'pasantía' else 'empleo' end || ')' || chr(10) ||
             'Estudiante: ' || e.nombre || ' ' || e.apellido || ' · legajo ' || e.legajo || chr(10) ||
             'Resultado: ' || case when new.resultado = 'seleccionado' then 'SELECCIONADO/A' else 'no seleccionado/a' end || '.'
        from busquedas b join organizaciones og on og.id = b.organizacion_id join estudiantes e on e.id = new.estudiante_id
       where b.id = new.busqueda_id;
    end if;
  elsif tg_table_name = 'busquedas' then
    select * into o from organizaciones where id = new.organizacion_id;
    insert into correos (asunto, cuerpo) values (
      'Nueva búsqueda publicada: ' || new.titulo,
      o.nombre || ' publicó una búsqueda.' || chr(10) ||
      'Tipo: ' || case when new.tipo = 'pasantia' then 'Pasantía educativa · ' || new.duracion_meses || ' meses · ' || new.vacantes || ' vacante(s) · tutor/a: ' || new.tutor else 'Empleo' end || ' · ' || new.modalidad || chr(10) ||
      'Carrera: ' || new.carrera || ' · Avance mínimo: ' || new.avance_minimo || '% · ' || new.horas_semanales || ' h semanales.' || chr(10) ||
      'Perfil buscado: ' || new.area_riasec || ' · ' || array_to_string(new.competencias, ', ') || '.' || chr(10) ||
      'Ya está visible para los estudiantes en Primer Paso FCE.'
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notificar_org on public.organizaciones;
create trigger trg_notificar_org after insert on public.organizaciones
  for each row execute function public.notificar_prosecretaria();
drop trigger if exists trg_notificar_pos on public.postulaciones;
create trigger trg_notificar_pos after update on public.postulaciones
  for each row execute function public.notificar_prosecretaria();
drop trigger if exists trg_notificar_bus on public.busquedas;
create trigger trg_notificar_bus after insert on public.busquedas
  for each row execute function public.notificar_prosecretaria();

-- ===== Vinculación de cuentas: une el usuario de Supabase Auth con su fila por correo =====
-- Sirve para los usuarios de prueba creados desde el seed o desde el panel de Supabase.
create or replace function public.vincular_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update estudiantes    set user_id = new.id where lower(email) = lower(new.email) and user_id is null;
  update organizaciones set user_id = new.id where lower(email) = lower(new.email) and user_id is null;
  update prosecretaria  set user_id = new.id where lower(email) = lower(new.email) and user_id is null;
  return new;
end $$;

drop trigger if exists on_auth_user_created_vincular on auth.users;
create trigger on_auth_user_created_vincular after insert on auth.users
  for each row execute function public.vincular_usuario();

-- ===== Avance según SIU Guaraní: solo la Prosecretaría lo marca como verificado =====
-- Si el estudiante cambia carrera, avance o regularidad, vuelve a quedar pendiente.
create or replace function public.proteger_verificacion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from prosecretaria where user_id = auth.uid()) then
    if new.avance_verificado and not old.avance_verificado then new.verificado_at := now(); end if;
    return new;
  end if;
  if new.carrera is distinct from old.carrera or new.avance is distinct from old.avance or new.regular is distinct from old.regular then
    new.avance_verificado := false;
    new.verificado_at := null;
  else
    new.avance_verificado := old.avance_verificado;
    new.verificado_at := old.verificado_at;
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_verificacion on public.estudiantes;
create trigger trg_proteger_verificacion before update on public.estudiantes
  for each row execute function public.proteger_verificacion();

create or replace function public.proteger_alta_estudiante()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.seeding', true) is distinct from 'on' then
    new.avance_verificado := false;
    new.verificado_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_alta on public.estudiantes;
create trigger trg_proteger_alta before insert on public.estudiantes
  for each row execute function public.proteger_alta_estudiante();


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


-- Primer Paso FCE · datos de prueba (todos ficticios)
-- Crea las cuentas de prueba en Supabase Auth con la contraseña demo1234.
-- Se puede volver a correr: no duplica datos.

select set_config('app.seeding', 'on', false);  -- evita que el seed genere correos de novedades

-- ===== Prosecretaría, organizaciones, estudiantes =====
insert into public.prosecretaria (email) values ('prosecretaria.insercion@fce.example')
on conflict do nothing;

insert into public.organizaciones (id, nombre, cuit, rubro, contacto, email, telefono, empleados, convenio, convenio_vence, created_at) values
 ('11111111-0000-4000-8000-000000000001','Estudio Contable Ficticio SRL','30-71234567-1','Servicios contables y profesionales','Laura Gómez','rrhh@estudioficticio.example','221 400-0001',18,true,'2027-12-31','2026-08-01 10:00-03'),
 ('11111111-0000-4000-8000-000000000002','Banco Imaginario SA','30-50001234-6','Banca y finanzas','Diego Ruiz','seleccion@bancoimaginario.example','221 400-0002',320,true,'2027-06-30','2026-08-05 10:00-03'),
 ('11111111-0000-4000-8000-000000000003','Municipalidad de Villa Ejemplo','30-99912345-3','Sector público','Ana Torres','empleo@villaejemplo.example','221 400-0003',45,true,'2026-12-31','2026-09-02 10:00-03'),
 ('11111111-0000-4000-8000-000000000004','Comercio Sin Convenio SA','30-70012345-2','Comercio','Pablo Sosa','contacto@sinconvenio.example','221 400-0004',8,false,null,'2026-10-02 10:00-03')
on conflict do nothing;

insert into public.busquedas (id, organizacion_id, titulo, tipo, modalidad, area_riasec, area2, competencias, carrera, avance_minimo, horas_semanales, dias_semana, duracion_meses, vacantes, asignacion_estimulo, cct, tutor, cobertura_art, descripcion, created_at) values
 ('22222222-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000001','Pasante contable','pasantia','Presencial','Convencional','Investigador','{"Atención al detalle","Organización","Pensamiento analítico","Trabajo en equipo"}','Contador Público',50,20,5,6,1,350000,'CCT 130/75 · Empleados de Comercio','Cra. Laura Gómez',true,'Apoyo en liquidación de impuestos y conciliaciones bancarias.','2026-09-20 10:00-03'),
 ('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-000000000002','Pasante de administración','pasantia','Híbrida','Emprendedor','Social','{"Organización","Comunicación","Resolución de problemas"}','Lic. en Administración',40,15,5,4,2,420000,'CCT 18/75 · Bancarios','Lic. Diego Ruiz',true,'Seguimiento de procesos internos y armado de reportes.','2026-09-25 10:00-03'),
 ('22222222-0000-4000-8000-000000000003','11111111-0000-4000-8000-000000000003','Pasante de análisis económico','pasantia','Presencial','Investigador',null,'{"Pensamiento analítico","Resolución de problemas","Atención al detalle"}','Lic. en Economía',30,20,4,12,1,300000,'Escalafón municipal','Lic. Ana Torres',true,'Relevamiento de precios y series de actividad local.','2026-10-01 10:00-03'),
 ('22222222-0000-4000-8000-000000000004','11111111-0000-4000-8000-000000000001','Asistente contable part-time','empleo','Presencial','Convencional',null,'{"Atención al detalle","Orientación al cliente","Organización"}','Contador Público',70,25,null,null,1,null,null,null,false,'Registración contable y atención de clientes pyme.','2026-10-14 10:00-03'),
 ('22222222-0000-4000-8000-000000000005','11111111-0000-4000-8000-000000000002','Analista económico part-time','empleo','Remota','Investigador',null,'{"Pensamiento analítico","Comunicación","Adaptabilidad"}','Lic. en Economía',40,20,null,null,1,null,null,null,false,'Análisis de indicadores para el área de riesgo crediticio.','2026-10-15 10:00-03')
on conflict do nothing;

insert into public.estudiantes (id, nombre, apellido, dni, legajo, email, fnac, carrera, avance, regular, pasantia_vigente, academico_actualizado, avance_verificado, verificado_at, ultimo_ingreso, brod) values
 ('33333333-0000-4000-8000-000000000001','Sofía','Pérez','45123456','12345/6','sofia@alumnos.fce.example','2006-03-14','Lic. en Administración',45,true,false,'2026-07-10 10:00-03',true,'2026-07-15 10:00-03','2026-10-10 12:00-03',
  '{"etapa":"Definiendo mi camino","riasec1":"Emprendedor","riasec2":"Social","enea":"3 · Triunfador","competencias":["Comunicación","Trabajo en equipo","Liderazgo"],"titular":"Estudiante de Administración · Gestión de proyectos y equipos","fecha":"2026-09-01T13:00:00Z","carrera_ref":"Lic. en Administración","avance_ref":45}'),
 ('33333333-0000-4000-8000-000000000002','Martín','López','44234567','11872/3','martin@alumnos.fce.example','2004-07-02','Contador Público',55,true,false,'2026-08-20 10:00-03',true,'2026-08-22 10:00-03','2026-10-10 12:00-03',
  '{"etapa":"Definiendo mi camino","riasec1":"Convencional","riasec2":"Investigador","enea":"1 · Perfeccionista","competencias":["Atención al detalle","Organización","Pensamiento analítico"],"titular":"Estudiante de Contador Público · Impuestos y análisis contable","fecha":"2026-08-20T13:00:00Z","carrera_ref":"Contador Público","avance_ref":55}'),
 ('33333333-0000-4000-8000-000000000003','Lucía','Fernández','49345678','13990/1','lucia@alumnos.fce.example','2009-05-20','Contador Público',75,true,false,'2026-10-01 10:00-03',false,null,'2026-10-12 12:00-03',null),
 ('33333333-0000-4000-8000-000000000004','Tomás','García','43456789','10544/8','tomas@alumnos.fce.example','2003-01-11','Lic. en Economía',50,true,true,'2026-08-10 10:00-03',true,'2026-08-12 10:00-03','2026-10-01 12:00-03',
  '{"etapa":"Busco nuevos horizontes","riasec1":"Investigador","riasec2":"","enea":"","competencias":["Pensamiento analítico","Resolución de problemas","Adaptabilidad"],"titular":"Analista económico orientado a la investigación","fecha":"2026-02-10T13:00:00Z","carrera_ref":"Lic. en Economía","avance_ref":35}')
on conflict do nothing;

insert into public.postulaciones (id, busqueda_id, estudiante_id, created_at, cumple_requisitos, motivos, estado, enviada, enviada_at) values
 ('44444444-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000002','2026-10-12 09:30-03',true,'{}','cumple requisitos',true,'2026-10-16 11:00-03'),
 ('44444444-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000003','2026-10-13 18:10-03',false,'{"Requiere ser mayor de 18"}','no cumple requisitos',false,null),
 ('44444444-0000-4000-8000-000000000003','22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000001','2026-10-14 15:45-03',true,'{}','cumple requisitos',false,null),
 ('44444444-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000003','2026-10-15 10:20-03',true,'{}','cumple requisitos',false,null)
on conflict do nothing;

insert into public.correos (id, fecha, asunto, cuerpo, leido) values
 ('55555555-0000-4000-8000-000000000001','2026-10-14 10:00-03','Nueva búsqueda publicada: Asistente contable part-time','Estudio Contable Ficticio SRL publicó una búsqueda.' || chr(10) || 'Tipo: Empleo · Carrera: Contador Público · Avance mínimo: 70% · 25 h semanales.' || chr(10) || 'Ya está visible para los estudiantes en Primer Paso FCE.',true),
 ('55555555-0000-4000-8000-000000000002','2026-10-15 10:00-03','Nueva búsqueda publicada: Analista económico part-time','Banco Imaginario SA publicó una búsqueda.' || chr(10) || 'Tipo: Empleo · Carrera: Lic. en Economía · Avance mínimo: 40% · 20 h semanales.' || chr(10) || 'Ya está visible para los estudiantes en Primer Paso FCE.',true)
on conflict do nothing;

-- ===== Cuentas de prueba en Supabase Auth (contraseña: demo1234) =====
-- El trigger vincular_usuario() une cada cuenta con su fila por correo.
do $$
declare
  correo text;
  uid uuid;
begin
  foreach correo in array array[
    'prosecretaria.insercion@fce.example',
    'rrhh@estudioficticio.example','seleccion@bancoimaginario.example','empleo@villaejemplo.example','contacto@sinconvenio.example',
    'sofia@alumnos.fce.example','martin@alumnos.fce.example','lucia@alumnos.fce.example','tomas@alumnos.fce.example'
  ] loop
    if not exists (select 1 from auth.users where email = correo) then
      uid := gen_random_uuid();
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                              confirmation_token, email_change, email_change_token_new, recovery_token)
      values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', correo,
              extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
              '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), uid, uid::text, json_build_object('sub', uid::text, 'email', correo, 'email_verified', true)::jsonb,
              'email', now(), now(), now());
    end if;
  end loop;
end $$;

-- Por si las cuentas ya existían antes de cargar las filas: vincula por correo
update public.estudiantes e    set user_id = u.id from auth.users u where e.user_id is null and lower(u.email) = lower(e.email);
update public.organizaciones o set user_id = u.id from auth.users u where o.user_id is null and lower(u.email) = lower(o.email);
update public.prosecretaria p  set user_id = u.id from auth.users u where p.user_id is null and lower(u.email) = lower(p.email);

select set_config('app.seeding', 'off', false);


-- Primer Paso FCE · datos de prueba para la sugerencia de postulantes (HU8). Todos ficticios.
-- Seis estudiantes de Contador Público postulados a "Asistente contable part-time". Se puede volver a correr.
select set_config('app.seeding', 'on', false);

insert into public.estudiantes (id, nombre, apellido, dni, legajo, email, fnac, carrera, avance, regular, pasantia_vigente, academico_actualizado, avance_verificado, verificado_at, ultimo_ingreso, brod) values
 ('33333333-0000-4000-8000-000000000005','Valentina','Ruiz','44111222','12001/1','valentina@alumnos.fce.example','2004-02-10','Contador Público',82,true,false,'2026-09-01 10:00-03',true,'2026-09-03 10:00-03','2026-10-15 10:00-03',
  '{"etapa":"Busco nuevos horizontes","riasec1":"Convencional","riasec2":"Social","enea":"","competencias":["Atención al detalle","Orientación al cliente","Organización","Comunicación"],"titular":"Analista contable con orientación al cliente","fecha":"2026-09-01T13:00:00Z","carrera_ref":"Contador Público","avance_ref":82}'),
 ('33333333-0000-4000-8000-000000000006','Joaquín','Méndez','44333444','12002/2','joaquin@alumnos.fce.example','2003-11-05','Contador Público',74,true,false,'2026-09-10 10:00-03',true,'2026-09-12 10:00-03','2026-10-15 10:00-03',
  '{"etapa":"Definiendo mi camino","riasec1":"Investigador","riasec2":"Convencional","enea":"","competencias":["Pensamiento analítico","Resolución de problemas","Atención al detalle"],"titular":"Estudiante de Contador Público · análisis de datos contables","fecha":"2026-09-10T13:00:00Z","carrera_ref":"Contador Público","avance_ref":74}'),
 ('33333333-0000-4000-8000-000000000007','Camila','Torres','45555666','12003/3','camila@alumnos.fce.example','2005-06-21','Contador Público',71,true,false,'2026-10-05 10:00-03',false,null,'2026-10-15 10:00-03',
  '{"etapa":"Definiendo mi camino","riasec1":"Social","riasec2":"","enea":"","competencias":["Comunicación","Trabajo en equipo","Orientación al cliente"],"titular":"Atención a clientes y trabajo en equipo","fecha":"2026-10-05T13:00:00Z","carrera_ref":"Contador Público","avance_ref":71}'),
 ('33333333-0000-4000-8000-000000000008','Nicolás','Vega','43777888','12004/4','nicolas@alumnos.fce.example','2002-09-30','Contador Público',90,true,false,'2026-08-25 10:00-03',true,'2026-08-27 10:00-03','2026-10-15 10:00-03',
  '{"etapa":"Quiero cambiar de trabajo","riasec1":"Emprendedor","riasec2":"","enea":"","competencias":["Liderazgo","Comunicación","Adaptabilidad"],"titular":"Gestión de equipos y negocios","fecha":"2026-08-25T13:00:00Z","carrera_ref":"Contador Público","avance_ref":90}'),
 ('33333333-0000-4000-8000-000000000009','Agustina','Ríos','44999000','12005/5','agustina@alumnos.fce.example','2004-04-18','Contador Público',77,true,false,'2026-09-20 10:00-03',true,'2026-09-22 10:00-03','2026-10-15 10:00-03',
  '{"etapa":"Definiendo mi camino","riasec1":"Convencional","riasec2":"","enea":"","competencias":["Organización","Atención al detalle","Trabajo en equipo"],"titular":"Registración contable ordenada y precisa","fecha":"2026-09-20T13:00:00Z","carrera_ref":"Contador Público","avance_ref":77}'),
 ('33333333-0000-4000-8000-000000000010','Bruno','Sosa','45121314','12006/6','bruno@alumnos.fce.example','2005-01-09','Contador Público',65,true,false,'2026-09-28 10:00-03',true,'2026-09-30 10:00-03','2026-10-15 10:00-03',
  '{"etapa":"Definiendo mi camino","riasec1":"Convencional","riasec2":"","enea":"","competencias":["Organización","Comunicación","Atención al detalle"],"titular":"Administración contable","fecha":"2026-09-28T13:00:00Z","carrera_ref":"Contador Público","avance_ref":65}')
on conflict do nothing;

insert into public.postulaciones (id, busqueda_id, estudiante_id, created_at, cumple_requisitos, motivos, estado) values
 ('44444444-0000-4000-8000-000000000005','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000005','2026-10-16 09:00-03',true,'{}','cumple requisitos'),
 ('44444444-0000-4000-8000-000000000006','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000006','2026-10-16 11:00-03',true,'{}','cumple requisitos'),
 ('44444444-0000-4000-8000-000000000007','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000007','2026-10-17 09:30-03',true,'{}','cumple requisitos'),
 ('44444444-0000-4000-8000-000000000008','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000008','2026-10-17 15:00-03',true,'{}','cumple requisitos'),
 ('44444444-0000-4000-8000-000000000009','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000009','2026-10-18 10:00-03',true,'{}','cumple requisitos'),
 ('44444444-0000-4000-8000-000000000010','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000010','2026-10-18 12:00-03',false,'{"Te falta 5% de avance (pide 70%)"}','no cumple requisitos')
on conflict do nothing;

select set_config('app.seeding', 'off', false);
