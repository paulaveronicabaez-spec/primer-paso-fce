import type { Datos, Rol, Sesion } from "./tipos";

export type Vista =
  | "inicio" | "login" | "regEst" | "regOrg"
  | "perfil" | "busquedas" | "detalle" | "postulaciones"
  | "orgBus" | "org"
  | "prosec" | "correos" | "verif" | "orgs";

export interface Filtros { q: string; carrera: string; tipo: string }

export interface Ctx {
  datos: Datos;
  sesion: Sesion | null;
  vista: Vista;
  loginRol: Rol;
  busId: string | null;
  despuesDeIngresar: string | null;   // búsqueda a abrir después del ingreso del estudiante
  novDesde: string | null;            // HU13: último ingreso anterior
  filtros: Filtros;
  ir: (v: Vista, extra?: { busId?: string | null; loginRol?: Rol; despuesDeIngresar?: string | null }) => void;
  setFiltros: (f: Filtros) => void;
  recargar: () => Promise<void>;
  aviso: (msg: string) => void;
  alIngresar: (s: Sesion, novDesde?: string | null) => Promise<void>;
  salir: () => Promise<void>;
}
