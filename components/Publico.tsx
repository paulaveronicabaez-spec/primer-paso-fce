"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Ctx } from "@/lib/ctx";
import type { Rol } from "@/lib/tipos";
import { CARRERAS, RUBROS, cuitOk, cupoPasantes, edadDe, emailValido, fmtCuit, mensajeError } from "@/lib/reglas";
import { I, POTENCIA } from "@/lib/contenido";
import * as api from "@/lib/api";
import { Err, Field, Icono, Notice, Stepper } from "./ui";

/* ===== P1 · Portada ===== */
export function Portada({ c }: { c: Ctx }) {
  const { datos, filtros } = c;
  const [q, setQ] = useState(filtros.q);
  const [pot, setPot] = useState<string | null>(null);
  const [palabra, setPalabra] = useState(0);
  const resultados = useRef<HTMLDivElement>(null);
  const palabras = ["oportunidad", "experiencia laboral", "búsqueda a medida"];
  const org = (id: string) => datos.organizaciones.find((o) => o.id === id);
  const pub = datos.busquedas.filter((b) => b.estado === "publicada");
  const nP = pub.filter((b) => b.tipo === "pasantia").length, nE = pub.length - nP;
  const list = useMemo(() => {
    const t = filtros.q.trim().toLowerCase();
    return pub.filter((b) => (!t || `${b.titulo} ${org(b.organizacion_id)?.nombre} ${b.descripcion} ${b.carrera}`.toLowerCase().includes(t)) && (!filtros.carrera || b.carrera === filtros.carrera) && (!filtros.tipo || b.tipo === filtros.tipo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, filtros]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setPalabra((p) => (p + 1) % palabras.length), 2600);
    return () => clearInterval(t);
  }, [palabras.length]);

  const aplicar = (f: typeof filtros) => {
    c.setFiltros(f);
    setTimeout(() => resultados.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const tick = pub.map((b) => (
    <span className="it" key={b.id}><span className="dot" /><b>{b.titulo}</b> · {org(b.organizacion_id)?.nombre} · {b.tipo === "pasantia" ? "Pasantía" : "Empleo"}</span>
  ));
  const abrir = (id: string) => (c.sesion?.rol === "est" ? c.ir("detalle", { busId: id }) : c.ir("login", { loginRol: "est", despuesDeIngresar: id }));
  const potSel = POTENCIA.find((p) => p.id === pot);

  return (
    <>
      <section className="hero3">
        <div className="photo" style={{ backgroundImage: "url('/hero.jpg')" }} role="img" aria-label="Estudiantes trabajando en equipo" />
        <div className="wrap">
          <h1>Encontrá tu primera <span className="rot swap" key={palabra}>{palabras[palabra]}</span></h1>
          <p className="sub">Todas las búsquedas para estudiantes de la FCE en un solo lugar. Sabé al instante si cumplís los requisitos y postulate con un clic.</p>
          <form className="bigsearch" role="search" onSubmit={(e) => { e.preventDefault(); aplicar({ ...filtros, q }); }}>
            <label className="q"><input type="search" placeholder="Puesto, organización o palabra clave" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Puesto, organización o palabra clave" /></label>
            <select aria-label="Carrera" value={filtros.carrera} onChange={(e) => aplicar({ ...filtros, q, carrera: e.target.value })}>
              <option value="">Todas las carreras</option>{CARRERAS.map((x) => <option key={x}>{x}</option>)}
            </select>
            <select aria-label="Tipo" value={filtros.tipo} onChange={(e) => aplicar({ ...filtros, q, tipo: e.target.value })}>
              <option value="">Pasantías y empleos</option><option value="pasantia">Pasantías</option><option value="empleo">Empleos</option>
            </select>
            <button className="btn" type="submit">Buscar búsquedas</button>
          </form>
          <div className="popular"><span>Más buscadas:</span>
            {[["contable", "Contable"], ["administración", "Administración"], ["económico", "Análisis económico"], ["part-time", "Part-time"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setQ(k); aplicar({ q: k, carrera: "", tipo: "" }); }}>{l}</button>
            ))}
          </div>
          <div className="statsrow">
            <div><b className="num">{datos.stats.busquedas}</b><span>búsquedas activas</span></div>
            <div><b className="num">{datos.stats.pasantias}</b><span>pasantías rentadas</span></div>
            <div><b className="num">{datos.stats.organizaciones}</b><span>organizaciones</span></div>
            <div><b className="num">{datos.stats.postulaciones}</b><span>postulaciones</span></div>
          </div>
        </div>
      </section>
      <div className="ticker" aria-label="Últimas búsquedas publicadas"><div className="track">{tick}<span aria-hidden="true" style={{ display: "contents" }}>{tick}</span></div></div>

      <section className="services"><div className="wrap">
        <h2>Explorá por tipo</h2>
        <div className="row">
          <button className="svc rise" type="button" aria-pressed={filtros.tipo === "pasantia"} onClick={() => aplicar({ ...filtros, tipo: filtros.tipo === "pasantia" ? "" : "pasantia" })}><Icono className="ico" svg={I.pas} /><b>Pasantías rentadas</b><span>{nP} abiertas · Ley 26.427</span></button>
          <button className="svc rise" type="button" aria-pressed={filtros.tipo === "empleo"} onClick={() => aplicar({ ...filtros, tipo: filtros.tipo === "empleo" ? "" : "empleo" })}><Icono className="ico y" svg={I.emp} /><b>Empleos part-time</b><span>{nE} abiertos</span></button>
          <button className="svc rise" type="button" onClick={() => c.ir("login", { loginRol: "est" })}><Icono className="ico g" svg={I.cum} /><b>¿Cumplo los requisitos?</b><span>Probalo con tu perfil</span></button>
          <button className="svc rise" type="button" onClick={() => c.ir("login", { loginRol: "est" })}><Icono className="ico p" svg={I.comp} /><b>Perfil de competencias</b><span>Con el test de BrOD</span></button>
        </div>
      </div></section>

      <div className="wrap landing" ref={resultados}>
        <div className="sec-head"><div><h2>Búsquedas recientes</h2>
          <p>{list.length} de {pub.length}{(filtros.q || filtros.carrera || filtros.tipo) ? <> · <button className="linkbtn" type="button" onClick={() => { setQ(""); c.setFiltros({ q: "", carrera: "", tipo: "" }); }}>Quitar filtros</button></> : null} · tocá una para ver si cumplís los requisitos</p></div></div>
        {list.length ? (
          <div className="cards">{list.map((b) => (
            <button key={b.id} className="pcard rise" type="button" onClick={() => abrir(b.id)}>
              <div className="top"><span className={`tag ${b.tipo === "pasantia" ? "acc" : "warn"}`}>{b.tipo === "pasantia" ? "Pasantía" : "Empleo"}</span><span className="num" style={{ color: "var(--muted)", fontSize: ".85rem" }}>{b.horas_semanales} h/sem</span></div>
              <div><div className="t">{b.titulo}</div><div className="o">{org(b.organizacion_id)?.nombre}</div></div>
              <div className="chips"><span className="chip">{b.carrera}</span><span className="chip num">Avance {b.avance_minimo}%</span>{b.duracion_meses ? <span className="chip num">{b.duracion_meses} meses</span> : null}</div>
              <span className="cta">¿Cumplo los requisitos? →</span>
            </button>))}
          </div>
        ) : <p className="empty">No hay búsquedas con esos filtros. Probá con otra carrera o tipo.</p>}

        <section className="services potencia" aria-labelledby="pot-h">
          <div className="sec-head"><div><h2 id="pot-h">Te ayudamos a potenciar tu perfil</h2><p>Programas de la FCE para sumar experiencia antes y durante tu primera búsqueda.</p></div></div>
          <div className="row">{POTENCIA.map((x) => (
            <button key={x.id} className="svc rise" type="button" aria-expanded={pot === x.id} onClick={() => setPot(pot === x.id ? null : x.id)}><Icono className={`ico ${x.c}`} svg={I[x.ico]} /><b>{x.t}</b><span>{x.s}</span></button>
          ))}</div>
          {potSel ? <div className="pot-det"><div><h3>{potSel.t}</h3><p>{potSel.d}</p></div><span className="soon">{potSel.estado}</span></div> : null}
        </section>
        <div className="cta-band"><div><h3>¿Tu organización busca talento de la FCE?</h3><p>Publicá una pasantía o un empleo y recibí postulaciones clasificadas según tus requisitos. El servicio es gratuito.</p></div><button className="btn" type="button" onClick={() => c.ir("login", { loginRol: "org" })}>Publicar una búsqueda</button></div>
        <div className="foot"><span>Prosecretaría de Inserción Laboral · FCE · UNLP · Prototipo con datos ficticios</span></div>
      </div>
    </>
  );
}

