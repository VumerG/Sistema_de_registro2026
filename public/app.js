"use strict";

const STORAGE_KEY = "tablero-disenos:miembro";
const MEMBER_HEADER = "X-Team-Member";
const SIN_ASIGNAR = "sin_asignar";
const MAX_ETIQUETAS = 8;

const state = {
  config: null,
  member: null,
  tasks: [],
  filters: {
    q: "",
    area: "",
    prioridad: "",
    responsable: "",
  },
  editingId: null,
  cover: null,
  compressing: false,
  saving: false,
  loading: false,
  firstLoad: true,
  draggingId: null,
  confirmResolve: null,
};

const els = {};
let searchTimer = null;

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  cachearElementos();
  conectarEventos();
  await cargarConfiguracion();
}

/* ------------------------------------------------------------ Referencias */

function cachearElementos() {
  els.identityScreen = document.getElementById("identity-screen");
  els.identityOptions = document.getElementById("identity-options");
  els.identityCancel = document.getElementById("identity-cancel");
  els.identityTitle = document.getElementById("identity-title");
  els.identitySubtitle = document.getElementById("identity-subtitle");
  els.identityNote = document.getElementById("identity-note");

  els.identityButton = document.getElementById("identity-button");
  els.identityAvatar = document.getElementById("identity-avatar");
  els.identityName = document.getElementById("identity-name");
  els.identityRole = document.getElementById("identity-role");

  els.statTotal = document.getElementById("stat-total");
  els.statEnDiseno = document.getElementById("stat-en_diseno");
  els.statRevision = document.getElementById("stat-revision");
  els.statAprobado = document.getElementById("stat-aprobado");

  els.searchInput = document.getElementById("search-input");
  els.filterArea = document.getElementById("filter-area");
  els.filterPrioridad = document.getElementById("filter-prioridad");
  els.filterResponsable = document.getElementById("filter-responsable");
  els.clearFilters = document.getElementById("clear-filters");
  els.refreshButton = document.getElementById("refresh-button");
  els.newTaskButton = document.getElementById("new-task-button");

  els.board = document.getElementById("board");
  els.boardLoading = document.getElementById("board-loading");

  els.taskDialog = document.getElementById("task-dialog");
  els.taskForm = document.getElementById("task-form");
  els.taskDialogTitle = document.getElementById("task-dialog-title");
  els.taskFormError = document.getElementById("task-form-error");
  els.taskMeta = document.getElementById("task-meta");
  els.taskTitulo = document.getElementById("task-titulo");
  els.taskDescripcion = document.getElementById("task-descripcion");
  els.taskArea = document.getElementById("task-area");
  els.taskEstado = document.getElementById("task-estado");
  els.taskPrioridad = document.getElementById("task-prioridad");
  els.taskResponsable = document.getElementById("task-responsable");
  els.taskFecha = document.getElementById("task-fecha");
  els.taskEtiquetas = document.getElementById("task-etiquetas");
  els.taskTagsPreview = document.getElementById("task-tags-preview");
  els.taskEnlace = document.getElementById("task-enlace");
  els.coverZone = document.getElementById("cover-zone");
  els.coverInput = document.getElementById("cover-input");
  els.coverPreview = document.getElementById("cover-preview");
  els.coverImage = document.getElementById("cover-image");
  els.coverChange = document.getElementById("cover-change");
  els.coverRemove = document.getElementById("cover-remove");
  els.coverStatus = document.getElementById("cover-status");
  els.taskDelete = document.getElementById("task-delete");
  els.taskCancel = document.getElementById("task-cancel");
  els.taskSubmit = document.getElementById("task-submit");
  els.taskClose = document.getElementById("task-close");

  els.confirmDialog = document.getElementById("confirm-dialog");
  els.confirmMessage = document.getElementById("confirm-message");
  els.confirmCancel = document.getElementById("confirm-cancel");
  els.confirmAccept = document.getElementById("confirm-accept");
  els.confirmClose = document.getElementById("confirm-close");

  els.toasts = document.getElementById("toasts");
}

