-- Primer Paso FCE · 22/10
-- La organización recibe un correo cada vez que la Prosecretaría le envía un postulante,
-- y ve sus correos en la aplicación.

create or replace function public.notificar_envio()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.enviada and not old.enviada then
    insert into correos (para, asunto, cuerpo)
    select og.email,
           'Nuevo postulante para: ' || b.titulo,
           'La Prosecretaría de Inserción Laboral de la FCE te envió un postulante para «' || b.titulo || '».' || chr(10) ||
           'Estudiante: ' || e.nombre || ' ' || e.apellido || ' · ' || coalesce(e.carrera, '') || ' · avance ' || coalesce(e.avance::text, '—') || '%' ||
             case when e.avance_verificado then ' (verificado con SIU Guaraní)' else '' end || chr(10) ||
           'Perfil según test: ' || coalesce(e.brod ->> 'titular', '—') || chr(10) ||
           'Ingresá a Primer Paso FCE para ver su perfil completo y, cuando decidas, registrá el resultado de la selección.'
      from busquedas b
      join organizaciones og on og.id = b.organizacion_id
      join estudiantes e on e.id = new.estudiante_id
     where b.id = new.busqueda_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_notificar_envio on public.postulaciones;
create trigger trg_notificar_envio after update on public.postulaciones
  for each row execute function public.notificar_envio();

-- Cada organización ve y marca como leídos solo los correos dirigidos a ella
drop policy if exists cor_select on public.correos;
create policy cor_select on public.correos for select to authenticated
  using (es_prosecretaria() or para = (select email from organizaciones where id = mi_org_id()));
drop policy if exists cor_update on public.correos;
create policy cor_update on public.correos for update to authenticated
  using (es_prosecretaria() or para = (select email from organizaciones where id = mi_org_id()))
  with check (es_prosecretaria() or para = (select email from organizaciones where id = mi_org_id()));
