import { Router } from "express";
import { ModuleRepository } from "./module-repository.js";
import type { JsonObject } from "./types.js";

/**
 * Crea un router REST estándar para cualquier módulo basado en ModuleRepository.
 */
export function createModuleRouter<T extends JsonObject = JsonObject>(
  modulo: string,
  autor: string,
): Router {
  const router = Router();
  const repo = new ModuleRepository<T>({ modulo, autor });

  router.get("/", async (req, res, next) => {
    try {
      const qCampo = typeof req.query.campo === "string" ? req.query.campo.trim() : "";
      const qValor = typeof req.query.valor === "string" ? req.query.valor.trim() : "";

      if (qCampo && qValor) {
        const filtrados = await repo.findByField(qCampo, qValor);
        res.json({ ok: true, modulo, autor, total: filtrados.length, datos: filtrados });
        return;
      }

      const registros = await repo.findAll();
      res.json({ ok: true, modulo, autor, total: registros.length, datos: registros });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const registro = await repo.findById(req.params.id);
      if (!registro) {
        res.status(404).json({
          ok: false,
          error: `Registro no encontrado en el módulo '${modulo}'.`,
        });
        return;
      }
      res.json({ ok: true, dato: registro });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const nuevo = await repo.create(req.body as T);
      res.status(201).json({
        ok: true,
        mensaje: `Registro creado exitosamente en '${modulo}'`,
        dato: nuevo,
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const actualizado = await repo.update(req.params.id, req.body);
      if (!actualizado) {
        res.status(404).json({
          ok: false,
          error: `Registro no encontrado para actualizar en '${modulo}'.`,
        });
        return;
      }
      res.json({
        ok: true,
        mensaje: `Registro actualizado en '${modulo}'`,
        dato: actualizado,
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const eliminado = await repo.delete(req.params.id);
      if (!eliminado) {
        res.status(404).json({
          ok: false,
          error: `Registro no encontrado para eliminar en '${modulo}'.`,
        });
        return;
      }
      res.json({
        ok: true,
        mensaje: `Registro eliminado de '${modulo}'`,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
