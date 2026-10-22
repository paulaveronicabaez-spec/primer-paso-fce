"use client";
import { useEffect, useState } from "react";
import type { Ctx } from "@/lib/ctx";
import { ESTADOS_BUSQUEDA, MOTIVOS_DESCARTE, PROSEC_MAIL, estadoBusqueda, rankingReglas, type Sugerencia, convenioVigente, cupoPasantes, edadDe, fmt, fmtHora, mensajeError, pNom, vacantesUsadas } from "@/lib/reglas";
import * as api from "@/lib/api";
import { Notice } from "./ui";
import { ResultadoCell } from "./Organizacion";

export function Tablero({ c }: { c: Ctx }) {
  const { datos } = c;
  const P = datos.postulaciones;
  const [filtro, setFiltro] = useState("");
  const unread = datos.correos.filter((m) => m.para === PROSEC_MAIL && !m.leido).length;
  const pendVerif = datos.estudiantes.filter((e) => e.academico_actualizado && !e.avance_verificado).length;
  const org = (id: string) => datos.organizaciones.find((o) => o.id === id);
  const bs = datos.busquedas.map((b) => ({ b, s: estadoBusqueda(b, P) }));
  const shown = filtro ? bs.filter((x) => x.s.k === filtro) : bs;
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">Prosecretaría de Inserción Laboral</span><h1>Tablero</h1><p className="lead">Seguí cada búsqueda desde que se publica hasta que la organización informa a quién eligió.</p></section>
      {unread ? <Notice tipo="new"><span><b>{unread === 1 ? "Tenés 1 correo nuevo" : `Tenés ${unread} correos nuevos`}.</b> <button className="linkbtn" type="button" onClick={() => c.ir("correos")}>Ver correos</button></span></Notice> : null}
      {pendVerif ? <Notice tipo="warn"><span><b>{pendVerif === 1 ? "1 estudiante" : `${pendVerif} estudiantes`}</b> con el avance pendiente de verificar con SIU Guaraní. <button className="linkbtn" type="button" onClick={() => c.ir("verif")}>Verificar</button></span></Notice> : null}
      <div className="kpis">
        <div className="panel"><span className="eyebrow">Búsquedas publicadas</span><b>{datos.busquedas.filter((b) => b.estado === "publicada").length}</b></div>
        <div className="panel"><span className="eyebrow">Postulaciones</span><b>{P.length}</b></div>
        <div className="panel"><span className="eyebrow">Cumplen requisitos</span><b>{P.filter((p) => p.cumple_requisitos).length}</b></div>
        <div className="panel"><span className="eyebrow">Enviadas a organizaciones</span><b>{P.filter((p) => p.enviada).length}</b></div>
        <div className="panel"><span className="eyebrow">Estudiantes seleccionados</span><b>{P.filter((p) => p.resultado === "seleccionado").length}</b></div>
      </div>
      <section className="panel" style={{ display: "grid", gap: 12 }}><div className="sec-head"><h2>Seguimiento de búsquedas</h2><small className="mut">Empleos y pasantías</small></div>
        <div className="segchips">{([["", "Todas", bs.length]] as [string, string, number][]).concat(ESTADOS_BUSQUEDA.map(([k, l]) => [k, l, bs.filter((x) => x.s.k === k).length] as [string, string, number])).map(([k, l, n]) => (
          <button key={k || "todas"} type="button" className={`segc${filtro === k ? " on" : ""}`} onClick={() => setFiltro(k)}>{l} <span className="num">{n}</span></button>))}</div>
        <div className="table-wrap"><table><thead><tr><th>Búsqueda</th><th>Publicada</th><th>Recorrido</th><th>Estado</th><th></th></tr></thead><tbody>
          {shown.length ? shown.map(({ b, s }) => { const e = ESTADOS_BUSQUEDA.find((x) => x[0] === s.k)!; return (
            <tr key={b.id}><td><strong>{b.titulo}</strong><div className="mut" style={{ fontSize: ".8rem" }}>{org(b.organizacion_id)?.nombre} · {b.tipo === "pasantia" ? "Pasantía" : "Empleo"} · {b.vacantes} vacante(s)</div></td>
              <td className="num nw">{fmt(b.created_at)}</td>
              <td><ol className="pipe"><li className={s.ps ? "done" : ""}><b className="num">{s.ps}</b> postulaciones</li><li className={s.pend ? "cur" : s.env ? "done" : ""}><b className="num">{s.pend}</b> pendientes de envío</li><li className={s.env ? (s.sinRes ? "cur" : "done") : ""}><b className="num">{s.env}</b> enviadas</li><li className={s.sel ? "done" : ""}><b className="num">{s.sel}</b> seleccionados</li></ol></td>
              <td><span className={`tag ${e[2]}`}>{e[1]}</span></td>
              <td>{s.pend ? <button className="linkbtn" type="button" onClick={() => c.ir("evaluar")}>Evaluar</button> : null}</td></tr>); })
            : <tr><td colSpan={5} className="empty">No hay búsquedas en este estado.</td></tr>}
        </tbody></table></div></section>
      <p className="hint mut">La organización registra a quién seleccionó desde su usuario. Si lo informa por otro medio, la Prosecretaría puede registrarlo en «Evaluar postulaciones».</p>
    </>
  );
}

