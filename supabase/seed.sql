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
