import type { Client } from "@libsql/client";
import { ModuleRepository } from "../../core/module-repository.js";
import { MODULO_DISENO } from "./config.js";
import type { Diseno } from "./types.js";

/**
 * Repositorio del tablero de diseños.
 *
 * Reutiliza `ModuleRepository` y fija `modulo = "diseno"`; el autor se recibe
 * por constructor porque cada petición puede venir de un integrante distinto.
 */
export class DisenoRepository extends ModuleRepository<Diseno> {
  constructor(autor: string, client?: Client) {
    super({
      modulo: MODULO_DISENO,
      autor,
      ...(client ? { client } : {}),
    });
  }
}
