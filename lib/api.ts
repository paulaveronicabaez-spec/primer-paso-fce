import { supabase } from "./supabase";
import type { Busqueda, Correo, Datos, Estadisticas, Estudiante, Organizacion, Postulacion, Rol, Sesion } from "./tipos";

const sb = () => {
  if (!supabase) throw new Error("Falta configurar Supabase (variables de entorno).");
  return supabase;
};

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

const vacio: Estadisticas = { busquedas: 0, pasantias: 0, organizaciones: 0, postulaciones: 0 };

/** Carga lo que cada perfil puede ver. Las políticas RLS de Supabase filtran del lado de la base. */
export async function cargar(rol: Rol | null): Promise<Datos> {
  const c = sb();
  const [orgs, bus, stats] = await Promise.all([
    c.from("organizaciones").select("*").order("created_at", { ascending: false }),
    c.from("busquedas").select("*").order("created_at", { ascending: false }),
    c.rpc("estadisticas"),
  ]);
  const d: Datos = {
    organizaciones: check<Organizacion[]>(orgs),
    busquedas: check<Busqueda[]>(bus),
    estudiantes: [],
    postulaciones: [],
    correos: [],
    afinidades: {},
    stats: (check<Estadisticas>(stats) as Estadisticas) || vacio,
  };
  if (!rol) return d;
  const [est, pos] = await Promise.all([
    c.from("estudiantes").select("*"),
    c.from("postulaciones").select("*").order("created_at", { ascending: true }),
  ]);
  d.estudiantes = check<Estudiante[]>(est);
  d.postulaciones = check<Postulacion[]>(pos);
  const af = await c.rpc("afinidades");
  for (const x of check<{ postulacion_id: string; pct: number }[]>(af) || []) d.afinidades[x.postulacion_id] = x.pct;
  if (rol === "pro" || rol === "org") d.correos = check<Correo[]>(await c.from("correos").select("*").order("fecha", { ascending: false }));
  return d;
}

export async function sesionActual(): Promise<Sesion | null> {
  const c = sb();
  const { data } = await c.auth.getSession();
  if (!data.session) return null;
  const r = await c.rpc("mi_rol");
  return (check<Sesion | null>(r) as Sesion | null) || null;
}

export async function ingresar(email: string, password: string): Promise<Sesion | null> {
  const c = sb();
  const { error } = await c.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return sesionActual();
}

export async function salir() {
  await sb().auth.signOut();
}

export async function disponibles(p: { dni?: string; legajo?: string; cuit?: string; email?: string }) {
  const r = await sb().rpc("datos_disponibles", { p_dni: p.dni ?? null, p_legajo: p.legajo ?? null, p_cuit: p.cuit ?? null, p_email: p.email ?? null });
  return check<{ dni: boolean; legajo: boolean; cuit: boolean; email: boolean }>(r);
}

async function crearUsuario(email: string, password: string) {
  const c = sb();
  const { data, error } = await c.auth.signUp({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  if (!data.session) {
    // Sin sesión: el proyecto pide confirmar el correo. Para el prototipo hay que desactivar "Confirm email".
    throw new Error("Email not confirmed");
  }
  return data.user!.id;
}

export async function registrarEstudiante(d: { nombre: string; apellido: string; dni: string; legajo: string; email: string; fnac: string }, password: string) {
  const uid = await crearUsuario(d.email, password);
  const r = await sb().from("estudiantes").insert({ ...d, email: d.email.toLowerCase(), user_id: uid, ultimo_ingreso: new Date().toISOString() }).select().single();
  return check<Estudiante>(r);
}

export async function registrarOrganizacion(d: Omit<Organizacion, "id" | "user_id" | "created_at">, password: string) {
  const uid = await crearUsuario(d.email, password);
  const r = await sb().from("organizaciones").insert({ ...d, email: d.email.toLowerCase(), user_id: uid }).select().single();
  return check<Organizacion>(r);
}

export async function actualizarEstudiante(id: string, cambios: Partial<Estudiante>) {
  const r = await sb().from("estudiantes").update(cambios).eq("id", id).select().single();
  return check<Estudiante>(r);
}

export async function publicarBusqueda(b: Partial<Busqueda>) {
  const r = await sb().from("busquedas").insert(b).select().single();
  return check<Busqueda>(r);
}

/** La clasificación la calcula la base (función postular), no la pantalla. */
export async function postular(busquedaId: string) {
  const r = await sb().rpc("postular", { p_busqueda: busquedaId });
  return check<Postulacion>(r);
}

export async function marcarCorreosLeidos(para: string) {
  await sb().from("correos").update({ leido: true }).eq("leido", false).eq("para", para);
}

export async function enviarPostulacion(id: string) {
  const r = await sb().from("postulaciones").update({ enviada: true }).eq("id", id).select().single();
  return check<Postulacion>(r);
}

export async function descartarPostulacion(id: string, motivo: string) {
  const r = await sb().from("postulaciones").update({ descartada: true, motivo_descarte: motivo }).eq("id", id).select().single();
  return check<Postulacion>(r);
}

/** HU6: la organización (o la Prosecretaría) registra si el estudiante fue seleccionado. */
export async function registrarResultado(id: string, resultado: "seleccionado" | "no seleccionado") {
  const r = await sb().from("postulaciones").update({ resultado }).eq("id", id).select().single();
  return check<Postulacion>(r);
}

/** HU8: pide a la IA hasta 5 postulantes sugeridos (datos anónimos). Devuelve null si la IA no está disponible. */
export async function sugerirConIA(busqueda: Record<string, unknown>, candidatos: Record<string, unknown>[]) {
  const { data } = await sb().auth.getSession();
  const r = await fetch("/api/sugerir", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ busqueda, candidatos }) });
  if (!r.ok) return null;
  const j = (await r.json()) as { items?: { codigo: string; puntaje: number; motivo: string }[] };
  return j.items && j.items.length ? j.items : null;
}

export async function verificarAvance(estId: string) {
  return actualizarEstudiante(estId, { avance_verificado: true });
}
