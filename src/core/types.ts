/**
 * Tipos JSON compartidos por todos los módulos.
 *
 * `content` se guarda como JSONB en Turso y siempre se devuelve como un
 * objeto JavaScript ya parseado, nunca como string o Buffer.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

/** Registro tal como lo devuelve `ModuleRepository`. */
export interface StoredRecord<T extends JsonObject = JsonObject> {
  id: string;
  createdAt: string;
  autor: string;
  modulo: string;
  content: T;
}

/** Permite actualizar propiedades anidadas sin repetir todo el objeto. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends JsonObject ? DeepPartial<T[K]> : T[K];
};

/** Contexto obligatorio de cada repositorio de módulo. */
export interface ModuleContext {
  modulo: string;
  autor: string;
}
