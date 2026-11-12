# 🚀 Sistema de Registro 2026 — Guía de Desarrollo en Equipo

Bienvenido al proyecto **Sistema de Registro 2026**. Esta es una práctica colaborativa profesional con arquitectura **Single-Table Design** usando **TypeScript**, **Turso (libSQL)** y almacenamiento binario con **`JSONB`**.

El objetivo de esta arquitectura es que **cada uno de ustedes trabaje en su propio módulo de forma 100% independiente en su propia rama**, sin tocar archivos de otros y sin generar jamás conflictos de merge al enviar sus **Pull Requests (PR)** hacia `main`.

---

## 👥 1. ¿Quién eres y qué te toca programar?

Ubica tu nombre en esta tabla para saber tu rama, tu carpeta y tu temática asignada:

| Integrante | Rol | Tu Rama Git | Tu Carpeta Única | Temática de tu módulo |
| :--- | :--- | :--- | :--- | :--- |
| **Vumer Gallardo** | Líder | `registro` | `/src/modules/registro/` | **Módulo Base / Ejemplo:** Expedientes escolares y registros académicos con datos anidados. |
| **Jefte** | Desarrollador | `motos` | `/src/modules/motos/` | **Motos:** Registro de motocicletas, VIN, placas, especificaciones, propietarios, mantenimientos y refacciones. |
| **Edwin** | Desarrollador | `plastiqueria` | `/src/modules/plastiqueria/` | **Plastiquería:** Catálogo de productos plásticos, materias primas (polímeros/resinas), lotes de producción y pedidos. |
| **Esteban** | Desarrollador | `redes` | `/src/modules/redes/` | **Redes:** Inventario de dispositivos (switches, routers, APs, servidores), IPs, VLANs, topología e incidencias. |
| **Elian** | Desarrollador | `comics` | `/src/modules/comics/` | **Cómics:** Catálogo de cómics, editoriales, volúmenes, números, autores, condición física, colecciones y compras. |

> [!CAUTION]
> ### 🛑 REGLA DE ORO DEL EQUIPO
> **SOLO puedes crear, modificar o guardar archivos dentro de tu carpeta:**  
> `src/modules/[tu-modulo]/`  
> 
> **NUNCA modifiques:** `src/core/`, `src/db/`, `scripts/`, `package.json`, `.github/` ni las carpetas de tus otros compañeros. Si todos respetamos esta regla, **los Pull Requests se integrarán automáticamente sin ningún conflicto.**

---

## 🛠️ 2. Guía Paso a Paso: Desde Clonar hasta tu Pull Request

Sigue con atención estos 8 pasos en orden:

### Paso 1: Clonar el proyecto y configurar tu identidad
Abre tu terminal en tu computadora y ejecuta:

```bash
# 1. Clona el repositorio oficial
git clone https://github.com/VumerG/Sistema_de_registro2026.git

# 2. Entra a la carpeta del proyecto
cd Sistema_de_registro2026

# 3. Configura tu nombre y correo en Git si aún no lo has hecho
git config user.name "Tu Nombre Real"
git config user.email "tu_correo@ejemplo.com"
```

---

### Paso 2: Cambiarte INMEDIATAMENTE a tu rama asignada
El repositorio ya tiene creadas las ramas de cada quien. **Nunca trabajes sobre `main`**.

Ejecuta el comando según tu nombre:

```bash
# Si eres Jefte:
git checkout motos

# Si eres Edwin:
git checkout plastiqueria

# Si eres Esteban:
git checkout redes

# Si eres Elian:
git checkout comics
```

> [!TIP]
> Comprueba en qué rama estás en cualquier momento ejecutando:
> ```bash
> git branch --show-current
> ```
> Debe imprimir el nombre exacto de tu módulo (`motos`, `plastiqueria`, `redes` o `comics`).

---

### Paso 3: Instalar las dependencias
Instala los paquetes necesarios del proyecto ejecutando:

```bash
npm install
```
*(Si usas Bun, también puedes ejecutar `bun install`).*

---

### Paso 4: Configurar tus credenciales de base de datos (`.env`)
1. Crea tu archivo local `.env` a partir de la plantilla:
   ```bash
   cp .env.example .env
   ```
2. Abre el archivo `.env` en tu editor de código (VS Code, Cursor, etc.).
3. Pega las credenciales secretas de Turso que te proporcionará el Líder:
   ```dotenv
   TURSO_DATABASE_URL=libsql://sistema-registro-xxxx.turso.io
   TURSO_AUTH_TOKEN=eyJhbGciOi...
   ```
