"use client";
import { useState, type FormEvent } from "react";
import type { Ctx } from "@/lib/ctx";
import type { Estudiante, Organizacion, Postulacion } from "@/lib/tipos";
import {
  CARRERAS, COMPETENCIAS, MODALIDADES, PERFIL, RIASEC, controlesLey, pNom, convenioVigente, edadDe, fmt, mensajeError,
  perfilDesact, ultimaAct, vacantesUsadas, validarBusqueda, type FormBusqueda,
} from "@/lib/reglas";
import * as api from "@/lib/api";
import { Err, Field, Notice } from "./ui";

/* HU6 · Registrar la selección (organización o Prosecretaría) */
export function ResultadoCell({ c, p }: { c: Ctx; p: Postulacion }) {
  const [enProceso, setEnProceso] = useState(false);
  if (!p.enviada) return <span className="mut" style={{ fontSize: ".82rem" }}>{p.descartada ? "No enviada" : "—"}</span>;
  if (p.resultado) return <><span className={`tag ${p.resultado === "seleccionado" ? "ok" : "no"}`}>{p.resultado === "seleccionado" ? "Seleccionado/a" : "No seleccionado/a"}</span><div className="mut" style={{ fontSize: ".78rem" }}>{fmt(p.resultado_at)}</div></>;
  async function registrar(r: "seleccionado" | "no seleccionado") {
    setEnProceso(true);
    try { await api.registrarResultado(p.id, r); const y = window.scrollY; await c.recargar(); window.scrollTo(0, y); c.aviso("Resultado registrado · avisamos a la Prosecretaría"); }
    catch (x) { c.aviso(mensajeError(x)); }
    setEnProceso(false);
  }
  return <div className="evalz"><button className="btn" type="button" disabled={enProceso} onClick={() => registrar("seleccionado")}>Seleccionado/a</button><button className="btn ghost" type="button" disabled={enProceso} onClick={() => registrar("no seleccionado")}>No seleccionado/a</button></div>;
}

const miOrg = (c: Ctx) => c.datos.organizaciones.find((o) => o.id === c.sesion?.ref) as Organizacion;

function PerfilCard({ e }: { e: Estudiante }) {
  const bd = e.brod;
  return (
    <div className="pv">
      <b>{e.nombre} {e.apellido}</b>
      <span>{e.carrera} · <span className="num">{e.avance}%</span> de avance · {edadDe(e.fnac)} años</span>
      <span>{e.avance_verificado ? <span className="tag ok">✔ Avance verificado con SIU Guaraní</span> : <span className="tag warn">Avance sin verificar</span>}</span>
      <span className="mut">{e.email}</span>
      {bd?.titular ? <span className="t">{bd.titular}</span> : null}
      <div className="chips">{bd?.riasec1 ? <span className="tag ia">{pNom(bd.riasec1)}</span> : null}{(bd?.competencias || []).map((x) => <span className="chip" key={x}>{x}</span>)}</div>
      <small className="mut">Perfil actualizado el {fmt(ultimaAct(e))}{perfilDesact(e) ? <> · <span className="tag no">Perfil desactualizado</span></> : null}</small>
    </div>
  );
}

