import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createClient, type Client } from "@libsql/client";
import { SCHEMA_STATEMENTS } from "../src/db/schema.js";
import { ModuleRepository } from "../src/core/module-repository.js";

type ContenidoPrueba = {
  nombre: string;
  perfil: {
    ciudad: string;
    activo: boolean;
    nivel: number;
  };
  etiquetas: string[];
  nota: string | null;
};

const contenidoBase: ContenidoPrueba = {
  nombre: "Ana",
  perfil: {
    ciudad: "Guadalajara",
    activo: true,
    nivel: 3,
  },
  etiquetas: ["nuevo", "beca"],
  nota: null,
};

async function setup(
  t: TestContext,
  modulo = "redes",
  autor = "Ana",
): Promise<{ client: Client; repo: ModuleRepository<ContenidoPrueba> }> {
  const client = createClient({ url: ":memory:" });
  t.after(() => client.close());

  for (const sql of SCHEMA_STATEMENTS) {
    await client.execute(sql);
  }

  return {
    client,
    repo: new ModuleRepository<ContenidoPrueba>({ modulo, autor, client }),
  };
}

test("create guarda JSONB, inyecta metadatos y devuelve content parseado", async (t) => {
  const { client, repo } = await setup(t, "redes", "Ana");

  const creado = await repo.create(contenidoBase);

  assert.match(
    creado.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.equal(creado.autor, "Ana");
  assert.equal(creado.modulo, "redes");
  assert.equal(typeof creado.createdAt, "string");
  assert.deepEqual(creado.content, contenidoBase);
  assert.equal(typeof creado.content, "object");

  const raw = await client.execute({
    sql: "SELECT typeof(content) AS tipo FROM records WHERE id = ?",
    args: [creado.id],
  });

  assert.equal(raw.rows[0]?.tipo, "blob");
});

test("las consultas quedan aisladas por módulo en la tabla compartida", async (t) => {
  const client = createClient({ url: ":memory:" });
  t.after(() => client.close());

  for (const sql of SCHEMA_STATEMENTS) {
    await client.execute(sql);
  }

  const redes = new ModuleRepository<ContenidoPrueba>({
    modulo: "redes",
    autor: "Ana",
    client,
  });
  const motos = new ModuleRepository<ContenidoPrueba>({
    modulo: "motos",
    autor: "Luis",
    client,
  });

  const dispositivo = await redes.create(contenidoBase);
  await redes.create({ ...contenidoBase, nombre: "Switch de acceso" });
  const moto = await motos.create({ ...contenidoBase, nombre: "Moto 001" });

  const total = await client.execute("SELECT COUNT(*) AS total FROM records");
  assert.equal(total.rows[0]?.total, 3);

  assert.equal((await redes.findAll()).length, 2);
  assert.equal((await motos.findAll()).length, 1);
  assert.equal(await motos.findById(dispositivo.id), null);
  assert.equal(
    await motos.update(dispositivo.id, { nombre: "Intruso" }),
    null,
  );
  assert.equal(await motos.delete(dispositivo.id), false);

  assert.equal(await redes.delete(moto.id), false);
  assert.equal(await redes.delete(dispositivo.id), true);
  assert.equal((await redes.findAll()).length, 1);
});

test("findByField filtra propiedades anidadas y valores primitivos", async (t) => {
  const { repo } = await setup(t);
  const ana = await repo.create(contenidoBase);
  await repo.create({
    ...contenidoBase,
    nombre: "Luis",
    perfil: { ciudad: "Zapopan", activo: false, nivel: 1 },
    nota: "revisar",
  });

  assert.deepEqual(
    (await repo.findByField("perfil.ciudad", "Guadalajara")).map((r) => r.id),
    [ana.id],
  );
  assert.equal((await repo.findByField("perfil.activo", true)).length, 1);
  assert.equal((await repo.findByField("perfil.activo", false)).length, 1);
  assert.equal((await repo.findByField("perfil.nivel", 3)).length, 1);
  assert.equal((await repo.findByField("nota", null)).length, 1);
  assert.equal((await repo.findByField("nombre", "Ana")).length, 1);

  await assert.rejects(
    () => repo.findByField("perfil.ciudad; DROP TABLE records", "x"),
    /no es válida/,
  );
});

test("update combina objetos anidados y conserva los metadatos", async (t) => {
  const { repo } = await setup(t);
  const creado = await repo.create(contenidoBase);

  const actualizado = await repo.update(creado.id, {
    perfil: {
      ciudad: "Monterrey",
    },
    etiquetas: ["actualizado"],
    nota: "lista",
  });

  assert.ok(actualizado);
  assert.equal(actualizado.id, creado.id);
  assert.equal(actualizado.autor, creado.autor);
  assert.equal(actualizado.createdAt, creado.createdAt);
  assert.deepEqual(actualizado.content, {
    ...contenidoBase,
    perfil: {
      ciudad: "Monterrey",
      activo: true,
      nivel: 3,
    },
    etiquetas: ["actualizado"],
    nota: "lista",
  });

  assert.equal(await repo.update("id-inexistente", { nombre: "Nadie" }), null);
});

test("create rechaza contenido que no sea un objeto JSON", async (t) => {
  const { repo } = await setup(t);

  await assert.rejects(
    () => repo.create([] as unknown as ContenidoPrueba),
    /objeto JSON/,
  );
});

test("el esquema solo acepta content en formato JSONB", async (t) => {
  const { client } = await setup(t);

  await assert.rejects(
    () =>
      client.execute({
        sql: `
          INSERT INTO records (autor, modulo, content)
          VALUES (?, ?, ?)
        `,
        args: ["Ana", "redes", JSON.stringify(contenidoBase)],
      }),
    /CHECK constraint failed/,
  );
});
