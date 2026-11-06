import { closeDbClient, getDbClient } from "../src/db/client.js";
import { SCHEMA_STATEMENTS } from "../src/db/schema.js";

async function main(): Promise<void> {
  const client = getDbClient();

  try {
    for (const sql of SCHEMA_STATEMENTS) {
      await client.execute(sql);
    }

    const columns = await client.execute("PRAGMA table_info(records)");
    const indexes = await client.execute("PRAGMA index_list(records)");
    const table = await client.execute(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'records'",
    );

    const tableSql = String(table.rows[0]?.sql ?? "");
    const hasJsonbCheck = tableSql.includes("json_valid(content, 8)");
    const moduleIndexes = indexes.rows
      .map((row) => String(row.name))
      .filter((name) => name.startsWith("idx_records"));

    console.log("✅ Base de datos inicializada correctamente.");
    console.log(`   Tabla: records (${columns.rows.length} columnas)`);
    console.table(
      columns.rows.map((row) => ({
        columna: String(row.name),
        tipo: String(row.type),
        obligatorio: Number(row.notnull) === 1 ? "sí" : "no",
        default:
          row.name === "id"
            ? "UUID v4"
            : row.dflt_value === null
              ? "—"
              : String(row.dflt_value),
      })),
    );
    console.log(`   CHECK JSONB (json_valid): ${hasJsonbCheck ? "sí" : "no"}`);
    console.log(`   Índices: ${moduleIndexes.join(", ")}`);
  } finally {
    closeDbClient();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ No se pudo inicializar Turso: ${message}`);
  process.exitCode = 1;
});