/* ===== HU12 · Correos de novedades (los genera la base con un trigger) ===== */
export function Correos({ c }: { c: Ctx }) {
  const esOrg = c.sesion?.rol === "org";
  const o = esOrg ? c.datos.organizaciones.find((x) => x.id === c.sesion?.ref) : undefined;
  const para = esOrg ? o?.email ?? "" : PROSEC_MAIL;
  const mios = c.datos.correos.filter((m) => m.para === para);
  const [nuevos] = useState(() => new Set(mios.filter((m) => !m.leido).map((m) => m.id)));
  useEffect(() => {
    if (nuevos.size) api.marcarCorreosLeidos(para).then(() => c.recargar()).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">{esOrg ? o?.nombre : "Prosecretaría"} · {para}</span><h1>Correos de novedades</h1></section>
      <Notice><span>{esOrg
        ? <><b>Te avisamos por correo cada vez que la Prosecretaría te envía un postulante.</b> Desde ese momento ves su perfil completo en «Mis búsquedas y postulaciones». Cuando decidas, registrá el resultado: el estudiante y la Prosecretaría se enteran al instante.</>
        : <><b>Bandeja de novedades.</b> La base de datos genera un correo ante cada alta de organización, búsqueda publicada y selección registrada. Las organizaciones reciben el suyo cuando les enviás postulantes.</>}
        {" "}<span className="mut">En esta versión los correos se ven en la aplicación; el envío a la casilla real queda para el Sprint 3.</span></span></Notice>
      <div className="list">{mios.length ? mios.map((m) => (
        <article key={m.id} className={`mail${nuevos.has(m.id) ? " unread" : ""}`}>
          <header><b>{nuevos.has(m.id) ? <><span className="tag new">Nuevo</span> </> : null}{m.asunto}</b><span className="num mut">{fmtHora(m.fecha)}</span></header>
          <small>De: Primer Paso FCE &lt;no-responder@primerpaso.fce.example&gt; · Para: {m.para}</small>
          <p>{m.cuerpo}</p>
        </article>)) : <p className="empty">Todavía no hay correos.</p>}</div>
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

/* ===== HU5a + HU5b · Evaluar postulaciones y enviar a la organización las aprobadas ===== */
export function Evaluar({ c }: { c: Ctx }) {
  const { datos } = c;
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [enProceso, setEnProceso] = useState<string | null>(null);
  const est = (id: string) => datos.estudiantes.find((e) => e.id === id);
  const org = (id: string) => datos.organizaciones.find((o) => o.id === id);
  const bs = datos.busquedas.filter((b) => datos.postulaciones.some((p) => p.busqueda_id === b.id));
  const [sug, setSug] = useState<Record<string, { estado: "pensando" | "ok"; fuente?: "ia" | "reglas"; items?: Sugerencia[] }>>({});
  const candidatos = (bid: string) => datos.postulaciones.filter((p) => p.busqueda_id === bid && p.cumple_requisitos && !p.enviada && !p.descartada);

  /* HU8: la IA cruza la búsqueda con los candidatos (sin nombre, DNI ni correo) y sugiere hasta 5 */
  async function sugerir(bid: string) {
    const b = datos.busquedas.find((x) => x.id === bid)!;
    const cs = candidatos(bid);
    setSug((s) => ({ ...s, [bid]: { estado: "pensando" } }));
    const codigos: Record<string, string> = {};
    const anon = cs.map((p, i) => {
      const e = est(p.estudiante_id); const cod = "P" + (i + 1); codigos[cod] = p.id;
      return { codigo: cod, carrera: e?.carrera ?? null, avance: e?.avance ?? null, avance_verificado: !!e?.avance_verificado, perfil_test: pNom(e?.brod?.riasec1), perfil_relacionado: pNom(e?.brod?.riasec2), competencias: e?.brod?.competencias || [], perfil_segun_test: e?.brod?.titular || "", afinidad_reglas: datos.afinidades[p.id] ?? 0 };
    });
    let items: Sugerencia[] | null = null;
    try {
      const r = await api.sugerirConIA({ titulo: b.titulo, tipo: b.tipo, modalidad: b.modalidad, carrera: b.carrera, avance_minimo: b.avance_minimo, perfil_buscado: pNom(b.area_riasec), perfil_complementario: pNom(b.area2), competencias: b.competencias, tareas: b.descripcion }, anon);
      if (r) items = r.filter((x) => codigos[x.codigo]).map((x) => ({ pid: codigos[x.codigo], puntaje: x.puntaje, motivo: x.motivo }));
    } catch { items = null; }
    setSug((s) => ({ ...s, [bid]: items && items.length ? { estado: "ok", fuente: "ia", items } : { estado: "ok", fuente: "reglas", items: rankingReglas(b, cs, datos.estudiantes) } }));
  }

  async function enviarSugeridos(bid: string) {
    const ids = (sug[bid]?.items || []).map((x) => x.pid).filter((id) => candidatos(bid).some((p) => p.id === id));
    setErr("");
    try {
      for (const id of ids) await api.enviarPostulacion(id);
      const y = window.scrollY; await c.recargar(); window.scrollTo(0, y);
      c.aviso(`${ids.length} postulación(es) enviadas a la organización`);
    } catch (x) { setErr(mensajeError(x)); }
  }

  async function accion(id: string, tipo: "enviar" | "descartar") {
    setErr("");
    if (tipo === "descartar" && !motivos[id]) { setErr("Elegí el motivo para no enviar la postulación."); return; }
    setEnProceso(id);
    try {
      if (tipo === "enviar") await api.enviarPostulacion(id); else await api.descartarPostulacion(id, motivos[id]);
      const y = window.scrollY; await c.recargar(); window.scrollTo(0, y);
      c.aviso(tipo === "enviar" ? "Postulación enviada a la organización" : "Postulación marcada como no enviada");
    } catch (x) { setErr(mensajeError(x)); }
    setEnProceso(null);
  }

  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">Prosecretaría</span><h1>Evaluar postulaciones</h1><p className="lead">Revisá cada postulación y enviá a la organización las que aprobás. La organización ve el perfil del estudiante recién después del envío. Las que no cumplen requisitos no se envían.</p></section>
      {err ? <Notice tipo="warn" role="alert"><span>{err}</span></Notice> : null}
      {bs.length ? bs.map((b) => {
        const o = org(b.organizacion_id)!;
        const ps = datos.postulaciones.filter((p) => p.busqueda_id === b.id).sort((x, y) => Number(y.cumple_requisitos) - Number(x.cumple_requisitos) || (datos.afinidades[y.id] ?? 0) - (datos.afinidades[x.id] ?? 0));
        const env = ps.filter((p) => p.enviada).length;
        const cupo = cupoPasantes(o.empleados);
        const envPas = datos.postulaciones.filter((p) => { const bb = datos.busquedas.find((x) => x.id === p.busqueda_id); return p.enviada && bb?.organizacion_id === o.id && bb.tipo === "pasantia"; }).length;
        return (
          <section className="panel" style={{ display: "grid", gap: 10 }} key={b.id}>
            <div className="job-head"><div><div className="job-title">{b.titulo}</div><div className="job-org">{o.nombre} · {b.tipo === "pasantia" ? "Pasantía" : "Empleo"} · {b.vacantes} vacante(s) · perfil buscado: {pNom(b.area_riasec)}</div></div><span className="tag acc num">{env} enviadas</span></div>
            {b.tipo === "pasantia" ? <div className="chips">{convenioVigente(o) ? <span className="tag ok">Convenio vigente</span> : <span className="tag no">Sin convenio vigente</span>}<span className={`tag ${envPas >= cupo ? "warn" : "ok"} num`}>Pasantes enviados {envPas} · cupo según planta {cupo}</span></div> : null}
            {(() => {
              const cs = candidatos(b.id), s = sug[b.id];
              if (!cs.length && !s) return null;
              if (!s) return <div className="ia-box"><div><b>🤖 Sugerencia con IA</b><span className="mut">{cs.length} postulante(s) cumplen y esperan envío. La IA los cruza con lo que pide la organización y te sugiere hasta 5.</span></div><button className="btn" type="button" onClick={() => sugerir(b.id)}>Sugerir 5 postulantes</button></div>;
              if (s.estado === "pensando") return <div className="ia-box"><div><b>🤖 Analizando postulantes…</b><span className="mut">Cruzando competencias, perfil vocacional y avance verificado.</span></div></div>;
              const pend = (s.items || []).filter((x) => cs.some((p) => p.id === x.pid));
              return (
                <div className="ia-box res"><div className="sec-head"><b>🤖 {s.fuente === "ia" ? "Sugerencia de la IA" : "Sugerencia por reglas"} · {s.items?.length} postulante(s)</b>{s.fuente === "ia" ? <span className="tag ia">IA</span> : <span className="mut" style={{ fontSize: ".8rem" }}>La IA no está configurada en esta versión.</span>}</div>
                  <ol className="sug">{(s.items || []).map((x, i) => { const p = datos.postulaciones.find((q) => q.id === x.pid); const e = p ? est(p.estudiante_id) : undefined; return (
                    <li key={x.pid}><span className="rk num">{i + 1}</span><div><b>{e ? `${e.apellido}, ${e.nombre}` : "—"}</b> <span className="tag ia num">{x.puntaje}</span>{p?.enviada ? <> <span className="tag acc">Enviada</span></> : null}<div className="mut" style={{ fontSize: ".85rem" }}>{x.motivo}</div></div></li>); })}</ol>
                  <div className="actions">{pend.length ? <button className="btn" type="button" onClick={() => enviarSugeridos(b.id)}>Enviar los {pend.length} sugeridos a la organización</button> : null}<button className="btn ghost" type="button" onClick={() => sugerir(b.id)}>Volver a sugerir</button><span className="mut" style={{ fontSize: ".8rem" }}>La IA sugiere; la Prosecretaría decide. Se envían datos sin nombre ni DNI.</span></div>
                </div>);
            })()}
            <div className="table-wrap"><table><thead><tr><th>Estudiante</th><th>Clasificación</th><th>Afinidad</th><th>Avance</th><th>Evaluación</th></tr></thead><tbody>
              {ps.map((p) => { const e = est(p.estudiante_id); const a = datos.afinidades[p.id]; return (
                <tr key={p.id} className={(sug[b.id]?.items || []).some((x) => x.pid === p.id) ? "sugrow" : undefined}>
                  <td>{(() => { const k = (sug[b.id]?.items || []).findIndex((x) => x.pid === p.id); return k >= 0 ? <><span className="tag ia">⭐ Sugerido #{k + 1}</span> </> : null; })()}<strong>{e ? `${e.apellido}, ${e.nombre}` : "—"}</strong><div className="mut" style={{ fontSize: ".8rem" }}>{e?.carrera} · {edadDe(e?.fnac)} años</div>{e?.brod?.titular ? <div style={{ fontSize: ".82rem" }}>{e.brod.titular}</div> : null}</td>
                  <td>{p.cumple_requisitos ? <span className="tag ok">Cumple</span> : <><span className="tag no">No cumple</span><div className="mut" style={{ fontSize: ".8rem" }}>{p.motivos.join(" · ")}</div></>}</td>
                  <td className="num">{a != null ? a + "%" : "—"}</td>
                  <td>{e?.avance}% {e?.avance_verificado ? <span className="tag ok">Verificado</span> : <span className="tag warn">Sin verificar</span>}</td>
                  <td>{p.enviada ? <><span className="tag acc">Enviada el {fmt(p.enviada_at)}</span><div style={{ marginTop: 6 }}><ResultadoCell c={c} p={p} /></div></>
                    : p.descartada ? <><span className="tag no">No enviada</span><div className="mut" style={{ fontSize: ".8rem" }}>{p.motivo_descarte}</div></>
                      : !p.cumple_requisitos ? <span className="mut" style={{ fontSize: ".85rem" }}>No se envía (no cumple)</span>
                        : <div className="evalz">
                          <button className="btn" type="button" disabled={enProceso === p.id} onClick={() => accion(p.id, "enviar")}>Enviar a la organización</button>
                          <select aria-label="Motivo para no enviar" value={motivos[p.id] || ""} onChange={(x) => setMotivos({ ...motivos, [p.id]: x.target.value })}><option value="">No enviar por…</option>{MOTIVOS_DESCARTE.map((m) => <option key={m}>{m}</option>)}</select>
                          <button className="btn ghost" type="button" disabled={enProceso === p.id} onClick={() => accion(p.id, "descartar")}>No enviar</button>
                        </div>}</td>
                </tr>); })}
            </tbody></table></div>
          </section>);
      }) : <p className="empty">Todavía no hay postulaciones.</p>}
      <p className="hint mut">Al enviar, la organización ve el perfil completo del estudiante. La organización registra a quién seleccionó; si lo informa por otro medio, podés registrarlo acá.</p>
    </>
  );
}
