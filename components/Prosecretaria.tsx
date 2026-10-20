"use client";
import { useEffect, useState } from "react";
import type { Ctx } from "@/lib/ctx";
import { PROSEC_MAIL, convenioVigente, cupoPasantes, fmt, fmtHora, mensajeError, vacantesUsadas } from "@/lib/reglas";
import * as api from "@/lib/api";
import { Notice } from "./ui";

export function Tablero({ c }: { c: Ctx }) {
  const { datos } = c;
  const P = datos.postulaciones;
  const unread = datos.correos.filter((m) => !m.leido).length;
  const pend = datos.estudiantes.filter((e) => e.academico_actualizado && !e.avance_verificado).length;
  const org = (id: string) => datos.organizaciones.find((o) => o.id === id);
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">Prosecretaría de Inserción Laboral</span><h1>Tablero</h1><p className="lead">Las novedades te llegan por correo: altas de organizaciones y búsquedas publicadas.</p></section>
      {unread ? <Notice tipo="new"><span><b>{unread === 1 ? "Tenés 1 correo nuevo" : `Tenés ${unread} correos nuevos`}.</b> <button className="linkbtn" type="button" onClick={() => c.ir("correos")}>Ver correos</button></span></Notice> : null}
      {pend ? <Notice tipo="warn"><span><b>{pend === 1 ? "1 estudiante" : `${pend} estudiantes`}</b> con el avance pendiente de verificar con SIU Guaraní. <button className="linkbtn" type="button" onClick={() => c.ir("verif")}>Verificar</button></span></Notice> : null}
      <div className="kpis">
        <div className="panel"><span className="eyebrow">Búsquedas publicadas</span><b>{datos.busquedas.filter((b) => b.estado === "publicada").length}</b></div>
        <div className="panel"><span className="eyebrow">Organizaciones</span><b>{datos.organizaciones.length}</b></div>
        <div className="panel"><span className="eyebrow">Estudiantes registrados</span><b>{datos.estudiantes.length}</b></div>
        <div className="panel"><span className="eyebrow">Postulaciones</span><b>{P.length}</b></div>
        <div className="panel"><span className="eyebrow">Cumplen requisitos</span><b>{P.filter((p) => p.cumple_requisitos).length}</b></div>
      </div>
      <section className="panel"><h2>Búsquedas</h2><div className="table-wrap"><table><thead><tr><th>Puesto</th><th>Organización</th><th>Publicada</th><th>Postulaciones</th><th>Cumplen</th><th>Enviadas</th></tr></thead><tbody>
        {datos.busquedas.map((b) => { const ps = P.filter((p) => p.busqueda_id === b.id); return (
          <tr key={b.id}><td><strong>{b.titulo}</strong><div className="mut" style={{ fontSize: ".8rem" }}>{b.tipo === "pasantia" ? "Pasantía" : "Empleo"} · {b.carrera}</div></td><td>{org(b.organizacion_id)?.nombre}</td><td className="num">{fmt(b.created_at)}</td><td className="num">{ps.length}</td><td className="num">{ps.filter((p) => p.cumple_requisitos).length}</td><td className="num">{ps.filter((p) => p.enviada).length}</td></tr>); })}
      </tbody></table></div></section>
      <p className="hint mut">Sprint 3: ver los postulantes de cada búsqueda y enviarlos a la organización (HU5a y HU5b), y registrar la selección (HU6).</p>
    </>
  );
}

