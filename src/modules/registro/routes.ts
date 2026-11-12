import { Router } from "express";
import { RegistroService } from "./service.js";
import type { RegistroAcademico } from "./types.js";

export const registroRouter = Router();
const service = new RegistroService();

// GET /api/registro — Lista todos los registros del módulo
registroRouter.get("/", async (req, res, next) => {
  try {
    const ciudad = typeof req.query.ciudad === "string" ? req.query.ciudad.trim() : "";
    if (ciudad) {
      const resultados = await service.buscarPorCiudad(ciudad);
      res.json({ ok: true, modulo: "registro", total: resultados.length, datos: resultados });
      return;
    }

    const registros = await service.listar();
    res.json({ ok: true, modulo: "registro", total: registros.length, datos: registros });
  } catch (error) {
    next(error);
  }
});

// GET /api/registro/:id — Obtiene un registro por su UUID
registroRouter.get("/:id", async (req, res, next) => {
  try {
    const registro = await service.obtener(req.params.id);
    if (!registro) {
      res.status(404).json({ ok: false, error: "Registro no encontrado en el módulo 'registro'." });
      return;
    }
    res.json({ ok: true, dato: registro });
  } catch (error) {
    next(error);
  }
});

// POST /api/registro — Crea un nuevo registro
registroRouter.post("/", async (req, res, next) => {
  try {
    const nuevo = await service.registrar(req.body as RegistroAcademico);
    res.status(201).json({ ok: true, mensaje: "Registro creado exitosamente", dato: nuevo });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/registro/:id — Actualización parcial con merge profundo
registroRouter.patch("/:id", async (req, res, next) => {
  try {
    const actualizado = await service.actualizar(req.params.id, req.body);
    if (!actualizado) {
      res.status(404).json({ ok: false, error: "Registro no encontrado para actualizar." });
      return;
    }
    res.json({ ok: true, mensaje: "Registro actualizado", dato: actualizado });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/registro/:id — Elimina un registro
registroRouter.delete("/:id", async (req, res, next) => {
  try {
    const eliminado = await service.eliminar(req.params.id);
    if (!eliminado) {
      res.status(404).json({ ok: false, error: "Registro no encontrado para eliminar." });
      return;
    }
    res.json({ ok: true, mensaje: "Registro eliminado exitosamente" });
  } catch (error) {
    next(error);
  }
});
