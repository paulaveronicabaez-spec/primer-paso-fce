"use client";
import { useState, type FormEvent } from "react";
import type { Ctx } from "@/lib/ctx";
import type { Brod, Estudiante } from "@/lib/tipos";
import {
  BROD_URL, CARRERAS, COMPETENCIAS, ENEA, ETAPAS, RIASEC, academicoPendiente, afinidad, altaCompleta, brodAlerta, brodTiene,
  edadDe, evaluar, fmt, mensajeError, perfilScore,
} from "@/lib/reglas";
import * as api from "@/lib/api";
import { Err, Field, Notice, Stepper } from "./ui";

const yo = (c: Ctx) => c.datos.estudiantes.find((e) => e.id === c.sesion?.ref) as Estudiante;

export function VerifChip({ e }: { e: Estudiante }) {
  if (e.avance_verificado) return <span className="tag ok">✔ Avance verificado con SIU Guaraní el {fmt(e.verificado_at)}</span>;
  if (e.academico_actualizado) return <span><span className="tag warn">Pendiente de verificación</span> <small className="mut">La Prosecretaría controla tu avance con SIU Guaraní. Si lo cambiás, vuelve a quedar pendiente.</small></span>;
  return <small className="mut">La Prosecretaría controla tu avance con SIU Guaraní.</small>;
}

