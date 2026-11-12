import type { StoredRecord } from "../../core/types.js";
import { FILTRO_SIN_ASIGNAR, ESTADOS } from "./config.js";
import { DisenoRepository } from "./repository.js";
import type { Diseno, EstadoDiseno, TareaDiseno } from "./types.js";
import {
  validarActualizacion,
  validarCreacion,
  validarMiembro,
} from "./validation.js";

export type FiltrosDiseno = {
  area?: string;
  prioridad?: string;
  responsable?: string;
  estado?: string;
  busqueda?: string;
};

const ORDEN_ESTADOS: Record<EstadoDiseno, number> = {
  backlog: 0,
  en_diseno: 1,
  revision: 2,
  aprobado: 3,
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

export function filtrarDisenos(
  tareas: StoredRecord<Diseno>[],
  filtros: FiltrosDiseno = {},
): StoredRecord<Diseno>[] {
  const busqueda = normalizar(filtros.busqueda?.trim() ?? "");

  const filtradas = tareas.filter((tarea) => {
    const { content } = tarea;

    if (filtros.area && content.area !== filtros.area) {
      return false;
    }

    if (filtros.prioridad && content.prioridad !== filtros.prioridad) {
      return false;
    }

    if (filtros.estado && content.estado !== filtros.estado) {
      return false;
    }

    if (filtros.responsable === FILTRO_SIN_ASIGNAR) {
      if (content.responsable !== "") {
        return false;
      }
    } else if (
      filtros.responsable &&
      content.responsable !== filtros.responsable
    ) {
      return false;
    }

    if (!busqueda) {
      return true;
    }

    const texto = [
      content.titulo,
      content.descripcion,
      content.area,
      content.responsable,
      ...content.etiquetas,
    ].join(" ");

    return normalizar(texto).includes(busqueda);
  });

  return filtradas.sort((a, b) => {
    const ordenEstado =
      (ORDEN_ESTADOS[a.content.estado] ?? 99) -
      (ORDEN_ESTADOS[b.content.estado] ?? 99);

    if (ordenEstado !== 0) {
      return ordenEstado;
    }

    if (a.content.orden !== b.content.orden) {
      return a.content.orden - b.content.orden;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function aTareaDiseno(
  registro: StoredRecord<Diseno>,
): TareaDiseno {
  return {
    id: registro.id,
    createdAt: registro.createdAt,
    autor: registro.autor,
    ...registro.content,
  };
}

/**
 * Reglas de negocio del tablero.
 *
 * El repositorio se crea por autor para que la columna `autor` conserve a la
 * persona que hizo cada operación, sin dejar de usar `ModuleRepository`.
 */
export class DisenoService {
  constructor(
    private readonly crearRepositorio: (
      autor: string,
    ) => DisenoRepository = (autor) => new DisenoRepository(autor),
  ) {}

  async listar(
    autor: string,
    filtros: FiltrosDiseno = {},
  ): Promise<StoredRecord<Diseno>[]> {
    const miembro = validarMiembro(autor);
    const tareas = await this.crearRepositorio(miembro).findAll();
    return filtrarDisenos(tareas, filtros);
  }

  async obtener(
    autor: string,
    id: string,
  ): Promise<StoredRecord<Diseno> | null> {
    const miembro = validarMiembro(autor);
    return this.crearRepositorio(miembro).findById(id);
  }

  async crear(
    autor: string,
    input: unknown,
  ): Promise<StoredRecord<Diseno>> {
    const miembro = validarMiembro(autor);
    const datos = validarCreacion(input);
    const repositorio = this.crearRepositorio(miembro);
    const orden =
      datos.orden ?? (await this.siguienteOrden(repositorio, datos.estado));
    const ahora = new Date().toISOString();

    return repositorio.create({
      version: 1,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      estado: datos.estado,
      prioridad: datos.prioridad,
      area: datos.area,
      responsable: datos.responsable,
      etiquetas: datos.etiquetas,
      enlace: datos.enlace,
      portada: datos.portada,
      fechaEntrega: datos.fechaEntrega,
      orden,
      actualizadoPor: miembro,
      actualizadoEn: ahora,
    });
  }

  async actualizar(
    autor: string,
    id: string,
    input: unknown,
  ): Promise<StoredRecord<Diseno> | null> {
    const miembro = validarMiembro(autor);
    const repositorio = this.crearRepositorio(miembro);
    const actual = await repositorio.findById(id);

    if (!actual) {
      return null;
    }

    const cambios = validarActualizacion(input);
    const estadoFinal = cambios.estado ?? actual.content.estado;

    let ordenFinal = cambios.orden ?? actual.content.orden;
    if (
      cambios.estado !== undefined &&
      cambios.estado !== actual.content.estado &&
      cambios.orden === undefined
    ) {
      ordenFinal = await this.siguienteOrden(repositorio, estadoFinal);
    }

    return repositorio.update(id, {
      ...cambios,
      estado: estadoFinal,
      orden: ordenFinal,
      actualizadoPor: miembro,
      actualizadoEn: new Date().toISOString(),
    });
  }

  async eliminar(autor: string, id: string): Promise<boolean> {
    const miembro = validarMiembro(autor);
    return this.crearRepositorio(miembro).delete(id);
  }

  private async siguienteOrden(
    repositorio: DisenoRepository,
    estado: EstadoDiseno,
  ): Promise<number> {
    const tareas = await repositorio.findByField("estado", estado);
    let maximo = 0;

    for (const tarea of tareas) {
      if (Number.isFinite(tarea.content.orden)) {
        maximo = Math.max(maximo, tarea.content.orden);
      }
    }

    return maximo + 1000;
  }
}

/** Orden de las columnas para consumidores que no usan la configuración. */
export const ESTADOS_EN_ORDEN = ESTADOS.map((estado) => estado.id);
