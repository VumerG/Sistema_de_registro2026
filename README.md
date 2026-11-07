# Sistema de Registro 2026

Base compartida de la práctica: **una sola tabla `records` en Turso**, con
contenido dinámico en **JSONB**, y un módulo aislado por integrante para evitar
conflictos en los Pull Requests. Incluye un **tablero de diseños** tipo Jira
para que el líder y los colaboradores organicen su trabajo creativo.

> **Stack:** TypeScript + Node.js 22 + `@libsql/client` + Turso (libSQL) +
> Express.
>
> **Repositorio:** <https://github.com/VumerG/Sistema_de_registro2026>
>
> **Módulos del equipo:** `redes`, `motos` y `plastiqueria`.
>
> **Tablero:** `npm start` levanta la interfaz en <http://localhost:3000>. El
> tablero vive únicamente en `main`; los colaboradores no necesitan ejecutarlo
> en sus ramas.

## Equipo y distribución

| Rol | Nombre | Rama = carpeta | Identidad en el tablero |
| --- | --- | --- | --- |
| Líder | Vumer Gallardo | `registro` | `VumerG` |
| Integrante 1 | Jefte Cervera | `redes` | `Jefte2004` |
| Integrante 2 | Manuel Esteban | `motos` | `ManuelEsteban12` |
| Integrante 3 | Quetzedwin | `plastiqueria` | `quetzedwin-wq` |

Temas asignados:

- **`redes`:** inventario y seguimiento de dispositivos, direcciones IP,
  VLANs, ubicaciones e incidencias de red.
- **`motos`:** registro de motocicletas, propietarios, servicios,
  mantenimientos y refacciones.
- **`plastiqueria`:** productos, materias primas, lotes de producción, pedidos
  e inventario de la planta.

Regla de oro: **ningún integrante modifica archivos fuera de
`src/modules/<su-modulo>/`**. La infraestructura compartida vive en `src/core/`,
`src/db/` y `scripts/` y la administra el líder.

## Arquitectura

```text
.
├── .env.example
├── .github/
│   └── pull_request_template.md
├── package.json
├── public/                        # interfaz web del tablero
│   ├── app.js                     # lógica, filtros, drag & drop y CRUD
│   ├── favicon.svg
│   ├── index.html
│   └── styles.css
├── scripts/
│   └── db-init.ts                 # npm run db:init (lo corre el líder una vez)
├── src/
│   ├── app.ts                     # API Express y servido de public/
│   ├── server.ts                  # arranque, PORT/HOST y cierre ordenado
│   ├── core/
│   │   ├── app-error.ts           # errores controlados de la API
│   │   ├── module-repository.ts   # CRUD genérico sobre records
│   │   ├── json.ts                # validación y merge de JSON
│   │   └── types.ts
│   ├── db/
│   │   ├── client.ts              # conexión única a Turso
│   │   └── schema.ts              # DDL de la tabla e índices
│   └── modules/
│       ├── diseno/                # tablero de diseños (solo main)
│       │   ├── README.md
│       │   ├── config.ts
│       │   ├── index.ts
│       │   ├── repository.ts
│       │   ├── service.ts
│       │   ├── types.ts
│       │   └── validation.ts
│       └── registro/              # módulo ejemplo del líder
│           ├── config.ts
│           ├── demo.ts
│           ├── index.ts
│           ├── repository.ts
│           ├── service.ts
│           └── types.ts
└── tests/
    ├── diseno.test.ts
    └── module-repository.test.ts
```

Cada compañero crea su carpeta dentro de `src/modules/` en **su propia rama**.
Al hacer merge de los PRs, cada módulo conserva su carpeta y no se pisan entre sí.

## Base de datos (Single-Table Design)

La tabla se llama `records` y tiene exactamente estas cinco columnas:

| Columna | Tipo | Uso |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | UUID v4 generado por Turso con `DEFAULT` si el código no envía uno. |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | Fecha de creación. |
| `autor` | `TEXT NOT NULL` | Nombre del integrante dueño; lo inyecta el repositorio. |
| `modulo` | `TEXT NOT NULL` | Nombre del módulo/rama; lo inyecta el repositorio. |
| `content` | `BLOB NOT NULL CHECK (json_valid(content, 8))` | Datos del módulo guardados con `jsonb(?)`; el `CHECK` garantiza JSONB válido. |

Índices creados por `db:init`:

```sql
-- Consultas del módulo ordenadas por fecha.
CREATE INDEX IF NOT EXISTS idx_records_modulo_fecha
  ON records (modulo, created_at DESC);

-- Filtros por integrante.
CREATE INDEX IF NOT EXISTS idx_records_autor
  ON records (autor);

-- Índice funcional opcional para el campo común `estado` dentro del JSONB.
CREATE INDEX IF NOT EXISTS idx_records_content_estado
  ON records (modulo, json_extract(content, '$.estado'));
```

Reglas internas del repositorio:

- Escritura: `INSERT ... content = jsonb(?)` y `UPDATE ... content = jsonb(?)`.
- Lectura: `SELECT ... json(content) AS content`.
- Filtros internos: `json_extract(content, '$.campo')`.
- `content` siempre se entrega como objeto JavaScript, nunca como `BLOB`/string.
- El `CHECK (json_valid(content, 8))` rechaza texto JSON normal y obliga a usar JSONB.
- Las lecturas y mutaciones están aisladas por `modulo`.

## Requisitos