/* ===== HU11 · Ingreso: cada perfil entra por su propia puerta ===== */
const ROLES: Record<Rol, [string, string]> = { est: ["Estudiante", "Ingresá a tu cuenta"], org: ["Organización", "Ingresá como organización"], pro: ["Prosecretaría", "Ingreso de la Prosecretaría"] };
const DEMO: Record<Rol, [string, string][]> = {
  est: [["Sofía Pérez", "sofia@alumnos.fce.example"], ["Martín López", "martin@alumnos.fce.example"], ["Lucía Fernández", "lucia@alumnos.fce.example"], ["Tomás García", "tomas@alumnos.fce.example"]],
  org: [["Estudio Contable Ficticio SRL", "rrhh@estudioficticio.example"], ["Banco Imaginario SA", "seleccion@bancoimaginario.example"], ["Municipalidad de Villa Ejemplo", "empleo@villaejemplo.example"], ["Comercio Sin Convenio SA", "contacto@sinconvenio.example"]],
  pro: [["Prosecretaría de Inserción Laboral", "prosecretaria.insercion@fce.example"]],
};

export function Ingreso({ c }: { c: Ctx }) {
  const r = c.loginRol;
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [enviando, setEnviando] = useState(false);
  const bus = c.despuesDeIngresar ? c.datos.busquedas.find((b) => b.id === c.despuesDeIngresar) : null;

  async function enviar(e: FormEvent) {
    e.preventDefault(); setErr(""); setEnviando(true);
    try {
      const s = await api.ingresar(email, pass);
      if (!s) { await api.salir(); throw new Error("La cuenta no tiene un perfil asociado en Primer Paso FCE."); }
      if (s.rol !== r) {
        await api.salir();
        throw new Error(`Esta cuenta no es de ${ROLES[r][0].toLowerCase()}. Ingresá desde «${s.rol === "est" ? "Ingresar como estudiante" : s.rol === "org" ? "Organizaciones" : "Prosecretaría"}» en la barra superior.`);
      }
      let previo: string | null = null;
      if (s.rol === "est" && s.ref) {
        const d = await api.cargar("est");
        const yo = d.estudiantes.find((x) => x.id === s.ref);
        previo = yo?.ultimo_ingreso ?? null;
        await api.actualizarEstudiante(s.ref, { ultimo_ingreso: new Date().toISOString() });
      }
      await c.alIngresar(s, previo);
    } catch (x) { setErr(mensajeError(x)); setEnviando(false); }
  }

  return (
    <div className="auth">
      <section className="panel auth-card">
        <span className="eyebrow">{ROLES[r][0]}</span>
        <h1>{ROLES[r][1]}</h1>
        {bus && r === "est" ? <p className="lead">Ingresá para saber si cumplís los requisitos de <b>{bus.titulo}</b>.</p> : null}
        {err ? <Notice tipo="warn" role="alert"><span>{err}</span></Notice> : null}
        <form className="form1" onSubmit={enviar} noValidate>
          <Field id="l-email" label="Correo"><input id="l-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field id="l-pass" label="Contraseña"><input id="l-pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} /></Field>
          <div className="actions"><button className="btn" type="submit" disabled={enviando}>{enviando ? "Ingresando…" : "Ingresar"}</button></div>
        </form>
        {r === "org" ? (
          <div className="porque"><b>¿Por qué completar toda la búsqueda?</b>
            <p>Hoy no alcanza con saber cuántas materias aprobó un estudiante. Para encontrar a la persona indicada cruzamos su <b>perfil completo</b>:</p>
            <div className="tres"><span><i>📚</i>Avance académico<small>verificado con SIU Guaraní</small></span><span><i>🧩</i>Competencias<small>las que tu equipo necesita</small></span><span><i>🧭</i>Aptitud vocacional<small>según el test de BrOD</small></span></div>
            <p className="mut">Cuanto más completa tu búsqueda, más precisa es la sugerencia de postulantes que recibe la Prosecretaría.</p></div>) : null}
        {r === "est" ? <p className="alt">¿Primera vez? <button className="linkbtn" type="button" onClick={() => c.ir("regEst")}>Crear mi usuario</button></p>
          : r === "org" ? <p className="alt">¿Tu organización no tiene cuenta? <button className="linkbtn" type="button" onClick={() => c.ir("regOrg")}>Registrar mi organización</button></p>
            : <p className="alt">Las cuentas de la Prosecretaría se crean internamente: no hay registro abierto.</p>}
      </section>
      <aside className="panel demo"><span className="eyebrow">Cuentas de prueba</span><p>Contraseña de todas: <code>demo1234</code>. Tocá una para completar el ingreso.</p>
        <div className="demo-list">{DEMO[r].map(([n, m]) => (
          <button key={m} type="button" className="demo-u" onClick={() => { setEmail(m); setPass("demo1234"); }}><b>{n}</b><small>{m}</small></button>
        ))}</div>
        <p className="hint">Datos ficticios, cargados con el seed de Supabase.</p>
      </aside>
    </div>
  );
}

