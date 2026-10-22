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
