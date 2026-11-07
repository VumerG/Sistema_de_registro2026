# Módulo `diseno`

Tablero tipo Jira para organizar los diseños del equipo. Todos los datos viven
en la tabla única `records`: cada tarjeta es un registro con
`modulo = "diseno"` y el área del equipo dentro de `content.area`.

> Este módulo se agregó en `main`. Los colaboradores no necesitan copiarlo ni
> ejecutar el servidor en sus ramas: siguen trabajando únicamente en
> `src/modules/redes/`, `src/modules/motos/` o `src/modules/plastiqueria/`.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `types.ts` | Tipo `Diseno` (contenido JSONB) y `TareaDiseno` (respuesta con metadatos). |
| `config.ts` | Constantes del tablero: estados, prioridades, áreas, equipo y límites. |
| `validation.ts` | Normalización y validación de los datos que llegan por la API. |
| `repository.ts` | `DisenoRepository`, que extiende `ModuleRepository<Diseno>` y fija `modulo = "diseno"`. |
| `service.ts` | Reglas de negocio: CRUD, filtros, orden de columnas y autoría. |
| `index.ts` | Exportaciones públicas del módulo. |
| `README.md` | Este documento. |

La API HTTP y la interfaz viven fuera del módulo, en `src/app.ts`,
`src/server.ts` y `public/`.

## Modelo de `content`

```ts
type Diseno = {
  version: 1;
  titulo: string;
  descripcion: string;
  estado: "backlog" | "en_diseno" | "revision" | "aprobado";
  prioridad: "baja" | "media" | "alta" | "urgente";
  area: "redes" | "motos" | "plastiqueria" | "registro";
  responsable: string;        // ID de EQUIPO o "" si no tiene
  etiquetas: string[];        // máximo 8
  enlace: string | null;      // http:// o https://
  portada: string | null;     // data URL de imagen comprimida
  fechaEntrega: string | null; // YYYY-MM-DD
  orden: number;              // posición dentro de la columna
  actualizadoPor: string;     // ID del último integrante que editó
  actualizadoEn: string;      // ISO 8601
};
```

La tarjeta que devuelve la API agrega los metadatos de la tabla:
`id`, `createdAt` y `autor`.

`content.area` es el área del equipo a la que pertenece el diseño; no es el
`modulo` de la tabla. El módulo central siempre es `diseno` para que los
registros del tablero no se mezclen con los de `redes`, `motos`,
`plastiqueria` o `registro`.

## Reglas de negocio

- Solo los IDs de `EQUIPO` pueden operar el tablero:
  `VumerG`, `Jefte2004`, `ManuelEsteban12` y `quetzedwin-wq`.
- El autor se conserva en la columna `autor`; cada edición actualiza
  `content.actualizadoPor` y `content.actualizadoEn`.
- Al crear, si no se envía `orden`, el servicio usa el final de la columna
  (`máximo + 1000`).
- Al mover una tarjeta a otra columna sin enviar `orden`, también se coloca al
  final de la columna destino.
- El tablero usa orden fraccionario para insertar entre dos tarjetas sin
  renumerar todas las demás.
- Los filtros se aplican en el servidor (`area`, `prioridad`, `responsable`,
  `estado`, `q`) y la interfaz también filtra en memoria para responder rápido.
- La búsqueda ignora acentos y mayúsculas; incluye título, descripción, área,
  responsable y etiquetas.

## Validación y límites

| Campo | Regla |
| --- | --- |
| `titulo` | Obligatorio, máximo 120 caracteres, espacios colapsados. |
| `descripcion` | Máximo 4000 caracteres; conserva saltos de línea. |
| `area` | Obligatoria; una de las áreas del equipo. |
| `estado` | Por defecto `backlog`. |
| `prioridad` | Por defecto `media`. |
| `responsable` | ID de `EQUIPO` o vacío para "sin asignar". |
| `etiquetas` | Máximo 8, máximo 30 caracteres cada una; sin duplicados. |
| `enlace` | Solo `http://` o `https://`, máximo 2000 caracteres. |
| `portada` | PNG, JPEG o WebP; data URL de máximo 1.9 M caracteres. |
| Imagen decodificada | Máximo 1.5 MB; se verifica la firma real del archivo. |
| `fechaEntrega` | Formato `YYYY-MM-DD` y fecha existente en el calendario. |
| `orden` | Número finito mayor o igual a cero. |