function conectarEventos() {
  els.identityOptions.addEventListener("click", alElegirIntegrante);
  els.identityCancel.addEventListener("click", cerrarSelectorIdentidad);
  els.identityButton.addEventListener("click", mostrarSelectorIdentidad);

  els.searchInput.addEventListener("input", alBuscar);
  els.filterArea.addEventListener("change", alCambiarFiltros);
  els.filterPrioridad.addEventListener("change", alCambiarFiltros);
  els.filterResponsable.addEventListener("change", alCambiarFiltros);
  els.clearFilters.addEventListener("click", limpiarFiltros);
  els.refreshButton.addEventListener("click", actualizarTablero);
  els.newTaskButton.addEventListener("click", () => abrirNueva("backlog"));

  els.board.addEventListener("click", alHacerClicTablero);
  els.board.addEventListener("keydown", alPresionarTeclaEnTablero);
  els.board.addEventListener("dragstart", alIniciarArrastre);
  els.board.addEventListener("dragend", alTerminarArrastre);
  els.board.addEventListener("dragover", alArrastrarSobreTablero);
  els.board.addEventListener("dragleave", alSalirDeColumna);
  els.board.addEventListener("drop", alSoltarTarjeta);

  els.taskForm.addEventListener("submit", guardarTarea);
  els.taskClose.addEventListener("click", cerrarDialogo);
  els.taskCancel.addEventListener("click", cerrarDialogo);
  els.taskDelete.addEventListener("click", alEliminarDesdeModal);
  els.taskDialog.addEventListener("close", limpiarFormulario);
  els.taskDialog.addEventListener("cancel", (event) => {
    if (state.saving) {
      event.preventDefault();
    }
  });
  els.taskDialog.addEventListener("click", (event) => {
    if (event.target === els.taskDialog) {
      cerrarDialogo();
    }
  });
  els.taskEtiquetas.addEventListener("input", actualizarTagPreview);

  els.coverInput.addEventListener("change", () => {
    const archivo = els.coverInput.files?.[0];
    if (archivo) {
      procesarArchivo(archivo);
    }
  });
  els.coverChange.addEventListener("click", () => els.coverInput.click());
  els.coverRemove.addEventListener("click", quitarPortada);

  for (const evento of ["dragenter", "dragover"]) {
    els.coverZone.addEventListener(evento, (event) => {
      event.preventDefault();
      els.coverZone.classList.add("drag-over");
    });
  }

  for (const evento of ["dragleave", "drop"]) {
    els.coverZone.addEventListener(evento, (event) => {
      event.preventDefault();
      els.coverZone.classList.remove("drag-over");
    });
  }

  els.coverZone.addEventListener("drop", (event) => {
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo) {
      procesarArchivo(archivo);
    }
  });

  els.confirmCancel.addEventListener("click", () => cerrarConfirmacion(false));
  els.confirmAccept.addEventListener("click", () => cerrarConfirmacion(true));
  els.confirmClose.addEventListener("click", () => cerrarConfirmacion(false));
  els.confirmDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    cerrarConfirmacion(false);
  });
}

/* --------------------------------------------------------------- Arranque */

async function cargarConfiguracion() {
  try {
    const config = await api("/api/config", { auth: false });
    state.config = config;
    llenarSelectores();

    const guardado = leerStorage();
    const miembro = config.miembros.find((item) => item.id === guardado);

    if (miembro) {
      await entrarComo(miembro, true);
    } else {
      mostrarSelectorIdentidad();
    }
  } catch (error) {
    mostrarErrorConfiguracion(error);
  }
}

function mostrarErrorConfiguracion(error) {
  els.identityScreen.hidden = false;
  els.identityTitle.textContent = "No se pudo cargar el tablero";
  els.identitySubtitle.textContent = error.message;
  els.identityNote.hidden = true;
  els.identityCancel.hidden = true;
  els.identityOptions.innerHTML = `
    <div class="identity-error">
      <p>Revisa que el servidor esté en ejecución y que las credenciales de Turso estén configuradas en <code>.env</code>.</p>
      <button class="button primary" type="button" id="retry-config">Reintentar</button>
    </div>
  `;

  const retry = document.getElementById("retry-config");
  retry?.addEventListener("click", () => {
    els.identityTitle.textContent = "¿Quién está trabajando?";
    els.identitySubtitle.textContent =
      "Elige tu nombre para registrar la autoría de los diseños que subas.";
    els.identityNote.hidden = false;
    els.identityOptions.innerHTML = "";
    cargarConfiguracion();
  });
}

function leerStorage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function guardarStorage(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Si el navegador bloquea el almacenamiento, la sesión sigue en memoria.
  }
}

function borrarStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible no hay nada que borrar.
  }
}

function mostrarSelectorIdentidad() {
  if (!state.config) {
    return;
  }

  const cambiando = Boolean(state.member);
  els.identityTitle.textContent = cambiando
    ? "Cambiar de integrante"
    : "¿Quién está trabajando?";
  els.identitySubtitle.textContent = cambiando
    ? "Elige otra identidad para continuar. El tablero es el mismo para todo el equipo."
    : "Elige tu nombre para registrar la autoría de los diseños que subas.";
  els.identityNote.hidden = false;
  els.identityCancel.hidden = !cambiando;
  els.identityOptions.innerHTML = state.config.miembros
    .map(miembroBotonHTML)
    .join("");
  els.identityScreen.hidden = false;

  const primero = els.identityOptions.querySelector(".identity-option");
  primero?.focus();
}

function cerrarSelectorIdentidad() {
  if (!state.member) {
    return;
  }

  els.identityScreen.hidden = true;
}

function alElegirIntegrante(event) {
  const boton = event.target.closest("[data-member]");
  if (!boton || !state.config) {
    return;
  }

  const miembro = state.config.miembros.find(
    (item) => item.id === boton.dataset.member,
  );

  if (miembro) {
    entrarComo(miembro, false);
  }
}

async function entrarComo(miembro, silencioso) {
  state.member = miembro;
  guardarStorage(miembro.id);
  actualizarChipIdentidad();
  els.identityScreen.hidden = true;

  if (!silencioso) {
    toast(`Hola, ${miembro.nombre}.`, "success");
  }

  await cargarTareas();
}

function actualizarChipIdentidad() {
  if (!state.member) {
    els.identityButton.hidden = true;
    return;
  }

  els.identityButton.hidden = false;
  els.identityAvatar.textContent = iniciales(state.member.nombre);
  els.identityAvatar.style.setProperty(
    "--avatar-color",
    colorSeguro(state.member.color),
  );
  els.identityName.textContent = state.member.nombre;
  els.identityRole.textContent = state.member.rol;
}

/* --------------------------------------------------------------- Opciones */

