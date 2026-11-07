import "dotenv/config";
import { crearApp } from "./app.js";
import { closeDbClient } from "./db/client.js";

function leerPuerto(valor: string | undefined): number {
  if (!valor || !valor.trim()) {
    return 3000;
  }

  const puerto = Number(valor);

  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error(
      "PORT debe ser un número entero entre 1 y 65535. Revisa tu archivo .env.",
    );
  }

  return puerto;
}

const puerto = leerPuerto(process.env.PORT);
const host = process.env.HOST?.trim() || "0.0.0.0";
const app = crearApp();

const servidor = app.listen(puerto, host, () => {
  console.log("");
  console.log("  Tablero de diseños — Sistema de Registro 2026");
  console.log(`  http://localhost:${puerto}`);
  console.log("");
});

servidor.on("error", (error) => {
  console.error("No se pudo iniciar el servidor:", error);
  process.exitCode = 1;
});

let cerrando = false;

function cerrar(senal: string): void {
  if (cerrando) {
    return;
  }

  cerrando = true;
  console.log(`\n${senal} recibido. Cerrando el servidor...`);

  servidor.close(() => {
    closeDbClient();
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => cerrar("SIGINT"));
process.on("SIGTERM", () => cerrar("SIGTERM"));
