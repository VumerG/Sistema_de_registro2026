import type { Client, Row } from "@libsql/client";
import {
  assertJsonObject,
  assertJsonPrimitive,
  mergeJsonObjects,
  serializeJsonObject,
  toJsonPath,
} from "./json.js";
import type {
  DeepPartial,
  JsonObject,
  JsonPrimitive,
  ModuleContext,
  StoredRecord,
} from "./types.js";
import { getDbClient } from "../db/client.js";

export interface ModuleRepositoryOptions extends ModuleContext {
  /**
   * Solo se usa para pruebas o para inyectar un cliente alternativo.
   * En producción se omite y se reutiliza el cliente global de Turso.
   */
  client?: Client;
}

const SELECT_COLUMNS = `
  id,
  created_at AS createdAt,
  autor,
  modulo,
  json(content) AS content
`;

function parseContent<T extends JsonObject>(value: unknown): T {
  let text: string;

  if (typeof value === "string") {
    text = value;
  } else if (value instanceof ArrayBuffer) {
    text = new TextDecoder().decode(new Uint8Array(value));
  } else if (ArrayBuffer.isView(value)) {
    text = new TextDecoder().decode(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
    );
  } else {
    throw new Error("Turso devolvió content en un formato inesperado.");
  }

  const parsed: unknown = JSON.parse(text);
  assertJsonObject(parsed, "content");

  return parsed as T;
}

function rowToRecord<T extends JsonObject>(row: Row): StoredRecord<T> {
  const createdAt = row.createdAt ?? row.created_at;

  if (createdAt === null || createdAt === undefined) {
    throw new Error("El registro no tiene created_at.");
  }

  return {
    id: String(row.id),
    createdAt: String(createdAt),
    autor: String(row.autor),
    modulo: String(row.modulo),
    content: parseContent<T>(row.content),
  };
}

/**
 * Repositorio base para todos los módulos.
 *
 * - Aísla las lecturas por `modulo` para que cada módulo vea sus propios datos.
 * - Inyecta `modulo` y `autor` automáticamente al crear.
 * - Guarda `content` con `jsonb(?)` y lo devuelve parseado con `json(content)`.
 *
 * @example
 * const repo = new ModuleRepository<MiContenido>({
 *   modulo: "redes",
 *   autor: "Nombre Integrante",
 * });
 */
export class ModuleRepository<T extends JsonObject = JsonObject> {
  private readonly client: Client;
  readonly modulo: string;
  readonly autor: string;

  constructor({ modulo, autor, client = getDbClient() }: ModuleRepositoryOptions) {
    const normalizedModulo = modulo.trim();
    const normalizedAutor = autor.trim();

    if (!normalizedModulo) {
      throw new Error("El módulo del repositorio no puede estar vacío.");
    }

    if (!normalizedAutor) {
      throw new Error("El autor del repositorio no puede estar vacío.");
    }

    this.modulo = normalizedModulo;
    this.autor = normalizedAutor;
    this.client = client;
  }

  /**
   * Inserta un nuevo registro y devuelve el objeto completo ya parseado.
   * El UUID v4 lo genera Turso mediante el DEFAULT de la tabla.
   */
  async create(data: T): Promise<StoredRecord<T>> {
    assertJsonObject(data);
    const json = serializeJsonObject(data);

    const result = await this.client.execute({
      sql: `
        INSERT INTO records (autor, modulo, content)
        VALUES (?, ?, jsonb(?))
        RETURNING ${SELECT_COLUMNS}
      `,
      args: [this.autor, this.modulo, json],
    });

    const row = result.rows[0];

    if (!row) {
      throw new Error("Turso no devolvió el registro creado.");
    }

    return rowToRecord<T>(row);
  }

  /** Lista todos los registros del módulo, del más reciente al más antiguo. */
  async findAll(): Promise<StoredRecord<T>[]> {
    const result = await this.client.execute({
      sql: `
        SELECT ${SELECT_COLUMNS}
        FROM records
        WHERE modulo = ?
        ORDER BY created_at DESC, id DESC
      `,
      args: [this.modulo],
    });

    return result.rows.map((row) => rowToRecord<T>(row));
  }

  /** Busca un registro del módulo por UUID. Devuelve null si no existe. */
  async findById(id: string): Promise<StoredRecord<T> | null> {
    const result = await this.client.execute({
      sql: `
        SELECT ${SELECT_COLUMNS}
        FROM records
        WHERE id = ? AND modulo = ?
        LIMIT 1
      `,
      args: [id, this.modulo],
    });

    const row = result.rows[0];
    return row ? rowToRecord<T>(row) : null;
  }

  /**
   * Filtra por una propiedad interna de `content`.
   *
   * Admite rutas anidadas con puntos, por ejemplo:
   * `findByField("direccion.ciudad", "Guadalajara")`.
   *
   * Se devuelve un arreglo porque el campo no tiene que ser único.
   */
  async findByField(
    jsonKey: string,
    value: JsonPrimitive,
  ): Promise<StoredRecord<T>[]> {
    assertJsonPrimitive(value);
    const jsonPath = toJsonPath(jsonKey);

    const whereField =
      value === null
        ? "json_type(content, ?) = 'null'"
        : "json_extract(content, ?) = json_extract(json(?), '$')";

    const args: (string | number | boolean)[] =
      value === null
        ? [this.modulo, jsonPath]
        : [this.modulo, jsonPath, JSON.stringify(value)];

    const result = await this.client.execute({
      sql: `
        SELECT ${SELECT_COLUMNS}
        FROM records
        WHERE modulo = ?
          AND ${whereField}
        ORDER BY created_at DESC, id DESC
      `,
      args,
    });

    return result.rows.map((row) => rowToRecord<T>(row));
  }

  /**
   * Actualiza parcialmente `content` mediante un merge profundo.
   *
   * Los objetos anidados se combinan y las propiedades enviadas reemplazan su
   * valor anterior. Devuelve null si el registro no existe en este módulo.
   */
  async update(
    id: string,
    data: DeepPartial<T>,
  ): Promise<StoredRecord<T> | null> {
    assertJsonObject(data);

    const transaction = await this.client.transaction("write");

    try {
      const currentResult = await transaction.execute({
        sql: `
          SELECT ${SELECT_COLUMNS}
          FROM records
          WHERE id = ? AND modulo = ?
          LIMIT 1
        `,
        args: [id, this.modulo],
      });

      const currentRow = currentResult.rows[0];

      if (!currentRow) {
        await transaction.rollback();
        return null;
      }

      const current = rowToRecord<T>(currentRow);
      const merged = mergeJsonObjects(current.content, data);
      const serialized = serializeJsonObject(merged);

      const result = await transaction.execute({
        sql: `
          UPDATE records
          SET content = jsonb(?)
          WHERE id = ? AND modulo = ?
          RETURNING ${SELECT_COLUMNS}
        `,
        args: [serialized, id, this.modulo],
      });

      await transaction.commit();

      const row = result.rows[0];

      if (!row) {
        throw new Error("Turso no devolvió el registro actualizado.");
      }

      return rowToRecord<T>(row);
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // La transacción ya pudo haberse cerrado; conservamos el error original.
      }

      throw error;
    }
  }

  /** Elimina un registro del módulo. Devuelve true si existía. */
  async delete(id: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: `
        DELETE FROM records
        WHERE id = ? AND modulo = ?
        RETURNING id
      `,
      args: [id, this.modulo],
    });

    return result.rows.length > 0;
  }
}