function llenarSelectores() {
  if (!state.config) {
    return;
  }

  const { areas, estados, prioridades, miembros } = state.config;

  els.filterArea.innerHTML =
    opcion("", "Todas las áreas") +
    areas.map((area) => opcion(area.id, area.etiqueta)).join("");
  els.filterPrioridad.innerHTML =
    opcion("", "Todas") +
    prioridades
      .map((prioridad) => opcion(prioridad.id, prioridad.etiqueta))
      .join("");
  els.filterResponsable.innerHTML =
    opcion("", "Todos") +
    opcion(SIN_ASIGNAR, "Sin asignar") +
    miembros.map((miembro) => opcion(miembro.id, miembro.nombre)).join("");

  els.taskArea.innerHTML =
    opcion("", "Selecciona un área") +
    areas.map((area) => opcion(area.id, area.etiqueta)).join("");
  els.taskEstado.innerHTML = estados
    .map((estado) => opcion(estado.id, estado.etiqueta))
    .join("");
  els.taskPrioridad.innerHTML = prioridades
    .map((prioridad) => opcion(prioridad.id, prioridad.etiqueta))
    .join("");
  els.taskResponsable.innerHTML =
    opcion("", "Sin asignar") +
    miembros.map((miembro) => opcion(miembro.id, miembro.nombre)).join("");

  els.filterArea.value = state.filters.area;
  els.filterPrioridad.value = state.filters.prioridad;
  els.filterResponsable.value = state.filters.responsable;
  els.searchInput.value = state.filters.q;
  actualizarBotonLimpiar();
}

function opcion(valor, etiqueta) {
  return `<option value="${escapeAttr(valor)}">${escapeHtml(etiqueta)}</option>`;
}

/* -------------------------------------------------------------- Identidad */

function miembroBotonHTML(miembro) {
  return `
    <button class="identity-option" type="button" data-member="${escapeAttr(miembro.id)}">
      ${avatarHTML(miembro, "avatar-lg")}
      <span class="identity-option-text">
        <strong>${escapeHtml(miembro.nombre)}</strong>
        <small>${escapeHtml(miembro.rol)}</small>
      </span>
      <span class="identity-option-check" aria-hidden="true">
        ${icono("check")}
      </span>
    </button>
  `;
}

/* ------------------------------------------------------------------ Datos */

async function api(ruta, { method = "GET", body, auth = true } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && state.member) {
    headers[MEMBER_HEADER] = state.member.id;
  }

  let respuesta;

  try {
    respuesta = await fetch(ruta, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Revisa que esté en ejecución.",
    );
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const error = new Error(
      datos.error || `No se pudo completar la operación (${respuesta.status}).`,
    );
    error.status = respuesta.status;
    throw error;
  }

  return datos;
}

async function cargarTareas() {
  if (!state.member) {
    return false;
  }

  state.loading = true;
  els.refreshButton.disabled = true;
  els.refreshButton.classList.add("is-spinning");

  if (state.firstLoad) {
    els.boardLoading.hidden = false;
  }

  let exito = false;

  try {
    const datos = await api("/api/tasks");
    state.tasks = Array.isArray(datos.tareas) ? datos.tareas : [];
    state.firstLoad = false;
    exito = true;
    renderTodo();
  } catch (error) {
    state.firstLoad = false;
    manejarErrorSesion(error);
    toast(error.message, "error");
    renderTodo();
  } finally {
    state.loading = false;
    els.refreshButton.disabled = false;
    els.refreshButton.classList.remove("is-spinning");
    els.boardLoading.hidden = true;
  }

  return exito;
}

async function actualizarTablero() {
  if (!state.member) {
    mostrarSelectorIdentidad();
    return;
  }

  const exito = await cargarTareas();

  if (exito) {
    toast("Tablero actualizado.", "info");
  }
}

function manejarErrorSesion(error) {
  if (error.status !== 401 && error.status !== 403) {
    return;
  }

  state.member = null;
  state.tasks = [];
  borrarStorage();
  actualizarChipIdentidad();

  if (els.taskDialog.open) {
    els.taskDialog.close();
  }

  mostrarSelectorIdentidad();
}

/* --------------------------------------------------------------- Filtrado */

function alBuscar() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filters.q = els.searchInput.value.trim();
    actualizarBotonLimpiar();
    renderTablero();
  }, 120);
}

function alCambiarFiltros() {
  state.filters.area = els.filterArea.value;
  state.filters.prioridad = els.filterPrioridad.value;
  state.filters.responsable = els.filterResponsable.value;
  actualizarBotonLimpiar();
  renderTablero();
}

function limpiarFiltros() {
  state.filters = {
    q: "",
    area: "",
    prioridad: "",
    responsable: "",
  };
  els.searchInput.value = "";
  els.filterArea.value = "";
  els.filterPrioridad.value = "";
  els.filterResponsable.value = "";
  actualizarBotonLimpiar();
  renderTablero();
}

function actualizarBotonLimpiar() {
  const activos = Boolean(
    state.filters.q ||
      state.filters.area ||
      state.filters.prioridad ||
      state.filters.responsable,
  );
  els.clearFilters.hidden = !activos;
}

function filtrarTareas(tareas) {
  const busqueda = normalizar(state.filters.q);

  return tareas.filter((tarea) => {
    if (state.filters.area && tarea.area !== state.filters.area) {
      return false;
    }

    if (
      state.filters.prioridad &&
      tarea.prioridad !== state.filters.prioridad
    ) {
      return false;
    }

    if (state.filters.responsable === SIN_ASIGNAR) {
      if (tarea.responsable) {
        return false;
      }
    } else if (
      state.filters.responsable &&
      tarea.responsable !== state.filters.responsable
    ) {
      return false;
    }

    if (!busqueda) {
      return true;
    }

    const responsable = buscarMiembro(tarea.responsable);
    const etiquetas = Array.isArray(tarea.etiquetas) ? tarea.etiquetas : [];
    const texto = [
      tarea.titulo,
      tarea.descripcion,
      tarea.area,
      tarea.responsable,
      responsable?.nombre ?? "",
      ...etiquetas,
    ].join(" ");

    return normalizar(texto).includes(busqueda);
  });
}