/* ===== HU2' + HU7b' · Mi perfil (y pasos 2 y 3 del alta) ===== */
export function Perfil({ c }: { c: Ctx }) {
  const e = yo(c);
  const alta = !altaCompleta(e);
  const b0: Brod = e.brod || { etapa: "", riasec1: "", riasec2: "", enea: "", competencias: [], titular: "" };
  const [f, setF] = useState({ carrera: e.carrera || "", avance: e.avance == null ? "" : String(e.avance), regular: e.regular, pasantia_vigente: e.pasantia_vigente });
  const [b, setB] = useState<Brod>({ ...b0, competencias: [...(b0.competencias || [])] });
  const [err, setErr] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const score = perfilScore(f.carrera, f.avance, b);
  const al = brodAlerta(e), ap = academicoPendiente(e);
  const opt = (arr: string[], ph: string) => [<option key="" value="">{ph}</option>, ...arr.map((x) => <option key={x}>{x}</option>)];
  const toggleComp = (x: string) => setB({ ...b, competencias: b.competencias.includes(x) ? b.competencias.filter((y) => y !== x) : [...b.competencias, x] });

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    const er: Record<string, string> = {};
    const av = Number(f.avance);
    if (!f.carrera) er.carrera = "Elegí tu carrera para poder guardar el perfil.";
    if (f.avance === "" || isNaN(av) || av < 0 || av > 100) er.avance = "Indicá un porcentaje entre 0 y 100.";
    if (b.competencias.length > 5) er.competencias = "Elegí hasta 5 competencias: las que mejor te representan.";
    else if (b.competencias.length < 3) er.competencias = "Elegí al menos 3 competencias, según tu resultado del test.";
    if (!b.etapa) er.etapa = "Elegí la etapa en la que estás.";
    if (!b.riasec1) er.riasec1 = "Elegí tu área principal según el test.";
    if (!b.titular.trim()) er.titular = "Copiá el perfil que te dio el test de BrOD.";
    setErr(er);
    if (Object.keys(er).length) return;
    setGuardando(true);
    try {
      const acad = { carrera: f.carrera, avance: av, regular: f.regular, pasantia_vigente: f.pasantia_vigente };
      const acadCambio = !e.academico_actualizado || e.carrera !== acad.carrera || e.avance !== acad.avance || e.regular !== acad.regular || e.pasantia_vigente !== acad.pasantia_vigente;
      const keys: (keyof Brod)[] = ["etapa", "riasec1", "riasec2", "enea", "titular"];
      const brodCambio = !e.brod || keys.some((k) => (e.brod?.[k] || "") !== (b[k] || "")) || JSON.stringify(e.brod.competencias || []) !== JSON.stringify(b.competencias);
      const brod: Brod = brodCambio ? { ...b, titular: b.titular.trim(), fecha: new Date().toISOString(), carrera_ref: acad.carrera, avance_ref: av } : { ...e.brod!, ...b };
      await api.actualizarEstudiante(e.id, { ...acad, ...(acadCambio ? { academico_actualizado: new Date().toISOString() } : {}), brod });
      await c.recargar();
      c.aviso(alta ? "Alta completa · ¡ya podés postularte!" : "Perfil guardado · elegibilidad actualizada");
      if (alta) c.ir("busquedas");
    } catch (x) { setErr({ general: mensajeError(x) }); }
    setGuardando(false);
  }

  return (
    <>
      <section style={{ display: "grid", gap: 10 }}><span className="eyebrow">Estudiante</span><h1>{alta ? "Completá tu perfil" : "Mi perfil"}</h1>{alta ? <Stepper paso={2} /> : null}
        <p className="lead">{alta ? "Para terminar tu alta cargá tu avance según SIU Guaraní y los resultados del test de BrOD. Son obligatorios: con ellos la plataforma sabe en qué búsquedas cumplís y las organizaciones conocen tu perfil." : "Actualizá tus datos a medida que avanzás en la carrera: la plataforma recalcula en qué búsquedas cumplís."}</p></section>
      <div className="meter"><b>Perfil completo al <span className="num">{score}%</span></b><div className="bar"><i style={{ width: score + "%" }} /></div><small>Carrera, avance, etapa, área principal, entre 3 y 5 competencias y tu perfil según el test.</small></div>
      <section className="panel pdata"><div className="sec-head"><h2>Datos personales</h2><small className="mut">Cargados al crear tu usuario</small></div>
        <dl><div><dt>Nombre</dt><dd>{e.nombre} {e.apellido}</dd></div><div><dt>DNI</dt><dd className="num">{e.dni}</dd></div><div><dt>Legajo</dt><dd className="num">{e.legajo}</dd></div><div><dt>Correo</dt><dd>{e.email}</dd></div><div><dt>Edad</dt><dd>{edadDe(e.fnac)} años <small className="mut">(según tu fecha de nacimiento)</small></dd></div></dl></section>
      {err.general ? <Notice tipo="warn" role="alert"><span>{err.general}</span></Notice> : null}
      <form className="panel" onSubmit={guardar} noValidate>
        <div className="sec-head"><h2>{alta ? "Paso 2 · " : "1 · "}Datos académicos</h2><small className="mut">Última actualización: {fmt(e.academico_actualizado)}</small></div>
        {ap ? <Notice tipo="warn"><span>Pasó el turno de exámenes de <b>{ap}</b>: actualizá tu avance para que la elegibilidad esté al día.</span></Notice> : null}
        <div className="form">
          <Field id="p-carrera" label="Carrera" err={err.carrera}><select id="p-carrera" value={f.carrera} onChange={(x) => setF({ ...f, carrera: x.target.value })}>{opt(CARRERAS, "Elegí tu carrera")}</select></Field>
          <Field id="p-avance" label="Avance según SIU Guaraní (%)" err={err.avance} hint="El porcentaje de materias aprobadas que figura en tu SIU Guaraní."><input id="p-avance" type="number" min={0} max={100} inputMode="numeric" value={f.avance} onChange={(x) => setF({ ...f, avance: x.target.value })} /></Field>
          <div className="field full"><VerifChip e={e} /></div>
          <div className="field full"><div className="checks">
            <label><input type="checkbox" checked={f.regular} onChange={(x) => setF({ ...f, regular: x.target.checked })} /> Soy alumno/a regular de grado</label>
            <label><input type="checkbox" checked={f.pasantia_vigente} onChange={(x) => setF({ ...f, pasantia_vigente: x.target.checked })} /> Tengo una pasantía vigente</label></div></div>
        </div>
        <div className="brod">
          <div className="brod-head"><div style={{ display: "grid", gap: 4 }}>
            <h2>{alta ? <>Paso 3 · Test de BrOD <span className="tag warn" style={{ verticalAlign: 3 }}>Obligatorio</span></> : "2 · Perfil vocacional y competencias"}</h2>
            <p>{alta ? <><b>1.</b> Tocá «Hacer el test en BrOD» (perfil Holland/RIASEC de 24 preguntas, unos 10 minutos). <b>2.</b> Cuando termines, volvé y cargá acá tus resultados.</> : "Cargá los resultados de tu test de BrOD."} El test se repite cada 6 meses, o antes si cambiás de carrera o tu avance sube 25 puntos.</p>
            {brodTiene(e.brod) ? <small className="mut">Último test cargado: {fmt(e.brod?.fecha)}</small> : null}</div>
            <a className="extlink" href={BROD_URL} target="_blank" rel="noopener noreferrer">Hacer el test en BrOD ↗</a></div>
          {al ? <Notice tipo="warn"><span><b>Es momento de actualizar tu test:</b> {al.join(" y ")}.</span></Notice> : null}
          <div className="form">
            <Field id="b-etapa" label="Tu momento" err={err.etapa}><select id="b-etapa" value={b.etapa} onChange={(x) => setB({ ...b, etapa: x.target.value })}>{opt(ETAPAS, "Elegí una opción")}</select></Field>
            <Field id="b-enea" label={<>Tipo de Eneagrama <small className="mut">(opcional)</small></>}><select id="b-enea" value={b.enea} onChange={(x) => setB({ ...b, enea: x.target.value })}>{opt(ENEA, "No lo hice")}</select></Field>
            <Field id="b-r1" label="Área vocacional principal (RIASEC)" err={err.riasec1}><select id="b-r1" value={b.riasec1} onChange={(x) => setB({ ...b, riasec1: x.target.value })}>{opt(RIASEC, "Elegí tu mejor match")}</select></Field>
            <Field id="b-r2" label="Área relacionada"><select id="b-r2" value={b.riasec2} onChange={(x) => setB({ ...b, riasec2: x.target.value })}>{opt(RIASEC, "Opcional")}</select></Field>
            <fieldset className={`field full${err.competencias ? " invalid" : ""}`}><legend>Competencias blandas (elegí entre 3 y 5)</legend>
              <div className="comp">{COMPETENCIAS.map((x) => <label key={x}><input type="checkbox" checked={b.competencias.includes(x)} onChange={() => toggleComp(x)} /> {x}</label>)}</div><Err msg={err.competencias} /></fieldset>
            <Field id="b-tit" label="Perfil según test" err={err.titular} hint="Copiá el perfil que te otorgó BrOD al terminar el test." full><input id="b-tit" maxLength={120} value={b.titular} placeholder="Ej.: Analista contable orientado a impuestos" onChange={(x) => setB({ ...b, titular: x.target.value })} /></Field>
          </div>
          <p className="hint" style={{ color: "var(--muted)", fontSize: ".82rem" }}>Los resultados se cargan a mano: no hay integración con BrOD (regla del caso). La conexión automática y el matching por competencias con IA están en el roadmap.</p>
        </div>
        <div className="actions"><button className="btn" type="submit" disabled={guardando}>{guardando ? "Guardando…" : alta ? "Guardar y ver búsquedas" : "Guardar perfil"}</button></div>
      </form>
    </>
  );
}

