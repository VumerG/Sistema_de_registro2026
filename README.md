# Sistema de Registro 2026

Base compartida (boilerplate) para la práctica en equipo: **una sola tabla `records` en Turso (libSQL)** con contenido dinámico en formato binario **`JSONB`** y un módulo aislado por cada integrante en su propia rama para evitar cualquier tipo de conflicto de merge en los **Pull Requests (PR)** hacia `main`.

> **Stack:** TypeScript + Node.js 20+ / Bun + `@libsql/client` (libSQL/Turso) + `tsx`.  
> **Repositorio GitHub:** <https://github.com/VumerG/Sistema_de_registro2026>  
> **Diseño de Base de Datos:** Single-Table Design con `jsonb()` y `json()`.

---

## Equipo y distribución de ramas

Cada integrante tiene asignado un tema y una rama específica. La rama, la carpeta en `/src/modules/` y el valor del campo `modulo` en la base de datos deben llamarse **exactamente igual**.

| Rol | Integrante | Rama / Módulo | Carpeta dedicada | Descripción del dominio |
| :--- | :--- | :--- | :--- | :--- |
| **Líder** | **Vumer Gallardo** | `registro` | `/src/modules/registro/` | Módulo base/ejemplo: expedientes y registros académicos con datos anidados. |
| **Integrante 1** | **Jefte** | `motos` | `/src/modules/motos/` | Registro de motocicletas, VIN, placas, propietarios, servicios y refacciones. |
| **Integrante 2** | **Edwin** | `plastiqueria` | `/src/modules/plastiqueria/` | Catálogo de productos plásticos, materias primas, lotes y pedidos. |
| **Integrante 3** | **Esteban** | `redes` | `/src/modules/redes/` | Inventario de dispositivos de red (switches, routers, APs), IPs, VLANs e incidencias. |
| **Integrante 4** | **Elian** | `comics` | `/src/modules/comics/` | Catálogo de cómics, editoriales, volúmenes, números, autores, condición y colecciones. |

> [!IMPORTANT]
> **Regla de oro del equipo:** Ningún integrante debe modificar archivos fuera de su carpeta `/src/modules/[su-modulo]/`. La infraestructura compartida (`/src/core/`, `/src/db/`, `/scripts/`, `package.json`) es administrada únicamente por el Líder en `main`.

---

## Arquitectura del proyecto

```text
.
├── .env.example                       # Plantilla de variables de entorno para Turso
├── .github/
│   └── pull_request_template.md       # Checklist obligatoria para apertura y revisión de PRs
├── package.json                       # Scripts npm y dependencias del proyecto
├── scripts/
│   ├── db-init.ts                     # Script ejecutable npm run db:init (lo corre el líder una vez)
│   └── run-tests.js                   # Runner universal de pruebas (compatible con Node.js y Bun)
├── src/
│   ├── core/                          # Núcleo compartido (no modificar por los integrantes)
│   │   ├── json.ts                    # Serialización, validación y merge profundo de objetos JSON
│   │   ├── module-repository.ts       # Repositorio genérico CRUD sobre la tabla compartida
│   │   └── types.ts                   # Definición de tipos base y contratos
│   ├── db/
│   │   ├── client.ts                  # Conexión singleton a Turso con @libsql/client
│   │   └── schema.ts                  # DDL de la tabla records e índices
│   └── modules/
│       └── registro/                  # MÓDULO BASE DEL LÍDER (ejemplo funcional completo)
│           ├── config.ts              # Constantes del módulo y autor del líder
│           ├── demo.ts                # Demostración ejecutable de CRUD completo (npm run demo)
│           ├── index.ts               # Exportaciones públicas del módulo
│           ├── repository.ts          # Extensión de ModuleRepository fijando el módulo
│           ├── service.ts             # Lógica de negocio y validaciones del dominio
│           └── types.ts               # Tipo complejo RegistroAcademico
└── tests/
    └── module-repository.test.ts      # Pruebas automatizadas de aislamiento y operaciones JSONB
```

Cada compañero trabaja dentro de su carpeta dentro de `src/modules/` en **su propia rama**:
- En rama `motos`: `src/modules/motos/`
- En rama `plastiqueria`: `src/modules/plastiqueria/`
- En rama `redes`: `src/modules/redes/`
- En rama `comics`: `src/modules/comics/`

Al enviar sus Pull Requests hacia `main`, cada módulo vive en su propia carpeta aislada, garantizando **cero conflictos de merge**.

---

## Especificaciones de la Base de Datos (Single-Table Design)

Todos los módulos persisten sus datos en una única tabla compartida en Turso llamada `records`, compuesta por **5 columnas exactas**:

| Columna | Tipo SQL | Descripción |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | Identificador único UUID v4 (generado por el DEFAULT de SQLite/Turso si no se envía). |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | Fecha y hora de creación del registro. |
| `autor` | `TEXT NOT NULL` | Nombre del integrante creador; inyectado automáticamente por `ModuleRepository`. |
| `modulo` | `TEXT NOT NULL` | Nombre del módulo/rama; inyectado automáticamente por `ModuleRepository`. |
| `content` | `BLOB NOT NULL CHECK (json_valid(content, 8))` | Datos dinámicos del módulo guardados en binario nativo con `jsonb(?)`. |

