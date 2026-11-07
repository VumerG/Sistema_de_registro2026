import { AppError } from "../../core/app-error.js";
import {
  AREAS,
  EQUIPO,
  ESTADOS,
  LIMITE_DESCRIPCION,
  LIMITE_ENLACE,
  LIMITE_ETIQUETA,
  LIMITE_ETIQUETAS,
  LIMITE_PORTADA,
  LIMITE_PORTADA_BYTES,
  LIMITE_TITULO,
  PRIORIDADES,
  esMiembro,
} from "./config.js";
import type {
  AreaDiseno,
  EstadoDiseno,
  PrioridadDiseno,
} from "./types.js";

/** Datos normalizados que recibe el repositorio al crear un diseño. */
export type DatosCreacionDiseno = {
  titulo: string;
  descripcion: string;
  estado: EstadoDiseno;
  prioridad: PrioridadDiseno;
  area: AreaDiseno;
  responsable: string;
  etiquetas: string[];
  enlace: string | null;
  portada: string | null;
  fechaEntrega: string | null;
  orden?: number;
};

export type DatosActualizacionDiseno = Partial<DatosCreacionDiseno>;

const CLAVES_PERMITIDAS = new Set([
  "titulo",
  "descripcion",
  "estado",
  "prioridad",
  "area",
  "responsable",
  "etiquetas",
  "enlace",
  "portada",
  "fechaEntrega",
  "orden",
]);

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_IMAGEN = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

function leerObjeto(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AppError("Los datos del diseño deben ser un objeto JSON.");
  }

  return value as Record<string, unknown>;
}

function validarClaves(datos: Record<string, unknown>): void {
  for (const clave of Object.keys(datos)) {
    if (!CLAVES_PERMITIDAS.has(clave)) {
      throw new AppError(`El campo "${clave}" no está permitido.`);
    }
  }
}

function tiene(datos: Record<string, unknown>, clave: string): boolean {
  return Object.prototype.hasOwnProperty.call(datos, clave);
}

function leerTexto(
  value: unknown,
  campo: string,
  maximo: number,
  obligatorio: boolean,
  colapsarEspacios = true,
): string {
  if (value === undefined || value === null) {
    if (obligatorio) {
      throw new AppError(`El campo "${campo}" es obligatorio.`);
    }
    return "";
  }

  if (typeof value !== "string") {
    throw new AppError(`El campo "${campo}" debe ser texto.`);
  }

  let limpio = colapsarEspacios
    ? value.trim().replace(/\s+/g, " ")
    : value.trim();

  if (!limpio && obligatorio) {
    throw new AppError(`El campo "${campo}" no puede estar vacío.`);
  }

  if (limpio.length > maximo) {
    throw new AppError(
      `El campo "${campo}" no puede superar ${maximo} caracteres.`,
    );
  }

  return limpio;
}

function leerEnumerado<T extends string>(
  value: unknown,
  campo: string,
  opciones: readonly { id: T }[],
  defecto?: T,
): T {
  if (value === undefined || value === null || value === "") {
    if (defecto !== undefined) {
      return defecto;
    }
    throw new AppError(`El campo "${campo}" es obligatorio.`);
  }

  if (typeof value !== "string") {
    throw new AppError(`El campo "${campo}" no es válido.`);
  }

  const encontrado = opciones.find((opcion) => opcion.id === value);
  if (!encontrado) {
    throw new AppError(
      `El campo "${campo}" debe ser uno de: ${opciones
        .map((opcion) => opcion.id)
        .join(", ")}.`,
    );
  }

  return encontrado.id;
}

function leerResponsable(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    throw new AppError('El campo "responsable" no es válido.');
  }

  const limpio = value.trim();
  if (!limpio) {
    return "";
  }

  if (!esMiembro(limpio)) {
    throw new AppError(
      'El responsable debe ser un integrante del equipo o quedar sin asignar.',
    );
  }

  return limpio;
}

function leerEtiquetas(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AppError('El campo "etiquetas" debe ser un arreglo de textos.');
  }

  const resultado: string[] = [];
  const vistos = new Set<string>();

  for (const etiqueta of value) {
    if (typeof etiqueta !== "string") {
      throw new AppError("Cada etiqueta debe ser texto.");
    }

    const limpia = etiqueta.trim();
    if (!limpia) {
      continue;
    }

    if (limpia.length > LIMITE_ETIQUETA) {
      throw new AppError(
        `Cada etiqueta no puede superar ${LIMITE_ETIQUETA} caracteres.`,
      );
    }

    const clave = limpia.toLocaleLowerCase("es-MX");
    if (!vistos.has(clave)) {
      vistos.add(clave);
      resultado.push(limpia);
    }
  }

  if (resultado.length > LIMITE_ETIQUETAS) {
    throw new AppError(
      `Un diseño no puede tener más de ${LIMITE_ETIQUETAS} etiquetas.`,
    );
  }

  return resultado;
}

function leerEnlace(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError('El campo "enlace" debe ser una URL.');
  }

  const limpio = value.trim();
  if (!limpio) {
    return null;
  }

  if (limpio.length > LIMITE_ENLACE) {
    throw new AppError(
      `El enlace no puede superar ${LIMITE_ENLACE} caracteres.`,
    );
  }

  let url: URL;
  try {
    url = new URL(limpio);
  } catch {
    throw new AppError("El enlace no es una URL válida.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("El enlace debe comenzar con http:// o https://.");
  }

  return url.toString();
}

