import type { Brod, Busqueda, Estudiante, Organizacion, Postulacion } from "./tipos";

export const CARRERAS = ["Contador Público", "Lic. en Administración", "Lic. en Economía"];
export const RIASEC = ["Convencional", "Investigador", "Emprendedor", "Social", "Artístico", "Realista"];
/** Vocabulario simple para cada área del test (RIASEC). Se guarda el código del test para poder cruzar con el estudiante. */
export const PERFIL: Record<string, [string, string]> = {
  Convencional: ["Organizado y administrativo", "Orden, registros, normas y números"],
  Investigador: ["Analítico", "Datos, investigación y resolución de problemas"],
  Emprendedor: ["Negocios y liderazgo", "Gestión, ventas y toma de decisiones"],
  Social: ["Orientado a las personas", "Atención, enseñanza y trabajo con otros"],
  "Artístico": ["Creativo", "Diseño, comunicación e ideas nuevas"],
  Realista: ["Práctico y operativo", "Tareas concretas, herramientas y trabajo de campo"],
};
export const pNom = (c?: string | null) => (c && PERFIL[c] ? PERFIL[c][0] : c || "");
export const MOTIVOS_DESCARTE = ["Perfil no acorde a la búsqueda", "Ya se cubrieron las vacantes", "Supera el cupo de pasantes de la organización", "Avance sin verificar con SIU Guaraní"];
export const ENEA = ["1 · Perfeccionista", "2 · Ayudador", "3 · Triunfador", "4 · Individualista", "5 · Investigador", "6 · Leal", "7 · Entusiasta", "8 · Desafiador", "9 · Pacificador"];
export const ETAPAS = ["Definiendo mi camino", "Quiero cambiar de trabajo", "Busco nuevos horizontes", "Volviendo al mercado"];
export const COMPETENCIAS = ["Comunicación", "Trabajo en equipo", "Organización", "Pensamiento analítico", "Atención al detalle", "Adaptabilidad", "Resolución de problemas", "Orientación al cliente", "Liderazgo", "Creatividad"];
export const RUBROS = ["Servicios contables y profesionales", "Banca y finanzas", "Sector público", "Comercio", "Industria", "Tecnología", "Otro"];
export const BROD_URL = "https://brod-orientacion.netlify.app/";
export const PROSEC_MAIL = "prosecretaria.insercion@fce.example";

/* ===== Fechas ===== */
export const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-AR") : "—");
export const fmtHora = (d: string) =>
  new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
export function edadDe(fnac?: string | null): number | null {
  if (!fnac) return null;
  const n = new Date(fnac + "T00:00:00"), h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) a--;
  return a;
}
export const mesesDesde = (d?: string | null) => (d ? (Date.now() - new Date(d).getTime()) / (30.44 * 864e5) : Infinity);

/* ===== HU3 · Elegibilidad (la base la vuelve a calcular en postular()) ===== */
export interface Requisito { ok: boolean; txt: string; motivo: string }
export function evaluar(e: Estudiante, b: Busqueda) {
  const req: Requisito[] = [];
  req.push({ ok: e.carrera === b.carrera, txt: "Carrera: " + b.carrera, motivo: e.carrera ? "Es para " + b.carrera : "Cargá tu carrera en Mi perfil" });
  const falta = b.avance_minimo - (e.avance ?? 0);
  req.push({ ok: falta <= 0, txt: `Avance mínimo: ${b.avance_minimo}% de materias aprobadas`, motivo: `Te falta ${falta}% de avance (pide ${b.avance_minimo}%)` });
  if (b.tipo === "pasantia") {
    req.push({ ok: e.regular, txt: "Alumno regular de grado", motivo: "Requiere ser alumno regular" });
    req.push({ ok: (edadDe(e.fnac) ?? 0) >= 18, txt: "Mayor de 18 años", motivo: "Requiere ser mayor de 18" });
    req.push({ ok: !e.pasantia_vigente, txt: "Sin otra pasantía asignada", motivo: "Ya tenés una pasantía vigente" });
  }
  const motivos = req.filter((r) => !r.ok).map((r) => r.motivo);
  return { cumple: motivos.length === 0, motivos, req };
}

