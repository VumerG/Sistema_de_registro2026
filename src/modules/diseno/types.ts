/**
 * Tipos del tablero de diseños.
 *
 * Cada tarjeta se guarda como un registro de la tabla `records` con
 * `modulo = "diseno"`. Todo el detalle vive dentro de `content` (JSONB).
 */

export type EstadoDiseno =
  | "backlog"
  | "en_diseno"
  | "revision"
  | "aprobado";

export type PrioridadDiseno = "baja" | "media" | "alta" | "urgente";

export type AreaDiseno = "redes" | "motos" | "plastiqueria" | "registro";

/** Contenido JSONB de una tarjeta del tablero. */
export type Diseno = {
  version: 1;
  titulo: string;
  descripcion: string;
  estado: EstadoDiseno;
  prioridad: PrioridadDiseno;
  area: AreaDiseno;
  /** Identificador del integrante asignado; cadena vacía si no tiene. */
  responsable: string;
  etiquetas: string[];
  /** Enlace externo al diseño (Figma, Drive, etc.). */
  enlace: string | null;
  /** Imagen de portada comprimida como data URL. */
  portada: string | null;
  /** Fecha de entrega en formato YYYY-MM-DD. */
  fechaEntrega: string | null;
  /** Posición dentro de la columna; permite reordenar con drag and drop. */
  orden: number;
  actualizadoPor: string;
  actualizadoEn: string;
};

/** Tarjeta que devuelve la API, con los metadatos de la tabla. */
export type TareaDiseno = Diseno & {
  id: string;
  createdAt: string;
  autor: string;
};