- Node.js **20.11 o superior** (recomendado 22).
- npm 9 o superior.
- Cuenta en [Turso](https://turso.tech/) y Turso CLI (opcional, pero recomendado).

## Configuración inicial del líder

### 1. Crear la base de datos en Turso

```bash
turso auth login
turso db create sistema-registro-2026
turso db show sistema-registro-2026 --url
turso db tokens create sistema-registro-2026
```

Copia los dos últimos valores. `--url` empieza con `libsql://` y el token es la
credencial de acceso.

### 2. Configurar variables de entorno

```bash
npm install
cp .env.example .env
```

Edita `.env`:

```dotenv
TURSO_DATABASE_URL="libsql://tu-base-tu-organizacion.turso.io"
TURSO_AUTH_TOKEN="eyJ..."

# Opcionales para el servidor del tablero.
PORT=3000
HOST=0.0.0.0
```

> `.env` está en `.gitignore`. **Nunca lo subas al repositorio ni compartas el
> token en el chat del equipo.** Pasa las credenciales por un gestor de secretos.
>
> `HOST=0.0.0.0` permite conexiones desde la red local; usa `127.0.0.1` si
> quieres limitar el tablero a tu propia máquina.

### 3. Crear tabla e índices una sola vez

```bash
npm run db:init
```

El script es idempotente: si lo vuelves a correr no borra datos ni duplica
índices. Al terminar muestra las columnas, el `CHECK` JSONB y los índices creados.

> `CREATE TABLE IF NOT EXISTS` no modifica una tabla que ya exista. Si ya habías
> creado `records` con un esquema anterior, respalda los datos y recrea/migra la
> tabla antes de usar este DDL.

### 4. Verificar todo

```bash
npm run verify
npm run demo
```

`npm run demo` ejecuta el CRUD completo del módulo `registro` y limpia sus datos
de prueba al final. Para conservarlos y verlos en Turso:

```bash
KEEP_DEMO_DATA=true npm run demo
```

## Tablero de diseños

El tablero es una interfaz tipo Jira para que el líder y los colaboradores
registren, revisen y aprueben los diseños de `redes`, `motos`, `plastiqueria` y
`registro`. Todo se guarda en la misma tabla `records`: cada tarjeta es un
registro con `modulo = "diseno"` y el área del equipo dentro de
`content.area`.

### Iniciar el tablero

```bash
npm install
cp .env.example .env
# Completa TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en .env
npm run db:init   # solo la primera vez
npm start
```

Abre <http://localhost:3000>. Para desarrollo con recarga automática:

```bash
npm run dev
```

El puerto y la interfaz de escucha se cambian con `PORT` y `HOST` en `.env`.

### Flujo de uso

1. Elige tu nombre en el selector de identidad. Se guarda en `localStorage`
   para no pedirlo en cada visita.
2. Crea un diseño con **Nuevo diseño**: título, área, estado, prioridad,
   responsable, fecha, etiquetas, enlace y portada.
3. Arrastra las tarjetas entre **Backlog → En diseño → En revisión → Aprobado**.
   El nuevo orden se guarda en `content.orden`.
4. Filtra por área, prioridad o responsable; usa la búsqueda para título,
   descripción, persona o etiqueta.
5. Abre una tarjeta para editarla o eliminarla. Las portadas se comprimen en el
   navegador antes de enviarse.

### Estados y prioridades

| Estados | Prioridades |
| --- | --- |
| `backlog`, `en_diseno`, `revision`, `aprobado` | `baja`, `media`, `alta`, `urgente` |

Las áreas disponibles son `redes`, `motos`, `plastiqueria` y `registro`.

### API

La interfaz consume una API Express. El token de Turso **nunca** llega al
navegador: el servidor lo lee de `.env` y usa `ModuleRepository`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Comprueba la conexión con Turso. |
| `GET` | `/api/config` | Áreas, estados, prioridades, equipo y límites. |
| `GET` | `/api/tasks` | Lista tareas. Acepta `area`, `prioridad`, `responsable`, `estado` y `q`. |
| `GET` | `/api/tasks/:id` | Obtiene una tarea. |
| `POST` | `/api/tasks` | Crea una tarea. |
| `PATCH` | `/api/tasks/:id` | Actualiza campos; `estado` y `orden` mueven la tarjeta. |
| `DELETE` | `/api/tasks/:id` | Elimina una tarea. |

Las rutas de tareas exigen el encabezado `X-Team-Member` con uno de los IDs del
equipo (`VumerG`, `Jefte2004`, `ManuelEsteban12`, `quetzedwin-wq`). Si falta,
la API responde `401`; si el ID no existe, `403`.

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -H 'X-Team-Member: VumerG' \
  -d '{"titulo":"Banner para redes","area":"redes","prioridad":"alta"}'
```

### Límites y seguridad

- Título: 120 caracteres. Descripción: 4000. Etiquetas: 8 como máximo.
- Enlace: solo `http://` o `https://`.
- Portada: PNG/JPEG/WebP, máximo 1.9 M caracteres de data URL y 1.5 MB
  decodificados. El servidor verifica la firma real del archivo.
- Cuerpo JSON máximo: 4 MB.
- La interfaz escapa el contenido y solo abre enlaces `http`/`https`.
- `X-Team-Member` identifica al autor, pero **no es autenticación real**. Si el
  tablero se publica en internet, protégelo con un inicio de sesión o una red
  privada.

El detalle del módulo está en
[`src/modules/diseno/README.md`](src/modules/diseno/README.md).

## Uso de `ModuleRepository`

Cada módulo define su propio tipo de contenido y crea un repositorio con su
contexto. No se escribe SQL propio en los módulos.

```ts
import { ModuleRepository } from "../../core/module-repository.js";

// El contenido puede tener objetos y arreglos anidados.
type DispositivoRed = {
  hostname: string;
  ip: string;
  mac: string;
  tipo: "router" | "switch" | "access-point" | "servidor";
  activo: boolean;
  ubicacion: {
    edificio: string;
    piso: number;
    rack: string;
  };
  etiquetas: string[];
};

const redes = new ModuleRepository<DispositivoRed>({
  modulo: "redes",
  autor: "Nombre del integrante",
});

// CREATE: autor y modulo se inyectan automáticamente.
const creado = await redes.create({
  hostname: "sw-piso-3",
  ip: "192.168.30.2",
  mac: "AA:BB:CC:DD:EE:FF",
  tipo: "switch",
  activo: true,
  ubicacion: { edificio: "Edificio A", piso: 3, rack: "R-03" },
  etiquetas: ["core", "produccion"],
});

// READ
const todos = await redes.findAll();
const uno = await redes.findById(creado.id);
const porEdificio = await redes.findByField("ubicacion.edificio", "Edificio A");

// UPDATE parcial: los objetos anidados se combinan.
const actualizado = await redes.update(creado.id, {
  activo: false,
  ubicacion: { rack: "R-04" },
});

// DELETE
const eliminado = await redes.delete(creado.id);
```

### Métodos disponibles

| Método | Retorno | Descripción |
| --- | --- | --- |
| `create(data)` | `StoredRecord<T>` | Inserta, inyecta `autor`/`modulo` y devuelve `content` parseado. |
| `findAll()` | `StoredRecord<T>[]` | Todos los registros del módulo, recientes primero. |
| `findById(id)` | `StoredRecord<T> \| null` | Busca por UUID dentro del módulo. |
| `findByField(key, value)` | `StoredRecord<T>[]` | Filtra por campo JSON; admite rutas con puntos y valores primitivos. |
| `update(id, data)` | `StoredRecord<T> \| null` | Merge profundo de `content`; no cambia `id`, `autor`, `modulo` ni `created_at`. |
| `delete(id)` | `boolean` | `true` si el registro existía y fue eliminado. |

Notas:

- `findByField("direccion.ciudad", "Guadalajara")` busca dentro del JSON.
- También acepta `string`, `number`, `boolean` y `null` como valor.
- Los arreglos se reemplazan completos; los objetos anidados se combinan.
- No se permite SQL manual ni nombres de columna dinámicos.

## Flujo de trabajo para los integrantes

### 1. Clonar y cambiar a la rama de tu módulo

```bash
git clone git@github.com:VumerG/Sistema_de_registro2026.git
cd Sistema_de_registro2026
git checkout redes   # usa exactamente tu módulo
```

Si usas HTTPS:

```bash
git clone https://github.com/VumerG/Sistema_de_registro2026.git
```

### 2. Instalar dependencias y configurar `.env`

```bash
npm install
cp .env.example .env
# Pide al líder las credenciales y pégalas en .env
```

**No ejecutes `npm run db:init`**: el líder ya creó la tabla compartida una sola
vez. Tampoco cambies las credenciales ni compartas `.env`.

El tablero y la API viven **solo en `main`**. Los colaboradores no necesitan
ejecutar `npm start`, copiar `public/` ni modificar `src/modules/diseno/`; su
trabajo sigue siendo únicamente su carpeta de módulo.

### 3. Trabajar SOLO en tu carpeta

```text
src/modules/redes/
├── config.ts
├── demo.ts          # opcional
├── index.ts
├── repository.ts
├── service.ts
└── types.ts
```

Copia el patrón de `src/modules/registro/` y cambia:

- `MODULO_*` por exactamente el nombre de tu rama.
- `AUTOR_*` por tu nombre.
- El tipo del contenido según tu dominio.

No modifiques `src/core/`, `src/db/`, `scripts/`, `package.json` ni archivos de
otros módulos. Si necesitas una dependencia nueva o un cambio en la base
compartida, coméntalo con el líder **antes** de tocar esos archivos.

### 4. Verificar antes de subir

```bash
npm run verify
```

Prueba tu CRUD al menos una vez contra Turso con un script/demo propio.
No dejes registros de prueba en producción.

### 5. Subir tu rama y abrir el PR

```bash
git status
git add src/modules/redes
git commit -m "feat(redes): agrega CRUD de dispositivos de red"
git push origin redes
```

En GitHub abre un **Pull Request de `redes` hacia `main`**. Completa la
plantilla de PR, adjunta evidencia de la prueba y espera la revisión del líder.
No hagas merge de tu propio PR.

Para mantener tu rama al día:

```bash
git fetch origin
git rebase origin/main   # evita mezclar commits de otros módulos
# Resuelve conflictos si existen y luego:
git push --force-with-lease origin redes
```

## Comandos Git del líder

El repositorio de GitHub ya existe. Desde la carpeta local que contiene esta
base (no ejecutes `git init` sobre un repo ya clonado):

```bash
cd ~/Sistema_de_registro2026

# 1. Configura tu identidad solo si aún no está configurada.
git config user.name "VumerGallardo"
git config user.email "136099923+VumerG@users.noreply.github.com"

# 2. Revisa, confirma y publica la base en main.
git status
git add .
git commit -m "feat: base compartida con Turso, JSONB y módulo registro"
git push origin main

# 3. Crea y publica una rama por integrante.
#    Estos son los módulos reales del equipo.
for modulo in redes motos plastiqueria; do
  git checkout main
  git pull --ff-only origin main
  git checkout -b "$modulo"
  git push -u origin "$modulo"
done

# 4. Regresa a main.
git checkout main
```

Si tu autenticación es por SSH, cambia el remoto una vez:

```bash
git remote set-url origin git@github.com:VumerG/Sistema_de_registro2026.git
```

En GitHub, configura `main` como rama protegida y exige PR + revisión del líder
antes de hacer merge.

## Checklist de revisión del líder

Antes de aprobar un PR:

1. La rama, el campo `modulo` y la carpeta se llaman exactamente igual.
2. Solo hay cambios dentro de `src/modules/<modulo>/`.
3. El módulo usa `ModuleRepository` y no incluye SQL propio.
4. No se subieron `.env`, tokens ni archivos de base de datos locales.
5. `npm run typecheck` y `npm test` pasan en la rama.
6. El CRUD fue probado contra Turso y no dejó datos de prueba.
7. El PR apunta a `main` y no tiene conflictos.

La plantilla de PR incluye esta checklist para que cada integrante la complete.

## Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `npm start` | Levanta el tablero y la API en el puerto configurado. |
| `npm run dev` | Igual que `start`, pero recarga al cambiar archivos. |
| `npm run db:init` | Crea la tabla `records` y sus índices en Turso (solo líder). |
| `npm run demo` | CRUD de demostración del módulo `registro`. |
| `npm run typecheck` | Valida TypeScript sin generar archivos. |
| `npm test` | Pruebas de integración con una base libSQL local en memoria. |
| `npm run verify` | Ejecuta typecheck y pruebas en secuencia. |

## Solución de problemas

**`Falta la variable de entorno TURSO_DATABASE_URL`**
No existe `.env` o no se copió completo. Ejecuta `cp .env.example .env` y
completa las credenciales.

**`no such table: records`**
El líder debe ejecutar `npm run db:init` contra la base correcta.

**`EADDRINUSE: address already in use`**
Ya hay otro proceso usando `PORT`. Cambia el puerto en `.env` o detén el proceso
anterior.

**La API responde `401` o `403`**
Falta el encabezado `X-Team-Member` o el ID no pertenece al equipo. La interfaz
lo envía al elegir un integrante; si usas `curl`, agrégalo manualmente.

**La imagen de portada no se guarda**
Debe ser PNG, JPEG o WebP real, de máximo 1.5 MB decodificados. La interfaz
comprime imágenes grandes, pero si el archivo original es inválido o demasiado
pesado, se rechaza.

**`SQLITE_TOOBIG` / JSON demasiado grande**
Reduce el tamaño del registro o divide la información en varios registros; no
agregues columnas específicas.

**Conflicto en un PR**
Actualiza tu rama con `git fetch origin && git rebase origin/main`. No mezcles
cambios de otros módulos en tu carpeta.

**La demo no encuentra datos**
La demo limpia sus registros al terminar. Usa `KEEP_DEMO_DATA=true npm run demo`
si quieres inspeccionarlos.
