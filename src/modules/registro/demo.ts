import { RegistroService } from "./service.js";
import type { RegistroAcademico } from "./types.js";

function printStep(title: string, value: unknown): void {
  console.log(`\n${title}`);
  console.log(JSON.stringify(value, null, 2));
}

async function main(): Promise<void> {
  const service = new RegistroService();
  const sufijo = Date.now().toString(36).toUpperCase();
  const creados: string[] = [];
  const conservarDatos = process.env.KEEP_DEMO_DATA === "true";

  const ana: RegistroAcademico = {
    folio: `DEMO-${sufijo}-01`,
    nombreCompleto: "Ana Martínez López",
    correo: "ana.martinez@example.com",
    programa: "Ingeniería en Sistemas Computacionales",
    semestre: 5,
    estatus: "pendiente",
    promedio: 9.1,
    documentacion: {
      identificacion: true,
      actaNacimiento: true,
      certificadoEstudios: false,
    },
    contacto: {
      telefono: "3312345678",
      direccion: {
        calle: "Av. Universidad 1200",
        ciudad: "Guadalajara",
        estado: "Jalisco",
        codigoPostal: "44100",
      },
    },
    etiquetas: ["nuevo-ingreso", "beca"],
  };

  const luis: RegistroAcademico = {
    ...ana,
    folio: `DEMO-${sufijo}-02`,
    nombreCompleto: "Luis Hernández Ramírez",
    correo: "luis.hernandez@example.com",
    programa: "Licenciatura en Administración",
    semestre: 3,
    promedio: 8.7,
    documentacion: {
      identificacion: true,
      actaNacimiento: false,
      certificadoEstudios: true,
    },
    contacto: {
      telefono: "3398765432",
      direccion: {
        ...ana.contacto.direccion,
        calle: "Calle Hidalgo 45",
        ciudad: "Zapopan",
      },
    },
    etiquetas: ["reingreso"],
  };

  try {
    const registroAna = await service.registrar(ana);
    creados.push(registroAna.id);

    const registroLuis = await service.registrar(luis);
    creados.push(registroLuis.id);

    printStep("1) CREATE: content JSONB devuelto como objeto", {
      id: registroAna.id,
      autor: registroAna.autor,
      modulo: registroAna.modulo,
      content: registroAna.content,
    });

    const todos = await service.listar();
    console.log(`\n2) FIND ALL: ${todos.length} registro(s) del módulo "registro".`);

    const encontrado = await service.obtener(registroAna.id);
    printStep("3) FIND BY ID", encontrado);

    const enGuadalajara = await service.buscarPorCiudad("Guadalajara");
    console.log(
      `\n4) FIND BY FIELD (contacto.direccion.ciudad = "Guadalajara"): ${enGuadalajara.length} coincidencia(s).`,
    );

    const actualizado = await service.actualizar(registroAna.id, {
      estatus: "validado",
      promedio: 9.3,
      documentacion: {
        certificadoEstudios: true,
      },
    });

    printStep("5) UPDATE con merge profundo", actualizado);

    const eliminado = await service.eliminar(registroLuis.id);
    console.log(`\n6) DELETE: registro de Luis eliminado = ${eliminado}.`);
  } finally {
    if (conservarDatos) {
      console.log(
        `\n📌 KEEP_DEMO_DATA=true: se conservaron ${creados.length} registro(s) de demostración.`,
      );
    } else {
      for (const id of creados) {
        await service.eliminar(id);
      }

      console.log("\n🧹 Datos de demostración eliminados.");
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ Error en la demostración: ${message}`);
  process.exitCode = 1;
});