/* ===== Ley 26.427 · controles cruzados ===== */
// Res. Conj. 825/2009 y 338/2009: hasta 200 trabajadores, un pasante cada diez; más de 200, el 7 %.
// Criterio a validar con la Prosecretaría: con menos de diez trabajadores se admite un pasante.
export function cupoPasantes(empleados: number) {
  if (empleados <= 0) return 0;
  if (empleados <= 200) return Math.max(1, Math.floor(empleados / 10));
  return Math.floor(empleados * 0.07);
}
export const convenioVigente = (o: Organizacion) => o.convenio && (!o.convenio_vence || new Date(o.convenio_vence + "T23:59:59") >= new Date());
export function vacantesUsadas(o: Organizacion, busquedas: Busqueda[]) {
  return busquedas.filter((b) => b.organizacion_id === o.id && b.tipo === "pasantia" && b.estado === "publicada").reduce((s, b) => s + b.vacantes, 0);
}

export const MODALIDADES = ["Presencial", "Híbrida", "Remota"];
export interface FormBusqueda {
  titulo: string; tipo: "pasantia" | "empleo"; modalidad: string; area_riasec: string; area2: string; competencias: string[]; carrera: string; avance_minimo: string; horas_semanales: string;
  dias_semana: string; duracion_meses: string; vacantes: string; asignacion_estimulo: string; cct: string; tutor: string;
  cobertura_art: boolean; descripcion: string;
}
export interface Control { ok: boolean | null; grupo: "Organización" | "Búsqueda" | "Estudiante"; txt: string }