/* ===== HU9 · Registro del estudiante (paso 1 de 3) ===== */
export function RegistroEstudiante({ c }: { c: Ctx }) {
  const [f, setF] = useState({ nombre: "", apellido: "", dni: "", legajo: "", email: "", fnac: "", pass: "", pass2: "", consent: false, ddjj: false });
  const [err, setErr] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string; checked?: boolean; type?: string } }) => setF({ ...f, [k]: e.target.type === "checkbox" ? !!e.target.checked : e.target.value });

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const d = { ...f, nombre: f.nombre.trim(), apellido: f.apellido.trim(), dni: f.dni.replace(/\D/g, ""), legajo: f.legajo.trim(), email: f.email.trim().toLowerCase() };
    const e: Record<string, string> = {};
    if (!d.nombre) e.nombre = "Escribí tu nombre.";
    if (!d.apellido) e.apellido = "Escribí tu apellido.";
    if (!/^\d{7,8}$/.test(d.dni)) e.dni = "El DNI tiene 7 u 8 números.";
    if (!d.legajo) e.legajo = "Escribí tu número de legajo.";
    if (!emailValido(d.email)) e.email = "Escribí un correo válido.";
    const age = edadDe(d.fnac);
    if (!d.fnac) e.fnac = "Indicá tu fecha de nacimiento."; else if (age == null || age < 15 || age > 99) e.fnac = "Revisá la fecha de nacimiento.";
    if (d.pass.length < 8) e.pass = "La contraseña debe tener al menos 8 caracteres."; else if (d.pass !== d.pass2) e.pass2 = "Las contraseñas no coinciden.";
    if (!d.consent) e.consent = "Necesitamos tu consentimiento para crear la cuenta.";
    if (!d.ddjj) e.ddjj = "Confirmá la declaración jurada.";
    setEnviando(true);
    try {
      if (!e.dni || !e.legajo || !e.email) {
        const disp = await api.disponibles({ dni: e.dni ? undefined : d.dni, legajo: e.legajo ? undefined : d.legajo, email: e.email ? undefined : d.email });
        if (!e.dni && !disp.dni) e.dni = "Ya hay una cuenta con ese DNI.";
        if (!e.legajo && !disp.legajo) e.legajo = "Ya hay una cuenta con ese legajo.";
        if (!e.email && !disp.email) e.email = "Ya hay una cuenta con ese correo.";
      }
      if (Object.keys(e).length) { setErr(e); setEnviando(false); return; }
      const est = await api.registrarEstudiante({ nombre: d.nombre, apellido: d.apellido, dni: d.dni, legajo: d.legajo, email: d.email, fnac: d.fnac }, d.pass);
      c.aviso("Usuario creado · seguí con tus datos académicos");
      await c.alIngresar({ rol: "est", ref: est.id }, null);
    } catch (x) { setErr({ general: mensajeError(x) }); setEnviando(false); }
  }

  return (
    <>
      <section style={{ display: "grid", gap: 10 }}><span className="eyebrow">Estudiante · Crear mi usuario</span><h1>Creá tu cuenta</h1><Stepper paso={1} />
        <p className="lead">Después de este paso cargás tus datos académicos según SIU Guaraní y hacés el test de BrOD. Los tres pasos son obligatorios para empezar a postularte.</p></section>
      {err.general ? <Notice tipo="warn" role="alert"><span>{err.general}</span></Notice> : null}
      <form className="panel" onSubmit={enviar} noValidate>
        <div className="form">
          <Field id="r-nombre" label="Nombre" err={err.nombre}><input id="r-nombre" autoComplete="given-name" value={f.nombre} onChange={set("nombre")} /></Field>
          <Field id="r-apellido" label="Apellido" err={err.apellido}><input id="r-apellido" autoComplete="family-name" value={f.apellido} onChange={set("apellido")} /></Field>
          <Field id="r-dni" label="DNI" err={err.dni}><input id="r-dni" inputMode="numeric" placeholder="Sin puntos" value={f.dni} onChange={set("dni")} /></Field>
          <Field id="r-legajo" label="Legajo" err={err.legajo}><input id="r-legajo" placeholder="Ej.: 12345/6" value={f.legajo} onChange={set("legajo")} /></Field>
          <Field id="r-email" label="Correo" err={err.email} hint="Será tu usuario de ingreso."><input id="r-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} /></Field>
          <Field id="r-fnac" label="Fecha de nacimiento" err={err.fnac} hint="La edad se calcula sola para los requisitos de pasantías."><input id="r-fnac" type="date" value={f.fnac} onChange={set("fnac")} /></Field>
          <Field id="r-pass" label="Contraseña" err={err.pass} hint="Al menos 8 caracteres."><input id="r-pass" type="password" autoComplete="new-password" value={f.pass} onChange={set("pass")} /></Field>
          <Field id="r-pass2" label="Repetí la contraseña" err={err.pass2}><input id="r-pass2" type="password" autoComplete="new-password" value={f.pass2} onChange={set("pass2")} /></Field>
          <div className={`field full${err.consent ? " invalid" : ""}`}><div className="checks"><label><input type="checkbox" checked={f.consent} onChange={set("consent")} /> Acepto que la Prosecretaría use mis datos para gestionar mis postulaciones (Ley 25.326). Las organizaciones solo ven mi perfil cuando la Prosecretaría lo envía.</label></div><Err msg={err.consent} /></div>
          <div className={`field full${err.ddjj ? " invalid" : ""}`}><div className="checks"><label><input type="checkbox" checked={f.ddjj} onChange={set("ddjj")} /> Declaro bajo juramento que los datos que cargo son verdaderos.</label></div><Err msg={err.ddjj} /></div>
        </div>
        <div className="actions"><button className="btn" type="submit" disabled={enviando}>{enviando ? "Creando…" : "Crear mi usuario y seguir"}</button><button className="btn ghost" type="button" onClick={() => c.ir("login", { loginRol: "est" })}>Ya tengo cuenta</button></div>
      </form>
    </>
  );
}