4. Guarda el archivo `.env`.

> [!WARNING]
> - **NO ejecutes `npm run db:init`:** La base de datos y la tabla compartida ya fueron creadas por el Líder.
> - **NUNCA hagas commit ni compartas tu `.env`:** Ya está protegido en el `.gitignore`.

---

### Paso 5: Programar tu Módulo (Estructura y Código)

En tu rama ya tienes una plantilla lista dentro de `src/modules/[tu-modulo]/`.  
La estructura de archivos de tu módulo debe ser la siguiente:

```text
src/modules/[tu-modulo]/
├── config.ts       # Constante con el nombre de tu módulo y tu nombre de autor
├── types.ts        # Tipo TypeScript del contenido JSONB que vas a almacenar
├── repository.ts   # Tu repositorio que extiende la clase ModuleRepository
├── index.ts        # Exportaciones públicas de tu módulo
├── demo.ts         # (Recomendado) Script de prueba donde pruebas tu CRUD
└── README.md       # Documentación de tu módulo
```

#### A. Archivo `config.ts`
Define tu módulo y tu nombre como autor:
```ts
export const MODULO_MOTOS = "motos";
export const AUTOR_MOTOS = "Jefte";
```

#### B. Archivo `types.ts`
Define la estructura TypeScript de los datos que guardarás en `content`. Puedes anidar objetos, números, booleanos y arreglos libremente:
```ts
export type Moto = {
  vin: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  propietario: {
    nombre: string;
    telefono: string;
    correo?: string;
  };
  servicio: {
    kilometraje: number;
    ultimoServicio?: string;
  };
  activa: boolean;
  etiquetas: string[];
};
```

#### C. Archivo `repository.ts`
Hereda de [`ModuleRepository`](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/core/module-repository.ts). ¡No necesitas escribir ninguna consulta SQL!:
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

#### D. ¿Cómo usar tu repositorio para hacer el CRUD?
Dentro de tus funciones o en tu `demo.ts`:

```ts
import { MotosRepository } from "./repository.js";

const repo = new MotosRepository();

// 1. CREATE: Guarda los datos en formato JSONB e inyecta autor y módulo automáticamente
const nuevaMoto = await repo.create({
  vin: "3GSCL33P98S123456",
  placa: "ABC-123-A",
  marca: "Honda",
  modelo: "CB190R",
  anio: 2024,
  color: "Rojo",
  propietario: {
    nombre: "Carlos Gómez",
    telefono: "3312345678",
  },
  servicio: {
    kilometraje: 5000,
  },
  activa: true,
  etiquetas: ["particular", "garantia"],
});
console.log("Moto creada con ID:", nuevaMoto.id);

// 2. FIND ALL: Obtiene todos los registros pertenecientes únicamente a tu módulo
const todas = await repo.findAll();

// 3. FIND BY ID: Busca un registro específico por su UUID
const encontrada = await repo.findById(nuevaMoto.id);

// 4. FIND BY FIELD: Busca dentro de las propiedades internas de tu JSON (incluso anidadas)
const hondas = await repo.findByField("marca", "Honda");
const porDuenio = await repo.findByField("propietario.nombre", "Carlos Gómez");

// 5. UPDATE: Actualización con merge profundo (conserva lo no enviado y actualiza lo nuevo)
const actualizada = await repo.update(nuevaMoto.id, {
  color: "Negro Mate",
  servicio: {
    kilometraje: 5500,
  },
});

// 6. DELETE: Elimina el registro por su UUID
const eliminado = await repo.delete(nuevaMoto.id);
console.log("¿Eliminado correctamente?:", eliminado); // true
```