function tieneFirmaImagen(bytes: Buffer, tipo: string): boolean {
  if (tipo === "png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (tipo === "jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  return (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function leerPortada(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError('El campo "portada" debe ser una imagen.');
  }

  if (value.length > LIMITE_PORTADA) {
    throw new AppError(
      "La imagen de portada es demasiado grande. Usa una imagen más pequeña.",
    );
  }

  const coincidencia = PATRON_IMAGEN.exec(value);
  if (!coincidencia) {
    throw new AppError(
      "La portada debe ser una imagen PNG, JPG o WebP válida.",
    );
  }

  const tipo = coincidencia[1];
  const base64 = coincidencia[2];

  if (!tipo || !base64) {
    throw new AppError("La imagen de portada no es válida.");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    throw new AppError("La imagen de portada no es válida.");
  }

  if (bytes.length > LIMITE_PORTADA_BYTES) {
    throw new AppError(
      "La imagen de portada supera el tamaño máximo permitido.",
    );
  }

  if (!tieneFirmaImagen(bytes, tipo)) {
    throw new AppError(
      "La portada no parece ser una imagen real. Intenta con otro archivo.",
    );
  }

  return value;
}

function leerFechaEntrega(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError('El campo "fechaEntrega" debe ser una fecha.');
  }

  const limpia = value.trim();
  if (!PATRON_FECHA.test(limpia)) {
    throw new AppError(
      'La fecha de entrega debe tener el formato AAAA-MM-DD.',
    );
  }

  const fecha = new Date(`${limpia}T00:00:00.000Z`);
  if (
    Number.isNaN(fecha.getTime()) ||
    fecha.toISOString().slice(0, 10) !== limpia
  ) {
    throw new AppError("La fecha de entrega no existe en el calendario.");
  }

  return limpia;
}

function leerOrden(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AppError(
      'El campo "orden" debe ser un número mayor o igual a cero.',
    );
  }

  return value;
}

export function validarMiembro(id: string): string {
  const limpio = id.trim();

  if (!limpio) {
    throw new AppError("Selecciona un integrante para continuar.", 401);
  }

  if (!esMiembro(limpio)) {
    throw new AppError("El integrante no está autorizado.", 403);
  }

  return limpio;
}

export function validarCreacion(input: unknown): DatosCreacionDiseno {
  const datos = leerObjeto(input);
  validarClaves(datos);

  return {
    titulo: leerTexto(
      datos.titulo,
      "título",
      LIMITE_TITULO,
      true,
    ),
    descripcion: leerTexto(
      datos.descripcion,
      "descripción",
      LIMITE_DESCRIPCION,
      false,
      false,
    ),
    estado: leerEnumerado<EstadoDiseno>(
      datos.estado,
      "estado",
      ESTADOS,
      "backlog",
    ),
    prioridad: leerEnumerado<PrioridadDiseno>(
      datos.prioridad,
      "prioridad",
      PRIORIDADES,
      "media",
    ),
    area: leerEnumerado<AreaDiseno>(datos.area, "área", AREAS),
    responsable: leerResponsable(datos.responsable),
    etiquetas: leerEtiquetas(datos.etiquetas),
    enlace: leerEnlace(datos.enlace),
    portada: leerPortada(datos.portada),
    fechaEntrega: leerFechaEntrega(datos.fechaEntrega),
    orden: leerOrden(datos.orden),
  };
}

export function validarActualizacion(input: unknown): DatosActualizacionDiseno {
  const datos = leerObjeto(input);
  validarClaves(datos);

  const cambios: DatosActualizacionDiseno = {};

  if (tiene(datos, "titulo")) {
    cambios.titulo = leerTexto(
      datos.titulo,
      "título",
      LIMITE_TITULO,
      true,
    );
  }

  if (tiene(datos, "descripcion")) {
    cambios.descripcion = leerTexto(
      datos.descripcion,
      "descripción",
      LIMITE_DESCRIPCION,
      false,
      false,
    );
  }

  if (tiene(datos, "estado")) {
    cambios.estado = leerEnumerado<EstadoDiseno>(
      datos.estado,
      "estado",
      ESTADOS,
    );
  }

  if (tiene(datos, "prioridad")) {
    cambios.prioridad = leerEnumerado<PrioridadDiseno>(
      datos.prioridad,
      "prioridad",
      PRIORIDADES,
    );
  }

  if (tiene(datos, "area")) {
    cambios.area = leerEnumerado<AreaDiseno>(datos.area, "área", AREAS);
  }

  if (tiene(datos, "responsable")) {
    cambios.responsable = leerResponsable(datos.responsable);
  }

  if (tiene(datos, "etiquetas")) {
    cambios.etiquetas = leerEtiquetas(datos.etiquetas);
  }

  if (tiene(datos, "enlace")) {
    cambios.enlace = leerEnlace(datos.enlace);
  }

  if (tiene(datos, "portada")) {
    cambios.portada = leerPortada(datos.portada);
  }

  if (tiene(datos, "fechaEntrega")) {
    cambios.fechaEntrega = leerFechaEntrega(datos.fechaEntrega);
  }

  if (tiene(datos, "orden")) {
    cambios.orden = leerOrden(datos.orden);
  }

  if (Object.keys(cambios).length === 0) {
    throw new AppError("No se recibieron cambios para actualizar el diseño.");
  }

  return cambios;
}

/** Lista de integrantes válidos, útil para diagnósticos y pruebas. */
export const IDS_EQUIPO = EQUIPO.map((miembro) => miembro.id);