/* ===== HU11 · Mis búsquedas y postulaciones: postulantes anónimos hasta el envío de la Prosecretaría ===== */
export function OrgBusquedas({ c }: { c: Ctx }) {
  const o = miOrg(c);
  const mine = c.datos.busquedas.filter((b) => b.organizacion_id === o.id);
  const cupo = (n: number) => (n <= 0 ? 0 : n <= 200 ? Math.max(1, Math.floor(n / 10)) : Math.floor(n * 0.07));
  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">{o.nombre}</span><h1>Mis búsquedas y postulaciones</h1>
        <p className="lead">Ves todas las postulaciones activas de tus búsquedas. Los datos de cada estudiante se habilitan cuando la Prosecretaría te envía los postulantes.</p>
        <div className="chips"><span className="chip num">CUIT {o.cuit}</span><span className="chip">{o.rubro}</span>
          {convenioVigente(o) ? <span className="tag ok">Convenio de pasantías vigente hasta {fmt(o.convenio_vence)}</span> : <span className="tag warn">Sin convenio de pasantías vigente</span>}
          <span className="chip num">Cupo de pasantes {vacantesUsadas(o, c.datos.busquedas)} de {cupo(o.empleados)}</span></div></section>
      {mine.length ? mine.map((b) => {
        const ps = c.datos.postulaciones.filter((p) => p.busqueda_id === b.id);
        const ok = ps.filter((p) => p.cumple_requisitos).length, env = ps.filter((p) => p.enviada).length;
        return (
          <section className="panel" style={{ display: "grid", gap: 10 }} key={b.id}>
            <div className="job-head"><div><div className="job-title">{b.titulo}</div><div className="job-org">Publicada el {fmt(b.created_at)} · {b.modalidad}</div></div><span className="tag acc num">{ps.length} {ps.length === 1 ? "postulación" : "postulaciones"}</span></div>
            <div className="chips"><span className="chip">{b.tipo === "pasantia" ? "Pasantía" : "Empleo"}</span><span className="chip">{b.carrera}</span><span className="chip num">Avance {b.avance_minimo}%</span><span className="tag ia">{pNom(b.area_riasec)}</span><span className="chip num">{ok} cumplen</span><span className="chip num">{env} enviadas por la Prosecretaría</span></div>
            {ps.length ? <div className="table-wrap"><table><thead><tr><th>Postulante</th><th>Fecha</th><th>Clasificación</th><th>Afinidad</th><th>Perfil del estudiante</th><th>Resultado</th></tr></thead><tbody>
              {ps.map((p, i) => {
                const e = c.datos.estudiantes.find((x) => x.id === p.estudiante_id);
                const a = c.datos.afinidades[p.id];
                return (
                  <tr key={p.id}><td className="nw"><strong>Postulante {i + 1}</strong></td><td className="num nw">{fmt(p.created_at)}</td>
                    <td className="nw">{p.cumple_requisitos ? <span className="tag ok">Cumple requisitos</span> : <span className="tag no">No cumple requisitos</span>}</td>
                    <td className="num nw">{a != null ? a + "%" : "—"}</td>
                    <td>{p.enviada && e ? <PerfilCard e={e} /> : <><span className="lock">🔒 Reservado</span><div className="mut" style={{ fontSize: ".82rem" }}>Disponible cuando la Prosecretaría envíe los postulantes.</div></>}</td><td><ResultadoCell c={c} p={p} /></td></tr>);
              })}
            </tbody></table></div> : <p className="empty">Todavía no hay postulaciones para esta búsqueda.</p>}
          </section>);
      }) : <p className="empty">Todavía no publicaste búsquedas. <button className="linkbtn" type="button" onClick={() => c.ir("org")}>Publicar la primera</button></p>}
      <p className="hint mut">La afinidad la calcula la base cruzando las competencias y el área buscadas con el test de BrOD de cada postulante, sin mostrarte su perfil. La Prosecretaría evalúa cada postulación y te envía las aprobadas: ahí ves el perfil completo. Cuando decidas, registrá el resultado: la Prosecretaría recibe el aviso.</p>
    </>
  );
}

/* ===== HU1 + HU7a · Nueva búsqueda: los datos se piden igual que los carga el estudiante ===== */
const vacio: FormBusqueda = { titulo: "", tipo: "pasantia", modalidad: "Presencial", area_riasec: "", area2: "", competencias: [], carrera: "", avance_minimo: "", horas_semanales: "", dias_semana: "5", duracion_meses: "", vacantes: "1", asignacion_estimulo: "", cct: "", tutor: "", cobertura_art: false, descripcion: "" };

