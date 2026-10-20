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
  enviada           boolean not null default false,   -- la Prosecretaría la envió a la organización (HU5b, Sprint 3)
  enviada_at        timestamptz,
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

-- Controles cruzados con la organización: convenio vigente y cupo.
create or replace function public.controlar_pasantia()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o organizaciones;
  usados int;
begin
  if new.tipo <> 'pasantia' or new.estado <> 'publicada' then
    return new;
  end if;
  select * into o from organizaciones where id = new.organizacion_id;
  if not o.convenio or (o.convenio_vence is not null and o.convenio_vence < current_date) then
    raise exception 'LEY26427_CONVENIO: La organización no tiene convenio de pasantías vigente con la FCE.';
  end if;
  select coalesce(sum(vacantes), 0) into usados
    from busquedas
   where organizacion_id = new.organizacion_id and tipo = 'pasantia' and estado = 'publicada' and id <> new.id;
  if usados + new.vacantes > cupo_pasantes(o.empleados) then
    raise exception 'LEY26427_CUPO: Supera el cupo de pasantes de la organización: % según una planta de % personas (ya hay % vacantes publicadas).',
      cupo_pasantes(o.empleados), o.empleados, usados;
  end if;
  return new;
end $$;

drop trigger if exists trg_controlar_pasantia on public.busquedas;
create trigger trg_controlar_pasantia
  before insert or update on public.busquedas
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