/* ===== HU10 · Registro de la organización ===== */
export function RegistroOrganizacion({ c }: { c: Ctx }) {
  const [f, setF] = useState({ nombre: "", cuit: "", rubro: "", contacto: "", email: "", telefono: "", empleados: "", convenio: false, convenio_vence: "", pass: "", pass2: "", consent: false });
  const [err, setErr] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string; checked?: boolean; type?: string } }) => setF({ ...f, [k]: e.target.type === "checkbox" ? !!e.target.checked : e.target.value });
  const emp = Number(f.empleados);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const d = { ...f, nombre: f.nombre.trim(), contacto: f.contacto.trim(), email: f.email.trim().toLowerCase(), telefono: f.telefono.trim() };
    const e: Record<string, string> = {};
    if (!d.nombre) e.nombre = "Escribí la razón social.";
    if (!cuitOk(d.cuit)) e.cuit = "El CUIT no es válido: revisá los 11 números.";
    if (!d.rubro) e.rubro = "Elegí el rubro.";
    if (!d.contacto) e.contacto = "Indicá una persona de contacto.";
    if (d.telefono.replace(/\D/g, "").length < 8) e.telefono = "Indicá un teléfono con código de área.";
    if (!emailValido(d.email)) e.email = "Escribí un correo válido.";
    if (d.empleados === "" || !(Number(d.empleados) >= 0)) e.empleados = "Indicá la cantidad de personas en planta permanente.";
    if (d.convenio && !d.convenio_vence) e.convenio_vence = "Indicá hasta cuándo está vigente el convenio.";
    if (d.pass.length < 8) e.pass = "La contraseña debe tener al menos 8 caracteres."; else if (d.pass !== d.pass2) e.pass2 = "Las contraseñas no coinciden.";
    if (!d.consent) e.consent = "Aceptá las condiciones de uso para registrarte.";
    setEnviando(true);
    try {
      if (!e.cuit || !e.email) {
        const disp = await api.disponibles({ cuit: e.cuit ? undefined : fmtCuit(d.cuit), email: e.email ? undefined : d.email });
        if (!e.cuit && !disp.cuit) e.cuit = "Ya hay una organización registrada con ese CUIT.";
        if (!e.email && !disp.email) e.email = "Ya hay una cuenta con ese correo.";
      }
      if (Object.keys(e).length) { setErr(e); setEnviando(false); return; }
      const o = await api.registrarOrganizacion({ nombre: d.nombre, cuit: fmtCuit(d.cuit), rubro: d.rubro, contacto: d.contacto, email: d.email, telefono: d.telefono, empleados: Number(d.empleados), convenio: d.convenio, convenio_vence: d.convenio ? d.convenio_vence : null }, d.pass);
      c.aviso("Organización registrada · avisamos a la Prosecretaría");
      await c.alIngresar({ rol: "org", ref: o.id }, null);
    } catch (x) { setErr({ general: mensajeError(x) }); setEnviando(false); }
  }

  return (
    <>
      <section style={{ display: "grid", gap: 6 }}><span className="eyebrow">Organización · Registro</span><h1>Registrá tu organización</h1><p className="lead">Con tu usuario y contraseña vas a publicar búsquedas y seguir sus postulaciones. La Prosecretaría recibe un aviso de tu alta.</p></section>
      {err.general ? <Notice tipo="warn" role="alert"><span>{err.general}</span></Notice> : null}
      <form className="panel" onSubmit={enviar} noValidate>
        <div className="form">
          <Field id="o-nombre" label="Razón social" err={err.nombre} full><input id="o-nombre" autoComplete="organization" value={f.nombre} onChange={set("nombre")} /></Field>
          <Field id="o-cuit" label="CUIT" err={err.cuit}><input id="o-cuit" inputMode="numeric" placeholder="30-12345678-9" value={f.cuit} onChange={set("cuit")} /></Field>
          <Field id="o-rubro" label="Rubro" err={err.rubro}><select id="o-rubro" value={f.rubro} onChange={set("rubro")}><option value="">Elegí un rubro</option>{RUBROS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field id="o-contacto" label="Persona de contacto" err={err.contacto}><input id="o-contacto" autoComplete="name" value={f.contacto} onChange={set("contacto")} /></Field>
          <Field id="o-tel" label="Teléfono" err={err.telefono}><input id="o-tel" type="tel" autoComplete="tel" value={f.telefono} onChange={set("telefono")} /></Field>
          <Field id="o-email" label="Correo" err={err.email} hint="Será el usuario de ingreso de la organización." full><input id="o-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} /></Field>
          <Field id="o-emp" label="Personas en planta permanente" err={err.empleados} hint={f.empleados !== "" && emp >= 0 ? `Cupo de pasantes según la Ley 26.427: ${cupoPasantes(emp)}.` : "Define el cupo de pasantes (Ley 26.427)."}><input id="o-emp" type="number" min={0} inputMode="numeric" value={f.empleados} onChange={set("empleados")} /></Field>
          <div className="field"><div className="checks" style={{ paddingTop: 24 }}><label><input type="checkbox" checked={f.convenio} onChange={set("convenio")} /> Tenemos convenio de pasantías vigente con la FCE</label></div></div>
          {f.convenio ? <Field id="o-vence" label="Convenio vigente hasta" err={err.convenio_vence}><input id="o-vence" type="date" value={f.convenio_vence} onChange={set("convenio_vence")} /></Field> : null}
          <Field id="o-pass" label="Contraseña" err={err.pass} hint="Al menos 8 caracteres."><input id="o-pass" type="password" autoComplete="new-password" value={f.pass} onChange={set("pass")} /></Field>
          <Field id="o-pass2" label="Repetí la contraseña" err={err.pass2}><input id="o-pass2" type="password" autoComplete="new-password" value={f.pass2} onChange={set("pass2")} /></Field>
          <div className={`field full${err.consent ? " invalid" : ""}`}><div className="checks"><label><input type="checkbox" checked={f.consent} onChange={set("consent")} /> Acepto las condiciones de uso: los datos de los estudiantes solo se usan para esta búsqueda (Ley 25.326).</label></div><Err msg={err.consent} /></div>
        </div>
        {!f.convenio ? <p className="law">Sin convenio de pasantías vigente vas a poder publicar empleos, pero no pasantías (Ley 26.427).</p> : null}
        <div className="actions"><button className="btn" type="submit" disabled={enviando}>{enviando ? "Registrando…" : "Registrar mi organización"}</button><button className="btn ghost" type="button" onClick={() => c.ir("login", { loginRol: "org" })}>Ya tengo cuenta</button></div>
      </form>
    </>
  );
}
