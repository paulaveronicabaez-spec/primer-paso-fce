"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Ctx, Filtros, Vista } from "@/lib/ctx";
import type { Datos, Rol, Sesion } from "@/lib/tipos";
import { configurado } from "@/lib/supabase";
import { altaCompleta, mensajeError } from "@/lib/reglas";
import * as api from "@/lib/api";
import { Badge, Notice } from "./ui";
import { Ingreso, Portada, RegistroEstudiante, RegistroOrganizacion } from "./Publico";
import { Detalle, MisPostulaciones, Perfil, Postularme } from "./Estudiante";
import { NuevaBusqueda, OrgBusquedas } from "./Organizacion";
import { Correos, Evaluar, Organizaciones, Tablero, Verificar } from "./Prosecretaria";

const VACIO: Datos = { organizaciones: [], busquedas: [], estudiantes: [], postulaciones: [], correos: [], afinidades: {}, stats: { busquedas: 0, pasantias: 0, organizaciones: 0, postulaciones: 0 } };
const NECESITA: Partial<Record<Vista, Rol>> = { perfil: "est", busquedas: "est", detalle: "est", postulaciones: "est", org: "org", orgBus: "org", prosec: "pro", correos: "pro", evaluar: "pro", verif: "pro", orgs: "pro" };
const INICIO: Record<Rol, Vista> = { est: "busquedas", org: "orgBus", pro: "prosec" };
const NOV_KEY = "ppf-nov-desde";

