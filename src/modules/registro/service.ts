import type { DeepPartial, StoredRecord } from "../../core/types.js";
import { RegistroRepository } from "./repository.js";
import type { RegistroAcademico } from "./types.js";

/**
 * Capa de negocio del módulo.
 *
 * La base de datos no valida las reglas del dominio; por eso viven aquí.
 * Los compañeros pueden copiar este patrón en su propio módulo.
 */
export class RegistroService {
  constructor(
    private readonly repository: RegistroRepository = new RegistroRepository(),
  ) {}

  async registrar(data: RegistroAcademico): Promise<StoredRecord<RegistroAcademico>> {
    const existentes = await this.repository.findByField("folio", data.folio);

    if (existentes.length > 0) {
      throw new Error(`Ya existe un registro con el folio "${data.folio}".`);
    }

    if (!data.documentacion.identificacion) {
      throw new Error("No se puede registrar sin identificación oficial.");
    }

    return this.repository.create(data);
  }

  listar(): Promise<StoredRecord<RegistroAcademico>[]> {
    return this.repository.findAll();
  }

  obtener(id: string): Promise<StoredRecord<RegistroAcademico> | null> {
    return this.repository.findById(id);
  }

  buscarPorCiudad(ciudad: string): Promise<StoredRecord<RegistroAcademico>[]> {
    return this.repository.findByField("contacto.direccion.ciudad", ciudad);
  }

  actualizar(
    id: string,
    cambios: DeepPartial<RegistroAcademico>,
  ): Promise<StoredRecord<RegistroAcademico> | null> {
    return this.repository.update(id, cambios);
  }

  eliminar(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