/* ===== HU13 · Postularme, con novedades ===== */
export function Postularme({ c }: { c: Ctx }) {
  const e = yo(c);
  const [soloOk, setSoloOk] = useState(false);
  const org = (id: string) => c.datos.organizaciones.find((o) => o.id === id);
  const yaPost = (id: string) => c.datos.postulaciones.find((p) => p.estudiante_id === e.id && p.busqueda_id === id);
  const desde = c.novDesde ? new Date(c.novDesde) : null;
  const pub = c.datos.busquedas.filter((b) => b.estado === "publicada");
  const nov = desde ? pub.filter((b) => new Date(b.created_at) > desde && !yaPost(b.id)) : [];
  const novIds = new Set(nov.map((b) => b.id));
  const rows = pub.map((b) => ({ b, r: evaluar(e, b), n: novIds.has(b.id) })).sort((x, y) => Number(y.r.cumple) - Number(x.r.cumple) || Number(y.n) - Number(x.n));
  const okN = rows.filter((x) => x.r.cumple).length;
  const shown = soloOk ? rows.filter((x) => x.r.cumple) : rows;
  const al = brodAlerta(e), ap = academicoPendiente(e);
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">Hola, {e.nombre}</span><h1>Postularme</h1><p className="lead">Primero ves las búsquedas en las que cumplís los requisitos. En las demás te mostramos qué te falta: así sabés qué piden hoy las organizaciones.</p></section>
      {nov.length ? <Notice tipo="new" role="status"><strong>🔔 {nov.length === 1 ? "Hay 1 búsqueda nueva" : `Hay ${nov.length} búsquedas nuevas`} desde tu último ingreso ({fmt(c.novDesde)})</strong><span>{nov.map((b) => `${b.titulo} · ${org(b.organizacion_id)?.nombre}`).join(" · ")}</span></Notice> : null}
      {al ? <Notice tipo="warn"><span><b>Actualizá tu test de BrOD:</b> {al.join(" y ")}. <button className="linkbtn" type="button" onClick={() => c.ir("perfil")}>Ir a Mi perfil</button></span></Notice> : null}
      {ap ? <Notice tipo="warn"><span>Pasó el turno de exámenes de <b>{ap}</b>. <button className="linkbtn" type="button" onClick={() => c.ir("perfil")}>Actualizá tu avance</button> para que la elegibilidad esté al día.</span></Notice> : null}
      <div className="toolbar"><span className="count">Cumplís con <span className="num">{okN}</span> de <span className="num">{rows.length}</span> búsquedas</span>
        <label className="switch"><input type="checkbox" checked={soloOk} onChange={(x) => setSoloOk(x.target.checked)} /> Ver solo las que cumplo</label></div>
      <div className="list">{shown.length ? shown.map(({ b, r, n }) => {
        const a = yaPost(b.id);
        return (
          <button key={b.id} className={`job${r.cumple ? "" : " no"}`} type="button" onClick={() => c.ir("detalle", { busId: b.id })}>
            <div className="job-head"><div><div className="job-title">{n ? <><span className="tag new">Nueva</span> </> : null}{b.titulo}</div><div className="job-org">{org(b.organizacion_id)?.nombre} · publicada el {fmt(b.created_at)}</div></div>
              {a ? <span className="tag acc">Te postulaste</span> : r.cumple ? <span className="tag ok">✔ Cumplís los requisitos</span> : <span className="tag no">No cumplís</span>}</div>
            <div className="chips"><span className="chip">{b.tipo === "pasantia" ? "Pasantía" : "Empleo"}</span><span className="chip">{b.carrera}</span><span className="chip num">{b.horas_semanales} h/sem</span><span className="chip num">Avance {b.avance_minimo}%</span>{b.duracion_meses ? <span className="chip num">{b.duracion_meses} meses</span> : null}{(() => { const a = afinidad(e, b); return a ? <span className="tag ia num">Afinidad {a.pct}%</span> : null; })()}</div>
            {r.cumple ? null : <div className="reasons">{r.motivos.map((m) => <span className="reason" key={m}>{m}</span>)}</div>}
          </button>);
      }) : <p className="empty">Todavía no hay búsquedas en las que cumplas los requisitos. Desactivá el filtro para ver qué piden las organizaciones.</p>}</div>
    </>
  );
}

