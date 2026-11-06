import type { JsonObject, JsonPrimitive } from "./types.js";

const JSON_PATH_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/**
 * Convierte `direccion.ciudad` en `$.direccion.ciudad`.
 *
 * Solo se aceptan claves simples separadas por puntos para evitar que un
 * valor externo se convierta en SQL/path injection.
 */
export function toJsonPath(jsonKey: string): string {
  if (!JSON_PATH_PATTERN.test(jsonKey)) {
    throw new Error(
      `La clave JSON "${jsonKey}" no es válida. Usa letras, números y guiones bajos, separando niveles con puntos (ej. "perfil.ciudad").`,
    );
  }

  return `$.${jsonKey}`;
}

export function isPlainJsonObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function assertJsonObject(value: unknown, label = "data"): asserts value is JsonObject {
  if (!isPlainJsonObject(value)) {
    throw new Error(`${label} debe ser un objeto JSON (no un arreglo, null o una instancia de clase).`);
  }
}

export function assertJsonPrimitive(
  value: unknown,
): asserts value is JsonPrimitive {
  const isValid =
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));

  if (!isValid) {
    throw new Error(
      "findByField() solo admite valores primitivos JSON: string, number, boolean o null.",
    );
  }
}

/**
 * Serializa y valida que el contenido se pueda convertir realmente a JSON.
 * Evita guardar `undefined`, BigInt, funciones o referencias circulares.
 */
export function serializeJsonObject(data: JsonObject): string {
  try {
    const serialized = JSON.stringify(data);

    if (serialized === undefined) {
      throw new Error("el objeto no se pudo serializar");
    }

    return serialized;
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(`content debe ser JSON serializable${detail}`);
  }
}

/**
 * Merge profundo de objetos JSON. Los objetos se combinan; los arreglos y
 * valores primitivos se reemplazan por completo.
 */
export function mergeJsonObjects<T extends JsonObject>(
  current: T,
  patch: JsonObject,
): T {
  const result: JsonObject = { ...current };

  for (const [key, patchValue] of Object.entries(patch)) {
    const currentValue = result[key];

    if (isPlainJsonObject(currentValue) && isPlainJsonObject(patchValue)) {
      result[key] = mergeJsonObjects(currentValue, patchValue);
    } else {
      result[key] = patchValue;
    }
  }

  return result as T;
}
