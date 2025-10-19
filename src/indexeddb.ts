// --- Módulo IndexedDB con stateObject ---
import { stateObject } from "./stateObject.js";

// Declaraciones de botones y elementos del DOM
declare const globalMPlus: HTMLButtonElement;
declare const globalMMinus: HTMLButtonElement;
declare const btnRecuperarMemoria: HTMLButtonElement;
declare const input: HTMLInputElement;

const btnGuardar = document.querySelector(".btnGuardar") as HTMLButtonElement;     // Guardar ecuación

// --- Cargar historial desde DB ---
export function cargarHistorialDesdeDB(stateObject: any): void {
    if (!stateObject.bd || !stateObject.memoryContainer) return;
    const tx = stateObject.bd.transaction("numero", "readonly");
    const store = tx.objectStore("numero");
    const request = store.openCursor();

    request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
            const div = document.createElement("div");
            div.textContent = `Número: ${cursor.value.numero}`;
            stateObject.memoryContainer.appendChild(div);
            cursor.continue();
        }
        actualizarValorOriginal();
    };
}

// --- Inicializar DB y listeners ---
export function runbd(): void {
    stateObject.memoryContainer = document.querySelector("#Memory") as HTMLDivElement;
    btnGuardar.addEventListener("click", almacenarNumero);

    const solicitud = indexedDB.open("Resultado-y-operaciones");
    solicitud.addEventListener("error", MostrarError);
    solicitud.addEventListener("success", Comenzar);
    solicitud.addEventListener("upgradeneeded", Crearalmacen);
}

// --- Crear almacen de datos ---
function Crearalmacen(evento: any): void {
    const baseDatos: IDBDatabase = evento.target.result;
    const almacen = baseDatos.createObjectStore("numero", { keyPath: "id", autoIncrement: true });
    almacen.createIndex("ecuacion", "ecuacion", { unique: false });
    almacen.createIndex("resultado", "resultado", { unique: false });
}

// --- Guardar o actualizar un registro ---
export function almacenarNumero(): void {
    if (!stateObject.expression || stateObject.expression.trim() === "") {
        alert("No puedes guardar una ecuación vacía.");
        return;
    }

    const transaction = stateObject.bd!.transaction(["numero"], "readwrite");
    const store = transaction.objectStore("numero");

    let request: IDBRequest<number>;
    if (stateObject.idEnEdicion !== null) {
        request = store.put({
            id: stateObject.idEnEdicion,
            ecuacion: stateObject.expression,
            resultado: stateObject.result
        }) as IDBRequest<number>;
        stateObject.idEnEdicion = null;
    } else {
        request = store.add({
            ecuacion: stateObject.expression,
            resultado: stateObject.result
        }) as IDBRequest<number>;
    }

    // Aquí es donde pones el onsuccess
    request.onsuccess = (event) => {
        stateObject.idUltimoResultado = (event.target as IDBRequest<number>).result;
        Mostrar(); // actualizar memoria en el DOM
    };

    input.value = "";
    stateObject.expression = "";
    stateObject.result = "";
}


// --- Mostrar registros ---
function Mostrar(): void {
    stateObject.memoryContainer!.innerHTML = "";
    const transaccion = stateObject.bd!.transaction(["numero"], "readonly");
    const almacen = transaccion.objectStore("numero");
    const cursor = almacen.openCursor();

    cursor.onsuccess = (evento: any) => {
        const puntero = evento.target.result;
        const idActual = puntero.value.id;
        if (puntero) {
            const div = document.createElement("div");
            div.className = "contenido";
            div.dataset.id = puntero.value.id;

            div.innerHTML = `
                <div class="Flex-container">
                <div class="Flex-space">
                    <strong>Ecuación:</strong> <div class="ecuacionn">${puntero.value.ecuacion}</div>
                </div>
                <div class="Flex-space">
                    <strong>Resultado:</strong> <div class="resultadoo">${puntero.value.resultado}</div>
                </div>
                </div>
                <div class="Flex">
                <div class="Flex-left">
                    <button class="borrar"><span id="color-span1" class="material-symbols-outlined">
                                    delete
                                </span></button>
                    <button class="Mmas">M+</button>
                    <button class="Mmenos">M-</button>
                    <button class="editarr"><span class="material-symbols-outlined">
                                     edit
                    </span></button>
                </div>
                </div>
            `;

            // Asignar listeners a botones internos
            const borrarBtn = div.querySelector(".borrar") as HTMLButtonElement;
            borrarBtn.addEventListener("click", () => eliminarNumero(idActual));

            const editarBtn = div.querySelector(".editarr") as HTMLButtonElement;
            editarBtn.addEventListener("click", () => editarEcuacion(idActual));

            stateObject.memoryContainer!.appendChild(div);

            puntero.continue();
        }
    };
}

// --- Editar ecuación ---
function editarEcuacion(id: number): void {
    const transaccion = stateObject.bd!.transaction(["numero"], "readonly");
    const almacen = transaccion.objectStore("numero");
    const solicitud = almacen.get(id);

    solicitud.onsuccess = () => {
        const resultado = solicitud.result;
        if (resultado) {
            stateObject.idEnEdicion = id;
            input.value = resultado.ecuacion;
            stateObject.expression = resultado.ecuacion;
            stateObject.result = resultado.resultado;
        }
    };
}

// --- Eliminar número ---
function eliminarNumero(key: number): void {
    const transaccion = stateObject.bd!.transaction(["numero"], "readwrite");
    const almacen = transaccion.objectStore("numero");
    almacen.delete(key);
    transaccion.addEventListener("complete", Mostrar);
}