/* ===== P5 · Detalle y postulación (la clasificación la calcula la base) ===== */
export function Detalle({ c }: { c: Ctx }) {
  const e = yo(c);
  const b = c.datos.busquedas.find((x) => x.id === c.busId);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState("");
  if (!b) return <p className="empty">La búsqueda ya no está disponible. <button className="linkbtn" type="button" onClick={() => c.ir("busquedas")}>Volver</button></p>;
  const o = c.datos.organizaciones.find((x) => x.id === b.organizacion_id);
  const r = evaluar(e, b);
  const ap = c.datos.postulaciones.find((p) => p.estudiante_id === e.id && p.busqueda_id === b.id);

  async function postular() {
    setEnviando(true); setErr("");
    try {
      const p = await api.postular(b!.id);
      await c.recargar();
      c.aviso(p.cumple_requisitos ? "Postulación enviada · Cumple requisitos" : "Postulación registrada · No cumple requisitos");
      c.ir("postulaciones");
    } catch (x) { setErr(mensajeError(x)); setEnviando(false); }
  }

  return (
    <>
      <div><button className="linkbtn" type="button" onClick={() => c.ir("busquedas")}>← Volver a Postularme</button></div>
      <section className="panel">
        <div className="job-head"><div style={{ display: "grid", gap: 4 }}><span className="eyebrow">{b.tipo === "pasantia" ? "Pasantía educativa" : "Empleo"}</span><h1>{b.titulo}</h1><p className="job-org">{o?.nombre}</p></div>
          {r.cumple ? <span className="tag ok">✔ Cumplís los requisitos</span> : <span className="tag no">No cumplís</span>}</div>
        <div className="chips"><span className="chip num">{b.horas_semanales} h semanales</span>{b.duracion_meses ? <span className="chip num">{b.duracion_meses} meses</span> : null}{b.tipo === "pasantia" && b.asignacion_estimulo ? <span className="chip num">Asignación estímulo $ {Number(b.asignacion_estimulo).toLocaleString("es-AR")}</span> : null}<span className="chip">{b.modalidad}</span></div>
        {(() => { const a = afinidad(e, b); return a ? <div className="brod-sum"><span className="eyebrow">Afinidad con tu perfil BrOD · <span className="num">{a.pct}%</span></span><span>Área buscada: <b>{b.area_riasec}</b> {a.area ? "✔ coincide con tu test" : `· tu área es ${e.brod?.riasec1}`}</span><div className="chips">{a.comunes.map((x) => <span className="tag ok" key={x}>✔ {x}</span>)}{a.faltan.map((x) => <span className="chip" key={x}>{x}</span>)}</div><small className="mut">Tenés {a.comunes.length} de {b.competencias.length} competencias buscadas. La afinidad no cambia si cumplís los requisitos: ayuda a la organización a decidir (la versión con IA está en el roadmap).</small></div> : null; })()}
        {b.descripcion ? <p>{b.descripcion}</p> : null}
        {b.tipo === "pasantia" ? <p className="law">Pasantía educativa · Ley 26.427 · {b.dias_semana} días por semana · tutor/a: {b.tutor} · con ART y obra social</p> : null}
        <div style={{ display: "grid", gap: 8 }}><h3>Requisitos</h3><ul className="req">{r.req.map((q) => (
          <li key={q.txt}><span className={`mark ${q.ok ? "ok" : "no"}`} aria-hidden="true">{q.ok ? "✔" : "✘"}</span><span>{q.txt}{q.ok ? null : <small> · {q.motivo}</small>}</span></li>))}</ul></div>
        {e.brod ? <div className="brod-sum"><span className="eyebrow">Tu perfil según el test · BrOD</span><span className="t">{e.brod.titular}</span>
          <div className="chips">{e.brod.riasec1 ? <span className="tag ia">{e.brod.riasec1}</span> : null}{(e.brod.competencias || []).map((x) => <span className="chip" key={x}>{x}</span>)}</div>
          <small style={{ color: "var(--muted)" }}>{e.avance_verificado ? `Avance verificado con SIU Guaraní el ${fmt(e.verificado_at)}` : "Avance pendiente de verificación por la Prosecretaría"}. La organización ve tu perfil recién cuando la Prosecretaría envía los postulantes.</small></div> : null}
        {err ? <Notice tipo="warn" role="alert"><span>{err}</span></Notice> : null}
        {ap ? <Notice tipo={ap.cumple_requisitos ? "ok" : "warn"}><strong>Ya te postulaste.</strong><span>Tu postulación quedó clasificada como <b>{ap.cumple_requisitos ? "Cumple requisitos" : "No cumple requisitos"}</b>.</span><div className="actions"><button className="btn ghost" type="button" onClick={() => c.ir("postulaciones")}>Ver mis postulaciones</button></div></Notice>
          : confirmar ? <Notice tipo="warn" role="alert"><strong>No cumplís estos requisitos:</strong><span>{r.motivos.join(" · ")}</span><span>Podés postularte igual: tu postulación quedará registrada como <b>No cumple requisitos</b> y no se enviará a la organización.</span><div className="actions"><button className="btn" type="button" disabled={enviando} onClick={postular}>Postularme igual</button><button className="btn ghost" type="button" onClick={() => setConfirmar(false)}>Cancelar</button></div></Notice>
            : <div className="actions"><button className="btn" type="button" disabled={enviando} onClick={() => (r.cumple ? postular() : setConfirmar(true))}>{enviando ? "Enviando…" : "Postularme"}</button>{r.cumple ? null : <span style={{ color: "var(--muted)", fontSize: ".88rem" }}>Antes de confirmar te mostramos cómo va a quedar clasificada.</span>}</div>}
      </section>
    </>
  );
}