export function NuevaBusqueda({ c }: { c: Ctx }) {
  const o = miOrg(c);
  const [f, setF] = useState<FormBusqueda>(vacio);
  const [err, setErr] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const pas = f.tipo === "pasantia";
  const usadas = vacantesUsadas(o, c.datos.busquedas);
  const ley = controlesLey(f, o, usadas);
  const okLey = ley.filter((x) => x.ok !== false).length;
  const set = <K extends keyof FormBusqueda>(k: K, v: FormBusqueda[K]) => setF({ ...f, [k]: v });
  const opt = (arr: string[], ph: string) => [<option key="" value="">{ph}</option>, ...arr.map((x) => <option key={x}>{x}</option>)];

  async function publicar(ev: FormEvent) {
    ev.preventDefault();
    const er = validarBusqueda(f, o, usadas);
    setErr(er);
    if (Object.keys(er).length) { if (er.general) window.scrollTo(0, 0); return; }
    setEnviando(true);
    try {
      const n = (k: keyof FormBusqueda) => Number(f[k]);
      await api.publicarBusqueda({
        organizacion_id: o.id, titulo: f.titulo.trim(), tipo: f.tipo, modalidad: f.modalidad, carrera: f.carrera, avance_minimo: n("avance_minimo"),
        area_riasec: f.area_riasec, area2: f.area2 || null, competencias: f.competencias,
        horas_semanales: n("horas_semanales"), vacantes: n("vacantes"),
        dias_semana: pas ? n("dias_semana") : null, duracion_meses: pas ? n("duracion_meses") : null,
        asignacion_estimulo: pas ? n("asignacion_estimulo") : null, cct: pas ? f.cct.trim() : null, tutor: pas ? f.tutor.trim() : null,
        cobertura_art: pas && f.cobertura_art, descripcion: f.descripcion.trim() || null,
      });
      await c.recargar();
      c.aviso("Búsqueda publicada · avisamos a la Prosecretaría");
      c.ir("orgBus");
    } catch (x) { setErr({ general: mensajeError(x) }); window.scrollTo(0, 0); }
    setEnviando(false);
  }

  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">{o.nombre}</span><h1>Nueva búsqueda</h1><p className="lead">Pedimos los requisitos con los mismos datos que carga el estudiante (SIU Guaraní y test de BrOD): así la plataforma los cruza y calcula quién cumple y la afinidad.</p></section>
      {err.general ? <Notice tipo="warn" role="alert"><span>{err.general}</span></Notice> : null}
      <form className="panel" id="busForm" onSubmit={publicar} noValidate>
        <h2>1 · El puesto</h2>
        <div className="form">
          <Field id="f-titulo" label="Título del puesto" err={err.titulo} full><input id="f-titulo" value={f.titulo} placeholder="Ej.: Pasante contable" onChange={(x) => set("titulo", x.target.value)} /></Field>
          <fieldset className="field"><legend>Tipo de búsqueda</legend><div className="radios">
            <label><input type="radio" name="tipo" checked={pas} onChange={() => set("tipo", "pasantia")} /> Pasantía educativa</label>
            <label><input type="radio" name="tipo" checked={!pas} onChange={() => set("tipo", "empleo")} /> Empleo</label></div></fieldset>
          <Field id="f-mod" label="Modalidad"><select id="f-mod" value={f.modalidad} onChange={(x) => set("modalidad", x.target.value)}>{MODALIDADES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field id="f-desc" label="Descripción de tareas" full><textarea id="f-desc" value={f.descripcion} onChange={(x) => set("descripcion", x.target.value)} /></Field>
        </div>
        <div className="cruce"><h2>2 · Requisitos académicos</h2><span className="tag acc">Se cruza con: datos académicos del estudiante (SIU Guaraní)</span></div>
        <div className="form">
          <Field id="f-carrera" label="Carrera" err={err.carrera}><select id="f-carrera" value={f.carrera} onChange={(x) => set("carrera", x.target.value)}>{opt(CARRERAS, "Elegí una carrera")}</select></Field>
          <Field id="f-avance" label="Avance mínimo (%)" err={err.avance_minimo} hint="Porcentaje de materias aprobadas según SIU Guaraní"><input id="f-avance" type="number" min={0} max={100} inputMode="numeric" value={f.avance_minimo} onChange={(x) => set("avance_minimo", x.target.value)} /></Field>
          {pas ? <p className="law full">En pasantías se controla además, con los datos del estudiante: alumno regular, mayor de 18 (por fecha de nacimiento) y sin otra pasantía vigente.</p> : null}
        </div>
        <div className="cruce"><h2>3 · Perfil buscado</h2><span className="tag ia">Se cruza con: test de BrOD del estudiante</span></div>
        <div className="form">
          <fieldset className={`field full${err.area_riasec ? " invalid" : ""}`}><legend>¿Qué perfil buscás?</legend>
            <div className="pcards">{RIASEC.map((x) => (
              <label className="pc" key={x}><input type="radio" name="area_riasec" checked={f.area_riasec === x} onChange={() => set("area_riasec", x)} /><b>{PERFIL[x][0]}</b><span>{PERFIL[x][1]}</span></label>))}</div>
            <Err msg={err.area_riasec} /></fieldset>
          <Field id="f-area2" label={<>Perfil complementario <small className="mut">(opcional)</small></>}><select id="f-area2" value={f.area2} onChange={(x) => set("area2", x.target.value)}><option value="">Ninguno</option>{RIASEC.map((x) => <option key={x} value={x}>{PERFIL[x][0]}</option>)}</select></Field>
          <fieldset className={`field full${err.competencias ? " invalid" : ""}`}><legend>Competencias buscadas (elegí entre 3 y 5 · misma lista que el estudiante)</legend>
            <div className="comp">{COMPETENCIAS.map((x) => <label key={x}><input type="checkbox" checked={f.competencias.includes(x)} onChange={() => set("competencias", f.competencias.includes(x) ? f.competencias.filter((y) => y !== x) : [...f.competencias, x])} /> {x}</label>)}</div><Err msg={err.competencias} /></fieldset>
        </div>
        <h2>4 · Condiciones</h2>
        <div className="form">
          <Field id="f-horas" label="Horas semanales" err={err.horas_semanales}><input id="f-horas" type="number" min={1} inputMode="numeric" value={f.horas_semanales} onChange={(x) => set("horas_semanales", x.target.value)} /></Field>
          <Field id="f-vac" label="Vacantes" err={err.vacantes}><input id="f-vac" type="number" min={1} inputMode="numeric" value={f.vacantes} onChange={(x) => set("vacantes", x.target.value)} /></Field>
          {pas ? <>
            <Field id="f-dias" label="Días por semana (lunes a viernes)" err={err.dias_semana}><input id="f-dias" type="number" min={1} max={5} inputMode="numeric" value={f.dias_semana} onChange={(x) => set("dias_semana", x.target.value)} /></Field>
            <Field id="f-dur" label="Duración (meses)" err={err.duracion_meses}><input id="f-dur" type="number" min={2} max={12} inputMode="numeric" value={f.duracion_meses} onChange={(x) => set("duracion_meses", x.target.value)} /></Field>
            <Field id="f-asig" label="Asignación estímulo mensual ($)" err={err.asignacion_estimulo}><input id="f-asig" type="number" min={1} inputMode="numeric" value={f.asignacion_estimulo} onChange={(x) => set("asignacion_estimulo", x.target.value)} /></Field>
            <Field id="f-cct" label="Convenio colectivo de referencia" err={err.cct}><input id="f-cct" value={f.cct} placeholder="Ej.: CCT 130/75 · Empleados de Comercio" onChange={(x) => set("cct", x.target.value)} /></Field>
            <Field id="f-tutor" label="Tutor/a de la organización" err={err.tutor} full><input id="f-tutor" value={f.tutor} placeholder="Nombre y cargo" onChange={(x) => set("tutor", x.target.value)} /></Field>
            <div className={`field full${err.cobertura_art ? " invalid" : ""}`}><div className="checks"><label><input type="checkbox" checked={f.cobertura_art} onChange={(x) => set("cobertura_art", x.target.checked)} /> El/la pasante tendrá cobertura de ART y obra social</label></div><Err msg={err.cobertura_art} /></div>
          </> : null}
        </div>
        {pas ? <div className="ley"><div className="sec-head"><h3>Controles de la Ley 26.427</h3><span className={`tag ${okLey === ley.length ? "ok" : "warn"} num`}>{okLey} de {ley.length}</span></div>
          <ul className="req">{ley.map((x) => <li key={x.txt}><span className={`mark ${x.ok === null ? "info" : x.ok ? "ok" : "no"}`} aria-hidden="true">{x.ok === null ? "ℹ" : x.ok ? "✔" : "✘"}</span><span><small className="mut">{x.grupo} · </small>{x.txt}</span></li>)}</ul></div> : null}
        <div className="actions"><button className="btn" type="submit" disabled={enviando}>{enviando ? "Publicando…" : "Publicar búsqueda"}</button><span className="hint" style={{ color: "var(--muted)", fontSize: ".85rem" }}>Al publicar, la Prosecretaría recibe un aviso por correo. La base vuelve a controlar la Ley 26.427.</span></div>
      </form>
    </>
  );
}
