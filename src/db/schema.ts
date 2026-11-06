/**
 * Esquema único y compartido por todos los módulos.
 *
 * No agregues columnas específicas de un módulo: todo lo dinámico debe vivir
 * dentro de `content` en formato JSONB. El CHECK con `json_valid(content, 8)`
 * impide guardar texto JSON normal o datos que no sean JSONB.
 */
export const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY DEFAULT (
        lower(hex(randomblob(4))) || '-' ||
        lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))), 2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) ||
        substr(lower(hex(randomblob(2))), 2) || '-' ||
        lower(hex(randomblob(6)))
      ),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      autor TEXT NOT NULL,
      modulo TEXT NOT NULL,
      content BLOB NOT NULL CHECK (json_valid(content, 8))
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_records_modulo_fecha
      ON records (modulo, created_at DESC)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_records_autor
      ON records (autor)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_records_content_estado
      ON records (modulo, json_extract(content, '$.estado'))
  `,
] as const;