Los campos desconocidos se rechazan para evitar que se guarde información
inesperada dentro del JSONB.

## Uso desde el servicio

```ts
import { DisenoService } from "./service.js";

const servicio = new DisenoService();

const tarea = await servicio.crear("VumerG", {
  titulo: "Banner para redes",
  area: "redes",
  prioridad: "alta",
  responsable: "Jefte2004",
});

const tareas = await servicio.listar("Jefte2004", {
  area: "redes",
  busqueda: "banner",
});

const movida = await servicio.actualizar("Jefte2004", tarea.id, {
  estado: "revision",
});
```

Métodos disponibles:

| Método | Descripción |
| --- | --- |
| `listar(autor, filtros)` | Lista y filtra las tarjetas del tablero. |
| `obtener(autor, id)` | Devuelve una tarjeta o `null`. |
| `crear(autor, input)` | Valida, calcula el orden y crea el registro. |
| `actualizar(autor, id, input)` | Valida el patch, mueve de columna si hace falta y registra al editor. |
| `eliminar(autor, id)` | Elimina solo registros del módulo `diseno`. |

`autor` es el ID del integrante que hace la operación; el servicio lo valida
antes de tocar la base. En la API llega desde el encabezado `X-Team-Member`.

## API HTTP

Todas las rutas de tareas requieren el encabezado:

```http
X-Team-Member: VumerG
```

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Comprueba la conexión con Turso. |
| `GET` | `/api/config` | Áreas, estados, prioridades, equipo y límites. |
| `GET` | `/api/tasks` | Lista tareas; acepta `area`, `prioridad`, `responsable`, `estado` y `q`. |
| `GET` | `/api/tasks/:id` | Obtiene una tarea. |
| `POST` | `/api/tasks` | Crea una tarea. |
| `PATCH` | `/api/tasks/:id` | Actualiza campos; `estado` y `orden` mueven la tarjeta. |
| `DELETE` | `/api/tasks/:id` | Elimina una tarea. |

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -H 'X-Team-Member: VumerG' \
  -d '{
    "titulo": "Banner para redes",
    "area": "redes",
    "prioridad": "alta",
    "responsable": "Jefte2004",
    "etiquetas": ["instagram", "lanzamiento"]
  }'
```

Respuestas de error esperadas:

- `400`: datos inválidos (título vacío, URL no permitida, imagen falsa, etc.).
- `401`: falta `X-Team-Member`.
- `403`: el integrante no está autorizado.
- `404`: la tarea no existe o no pertenece al módulo.
- `413`: el cuerpo o la imagen superan el tamaño permitido.

## Seguridad

- El token de Turso se lee solo en el servidor (`src/db/client.ts`). Nunca se
  envía al navegador ni se incluye en los archivos de `public/`.
- La API limita el cuerpo JSON a 4 MB y valida la firma de las imágenes.
- La interfaz escapa el contenido antes de insertarlo en el DOM y solo permite
  enlaces `http`/`https`.
- `X-Team-Member` identifica al autor, pero **no es autenticación real**. No
  protege contra alguien que conozca los IDs del equipo; es una medida de
  trazabilidad para esta primera versión. Si el tablero se publica en internet,
  colócalo detrás de un inicio de sesión o de una red privada.
- El servidor agrega cabeceras `CSP`, `X-Frame-Options`, `nosniff` y
  `Referrer-Policy`.

## Pruebas

```bash
npm test
```

`tests/diseno.test.ts` cubre creación con valores por defecto, validaciones,
imágenes, actualización con merge, orden entre columnas, filtros y aislamiento
respecto de otros módulos. Las pruebas usan una base libSQL en memoria; no
tocan Turso.