> [!NOTE]
> ¿Quieres ver un ejemplo 100% completo y funcional?  
> Revisa la carpeta del Líder en [src/modules/registro/](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/modules/registro/). Ahí verás cómo implementó [types.ts](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/modules/registro/types.ts), [service.ts](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/modules/registro/service.ts) y [demo.ts](file:///home/hesiquio/dev/var/proyisma7/Sistema_de_registro2026/src/modules/registro/demo.ts).

---

### Paso 6: Probar tu código localmente
1. **Ejecutar tu script de prueba propio:**  
   Puedes correr tu archivo de demostración con:
   ```bash
   npx tsx src/modules/[tu-modulo]/demo.ts
   ```
2. **Verificar que no haya errores de compilación ni pruebas rotas:**  
   Ejecuta el verificador del proyecto:
   ```bash
   npm run verify
   ```
   *(Este comando corre `npm run typecheck` y `npm test`. **Debe terminar sin ningún error en rojo**).*

---

### Paso 7: Guardar y subir tus cambios a tu rama en GitHub

1. Revisa qué archivos has modificado:
   ```bash
   git status
   ```
   *(Asegúrate de que **SOLO** aparezcan archivos dentro de `src/modules/[tu-modulo]/`)*.

2. Agrega únicamente tu carpeta:
   ```bash
   git add src/modules/[tu-modulo]
   ```

3. Crea tu commit con un mensaje claro:
   ```bash
   git commit -m "feat([tu-modulo]): implementa CRUD y logica de negocio"
   ```

4. Sube tu rama a GitHub:
   ```bash
   git push origin [tu-modulo]
   ```
   *(Por ejemplo: `git push origin motos` o `git push origin comics`)*.

---

### Paso 8: Abrir tu Pull Request (PR) hacia `main`

1. Entra al repositorio en GitHub:  
   👉 **<https://github.com/VumerG/Sistema_de_registro2026/pulls>**
2. Haz clic en el botón verde **"New pull request"**.
3. En la selección de ramas configura:
   - **base:** `main`
   - **compare:** `[tu-modulo]` *(ejemplo: `motos`)*
4. En el título del PR escribe:  
   `feat([tu-modulo]): entrega de modulo completo`
5. En la descripción verás una **plantilla con una Checklist**. Rellena tus datos, marca las casillas con `[x]` y pega la salida de tu consola en **"Evidencia de prueba"**.
6. Haz clic en **"Create pull request"**.
7. ¡Listo! Avisa al Líder de Equipo en el grupo para que revise tu PR y haga el merge a `main`.

---

## 🏛️ 3. Especificaciones de la Base de Datos (Para tu entendimiento)

No necesitas crear tablas ni configurar conexiones, pero es fundamental que conozcas cómo funciona Turso por detrás:

- **Nombre de la tabla única:** `records`
- **Las 5 columnas de la tabla:**
  1. `id` (`TEXT PRIMARY KEY`): UUID generado automáticamente.
  2. `created_at` (`DATETIME`): Fecha y hora de creación automática.
  3. `autor` (`TEXT`): Tu nombre inyectado por `ModuleRepository`.
  4. `modulo` (`TEXT`): Nombre de tu módulo inyectado por `ModuleRepository`.
  5. `content` (`BLOB`): Tus datos convertidos a binario nativo con la función SQL `jsonb(?)`.
- **Aislamiento por módulo:** Cuando ejecutas `findAll()`, el repositorio hace internamente:
  `SELECT id, created_at, autor, modulo, json(content) AS content FROM records WHERE modulo = ?`  
  Esto garantiza que tú solo leas y modifiques los registros que le pertenecen a tu módulo.

---

## ❓ 4. Preguntas Frecuentes y Solución de Problemas

### 🔴 Error: `Falta la variable de entorno TURSO_DATABASE_URL`
👉 **Causa:** No creaste el archivo `.env` o está vacío.  
👉 **Solución:** Ejecuta `cp .env.example .env` y copia las credenciales que te pasó el Líder.

### 🔴 ¿Qué hago si modifiqué por error un archivo fuera de mi carpeta?
👉 **Solución:** Puedes descartar cambios en ese archivo específico sin perder tu trabajo ejecutando:
```bash
git checkout -- ruta/del/archivo/modificado
```

### 🔴 ¿Cómo mantengo mi rama al día con los últimos cambios de `main`?
👉 **Solución:** Si el Líder subió mejoras o aprobó otros módulos, actualiza tu rama así:
```bash
git fetch origin
git merge origin/main
```

### 🔴 ¿Puedo usar `console.log` para depurar?
👉 **Sí, por supuesto.** Puedes imprimir cualquier dato en tus pruebas locales en `demo.ts`.

---

## 📋 5. Comandos Rápidos de Referencia

| Comando | Para qué sirve |
| :--- | :--- |
| `git branch --show-current` | Muestra en qué rama estás parado. |
| `npm run verify` | Corre typecheck y tests para verificar que todo esté perfecto. |
| `npx tsx src/modules/[modulo]/demo.ts` | Ejecuta tu script de prueba propio. |
| `git status` | Revisa qué archivos modificaste antes de hacer commit. |
