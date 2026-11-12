import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createClient, type Client } from "@libsql/client";
import { SCHEMA_STATEMENTS } from "../src/db/schema.js";
import { ModuleRepository } from "../src/core/module-repository.js";
import { DisenoRepository } from "../src/modules/diseno/repository.js";
import { DisenoService } from "../src/modules/diseno/service.js";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nK0AAAAASUVORK5CYII=";

async function setup(
  t: TestContext,
): Promise<{ client: Client; servicio: DisenoService }> {
  const client = createClient({ url: ":memory:" });
  t.after(() => client.close());

  for (const sql of SCHEMA_STATEMENTS) {
    await client.execute(sql);
  }

  return {
    client,
    servicio: new DisenoService(
      (autor) => new DisenoRepository(autor, client),
    ),
  };
}

test("crea un diseño con valores por defecto y autor correcto", async (t) => {
  const { servicio } = await setup(t);

  const creado = await servicio.crear("VumerG", {
    titulo: "  Banner   de redes  ",
    area: "redes",
  });

  assert.match(creado.id, /^[0-9a-f-]{36}$/i);
  assert.equal(creado.modulo, "diseno");
  assert.equal(creado.autor, "VumerG");
  assert.equal(creado.content.version, 1);
  assert.equal(creado.content.titulo, "Banner de redes");
  assert.equal(creado.content.descripcion, "");
  assert.equal(creado.content.estado, "backlog");
  assert.equal(creado.content.prioridad, "media");
  assert.equal(creado.content.responsable, "");
  assert.deepEqual(creado.content.etiquetas, []);
  assert.equal(creado.content.enlace, null);
  assert.equal(creado.content.portada, null);
  assert.equal(creado.content.fechaEntrega, null);
  assert.equal(creado.content.orden, 1000);
  assert.equal(creado.content.actualizadoPor, "VumerG");
  assert.match(creado.content.actualizadoEn, /^\d{4}-\d{2}-\d{2}T/);
});

test("valida integrantes, campos y URLs antes de guardar", async (t) => {
  const { servicio } = await setup(t);

  await assert.rejects(
    () => servicio.crear("Intruso", { titulo: "X", area: "redes" }),
    /no está autorizado/,
  );
  await assert.rejects(
    () => servicio.crear("VumerG", { titulo: "", area: "redes" }),
    /título/,
  );
  await assert.rejects(
    () => servicio.crear("VumerG", { titulo: "X" }),
    /área/,
  );
  await assert.rejects(
    () =>
      servicio.crear("VumerG", {
        titulo: "X",
        area: "redes",
        estado: "inventado",
      }),
    /estado/,
  );
  await assert.rejects(
    () =>
      servicio.crear("VumerG", {
        titulo: "X",
        area: "redes",
        enlace: "javascript:alert(1)",
      }),
    /http/,
  );
  await assert.rejects(
    () =>
      servicio.crear("VumerG", {
        titulo: "X",
        area: "redes",
        portada: "data:image/png;base64,aGVsbG8=",
      }),
    /imagen real/,
  );
  await assert.rejects(
    () =>
      servicio.crear("VumerG", {
        titulo: "X",
        area: "redes",
        fechaEntrega: "2026-02-31",
      }),
    /no existe/,
  );
  await assert.rejects(
    () =>
      servicio.crear("VumerG", {
        titulo: "X",
        area: "redes",
        responsable: "Intruso",
      }),
    /integrante del equipo/,
  );
  await assert.rejects(
    () =>
      servicio.crear("VumerG", {
        titulo: "X",
        area: "redes",
        campoInventado: true,
      }),
    /no está permitido/,
  );
});

test("guarda una portada PNG válida y fechas correctas", async (t) => {
  const { servicio } = await setup(t);

  const creado = await servicio.crear("Jefte2004", {
    titulo: "Portada",
    area: "motos",
    portada: PNG_1X1,
    fechaEntrega: "2026-12-31",
  });

  assert.equal(creado.content.portada, PNG_1X1);
  assert.equal(creado.content.fechaEntrega, "2026-12-31");
  assert.equal(creado.content.responsable, "");
});