/* ---------------------------------------------------------------- Render */

function renderTodo() {
  renderEstadisticas();
  renderTablero();
  actualizarBotonLimpiar();
}

function renderEstadisticas() {
  const contar = (estado) =>
    state.tasks.filter((tarea) => tarea.estado === estado).length;

  els.statTotal.textContent = String(state.tasks.length);
  els.statEnDiseno.textContent = String(contar("en_diseno"));
  els.statRevision.textContent = String(contar("revision"));
  els.statAprobado.textContent = String(contar("aprobado"));
}

function renderTablero() {
  if (!state.config) {
    return;
  }

  const visibles = filtrarTareas(state.tasks);

  els.board.innerHTML = state.config.estados
    .map((estado) => {
      const tareas = visibles
        .filter((tarea) => tarea.estado === estado.id)
        .sort(compararTareas);
      const contenido = tareas.length
        ? tareas.map(tarjetaHTML).join("")
        : `<div class="column-empty">Sin diseños aquí.<br>Suelta una tarjeta o crea uno nuevo.</div>`;

      return `
        <section class="board-column" data-estado="${escapeAttr(estado.id)}" aria-label="${escapeAttr(estado.etiqueta)}">
          <header class="column-header">
            <div class="column-title">
              <span class="state-dot" style="--dot:${colorSeguro(estado.color)}"></span>
              <h2>${escapeHtml(estado.etiqueta)}</h2>
              <span class="count">${tareas.length}</span>
            </div>
            <button
              class="icon-button add-task"
              type="button"
              data-action="new"
              data-estado="${escapeAttr(estado.id)}"
              title="Agregar a ${escapeAttr(estado.etiqueta)}"
              aria-label="Agregar a ${escapeAttr(estado.etiqueta)}"
            >
              ${icono("plus")}
            </button>
          </header>
          <div class="column-cards">
            ${contenido}
          </div>
        </section>
      `;
    })
    .join("");
}

function compararTareas(a, b) {
  const ordenA = Number(a.orden);
  const ordenB = Number(b.orden);
  const aValido = Number.isFinite(ordenA) ? ordenA : 0;
  const bValido = Number.isFinite(ordenB) ? ordenB : 0;

  if (aValido !== bValido) {
    return aValido - bValido;
  }

  return String(b.createdAt).localeCompare(String(a.createdAt));
}