/** Lista de controles de la Ley 26.427 para mostrar en vivo al cargar una pasantía. */
export function controlesLey(f: FormBusqueda, o: Organizacion, usadas: number): Control[] {
  const h = Number(f.horas_semanales), d = Number(f.dias_semana), m = Number(f.duracion_meses), v = Number(f.vacantes || 1);
  const cupo = cupoPasantes(o.empleados);
  return [
    { grupo: "Organización", ok: convenioVigente(o), txt: o.convenio ? `Convenio de pasantías con la FCE vigente${o.convenio_vence ? " hasta el " + fmt(o.convenio_vence) : ""}` : "Convenio de pasantías con la FCE vigente" },
    { grupo: "Organización", ok: null, txt: `Cupo de pasantes según la planta (${o.empleados} personas): ${cupo}. Vacantes publicadas: ${usadas}${usadas + v > cupo ? ` + ${v} de esta búsqueda: supera el cupo` : ""}. Podés publicar igual; la Prosecretaría lo evalúa al enviar postulantes.` },
    { grupo: "Búsqueda", ok: h > 0 && h <= 20, txt: "Hasta 20 horas semanales" },
    { grupo: "Búsqueda", ok: d >= 1 && d <= 5 && h > 0 && h / d <= 6.5, txt: "De lunes a viernes, hasta 6 h 30 min por día" },
    { grupo: "Búsqueda", ok: m >= 2 && m <= 12, txt: "Duración de 2 a 12 meses" },
    { grupo: "Búsqueda", ok: Number(f.asignacion_estimulo) > 0 && f.cct.trim() !== "", txt: "Asignación estímulo y convenio colectivo de referencia" },
    { grupo: "Búsqueda", ok: f.tutor.trim() !== "", txt: "Tutor/a designado/a por la organización" },
    { grupo: "Búsqueda", ok: f.cobertura_art, txt: "Cobertura de ART y obra social para el/la pasante" },
    { grupo: "Estudiante", ok: true, txt: "Se controla al postularse: alumno regular, mayor de 18 y sin otra pasantía vigente" },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validarBusqueda(f: FormBusqueda, o: Organizacion, usadas: number) {
  const err: Record<string, string> = {};
  const n = (k: keyof FormBusqueda) => Number(f[k]);
  if (!f.titulo.trim()) err.titulo = "Escribí un título para la búsqueda.";
  if (!f.carrera) err.carrera = "Elegí la carrera.";
  if (f.avance_minimo === "" || isNaN(n("avance_minimo")) || n("avance_minimo") < 0 || n("avance_minimo") > 100) err.avance_minimo = "Indicá un porcentaje entre 0 y 100.";
  if (f.horas_semanales === "" || !(n("horas_semanales") > 0)) err.horas_semanales = "Indicá las horas semanales.";
  if (!f.area_riasec) err.area_riasec = "Elegí el perfil que buscás.";
  if (f.competencias.length < 3 || f.competencias.length > 5) err.competencias = "Elegí entre 3 y 5 competencias.";
  if (!(n("vacantes") >= 1)) err.vacantes = "Indicá al menos una vacante.";
  if (f.tipo === "pasantia") {
    if (!convenioVigente(o)) err.general = "Tu organización no tiene convenio de pasantías vigente con la FCE: no puede publicar pasantías (Ley 26.427). Podés publicar un empleo.";
    if (!err.horas_semanales && n("horas_semanales") > 20) err.horas_semanales = "Una pasantía puede tener hasta 20 horas semanales.";
    if (!(n("dias_semana") >= 1 && n("dias_semana") <= 5)) err.dias_semana = "Indicá de 1 a 5 días (lunes a viernes).";
    else if (!err.horas_semanales && n("horas_semanales") / n("dias_semana") > 6.5) err.dias_semana = "La jornada no puede superar 6 h 30 min por día: sumá días o bajá las horas.";
    if (!(n("duracion_meses") >= 2 && n("duracion_meses") <= 12)) err.duracion_meses = "Una pasantía dura entre 2 y 12 meses.";
    if (!(n("asignacion_estimulo") > 0)) err.asignacion_estimulo = "Indicá la asignación estímulo mensual.";
    if (!f.cct.trim()) err.cct = "Indicá el convenio colectivo de referencia.";
    if (!f.tutor.trim()) err.tutor = "Indicá quién será el/la tutor/a.";
    if (!f.cobertura_art) err.cobertura_art = "La pasantía requiere cobertura de ART y obra social.";
  }
  return err;
}

/* ===== HU9 / HU10 ===== */
export function cuitOk(c: string) {
  const d = c.replace(/\D/g, "");
  if (d.length !== 11) return false;
  const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let s = 0;
  for (let i = 0; i < 10; i++) s += w[i] * Number(d[i]);
  let v = 11 - (s % 11);
  if (v === 11) v = 0;
  if (v === 10) return false;
  return v === Number(d[10]);
}
export const fmtCuit = (c: string) => { const d = c.replace(/\D/g, ""); return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}` : c; };
export const emailValido = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());

/* ===== HU2' y HU7b' · perfil vigente ===== */
export const brodTiene = (b?: Brod | null) => !!(b && (b.riasec1 || b.etapa || (b.competencias || []).length));
export function brodAlerta(e: Estudiante): string[] | null {
  const b = e.brod;
  if (!b || !brodTiene(b)) return null;
  const r: string[] = [];
  if (mesesDesde(b.fecha) >= 6) r.push(`pasaron más de 6 meses desde tu último test (${fmt(b.fecha)})`);
  if (b.carrera_ref && e.carrera && b.carrera_ref !== e.carrera) r.push("cambiaste de carrera");
  if (b.avance_ref != null && e.avance != null && e.avance - b.avance_ref >= 25) r.push(`tu avance subió ${e.avance - b.avance_ref} puntos`);
  return r.length ? r : null;
}
function ultimoTurno() {
  const h = new Date(), y = h.getFullYear();
  return [new Date(y, 11, 1), new Date(y, 7, 1), new Date(y, 2, 1), new Date(y - 1, 11, 1)].find((d) => d <= h)!;
}
export function academicoPendiente(e: Estudiante): string | null {
  if (!e.academico_actualizado) return null;
  const t = ultimoTurno();
  return new Date(e.academico_actualizado) < t ? ["marzo", "agosto", "diciembre"][[2, 7, 11].indexOf(t.getMonth())] : null;
}
export function ultimaAct(e: Estudiante) {
  const a = [e.academico_actualizado, e.brod?.fecha].filter(Boolean) as string[];
  return a.sort()[a.length - 1];
}
export const perfilDesact = (e: Estudiante) => mesesDesde(e.academico_actualizado) >= 6 || (brodTiene(e.brod) && mesesDesde(e.brod?.fecha) >= 6);
export function perfilScore(carrera: string | null, avance: number | string | null, b: Brod | null) {
  const bd = b || ({} as Partial<Brod>);
  const parts = [!!carrera, avance !== "" && avance != null, !!bd.etapa, !!bd.riasec1, (bd.competencias || []).length >= 3, !!bd.titular];
  return Math.round((100 * parts.filter(Boolean).length) / parts.length);
}

/** Convierte los errores de la base en mensajes para la persona (los de la base empiezan con un código). */
export function mensajeError(e: unknown): string {
  const msg = (e as { message?: string })?.message || String(e);
  const m = msg.match(/^[A-Z0-9_]+: ([\s\S]*)$/);
  if (m) return m[1];
  if (/duplicate key/i.test(msg)) return "Ese dato ya está registrado.";
  if (/row-level security/i.test(msg)) return "No tenés permiso para esta acción.";
  if (/pasantia_ley_26427/.test(msg)) return "La pasantía no cumple los controles de la Ley 26.427.";
  if (/User already registered/i.test(msg)) return "Ya hay una cuenta con ese correo.";
  if (/Invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
  if (/rate limit/i.test(msg)) return "Supabase frenó el alta porque intentó mandar un correo de confirmación. Hay que desactivar \"Confirm email\" en Supabase (Authentication → Sign In / Providers → Email) y volver a intentar.";
  if (/Email not confirmed/i.test(msg)) return "La cuenta no está confirmada. En Supabase hay que desactivar \"Confirm email\".";
  return msg;
}

/** El alta del estudiante está completa cuando cargó datos académicos y el test de BrOD (obligatorio). */
export const altaCompleta = (e: Estudiante) => !!e.carrera && e.avance != null && !!e.brod?.riasec1 && !!e.brod?.etapa && (e.brod?.competencias || []).length >= 3 && !!e.brod?.titular;

/** Afinidad por competencias (base del spike de HU8): misma lista común de ambos lados. No cambia la elegibilidad. */
export function afinidad(e: Estudiante | undefined, b: Busqueda) {
  if (!e?.brod || !b.competencias?.length) return null;
  const ec = e.brod.competencias || [];
  const comunes = b.competencias.filter((c) => ec.includes(c));
  const area = !!b.area_riasec && (e.brod.riasec1 === b.area_riasec || e.brod.riasec2 === b.area_riasec);
  const pct = Math.round(100 * ((0.8 * comunes.length) / b.competencias.length + (area ? 0.2 : 0)));
  return { pct, comunes, faltan: b.competencias.filter((c) => !ec.includes(c)), area };
}

/* ===== Seguimiento de cada búsqueda (tablero de la Prosecretaría) ===== */
export const ESTADOS_BUSQUEDA: [string, string, string][] = [
  ["sinpost", "Sin postulaciones", "no"],
  ["pendiente", "Pendiente de envío de postulaciones", "warn"],
  ["enviada", "Con envío · esperando selección", "acc"],
  ["seleccion", "Con estudiante seleccionado", "ok"],
  ["sinsel", "Sin selección", "no"],
];
export function estadoBusqueda(b: Busqueda, ps: Postulacion[]) {
  const mias = ps.filter((p) => p.busqueda_id === b.id);
  const pend = mias.filter((p) => p.cumple_requisitos && !p.enviada && !p.descartada).length;
  const env = mias.filter((p) => p.enviada);
  const sel = env.filter((p) => p.resultado === "seleccionado").length;
  const sinRes = env.filter((p) => !p.resultado).length;
  const k = sel ? "seleccion" : sinRes ? "enviada" : pend ? "pendiente" : mias.length ? "sinsel" : "sinpost";
  return { k, ps: mias.length, pend, env: env.length, sel, sinRes };
}

/* ===== HU8 · Sugerencia de hasta 5 postulantes (respaldo por reglas cuando la IA no está disponible) ===== */
export interface Sugerencia { pid: string; puntaje: number; motivo: string }
export function rankingReglas(b: Busqueda, cands: Postulacion[], estudiantes: Estudiante[]): Sugerencia[] {
  return cands.map((p) => {
    const e = estudiantes.find((x) => x.id === p.estudiante_id);
    const a = afinidad(e, b) || { pct: 0, comunes: [] as string[], area: false };
    const score = Math.round(a.pct * 0.7 + (e?.avance_verificado ? 15 : 0) + Math.min(15, ((e?.avance ?? 0) - b.avance_minimo) / 2));
    const r: string[] = [];
    if (a.comunes.length) r.push(`tiene ${a.comunes.length} de ${b.competencias.length} competencias buscadas (${a.comunes.join(", ")})`);
    if (a.area) r.push("su perfil coincide con el buscado");
    r.push(e?.avance_verificado ? "avance verificado con SIU Guaraní" : "avance aún sin verificar");
    return { pid: p.id, puntaje: Math.max(0, Math.min(100, score)), motivo: r.join("; ") + "." };
  }).sort((x, y) => y.puntaje - x.puntaje).slice(0, 5);
}
