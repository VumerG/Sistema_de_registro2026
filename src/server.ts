import "dotenv/config";
import { crearApp } from "./app.js";
import { closeDbClient } from "./db/client.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const app = crearApp();

const server = app.listen(PORT, HOST, () => {
  console.log("");
  console.log("==================================================");
  console.log("  🚀 Servidor Sistema de Registro 2026 corriendo");
  console.log(`  🌐 Local:   http://localhost:${PORT}`);
  console.log(`  🩺 Salud:   http://localhost:${PORT}/api/health`);
  console.log(`  📦 Módulo:  http://localhost:${PORT}/api/registro`);
  console.log("==================================================");
  console.log("");
});

server.on("error", (error) => {
  console.error("❌ Error al iniciar el servidor HTTP:", error);
  process.exit(1);
});

function shutdown(signal: string): void {
  console.log(`\n🛑 Recibido ${signal}. Cerrando servidor HTTP...`);
  server.close(() => {
    closeDbClient();
    console.log("✅ Conexiones cerradas. Servidor detenido.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
