import type {
  AreaDiseno,
  EstadoDiseno,
  PrioridadDiseno,
} from "./types.js";

/** Valor de `modulo` para todos los registros del tablero. */
export const MODULO_DISENO = "diseno";

/** Límites compartidos por la validación del servidor y la interfaz. */
export const LIMITE_TITULO = 120;
export const LIMITE_DESCRIPCION = 4000;
export const LIMITE_ETIQUETAS = 8;
export const LIMITE_ETIQUETA = 30;
export const LIMITE_ENLACE = 2000;
/** Caracteres máximos del data URL de la portada. */
export const LIMITE_PORTADA = 1_900_000;
/** Bytes máximos de la imagen ya decodificada. */
export const LIMITE_PORTADA_BYTES = 1_500_000;

export type DefinicionEstado = {
  id: EstadoDiseno;
  etiqueta: string;
  color: string;
};

export const ESTADOS: readonly DefinicionEstado[] = [
  { id: "backlog", etiqueta: "Backlog", color: "#64748b" },
  { id: "en_diseno", etiqueta: "En diseño", color: "#2563eb" },
  { id: "revision", etiqueta: "En revisión", color: "#d97706" },
  { id: "aprobado", etiqueta: "Aprobado", color: "#059669" },
] as const;

export type DefinicionPrioridad = {
  id: PrioridadDiseno;
  etiqueta: string;
  color: string;
};

export const PRIORIDADES: readonly DefinicionPrioridad[] = [
  { id: "baja", etiqueta: "Baja", color: "#0f766e" },
  { id: "media", etiqueta: "Media", color: "#2563eb" },
  { id: "alta", etiqueta: "Alta", color: "#ea580c" },
  { id: "urgente", etiqueta: "Urgente", color: "#dc2626" },
] as const;

export type DefinicionArea = {
  id: AreaDiseno;
  etiqueta: string;
  color: string;
};

export const AREAS: readonly DefinicionArea[] = [
  { id: "redes", etiqueta: "Redes", color: "#0891b2" },
  { id: "motos", etiqueta: "Motos", color: "#ea580c" },
  { id: "plastiqueria", etiqueta: "Plastiquería", color: "#16a34a" },
  { id: "comics", etiqueta: "Cómics", color: "#e11d48" },
  { id: "registro", etiqueta: "Registro", color: "#7c3aed" },
] as const;

export type MiembroEquipo = {
  id: string;
  nombre: string;
  rol: "Líder" | "Colaborador";
  color: string;
};

/**
 * Identidad usada en la columna `autor` y en el encabezado X-Team-Member.
 * No es autenticación real: es el selector de integrante de esta primera
 * versión. Los IDs coinciden con las cuentas de GitHub del equipo.
 */
export const EQUIPO: readonly MiembroEquipo[] = [
  {
    id: "VumerG",
    nombre: "Vumer Gallardo",
    rol: "Líder",
    color: "#7c3aed",
  },
  {
    id: "Jefte2004",
    nombre: "Jefte Cervera",
    rol: "Colaborador",
    color: "#0891b2",
  },
  {
    id: "ManuelEsteban12",
    nombre: "Manuel Esteban",
    rol: "Colaborador",
    color: "#ea580c",
  },
  {
    id: "quetzedwin-wq",
    nombre: "Edwin",
    rol: "Colaborador",
    color: "#16a34a",
  },
  {
    id: "elian",
    nombre: "Elian",
    rol: "Colaborador",
    color: "#e11d48",
  },
] as const;

export function buscarMiembro(id: string): MiembroEquipo | undefined {
  const normalizado = id.trim().toLowerCase();
  return EQUIPO.find(
    (miembro) =>
      miembro.id.toLowerCase() === normalizado ||
      miembro.nombre.toLowerCase() === normalizado,
  );
}

export function esMiembro(id: string): boolean {
  return buscarMiembro(id) !== undefined;
}

/** Valor del filtro para las tarjetas sin responsable. */
export const FILTRO_SIN_ASIGNAR = "sin_asignar";