function tarjetaHTML(tarea) {
  const area = buscarDefinicion(state.config.areas, tarea.area);
  const prioridad = buscarDefinicion(state.config.prioridades, tarea.prioridad);
  const responsable = buscarMiembro(tarea.responsable);
  const etiquetas = Array.isArray(tarea.etiquetas) ? tarea.etiquetas : [];
  const vencida =
    Boolean(tarea.fechaEntrega) &&
    tarea.estado !== "aprobado" &&
    tarea.fechaEntrega < hoyISO();
  const orden = Number.isFinite(Number(tarea.orden)) ? Number(tarea.orden) : 0;
  const portada =
    typeof tarea.portada === "string" && tarea.portada.startsWith("data:image/")
      ? `<div class="card-cover"><img src="${escapeAttr(tarea.portada)}" alt="" loading="lazy" /></div>`
      : "";
  const etiquetasHTML = etiquetas
    .slice(0, 3)
    .map((etiqueta) => `<span class="tag">${escapeHtml(etiqueta)}</span>`)
    .join("");
  const extra =
    etiquetas.length > 3
      ? `<span class="tag more">+${etiquetas.length - 3}</span>`
      : "";
  const enlace =
    typeof tarea.enlace === "string" && esUrlSegura(tarea.enlace)
      ? `<a
          class="icon-button"
          href="${escapeAttr(tarea.enlace)}"
          target="_blank"
          rel="noopener noreferrer"
          data-action="link"
          title="Abrir enlace del diseño"
          aria-label="Abrir enlace del diseño"
        >${icono("external")}</a>`
      : "";
  const asignado = responsable
    ? `${avatarHTML(responsable)}<span>${escapeHtml(responsable.nombre)}</span>`
    : `<span class="avatar empty" title="Sin asignar">?</span><span>Sin asignar</span>`;
  const fecha = tarea.fechaEntrega
    ? `<span class="due${vencida ? " overdue" : ""}" title="Fecha de entrega">
        ${icono("calendar")}${escapeHtml(fechaCorta(tarea.fechaEntrega))}
      </span>`
    : "";

  return `
    <article
      class="task-card"
      draggable="true"
      tabindex="0"
      data-id="${escapeAttr(tarea.id)}"
      data-orden="${orden}"
      aria-label="${escapeAttr(`Diseño: ${tarea.titulo}. Abrir para editar.`)}"
    >
      ${portada}
      <div class="card-body">
        <div class="card-badges">
          <span class="badge area" style="--badge-color:${colorSeguro(area?.color ?? "#64748b")}">
            <span class="badge-dot"></span>${escapeHtml(area?.etiqueta ?? tarea.area)}
          </span>
          <span class="badge priority ${escapeAttr(tarea.prioridad)}">
            ${escapeHtml(prioridad?.etiqueta ?? tarea.prioridad)}
          </span>
        </div>
        <h3 class="card-title">${escapeHtml(tarea.titulo)}</h3>
        ${
          tarea.descripcion
            ? `<p class="card-description">${escapeHtml(tarea.descripcion)}</p>`
            : ""
        }
        ${
          etiquetasHTML
            ? `<div class="card-tags">${etiquetasHTML}${extra}</div>`
            : ""
        }
        <div class="card-footer">
          <div class="card-assignee">${asignado}</div>
          <div class="card-meta">
            ${fecha}
            <div class="card-actions">
              ${enlace}
              <button class="icon-button" type="button" data-action="edit" title="Editar diseño" aria-label="Editar diseño">
                ${icono("edit")}
              </button>
              <button class="icon-button" type="button" data-action="delete" title="Eliminar diseño" aria-label="Eliminar diseño">
                ${icono("trash")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function alHacerClicTablero(event) {
  const accion = event.target.closest("[data-action]");
  const tarjeta = event.target.closest(".task-card");

  if (accion) {
    const tipo = accion.dataset.action;

    if (tipo === "new") {
      event.preventDefault();
      abrirNueva(accion.dataset.estado || "backlog");
      return;
    }

    if (tipo === "link") {
      event.stopPropagation();
      return;
    }

    if (!tarjeta) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (tipo === "edit") {
      abrirEdicion(tarjeta.dataset.id);
    } else if (tipo === "delete") {
      eliminarConConfirmacion(tarjeta.dataset.id);
    }

    return;
  }

  if (tarjeta) {
    abrirEdicion(tarjeta.dataset.id);
  }
}

function alPresionarTeclaEnTablero(event) {
  const tarjeta = event.target.closest(".task-card");

  if (!tarjeta || event.target !== tarjeta) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    abrirEdicion(tarjeta.dataset.id);
  }
}

/* ------------------------------------------------------------ Drag & drop */

function alIniciarArrastre(event) {
  const tarjeta = event.target.closest(".task-card");

  if (!tarjeta) {
    return;
  }

  state.draggingId = tarjeta.dataset.id;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tarjeta.dataset.id);
  }

  requestAnimationFrame(() => tarjeta.classList.add("dragging"));
}

function alTerminarArrastre() {
  state.draggingId = null;
  document
    .querySelectorAll(".task-card.dragging")
    .forEach((tarjeta) => tarjeta.classList.remove("dragging"));
  document
    .querySelectorAll(".board-column.drag-over")
    .forEach((columna) => columna.classList.remove("drag-over"));
  renderTablero();
}

function alArrastrarSobreTablero(event) {
  const columna = event.target.closest(".board-column");

  if (!columna || !state.draggingId) {
    return;
  }

  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  document.querySelectorAll(".board-column.drag-over").forEach((otra) => {
    if (otra !== columna) {
      otra.classList.remove("drag-over");
    }
  });
  columna.classList.add("drag-over");

  const lista = columna.querySelector(".column-cards");
  const arrastrada = els.board.querySelector(".task-card.dragging");

  if (!lista || !arrastrada) {
    return;
  }

  lista.querySelector(".column-empty")?.remove();
  const despues = elementoDespuesDelCursor(lista, event.clientY);

  if (despues) {
    lista.insertBefore(arrastrada, despues);
  } else {
    lista.appendChild(arrastrada);
  }
}

function alSalirDeColumna(event) {
  const columna = event.target.closest(".board-column");

  if (!columna) {
    return;
  }

  if (
    event.relatedTarget instanceof Node &&
    columna.contains(event.relatedTarget)
  ) {
    return;
  }

  columna.classList.remove("drag-over");
}

function alSoltarTarjeta(event) {
  const columna = event.target.closest(".board-column");

  if (!columna || !state.draggingId) {
    return;
  }

  event.preventDefault();
  columna.classList.remove("drag-over");

  const arrastrada = els.board.querySelector(".task-card.dragging");
  const tarea = state.tasks.find((item) => item.id === state.draggingId);

  if (!arrastrada || !tarea) {
    state.draggingId = null;
    renderTablero();
    return;
  }

  const estado = columna.dataset.estado;
  const lista = columna.querySelector(".column-cards");
  const tarjetas = lista
    ? [...lista.querySelectorAll(".task-card")]
    : [];
  const indice = tarjetas.indexOf(arrastrada);
  const anterior = indice > 0 ? tarjetas[indice - 1] : null;
  const siguiente =
    indice >= 0 && indice < tarjetas.length - 1
      ? tarjetas[indice + 1]
      : null;
  const nuevoOrden = calcularOrden(anterior, siguiente);

  state.draggingId = null;

  if (
    tarea.estado === estado &&
    Math.abs(Number(tarea.orden) - nuevoOrden) < 0.0001
  ) {
    renderTablero();
    return;
  }

  const estadoAnterior = tarea.estado;
  const ordenAnterior = tarea.orden;
  tarea.estado = estado;
  tarea.orden = nuevoOrden;
  renderTodo();
  guardarMovimiento(
    tarea,
    estadoAnterior,
    ordenAnterior,
    estado,
    nuevoOrden,
  );
}

function elementoDespuesDelCursor(contenedor, y) {
  const tarjetas = [
    ...contenedor.querySelectorAll(".task-card:not(.dragging)"),
  ];

  return tarjetas.reduce(
    (cercana, tarjeta) => {
      const caja = tarjeta.getBoundingClientRect();
      const distancia = y - caja.top - caja.height / 2;

      if (distancia < 0 && distancia > cercana.distancia) {
        return { distancia, elemento: tarjeta };
      }

      return cercana;
    },
    { distancia: Number.NEGATIVE_INFINITY, elemento: null },
  ).elemento;
}

function calcularOrden(anterior, siguiente) {
  const previo = anterior ? Number(anterior.dataset.orden) : NaN;
  const posterior = siguiente ? Number(siguiente.dataset.orden) : NaN;
  const previoValido = Number.isFinite(previo);
  const posteriorValido = Number.isFinite(posterior);

  if (!previoValido && !posteriorValido) {
    return Date.now();
  }

  if (!previoValido) {
    return Math.max(0, posterior / 2);
  }

  if (!posteriorValido) {
    return previo + 1000;
  }

  if (posterior > previo) {
    return (previo + posterior) / 2;
  }

  return previo + 1000;
}

async function guardarMovimiento(
  tarea,
  estadoAnterior,
  ordenAnterior,
  estado,
  orden,
) {
  try {
    const datos = await api(`/api/tasks/${encodeURIComponent(tarea.id)}`, {
      method: "PATCH",
      body: { estado, orden },
    });
    reemplazarTarea(datos.tarea);
    renderTodo();
    toast(
      `“${tarea.titulo}” se movió a ${etiquetaEstado(estado)}.`,
      "success",
    );
  } catch (error) {
    tarea.estado = estadoAnterior;
    tarea.orden = ordenAnterior;
    renderTodo();
    manejarErrorSesion(error);
    toast(error.message, "error");
  }
}

/* ---------------------------------------------------------------- Modal */

function abrirNueva(estado = "backlog") {
  if (!state.member) {
    mostrarSelectorIdentidad();
    return;
  }

  limpiarFormulario();
  state.editingId = null;
  els.taskDialogTitle.textContent = "Nuevo diseño";
  els.taskDelete.hidden = true;
  els.taskMeta.hidden = true;
  els.taskArea.value = "";
  els.taskEstado.value = state.config.estados.some(
    (item) => item.id === estado,
  )
    ? estado
    : "backlog";
  els.taskPrioridad.value = "media";
  els.taskResponsable.value = state.member.id;
  els.taskEtiquetas.value = "";
  actualizarTagPreview();
  actualizarBotonGuardar();
  els.taskDialog.showModal();
  setTimeout(() => els.taskTitulo.focus(), 30);
}

function abrirEdicion(id) {
  const tarea = state.tasks.find((item) => item.id === id);

  if (!tarea) {
    return;
  }

  if (!state.member) {
    mostrarSelectorIdentidad();
    return;
  }

  limpiarFormulario();
  state.editingId = tarea.id;
  els.taskDialogTitle.textContent = "Editar diseño";
  els.taskDelete.hidden = false;
  els.taskMeta.hidden = false;
  els.taskMeta.textContent = `Creado por ${nombreMiembro(
    tarea.autor,
  )} el ${fechaLarga(tarea.createdAt)} · Última edición: ${nombreMiembro(
    tarea.actualizadoPor,
  )} el ${fechaLarga(tarea.actualizadoEn)}`;
  els.taskTitulo.value = tarea.titulo ?? "";
  els.taskDescripcion.value = tarea.descripcion ?? "";
  els.taskArea.value = tarea.area ?? "";
  els.taskEstado.value = tarea.estado ?? "backlog";
  els.taskPrioridad.value = tarea.prioridad ?? "media";
  els.taskResponsable.value = tarea.responsable ?? "";
  els.taskFecha.value = tarea.fechaEntrega ?? "";
  els.taskEtiquetas.value = Array.isArray(tarea.etiquetas)
    ? tarea.etiquetas.join(", ")
    : "";
  els.taskEnlace.value = tarea.enlace ?? "";
  state.cover = tarea.portada ?? null;
  actualizarPortada();
  actualizarTagPreview();
  actualizarBotonGuardar();
  els.taskDialog.showModal();
  setTimeout(() => els.taskTitulo.focus(), 30);
}

function cerrarDialogo() {
  if (state.saving) {
    return;
  }

  if (els.taskDialog.open) {
    els.taskDialog.close();
  }
}

function limpiarFormulario() {
  els.taskForm.reset();
  state.editingId = null;
  state.cover = null;
  state.compressing = false;
  state.saving = false;
  els.taskFormError.hidden = true;
  els.taskFormError.textContent = "";
  els.taskMeta.hidden = true;
  els.taskMeta.textContent = "";
  els.coverInput.value = "";
  els.coverStatus.textContent = "";
  els.coverStatus.className = "hint";
  actualizarPortada();
  actualizarTagPreview();
  actualizarBotonGuardar();
}

function actualizarBotonGuardar() {
  const ocupado = state.saving || state.compressing;
  els.taskSubmit.disabled = ocupado;

  if (state.saving) {
    els.taskSubmit.textContent = "Guardando…";
  } else if (state.compressing) {
    els.taskSubmit.textContent = "Procesando imagen…";
  } else {
    els.taskSubmit.textContent = state.editingId
      ? "Guardar cambios"
      : "Crear diseño";
  }
}

async function guardarTarea(event) {
  event.preventDefault();

  if (state.saving || state.compressing || !state.member) {
    return;
  }

  const titulo = els.taskTitulo.value.trim();
  const area = els.taskArea.value;

  if (!titulo) {
    mostrarErrorFormulario("El título es obligatorio.");
    els.taskTitulo.focus();
    return;
  }

  if (!area) {
    mostrarErrorFormulario("Selecciona el área del diseño.");
    els.taskArea.focus();
    return;
  }

  const cuerpo = {
    titulo,
    descripcion: els.taskDescripcion.value.trim(),
    area,
    estado: els.taskEstado.value,
    prioridad: els.taskPrioridad.value,
    responsable: els.taskResponsable.value || null,
    fechaEntrega: els.taskFecha.value || null,
    etiquetas: parsearEtiquetas(els.taskEtiquetas.value),
    enlace: els.taskEnlace.value.trim() || null,
    portada: state.cover,
  };

  state.saving = true;
  actualizarBotonGuardar();
  ocultarErrorFormulario();

  try {
    const editando = Boolean(state.editingId);
    const datos = editando
      ? await api(`/api/tasks/${encodeURIComponent(state.editingId)}`, {
          method: "PATCH",
          body: cuerpo,
        })
      : await api("/api/tasks", {
          method: "POST",
          body: cuerpo,
        });

    if (editando) {
      reemplazarTarea(datos.tarea);
    } else {
      state.tasks.push(datos.tarea);
    }

    renderTodo();
    els.taskDialog.close();
    toast(editando ? "Diseño actualizado." : "Diseño creado.", "success");
  } catch (error) {
    manejarErrorSesion(error);
    mostrarErrorFormulario(error.message);
  } finally {
    state.saving = false;
    actualizarBotonGuardar();
  }
}

function reemplazarTarea(tarea) {
  const indice = state.tasks.findIndex((item) => item.id === tarea.id);

  if (indice === -1) {
    state.tasks.push(tarea);
  } else {
    state.tasks[indice] = tarea;
  }
}

function mostrarErrorFormulario(mensaje) {
  els.taskFormError.innerHTML = `${icono("alert")}<span>${escapeHtml(
    mensaje,
  )}</span>`;
  els.taskFormError.hidden = false;
}

function ocultarErrorFormulario() {
  els.taskFormError.hidden = true;
  els.taskFormError.textContent = "";
}

function parsearEtiquetas(valor) {
  return String(valor)
    .split(",")
    .map((etiqueta) => etiqueta.trim())
    .filter(Boolean)
    .slice(0, MAX_ETIQUETAS);
}

function actualizarTagPreview() {
  const etiquetas = parsearEtiquetas(els.taskEtiquetas.value);
  els.taskTagsPreview.innerHTML = etiquetas
    .map((etiqueta) => `<span class="tag">${escapeHtml(etiqueta)}</span>`)
    .join("");
}

/* --------------------------------------------------------------- Portada */

function actualizarPortada() {
  if (state.cover) {
    els.coverImage.src = state.cover;
    els.coverPreview.hidden = false;
    els.coverZone.hidden = true;
  } else {
    els.coverImage.removeAttribute("src");
    els.coverPreview.hidden = true;
    els.coverZone.hidden = false;
  }
}

function quitarPortada() {
  state.cover = null;
  els.coverInput.value = "";
  els.coverStatus.textContent = "";
  els.coverStatus.className = "hint";
  actualizarPortada();
}

async function procesarArchivo(archivo) {
  if (!archivo || state.compressing) {
    return;
  }

  state.compressing = true;
  actualizarBotonGuardar();
  els.coverStatus.className = "hint";
  els.coverStatus.textContent = "Procesando imagen…";

  try {
    const dataUrl = await comprimirImagen(archivo);
    state.cover = dataUrl;
    actualizarPortada();
    const kb = Math.round((dataUrl.length * 0.75) / 1024);
    els.coverStatus.className = "hint success";
    els.coverStatus.textContent = `Portada lista (${kb} KB aproximados).`;
  } catch (error) {
    els.coverStatus.className = "hint error";
    els.coverStatus.textContent = error.message;
  } finally {
    state.compressing = false;
    els.coverInput.value = "";
    actualizarBotonGuardar();
  }
}

async function comprimirImagen(archivo) {
  if (!archivo.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen.");
  }

  if (!/^image\/(png|jpeg|webp)$/.test(archivo.type)) {
    throw new Error("Usa una imagen JPG, PNG o WebP.");
  }

  if (archivo.size > 15 * 1024 * 1024) {
    throw new Error("La imagen original no debe superar 15 MB.");
  }

  let mapa;

  try {
    mapa =
      typeof createImageBitmap === "function"
        ? await createImageBitmap(archivo)
        : await cargarImagen(archivo);
  } catch {
    mapa = await cargarImagen(archivo);
  }

  const maxLado = 1400;
  const escala = Math.min(1, maxLado / Math.max(mapa.width, mapa.height));
  const ancho = Math.max(1, Math.round(mapa.width * escala));
  const alto = Math.max(1, Math.round(mapa.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("Tu navegador no pudo procesar la imagen.");
  }

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, ancho, alto);
  contexto.drawImage(mapa, 0, 0, ancho, alto);

  if (typeof mapa.close === "function") {
    mapa.close();
  }

  const limite = Math.min(
    Number(state.config?.limites?.portada) || 1_900_000,
    1_650_000,
  );
  let calidad = 0.84;
  let dataUrl = canvas.toDataURL("image/jpeg", calidad);

  while (dataUrl.length > limite && calidad > 0.38) {
    calidad = Math.max(0.38, calidad - 0.08);
    dataUrl = canvas.toDataURL("image/jpeg", calidad);
  }

  if (dataUrl.length > limite) {
    const reducido = document.createElement("canvas");
    reducido.width = Math.max(1, Math.round(ancho * 0.75));
    reducido.height = Math.max(1, Math.round(alto * 0.75));
    const contextoReducido = reducido.getContext("2d");

    if (!contextoReducido) {
      throw new Error("Tu navegador no pudo procesar la imagen.");
    }

    contextoReducido.fillStyle = "#ffffff";
    contextoReducido.fillRect(0, 0, reducido.width, reducido.height);
    contextoReducido.drawImage(canvas, 0, 0, reducido.width, reducido.height);
    dataUrl = reducido.toDataURL("image/jpeg", 0.7);
  }

  if (dataUrl.length > limite) {
    throw new Error(
      "La imagen sigue siendo demasiado grande. Prueba con una más pequeña.",
    );
  }

  return dataUrl;
}

function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();

    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagen);
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };

    imagen.src = url;
  });
}

/* -------------------------------------------------------------- Eliminar */

function alEliminarDesdeModal() {
  if (state.editingId) {
    eliminarConConfirmacion(state.editingId);
  }
}

async function eliminarConConfirmacion(id) {
  const tarea = state.tasks.find((item) => item.id === id);

  if (!tarea) {
    return;
  }

  const confirmado = await confirmar(
    `¿Eliminar “${tarea.titulo}”? Esta acción no se puede deshacer.`,
  );

  if (!confirmado) {
    return;
  }

  try {
    await api(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.tasks = state.tasks.filter((item) => item.id !== id);
    renderTodo();

    if (state.editingId === id) {
      cerrarDialogo();
    }

    toast("Diseño eliminado.", "success");
  } catch (error) {
    manejarErrorSesion(error);
    toast(error.message, "error");
  }
}

function confirmar(mensaje) {
  return new Promise((resolve) => {
    state.confirmResolve = resolve;
    els.confirmMessage.textContent = mensaje;

    try {
      els.confirmDialog.showModal();
    } catch {
      state.confirmResolve = null;
      resolve(window.confirm(mensaje));
    }
  });
}

function cerrarConfirmacion(valor) {
  if (els.confirmDialog.open) {
    els.confirmDialog.close();
  }

  const resolver = state.confirmResolve;
  state.confirmResolve = null;
  resolver?.(valor);
}

/* ---------------------------------------------------------------- Toasts */

function toast(mensaje, tipo = "info") {
  const elemento = document.createElement("div");
  elemento.className = `toast ${tipo}`;

  const iconoToast = document.createElement("span");
  iconoToast.className = "toast-icon";
  iconoToast.textContent =
    tipo === "error" ? "!" : tipo === "success" ? "✓" : "i";

  const texto = document.createElement("span");
  texto.textContent = mensaje;

  elemento.append(iconoToast, texto);
  els.toasts.appendChild(elemento);

  setTimeout(() => {
    elemento.classList.add("toast-out");
    elemento.addEventListener("animationend", () => elemento.remove(), {
      once: true,
    });
    setTimeout(() => elemento.remove(), 400);
  }, 4200);
}

/* --------------------------------------------------------------- Utilidades */

function buscarMiembro(id) {
  return state.config?.miembros.find((miembro) => miembro.id === id);
}

function buscarDefinicion(lista, id) {
  return Array.isArray(lista)
    ? lista.find((elemento) => elemento.id === id)
    : undefined;
}

function nombreMiembro(id) {
  if (!id) {
    return "Alguien";
  }

  return buscarMiembro(id)?.nombre ?? id;
}

function etiquetaEstado(estado) {
  return buscarDefinicion(state.config?.estados, estado)?.etiqueta ?? estado;
}

function avatarHTML(miembro, extra = "") {
  if (!miembro) {
    return `<span class="avatar empty" title="Sin asignar">?</span>`;
  }

  return `<span class="avatar ${extra}" style="--avatar-color:${colorSeguro(
    miembro.color,
  )}" title="${escapeAttr(miembro.nombre)}">${escapeHtml(
    iniciales(miembro.nombre),
  )}</span>`;
}

function iniciales(nombre) {
  const partes = String(nombre ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) {
    return "?";
  }

  const primera = partes[0]?.[0] ?? "";
  const segunda = partes[1]?.[0] ?? "";
  return `${primera}${segunda}`.toUpperCase();
}

function colorSeguro(valor) {
  return /^#[0-9a-f]{6}$/i.test(String(valor ?? ""))
    ? String(valor)
    : "#94a3b8";
}

function esUrlSegura(valor) {
  try {
    const url = new URL(String(valor));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hoyISO() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function fechaDesde(valor) {
  if (!valor) {
    return null;
  }

  const texto = String(valor);
  const normalizado = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(texto)
    ? `${texto.replace(" ", "T")}Z`
    : texto;
  const fecha = new Date(normalizado);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function fechaCorta(valor) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? ""))) {
    const fecha = new Date(`${valor}T12:00:00`);

    if (!Number.isNaN(fecha.getTime())) {
      return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
      }).format(fecha);
    }
  }

  const fecha = fechaDesde(valor);

  if (!fecha) {
    return String(valor ?? "");
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(fecha);
}

function fechaLarga(valor) {
  const fecha = fechaDesde(valor);

  if (!fecha) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function icono(nombre) {
  return `<svg class="icon" aria-hidden="true"><use href="#icon-${nombre}"></use></svg>`;
}

const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ESCAPES[caracter]);
}

function escapeAttr(valor) {
  return escapeHtml(valor);
}
