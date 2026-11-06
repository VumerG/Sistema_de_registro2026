## Módulo / rama

- **Integrante:**
- **Módulo (debe coincidir con la rama y la carpeta):**
- **Rama origen:**
- **Descripción del cambio:**

## Checklist del integrante

- [ ] Mi rama se llama exactamente igual que mi módulo (`git branch --show-current`).
- [ ] Mi código está únicamente dentro de `src/modules/<mi-modulo>/`.
- [ ] No modifiqué `src/core/`, `src/db/`, `scripts/`, `package.json` ni archivos de otros módulos.
- [ ] No subí `.env`, tokens, bases `.db`/`.sqlite` ni secretos.
- [ ] Uso `ModuleRepository`; no agregué SQL manual en mi módulo.
- [ ] Mi `content` es un objeto JSON serializable (sin `undefined`, funciones ni ciclos).
- [ ] Las constantes `modulo` y `autor` de mi módulo son correctas.
- [ ] Ejecuté `npm run typecheck` y pasa.
- [ ] Ejecuté `npm test` y pasa.
- [ ] Probé el CRUD completo contra Turso y borré mis datos de prueba.
- [ ] El PR apunta a `main` (no a otra rama de compañero).
- [ ] Adjunté evidencia de la prueba (log, captura o descripción).

## Checklist del líder (solo revisor)

- [ ] La rama, el campo `modulo` y la carpeta tienen el mismo nombre.
- [ ] El diff solo toca `src/modules/<modulo>/`.
- [ ] No hay secretos ni credenciales en el diff.
- [ ] El módulo usa la clase base y respeta el single-table design.
- [ ] `content` se guarda con `jsonb` y se lee con `json(content)` a través del repositorio.
- [ ] Verifiqué el CRUD y el aislamiento por módulo.
- [ ] El PR no tiene conflictos con `main`.
- [ ] Apruebo el merge.

## Evidencia de prueba

```text
Pega aquí los logs relevantes o describe cómo probaste el módulo.
```