/* ===== P6 · Mis postulaciones ===== */
export function MisPostulaciones({ c }: { c: Ctx }) {
  const e = yo(c);
  const ps = c.datos.postulaciones.filter((p) => p.estudiante_id === e.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const bus = (id: string) => c.datos.busquedas.find((b) => b.id === id);
  const org = (id?: string) => c.datos.organizaciones.find((o) => o.id === id);
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">{e.nombre}</span><h1>Mis postulaciones</h1><p className="lead">Cada postulación se clasifica automáticamente según los requisitos de la búsqueda. Las que cumplen son las que la Prosecretaría envía a la organización.</p></section>
      {ps.length ? <div className="table-wrap panel" style={{ padding: "8px 12px" }}><table><thead><tr><th>Búsqueda</th><th>Organización</th><th>Fecha</th><th>Clasificación</th><th>Envío</th></tr></thead><tbody>
        {ps.map((p) => { const b = bus(p.busqueda_id); return (
          <tr key={p.id}><td><strong>{b?.titulo}</strong></td><td>{org(b?.organizacion_id)?.nombre}</td><td className="num">{fmt(p.created_at)}</td>
            <td>{p.cumple_requisitos ? <span className="tag ok">Cumple requisitos</span> : <><span className="tag no">No cumple requisitos</span><div style={{ color: "var(--muted)", fontSize: ".82rem", marginTop: 4 }}>{p.motivos.join(" · ")}</div></>}</td>
            <td>{p.enviada ? <span className="tag acc">Enviada a la organización</span> : <span className="mut" style={{ fontSize: ".85rem" }}>{p.cumple_requisitos ? "En revisión de la Prosecretaría" : "No se envía"}</span>}</td></tr>); })}
      </tbody></table></div> : <p className="empty">Todavía no te postulaste a ninguna búsqueda. <button className="linkbtn" type="button" onClick={() => c.ir("busquedas")}>Ir a Postularme</button></p>}
    </>
  );
}