export default function App() {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [vista, setVista] = useState<Vista>("inicio");
  const [loginRol, setLoginRol] = useState<Rol>("est");
  const [busId, setBusId] = useState<string | null>(null);
  const [despues, setDespues] = useState<string | null>(null);
  const [novDesde, setNovDesde] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ q: "", carrera: "", tipo: "" });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sesionRef = useRef<Sesion | null>(null);

  const aviso = useCallback((m: string) => {
    setToast(m);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(""), 2800);
  }, []);

  const recargar = useCallback(async () => {
    try { setDatos(await api.cargar(sesionRef.current?.rol ?? null)); setError(""); }
    catch (x) { setError(mensajeError(x)); }
  }, []);

  useEffect(() => {
    if (!configurado) { setCargando(false); return; }
    (async () => {
      try {
        const s = await api.sesionActual();
        sesionRef.current = s; setSesion(s);
        try { setNovDesde(sessionStorage.getItem(NOV_KEY)); } catch { /* sin almacenamiento */ }
        setDatos(await api.cargar(s?.rol ?? null));
        if (s) setVista(INICIO[s.rol]);
      } catch (x) { setError(mensajeError(x)); }
      setCargando(false);
    })();
  }, []);

  const ir: Ctx["ir"] = (v, extra) => {
    if (extra?.busId !== undefined) setBusId(extra.busId);
    if (extra?.loginRol) setLoginRol(extra.loginRol);
    if (extra?.despuesDeIngresar !== undefined) setDespues(extra.despuesDeIngresar);
    setVista(v);
    window.scrollTo(0, 0);
  };

  const alIngresar: Ctx["alIngresar"] = async (s, previo) => {
    sesionRef.current = s; setSesion(s);
    const nd = previo ?? null;
    setNovDesde(nd);
    try { if (nd) sessionStorage.setItem(NOV_KEY, nd); else sessionStorage.removeItem(NOV_KEY); } catch { /* sin almacenamiento */ }
    const d = await api.cargar(s.rol);
    setDatos(d);
    if (s.rol === "est" && despues) { const b = despues; setDespues(null); ir("detalle", { busId: b }); return; }
    ir(INICIO[s.rol]);
  };

  const salir = async () => {
    await api.salir();
    sesionRef.current = null; setSesion(null); setNovDesde(null);
    try { sessionStorage.removeItem(NOV_KEY); } catch { /* sin almacenamiento */ }
    setDatos(await api.cargar(null));
    ir("inicio");
    aviso("Sesión cerrada");
  };

  const c: Ctx = { datos, sesion, vista, loginRol, busId, despuesDeIngresar: despues, novDesde, filtros, ir, setFiltros, recargar, aviso, alIngresar, salir };

  // Vista efectiva: protege las vistas por perfil y obliga a completar el alta del estudiante
  let v: Vista = vista;
  const necesita = NECESITA[v];
  if (necesita && sesion?.rol !== necesita) v = "login";
  const yo = sesion?.rol === "est" ? datos.estudiantes.find((e) => e.id === sesion.ref) : undefined;
  const enAlta = !!yo && !altaCompleta(yo);
  if (enAlta) v = "perfil";
  const rolLogin: Rol = necesita && sesion?.rol !== necesita ? necesita : loginRol;
  const cLogin = { ...c, loginRol: rolLogin };

  // Pestañas por perfil
  let tabs: [Vista, React.ReactNode, Vista[]?][] = [];
  if (sesion?.rol === "est" && !enAlta) {
    const desde = novDesde ? new Date(novDesde) : null;
    const nov = desde && yo ? datos.busquedas.filter((b) => b.estado === "publicada" && new Date(b.created_at) > desde && !datos.postulaciones.some((p) => p.estudiante_id === yo.id && p.busqueda_id === b.id)).length : 0;
    tabs = [["busquedas", <>Postularme<Badge n={nov} /></>, ["detalle"]], ["postulaciones", "Mis postulaciones"], ["perfil", "Mi perfil"]];
  }
  if (sesion?.rol === "org") tabs = [["orgBus", "Mis búsquedas y postulaciones"], ["org", "Nueva búsqueda"]];
  if (sesion?.rol === "pro") tabs = [["prosec", "Tablero"], ["correos", <>Correos<Badge n={datos.correos.filter((m) => !m.leido).length} /></>], ["evaluar", <>Evaluar postulaciones<Badge n={datos.postulaciones.filter((p) => p.cumple_requisitos && !p.enviada && !p.descartada).length} /></>], ["verif", <>Verificar avance<Badge n={datos.estudiantes.filter((e) => e.academico_actualizado && !e.avance_verificado).length} /></>], ["orgs", "Organizaciones"]];

  const quien = sesion?.rol === "est" ? `Estudiante · ${yo?.nombre ?? ""}${enAlta ? " · completando el alta" : ""}` : sesion?.rol === "org" ? `Organización · ${datos.organizaciones.find((o) => o.id === sesion.ref)?.nombre ?? ""}` : sesion?.rol === "pro" ? "Prosecretaría" : "";

  return (
    <>
      <header className="topbar"><div className="in">
        <button className="brand" type="button" onClick={() => ir(sesion ? INICIO[sesion.rol] : "inicio")}>Primer Paso FCE <small>Prosecretaría de Inserción Laboral</small></button>
        <span className="spacer" />
        {sesion ? <><span className="who">{quien}</span><button className="tb-btn" type="button" onClick={salir}>Cerrar sesión</button></> : (
          <nav className="landnav" aria-label="Ingresar">
            <button className="ln-link" type="button" aria-current={v === "login" && rolLogin === "pro" ? "page" : undefined} onClick={() => ir("login", { loginRol: "pro", despuesDeIngresar: null })}>Prosecretaría</button>
            <button className="ln-ghost" type="button" aria-current={v === "login" && rolLogin === "org" ? "page" : undefined} onClick={() => ir("login", { loginRol: "org", despuesDeIngresar: null })}>Organizaciones: publicar búsqueda</button>
            <button className="ln-solid" type="button" aria-current={v === "login" && rolLogin === "est" ? "page" : undefined} onClick={() => ir("login", { loginRol: "est" })}>Ingresar como estudiante</button>
          </nav>)}
        {tabs.length ? <nav className="tabs">{tabs.map(([t, l, also]) => (
          <button key={t} className="tab" type="button" aria-current={v === t || (also || []).includes(v) ? "page" : undefined} onClick={() => ir(t)}>{l}</button>))}</nav> : null}
      </div></header>
      <main className={v === "inicio" ? "is-landing" : undefined}>
        {!configurado ? <Notice tipo="warn"><strong>Falta conectar Supabase.</strong><span>Cargá las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (en Vercel: Settings → Environment Variables) y volvé a desplegar.</span></Notice>
          : cargando ? <p className="empty">Cargando…</p>
            : <>
              {error ? <Notice tipo="warn" role="alert"><span>{error}</span></Notice> : null}
              {v === "inicio" && <Portada c={c} />}
              {v === "login" && <Ingreso key={rolLogin} c={cLogin} />}
              {v === "regEst" && <RegistroEstudiante c={c} />}
              {v === "regOrg" && <RegistroOrganizacion c={c} />}
              {v === "perfil" && yo && <Perfil key={yo.id + (enAlta ? "-alta" : "")} c={c} />}
              {v === "busquedas" && yo && <Postularme c={c} />}
              {v === "detalle" && yo && <Detalle key={busId ?? ""} c={c} />}
              {v === "postulaciones" && yo && <MisPostulaciones c={c} />}
              {v === "orgBus" && <OrgBusquedas c={c} />}
              {v === "org" && <NuevaBusqueda c={c} />}
              {v === "prosec" && <Tablero c={c} />}
              {v === "correos" && <Correos c={c} />}
              {v === "verif" && <Verificar c={c} />}
              {v === "evaluar" && <Evaluar c={c} />}
              {v === "orgs" && <Organizaciones c={c} />}
            </>}
      </main>
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </>
  );
}