### Reglas de consultas SQL implementadas
1. **Índices obligatorios creados por `db:init`:**
   ```sql
   -- Índice para filtrar por módulo
   CREATE INDEX IF NOT EXISTS idx_records_modulo ON records (modulo);

   -- Índice para filtrar por autor
   CREATE INDEX IF NOT EXISTS idx_records_autor ON records (autor);

   -- Índice compuesto para consultas ordenadas por fecha reciente
   CREATE INDEX IF NOT EXISTS idx_records_modulo_fecha ON records (modulo, created_at DESC);
   ```
2. **Escrituras (`INSERT` / `UPDATE`):** Se utiliza `jsonb(?)` sobre la columna `content`. El `CHECK (json_valid(content, 8))` valida que los datos almacenados sean binario JSONB estricto.
3. **Lecturas (`SELECT`):** Se utiliza `json(content)` para deserializar el JSONB legible y `ModuleRepository` lo parsea automáticamente al objeto tipado TypeScript `T`, garantizando que el usuario nunca manipule blobs binarios.
4. **Filtros por campos internos:** Se utiliza `json_extract(content, '$.ruta.al.campo') = ?` para consultar propiedades anidadas dentro de `content`.

---

## La Clase Base `ModuleRepository`

Ubicada en [src/core/module-repository.ts](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/core/module-repository.ts), proporciona a cada integrante un CRUD completo y seguro sin necesidad de escribir SQL:

### Constructor
```ts
const repo = new ModuleRepository<MiTipo>({
  modulo: "motos", // Nombre exacto de tu módulo
  autor: "Jefte",   // Tu nombre
});
```

### Métodos disponibles

| Método | Firma | Descripción |
| :--- | :--- | :--- |
| `create(data)` | `create(data: T): Promise<StoredRecord<T>>` | Convierte `data` a JSONB con `jsonb(?)`, inyecta `autor` y `modulo`, y devuelve el registro guardado con `content` parseado. |
| `findAll()` | `findAll(): Promise<StoredRecord<T>[]>` | Retorna todos los registros correspondientes al módulo del repositorio, ordenados del más reciente al más antiguo. |
| `findById(id)` | `findById(id: string): Promise<StoredRecord<T> \| null>` | Busca un registro por su UUID dentro del módulo. Retorna `null` si no existe o si pertenece a otro módulo. |
| `findByField(key, val)` | `findByField(jsonKey: string, value: JsonPrimitive): Promise<StoredRecord<T>[]>` | Busca registros por propiedades de `content` (ej. `"marca"`, `"propietario.ciudad"`). Retorna coincidencias del módulo. |
| `update(id, data)` | `update(id: string, data: DeepPartial<T>): Promise<StoredRecord<T> \| null>` | Realiza un merge profundo de las propiedades de `content`, guarda con `jsonb(?)` y devuelve el registro actualizado. |
| `delete(id)` | `delete(id: string): Promise<boolean>` | Elimina el registro por UUID respetando el aislamiento de módulo. Retorna `true` si existía y fue borrado. |

---

## Módulo Base del Líder (`/src/modules/registro/`)

El módulo del Líder se encuentra completamente funcional y sirve como referencia para el equipo:

- **[types.ts](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/modules/registro/types.ts):** Define la estructura compleja `RegistroAcademico` con objetos anidados (`contacto.direccion`), arreglos (`etiquetas`) y booleanos (`documentacion`).
- **[repository.ts](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/modules/registro/repository.ts):** Subclase de `ModuleRepository<RegistroAcademico>` que fija automáticamente `modulo: "registro"` y `autor: "VumerGallardo"`.
- **[service.ts](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/modules/registro/service.ts):** Capa de servicios con reglas de validación de negocio antes de persistir.
- **[demo.ts](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/modules/registro/demo.ts):** Script ejecutable con `npm run demo` que realiza en vivo un ciclo CRUD completo contra Turso.

Para ejecutar la demostración:
```bash
npm run demo
```
*(Para mantener los registros insertados en Turso sin eliminarlos al final de la prueba, ejecuta `KEEP_DEMO_DATA=true npm run demo`).*

---

## Comandos Git para el Líder de Equipo

El Líder de Equipo debe ejecutar estos comandos para inicializar la base compartida en GitHub y generar las ramas de trabajo de cada colaborador:

```bash
# 1. Posicionarse en el directorio del proyecto
cd ~/Sistema_de_registro2026

# 2. Configurar la identidad en Git (si no está lista)
git config user.name "VumerGallardo"
git config user.email "136099923+VumerG@users.noreply.github.com"

# 3. Inicializar repositorio (solo si es nuevo) y agregar origen remoto
# git init
# git remote add origin https://github.com/VumerG/Sistema_de_registro2026.git

# 4. Asegurar que la rama principal se llame main, confirmar y subir
git branch -M main
git add .
git commit -m "feat: boilerplate base con Turso JSONB y modulo registro"
git push -u origin main

# 5. Crear y publicar en GitHub las ramas individuales para cada integrante:
for modulo in motos plastiqueria redes comics; do
  git checkout main
  git checkout -b "$modulo"
  git push -u origin "$modulo"
done

# 6. Regresar a la rama principal
git checkout main
```

---

## Guía paso a paso para los Integrantes del Equipo

### 1. Clonar el repositorio y cambiarse a su rama asignada
Abre tu terminal y clona el proyecto. Cambia inmediatamente a la rama que te corresponde:

```bash
# Clonar el proyecto
git clone https://github.com/VumerG/Sistema_de_registro2026.git
cd Sistema_de_registro2026

# Cambiar a tu rama (ejemplos según tu asignación):
# Si eres Jefte:
git checkout motos

# Si eres Edwin:
git checkout plastiqueria

# Si eres Esteban:
git checkout redes

# Si eres Elian:
git checkout comics
```

Verifica en qué rama estás con:
```bash
git branch --show-current
```

### 2. Instalar dependencias y configurar variables de entorno
```bash
npm install
cp .env.example .env
```
Abre `.env` y pega las credenciales de Turso que te proporcionará el Líder:
```dotenv
TURSO_DATABASE_URL=libsql://tu-base.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOi...
```

> [!WARNING]
> **NO ejecutes `npm run db:init`**: El líder ya creó la tabla compartida en Turso.
> **NUNCA hagas commit de tu archivo `.env`**.

### 3. Trabajar únicamente en tu carpeta de módulo
Crea tus archivos y código **únicamente** en tu carpeta correspondiente:
- Jefte: `/src/modules/motos/`
- Edwin: `/src/modules/plastiqueria/`
- Esteban: `/src/modules/redes/`
- Elian: `/src/modules/comics/`

#### Estructura recomendada para tu módulo:
```text
src/modules/[tu-modulo]/
├── config.ts       # Constante MODULO_[NOMBRE] y tu AUTOR
├── types.ts        # Tipos TypeScript de los datos que guardarás en JSONB
├── repository.ts   # Tu repositorio que extiende o instancia ModuleRepository
├── service.ts      # (Opcional) Reglas de negocio o validaciones
├── demo.ts         # (Recomendado) Script para probar tu CRUD
└── index.ts        # Exportaciones públicas de tu módulo
```

#### Ejemplo de uso en tu módulo (`src/modules/[tu-modulo]/repository.ts`):
```ts
import { ModuleRepository } from "../../core/module-repository.js";
import { AUTOR_MOTOS, MODULO_MOTOS } from "./config.js";
import type { Moto } from "./types.js";

export class MotosRepository extends ModuleRepository<Moto> {
  constructor(autor: string = AUTOR_MOTOS) {
    super({
      modulo: MODULO_MOTOS,
      autor,
    });
  }
}
```

### 4. Validar tu código localmente
Antes de hacer commit y subir cambios, verifica que TypeScript compile y que las pruebas sigan pasando:
```bash
npm run verify
```
*(Ejecuta internamente `npm run typecheck` y `npm test`).*

### 5. Confirmar cambios y enviar Pull Request
```bash
# 1. Revisa que solo hayas modificado archivos dentro de tu carpeta
git status

# 2. Agrega únicamente tu carpeta
git add src/modules/[tu-modulo]

# 3. Haz commit con un mensaje descriptivo
git commit -m "feat([tu-modulo]): implementa CRUD y logica del modulo"

# 4. Sube los cambios a tu rama en GitHub
git push origin [tu-modulo]
```

### 6. Abrir el Pull Request (PR) hacia `main`
1. Entra a GitHub: <https://github.com/VumerG/Sistema_de_registro2026/pulls>
2. Haz clic en **"New pull request"**.
3. Selecciona como base: `main` y como compare: `tu-modulo` (ej. `motos`).
4. Se cargará automáticamente la plantilla de `.github/pull_request_template.md`.
5. Llena todos los campos, marca cada casilla de la **Checklist del integrante**, adjunta los logs o capturas de tu prueba en la sección de evidencia y crea el PR.
6. Notifica al Líder de Equipo para su revisión y merge.

---

## Scripts disponibles en `package.json`

| Comando | Descripción |
| :--- | :--- |
| `npm run db:init` | Crea la tabla `records` y sus índices en Turso (solo debe correrlo el Líder). |
| `npm run demo` | Ejecuta la demostración de CRUD del módulo base `registro`. |
| `npm run typecheck` | Valida todos los tipos TypeScript sin emitir archivos compilados. |
| `npm test` | Ejecuta la suite de pruebas unitarias y de integración sobre `ModuleRepository`. |
| `npm run verify` | Corre en serie `typecheck` y `test` para certificar el código antes de abrir un PR. |