// --- Eliminar todos los registros ---
export function eliminarTodo(): void {
    const transaccion = stateObject.bd!.transaction(["numero"], "readwrite");
    const almacen = transaccion.objectStore("numero");
    almacen.clear();
    transaccion.addEventListener("complete", Mostrar);
}

// --- Manejo de errores ---
function MostrarError(evento: any): void {
    console.error("Error en IndexedDB", evento);
}

// --- Conexión exitosa ---
export function Comenzar(evento: any): void {
    stateObject.bd = evento.target.result;
    Mostrar();
    actualizarValorOriginal();

    // Internal function: update M+ / M- for a memory item
function actualizarMemoria(id: number, operacion: "sumar" | "restar") {
    if (!stateObject.bd) return;

    const transaccion = stateObject.bd.transaction(["numero"], "readwrite");
    const almacen = transaccion.objectStore("numero");
    const solicitud = almacen.get(id);

    solicitud.onsuccess = (event: any) => {
        const registro = event.target.result;
        if (!registro) return;

        // Guardar resultado original si no existe
        if (registro.resultadoOriginal === undefined) {
            registro.resultadoOriginal = Number(registro.resultado) || 0;
        }

        // Parsear valor de input seguro
        const valorInput = parseFloat((input.value || "0").replace(',', '.'));
        if (isNaN(valorInput)) {
            console.warn("Input no es un número válido:", input.value);
            return;
        }

        let valorActual = Number(registro.resultado) || 0;
        valorActual = operacion === "sumar" ? valorActual + valorInput : valorActual - valorInput;

        registro.resultado = valorActual;
        const requestUpdate = almacen.put(registro);

        requestUpdate.onsuccess = () => {
            const divContenedor = stateObject.memoryContainer!.querySelector(
                `.contenido[data-id='${id}'] .resultadoo`
            ) as HTMLDivElement;
            if (divContenedor) divContenedor.textContent = registro.resultado.toString();
        };
    };
}


    // Register click listeners only once
    if (!(window as any).__memoryListenersRegistered) {
        document.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            const contenido = target.closest(".contenido") as HTMLElement | null;
            if (!contenido || !contenido.dataset.id) return;

            const id = Number(contenido.dataset.id);

            if (target.classList.contains("Mmas")) actualizarMemoria(id, "sumar");
            if (target.classList.contains("Mmenos")) actualizarMemoria(id, "restar");
        });
        (window as any).__memoryListenersRegistered = true;
    }
}


// --- Guardar último valor original ---
export function actualizarValorOriginal(): void {
    const transaccion = stateObject.bd!.transaction(["numero"], "readonly");
    const store = transaccion.objectStore("numero");
    const request = store.openCursor(null, "prev");

    request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
            stateObject.valorOriginalMemoria = parseFloat(cursor.value.resultado);
            stateObject.idUltimoResultado = cursor.value.id;
        } else {
            stateObject.valorOriginalMemoria = 0;
            stateObject.idUltimoResultado = null;
        }
    };

    request.onerror = (event: any) => {
        console.error("Error al obtener último resultado", event);
        stateObject.valorOriginalMemoria = 0;
        stateObject.idUltimoResultado = null;
    };
}

// --- Memoria global ---
export function memoriaMasGlobal(): void {
    if (stateObject.idUltimoResultado === null) return;
    const transaction = stateObject.bd!.transaction(["numero"], "readwrite");
    const store = transaction.objectStore("numero");
    const getRequest = store.get(stateObject.idUltimoResultado);

    getRequest.onsuccess = () => {
        const registro = getRequest.result;
        const nuevoValor = parseFloat(registro.resultado) + Number(input.value);
        store.put({ id: stateObject.idUltimoResultado, ecuacion: registro.ecuacion, resultado: nuevoValor });
        transaction.oncomplete = () => Mostrar();
    };
}

export function memoriaMenosGlobal(): void {
    if (stateObject.idUltimoResultado === null) return;
    const transaction = stateObject.bd!.transaction(["numero"], "readwrite");
    const store = transaction.objectStore("numero");
    const getRequest = store.get(stateObject.idUltimoResultado);

    getRequest.onsuccess = () => {
        const registro = getRequest.result;
        const nuevoValor = parseFloat(registro.resultado) - Number(input.value);
        store.put({ id: stateObject.idUltimoResultado, ecuacion: registro.ecuacion, resultado: nuevoValor });
        transaction.oncomplete = () => Mostrar();
    };
}

// --- Listeners globales ---
globalMPlus.addEventListener("click", memoriaMasGlobal);
globalMMinus.addEventListener("click", memoriaMenosGlobal);
btnRecuperarMemoria.addEventListener("click", restoreMemory);

// --- Recuperar memoria ---
export function restoreMemory(): void {
    const transaccion = stateObject.bd!.transaction(["numero"], "readonly");
    const almacen = transaccion.objectStore("numero");
    const request = almacen.openCursor(null, "prev");

    request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
            input.value = cursor.value.resultado;
            console.log("Memoria recuperada:", cursor.value.resultado, "de ecuación:", cursor.value.ecuacion);
        } else {
            console.log("No hay memoria en IndexedDB");
        }
    };

    request.onerror = (event: any) => {
        console.error("Error al recuperar memoria:", event);
    };
}

// --- Inicializar ---
window.addEventListener("load", runbd);