test("actualiza con merge, conserva el autor y registra quién editó", async (t) => {
  const { servicio } = await setup(t);
  const creado = await servicio.crear("VumerG", {
    titulo: "Cartel",
    area: "plastiqueria",
  });

  const actualizado = await servicio.actualizar("ManuelEsteban12", creado.id, {
    estado: "revision",
    prioridad: "alta",
    etiquetas: ["Urgente", "urgente", "  "],
  });

  assert.ok(actualizado);
  assert.equal(actualizado.id, creado.id);
  assert.equal(actualizado.autor, "VumerG");
  assert.equal(actualizado.createdAt, creado.createdAt);
  assert.equal(actualizado.content.titulo, "Cartel");
  assert.equal(actualizado.content.estado, "revision");
  assert.equal(actualizado.content.prioridad, "alta");
  assert.deepEqual(actualizado.content.etiquetas, ["Urgente"]);
  assert.equal(actualizado.content.actualizadoPor, "ManuelEsteban12");
  assert.equal(
    await servicio.actualizar("VumerG", "id-inexistente", {
      titulo: "Nadie",
    }),
    null,
  );
});

test("al mover a otra columna asigna el final de esa columna", async (t) => {
  const { servicio } = await setup(t);
  const primero = await servicio.crear("VumerG", {
    titulo: "Primero",
    area: "redes",
  });
  const segundo = await servicio.crear("VumerG", {
    titulo: "Segundo",
    area: "redes",
  });

  const movido = await servicio.actualizar("VumerG", primero.id, {
    estado: "en_diseno",
  });
  assert.ok(movido);
  assert.equal(movido.content.orden, 1000);

  const otro = await servicio.actualizar("VumerG", segundo.id, {
    estado: "en_diseno",
  });
  assert.ok(otro);
  assert.equal(otro.content.orden, 2000);

  const enDiseno = await servicio.listar("VumerG", {
    estado: "en_diseno",
  });
  assert.deepEqual(
    enDiseno.map((tarea) => tarea.content.titulo),
    ["Primero", "Segundo"],
  );
});

test("filtra por área, prioridad, responsable, estado y búsqueda", async (t) => {
  const { servicio } = await setup(t);

  await servicio.crear("VumerG", {
    titulo: "Banner para redes",
    area: "redes",
    prioridad: "urgente",
    responsable: "Jefte2004",
    etiquetas: ["instagram"],
  });
  await servicio.crear("VumerG", {
    titulo: "Catálogo de motos",
    area: "motos",
    prioridad: "baja",
    responsable: "ManuelEsteban12",
  });
  await servicio.crear("VumerG", {
    titulo: "Etiqueta de plástico",
    area: "plastiqueria",
    estado: "aprobado",
  });

  assert.equal((await servicio.listar("VumerG", { area: "redes" })).length, 1);
  assert.equal(
    (await servicio.listar("VumerG", { prioridad: "urgente" })).length,
    1,
  );
  assert.equal(
    (await servicio.listar("VumerG", { responsable: "Jefte2004" })).length,
    1,
  );
  assert.equal(
    (await servicio.listar("VumerG", { responsable: "sin_asignar" })).length,
    1,
  );
  assert.equal(
    (await servicio.listar("VumerG", { estado: "aprobado" })).length,
    1,
  );
  assert.equal(
    (await servicio.listar("VumerG", { busqueda: "BANNER" })).length,
    1,
  );
  assert.equal(
    (await servicio.listar("VumerG", { busqueda: "instagram" })).length,
    1,
  );
});

test("elimina solo registros del módulo diseno", async (t) => {
  const { client, servicio } = await setup(t);

  const otros = new ModuleRepository({
    modulo: "redes",
    autor: "Jefte2004",
    client,
  });
  const ajeno = await otros.create({ nombre: "Switch" });

  const creado = await servicio.crear("VumerG", {
    titulo: "Eliminar",
    area: "registro",
  });

  assert.equal(await servicio.eliminar("VumerG", ajeno.id), false);
  assert.equal(await servicio.eliminar("VumerG", creado.id), true);
  assert.equal((await servicio.listar("VumerG")).length, 0);
  assert.equal((await otros.findAll()).length, 1);
});
