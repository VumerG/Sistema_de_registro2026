# Módulo `registro` (ejemplo base del líder)

Este módulo es la plantilla de referencia para el equipo. Muestra cómo:

- Inyectar `modulo` y `autor` mediante `RegistroRepository`.
- Guardar datos anidados y arreglos dentro de `content` (JSONB).
- Crear, listar, buscar por id, filtrar por un campo JSON, actualizar y eliminar.
- Separar la capa de negocio (`service.ts`) del acceso a datos (`repository.ts`).

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `config.ts` | Nombre del módulo y autor líder. |
| `types.ts` | Forma del contenido JSON del módulo. |
| `repository.ts` | Instancia de `ModuleRepository` con el contexto del módulo. |
| `service.ts` | Reglas de negocio y operaciones CRUD expuestas. |
| `demo.ts` | Demostración ejecutable de las seis operaciones. |
| `index.ts` | Exportaciones públicas del módulo. |

## Ejecutar la demostración

Desde la raíz del proyecto:

```bash
npm run demo
```

La demo elimina sus propios registros al terminar. Si quieres inspeccionarlos
en Turso, usa:

```bash
KEEP_DEMO_DATA=true npm run demo
```

## Copiar este patrón en otro módulo

1. Crea `src/modules/<tu-modulo>/`.
2. Duplica `config.ts`, `types.ts`, `repository.ts`, `service.ts` e `index.ts`.
3. Cambia `MODULO_*`, `AUTOR_*` y el tipo de `content`.
4. No modifiques `src/core/` ni `src/db/` desde tu rama.
