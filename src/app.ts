import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { getDbClient } from "./db/client.js";
import { registroRouter } from "./modules/registro/routes.js";

/**
 * Crea y configura la aplicación Express.
 */
export function crearApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  // Mensaje de bienvenida e índice de la API
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      nombre: "Sistema de Registro 2026 — API",
      descripcion: "Backend modular con Turso (libSQL) y almacenamiento JSONB",
      salud: "/api/health",
      modulosDisponibles: [
        { modulo: "registro", endpoint: "/api/registro", autor: "VumerGallardo" },
      ],
      equipo: {
        lider: "Vumer Gallardo (registro)",
        integrantes: [
          "Jefte (motos)",
          "Edwin (plastiqueria)",
          "Esteban (redes)",
          "Elian (comics)",
        ],
      },
    });
  });

  // Healthcheck de la base de datos Turso
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const client = getDbClient();
      await client.execute("SELECT 1");
      res.json({
        ok: true,
        baseDeDatos: "conectado",
        motor: "Turso (libSQL)",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      res.status(503).json({
        ok: false,
        baseDeDatos: "error",
        error: mensaje,
      });
    }
  });

  // Módulo del Líder montado en /api/registro
  app.use("/api/registro", registroRouter);

  // Manejo de rutas inexistentes (404)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      ok: false,
      error: "Ruta no encontrada. Visita GET / para ver los endpoints disponibles.",
    });
  });

  // Manejo centralizado de errores
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const mensaje = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[API Error]:", error);
    res.status(500).json({
      ok: false,
      error: mensaje,
    });
  });

  return app;
}
