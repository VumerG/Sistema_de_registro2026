import express from "express";
import type {
  ErrorRequestHandler,
  Express,
  NextFunction,
  Request,
  Response,
} from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "./core/app-error.js";
import { getDbClient } from "./db/client.js";
import { registroRouter } from "./modules/registro/routes.js";
import {
  AREAS,
  ESTADOS,
  EQUIPO,
  LIMITE_DESCRIPCION,
  LIMITE_ETIQUETAS,
  LIMITE_PORTADA,
  LIMITE_PORTADA_BYTES,
  LIMITE_TITULO,
  MODULO_DISENO,
  PRIORIDADES,
  DisenoService,
  aTareaDiseno,
  validarMiembro,
} from "./modules/diseno/index.js";
import type { FiltrosDiseno } from "./modules/diseno/index.js";

const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));

export interface AppOptions {
  servicioDiseno?: DisenoService;
}

function leerConsulta(value: unknown): string | undefined {
  if (typeof value === "string") {
    const limpio = value.trim();
    return limpio || undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }
    }
  }

  return undefined;
}

function miembroDe(res: Response): string {
  return String(res.locals.miembro ?? "");
}

/**
 * Construye la aplicación HTTP del tablero de diseño y API REST de módulos.
 */
export function crearApp({
  servicioDiseno = new DisenoService(),
}: AppOptions = {}): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "4mb" }));

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "connect-src 'self'",
      ].join("; "),
    );
    next();
  });

  // Healthcheck de la base de datos Turso
  app.get("/api/health", async (_req, res) => {
    try {
      await getDbClient().execute("SELECT 1");
      res.json({
        ok: true,
        baseDeDatos: "conectado",
        motor: "Turso (libSQL)",
        fecha: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[health] No se pudo consultar Turso:", error);
      res.status(503).json({
        ok: false,
        baseDeDatos: "error",
        error: "No se pudo conectar con la base de datos.",
      });
    }
  });

  // Configuración del tablero para el frontend
  app.get("/api/config", (_req, res) => {
    res.json({
      modulo: MODULO_DISENO,
      areas: AREAS,
      estados: ESTADOS,
      prioridades: PRIORIDADES,
      miembros: EQUIPO,
      limites: {
        titulo: LIMITE_TITULO,
        descripcion: LIMITE_DESCRIPCION,
        etiquetas: LIMITE_ETIQUETAS,
        portada: LIMITE_PORTADA,
        portadaBytes: LIMITE_PORTADA_BYTES,
      },
    });
  });

  // API REST del módulo del Líder (registro académico)
  app.use("/api/registro", registroRouter);

  // Rutas del Tablero de Diseños (requieren x-team-member)
  const tasksRouter = express.Router();

  tasksRouter.use((req, res, next) => {
    try {
      const id = validarMiembro(req.header("x-team-member") ?? "");
      res.locals.miembro = id;
      next();
    } catch (error) {
      next(error);
    }
  });

  tasksRouter.get("/", async (req, res, next) => {
    try {
      const filtros: FiltrosDiseno = {
        area: leerConsulta(req.query.area),
        prioridad: leerConsulta(req.query.prioridad),
        responsable: leerConsulta(req.query.responsable),
        estado: leerConsulta(req.query.estado),
        busqueda: leerConsulta(req.query.q),
      };

      const tareas = await servicioDiseno.listar(miembroDe(res), filtros);
      res.json({ tareas: tareas.map(aTareaDiseno) });
    } catch (error) {
      next(error);
    }
  });

  tasksRouter.get("/:id", async (req, res, next) => {
    try {
      const tarea = await servicioDiseno.obtener(
        miembroDe(res),
        req.params.id ?? "",
      );

      if (!tarea) {
        res.status(404).json({ error: "El diseño no existe." });
        return;
      }

      res.json({ tarea: aTareaDiseno(tarea) });
    } catch (error) {
      next(error);
    }
  });

  tasksRouter.post("/", async (req, res, next) => {
    try {
      const tarea = await servicioDiseno.crear(miembroDe(res), req.body);
      res.status(201).json({ tarea: aTareaDiseno(tarea) });
    } catch (error) {
      next(error);
    }
  });

  tasksRouter.patch("/:id", async (req, res, next) => {
    try {
      const tarea = await servicioDiseno.actualizar(
        miembroDe(res),
        req.params.id ?? "",
        req.body,
      );

      if (!tarea) {
        res.status(404).json({ error: "El diseño no existe." });
        return;
      }

      res.json({ tarea: aTareaDiseno(tarea) });
    } catch (error) {
      next(error);
    }
  });

  tasksRouter.delete("/:id", async (req, res, next) => {
    try {
      const eliminado = await servicioDiseno.eliminar(
        miembroDe(res),
        req.params.id ?? "",
      );

      if (!eliminado) {
        res.status(404).json({ error: "El diseño no existe." });
        return;
      }

      res.json({ eliminado: true });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/tasks", tasksRouter);

  // Servir archivos estáticos del tablero web de diseño
  app.use(
    express.static(PUBLIC_DIR, {
      extensions: ["html"],
      index: "index.html",
      maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    }),
  );

  // Cualquier ruta no-API que acepte HTML sirve index.html
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ ok: false, error: "Ruta de API no encontrada." });
      return;
    }

    if (req.method !== "GET" || !req.accepts("html")) {
      next();
      return;
    }

    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });

  // Manejador centralizado de errores
  const manejadorErrores: ErrorRequestHandler = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (res.headersSent) {
      return;
    }

    if (error instanceof AppError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ error: "El cuerpo JSON no es válido." });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      (error as { type?: unknown }).type === "entity.too.large"
    ) {
      res.status(413).json({
        error: "La imagen o el contenido enviado es demasiado grande.",
      });
      return;
    }

    console.error("[api] Error inesperado:", error);
    res.status(500).json({
      error: "Ocurrió un error inesperado en el servidor.",
    });
  };

  app.use(manejadorErrores);

  return app;
}
