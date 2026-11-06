import { ModuleRepository } from "../../core/module-repository.js";
import { AUTOR_LIDER, MODULO_REGISTRO } from "./config.js";
import type { RegistroAcademico } from "./types.js";

/**
 * Repositorio del módulo `registro`.
 *
 * Esta clase es opcional: también puedes instanciar ModuleRepository
 * directamente. Sirve para fijar el módulo y el autor en un solo lugar.
 */
export class RegistroRepository extends ModuleRepository<RegistroAcademico> {
  constructor(autor: string = AUTOR_LIDER) {
    super({
      modulo: MODULO_REGISTRO,
      autor,
    });
  }
}