/* ===== HU12 · Correos de novedades (los genera la base con un trigger) ===== */
export function Correos({ c }: { c: Ctx }) {
  const [nuevos] = useState(() => new Set(c.datos.correos.filter((m) => !m.leido).map((m) => m.id)));
  useEffect(() => {
    if (nuevos.size) api.marcarCorreosLeidos().then(() => c.recargar()).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">Prosecretaría · {PROSEC_MAIL}</span><h1>Correos de novedades</h1></section>
      <Notice><span><b>Bandeja simulada.</b> Los correos los genera la base de datos (un trigger) ante cada alta de organización y cada búsqueda publicada, y se muestran acá. El envío real por un servicio de correo queda a confirmar con el docente.</span></Notice>
      <div className="list">{c.datos.correos.length ? c.datos.correos.map((m) => (
        <article key={m.id} className={`mail${nuevos.has(m.id) ? " unread" : ""}`}>
          <header><b>{nuevos.has(m.id) ? <><span className="tag new">Nuevo</span> </> : null}{m.asunto}</b><span className="num mut">{fmtHora(m.fecha)}</span></header>
          <small>De: Primer Paso FCE &lt;no-responder@primerpaso.fce.example&gt; · Para: {m.para}</small>
          <p>{m.cuerpo}</p>
        </article>)) : <p className="empty">No hay correos.</p>}</div>
    </>
  );
}

/* ===== Verificación del avance con SIU Guaraní (control manual, sin integración) ===== */
export function Verificar({ c }: { c: Ctx }) {
  const [err, setErr] = useState("");
  const [enProceso, setEnProceso] = useState<string | null>(null);
  const es = c.datos.estudiantes.filter((e) => e.academico_actualizado).sort((a, b) => Number(a.avance_verificado) - Number(b.avance_verificado) || a.apellido.localeCompare(b.apellido));
  async function verificar(id: string, nombre: string) {
    setEnProceso(id); setErr("");
    try { await api.verificarAvance(id); await c.recargar(); c.aviso(`Avance de ${nombre} verificado`); } catch (x) { setErr(mensajeError(x)); }
    setEnProceso(null);
  }
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">Prosecretaría</span><h1>Verificar avance con SIU Guaraní</h1><p className="lead">El estudiante declara su avance; la Prosecretaría lo compara con SIU Guaraní y lo marca como verificado. Si el estudiante lo modifica, la base lo vuelve a dejar pendiente.</p></section>
      {err ? <Notice tipo="warn" role="alert"><span>{err}</span></Notice> : null}
      <section className="panel"><div className="table-wrap"><table><thead><tr><th>Estudiante</th><th>Legajo</th><th>Carrera</th><th>Avance declarado</th><th>Estado</th><th></th></tr></thead><tbody>
        {es.map((e) => (
          <tr key={e.id}><td><strong>{e.apellido}, {e.nombre}</strong><div className="mut" style={{ fontSize: ".8rem" }}>Actualizado el {fmt(e.academico_actualizado)}</div></td><td className="num">{e.legajo}</td><td>{e.carrera}</td><td className="num">{e.avance}%</td>
            <td>{e.avance_verificado ? <span className="tag ok">Verificado {fmt(e.verificado_at)}</span> : <span className="tag warn">Pendiente</span>}</td>
            <td>{e.avance_verificado ? null : <button className="btn" type="button" disabled={enProceso === e.id} onClick={() => verificar(e.id, e.nombre)}>Coincide con SIU Guaraní</button>}</td></tr>))}
      </tbody></table></div></section>
      <p className="hint mut">La consulta automática a SIU Guaraní queda en el roadmap (regla del caso: sin integraciones en esta versión).</p>
    </>
  );
}

export function Organizaciones({ c }: { c: Ctx }) {
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">Prosecretaría</span><h1>Organizaciones registradas</h1><p className="lead">Cada alta llega por correo. Sin convenio vigente, la organización puede publicar empleos pero no pasantías; el cupo de pasantes depende de su planta (Ley 26.427).</p></section>
      <section className="panel"><div className="table-wrap"><table><thead><tr><th>Organización</th><th>CUIT</th><th>Contacto</th><th>Convenio</th><th>Cupo de pasantes</th><th>Alta</th></tr></thead><tbody>
        {c.datos.organizaciones.map((o) => (
          <tr key={o.id}><td><strong>{o.nombre}</strong><div className="mut" style={{ fontSize: ".8rem" }}>{o.rubro}</div></td><td className="num">{o.cuit}</td><td>{o.contacto}<div className="mut" style={{ fontSize: ".8rem" }}>{o.email}</div></td>
            <td>{convenioVigente(o) ? <span className="tag ok">Vigente hasta {fmt(o.convenio_vence)}</span> : <span className="tag warn">Sin convenio</span>}</td>
            <td className="num">{vacantesUsadas(o, c.datos.busquedas)} de {cupoPasantes(o.empleados)} <span className="mut" style={{ fontSize: ".8rem" }}>(planta {o.empleados})</span></td>
            <td className="num">{fmt(o.created_at)}</td></tr>))}
      </tbody></table></div></section>
    </>
  );
}
