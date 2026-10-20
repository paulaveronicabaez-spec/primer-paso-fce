export type Rol = "est" | "org" | "pro";
export type Carrera = "Contador Público" | "Lic. en Administración" | "Lic. en Economía";

export interface Organizacion {
  id: string;
  user_id: string | null;
  nombre: string;
  cuit: string;
  rubro: string;
  contacto: string;
  email: string;
  telefono: string;
  empleados: number;
  convenio: boolean;
  convenio_vence: string | null;
  created_at: string;
}

export interface Busqueda {
  id: string;
  organizacion_id: string;
  titulo: string;
  tipo: "pasantia" | "empleo";
  modalidad: string;
  carrera: string;
  area_riasec: string;
  area2: string | null;
  competencias: string[];
  avance_minimo: number;
  horas_semanales: number;
  dias_semana: number | null;
  duracion_meses: number | null;
  vacantes: number;
  asignacion_estimulo: number | null;
  cct: string | null;
  tutor: string | null;
  cobertura_art: boolean;
  descripcion: string | null;
  estado: "publicada" | "cerrada";
  created_at: string;
}

export interface Brod {
  etapa: string;
  riasec1: string;
  riasec2: string;
  enea: string;
  competencias: string[];
  titular: string;
  fecha?: string;
  carrera_ref?: string | null;
  avance_ref?: number | null;
}

export interface Estudiante {
  id: string;
  user_id: string | null;
  nombre: string;
  apellido: string;
  dni: string;
  legajo: string;
  email: string;
  fnac: string;
  carrera: string | null;
  avance: number | null;
  regular: boolean;
  pasantia_vigente: boolean;
  academico_actualizado: string | null;
  avance_verificado: boolean;
  verificado_at: string | null;
  ultimo_ingreso: string | null;
  brod: Brod | null;
}

export interface Postulacion {
  id: string;
  busqueda_id: string;
  estudiante_id: string;
  created_at: string;
  cumple_requisitos: boolean;
  motivos: string[];
  estado: "cumple requisitos" | "no cumple requisitos";
  enviada: boolean;
  enviada_at: string | null;
}

export interface Correo {
  id: string;
  fecha: string;
  para: string;
  asunto: string;
  cuerpo: string;
  leido: boolean;
}

export interface Estadisticas {
  busquedas: number;
  pasantias: number;
  organizaciones: number;
  postulaciones: number;
}

export interface Datos {
  organizaciones: Organizacion[];
  busquedas: Busqueda[];
  estudiantes: Estudiante[];
  postulaciones: Postulacion[];
  correos: Correo[];
  afinidades: Record<string, number>;   // postulacion_id → % (calculado en la base)
  stats: Estadisticas;
}

export interface Sesion {
  rol: Rol;
  ref: string | null;
}
