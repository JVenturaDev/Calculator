// --- Módulo IndexedDB con stateObject ---
import { stateObject } from "./stateObject.js";
const btnGuardar = document.querySelector(".btnGuardar"); // Guardar ecuación
// --- Cargar historial desde DB ---
export function cargarHistorialDesdeDB(stateObject) {
    if (!stateObject.bd || !stateObject.memoryContainer)
        return;
    const tx = stateObject.bd.transaction("numero", "readonly");
    const store = tx.objectStore("numero");
    const request = store.openCursor();
    request.onsuccess = (event) => {
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
export function runbd() {
    stateObject.memoryContainer = document.querySelector("#Memory");
    btnGuardar.addEventListener("click", almacenarNumero);
    const solicitud = indexedDB.open("Resultado-y-operaciones");
    solicitud.addEventListener("error", MostrarError);
    solicitud.addEventListener("success", Comenzar);
    solicitud.addEventListener("upgradeneeded", Crearalmacen);
}
// --- Crear almacen de datos ---
function Crearalmacen(evento) {
    const baseDatos = evento.target.result;
    const almacen = baseDatos.createObjectStore("numero", { keyPath: "id", autoIncrement: true });
    almacen.createIndex("ecuacion", "ecuacion", { unique: false });
    almacen.createIndex("resultado", "resultado", { unique: false });
}
// --- Guardar o actualizar un registro ---
export function almacenarNumero() {
    if (!stateObject.expression || stateObject.expression.trim() === "") {
        alert("No puedes guardar una ecuación vacía.");
        return;
    }
    const transaction = stateObject.bd.transaction(["numero"], "readwrite");
    const store = transaction.objectStore("numero");
    let request;
    if (stateObject.idEnEdicion !== null) {
        request = store.put({
            id: stateObject.idEnEdicion,
            ecuacion: stateObject.expression,
            resultado: stateObject.result
        });
        stateObject.idEnEdicion = null;
    }
    else {
        request = store.add({
            ecuacion: stateObject.expression,
            resultado: stateObject.result
        });
    }
    // Aquí es donde pones el onsuccess
    request.onsuccess = (event) => {
        stateObject.idUltimoResultado = event.target.result;
        Mostrar(); // actualizar memoria en el DOM
    };
    input.value = "";
    stateObject.expression = "";
    stateObject.result = "";
}
// --- Mostrar registros ---
function Mostrar() {
    stateObject.memoryContainer.innerHTML = "";
    const transaccion = stateObject.bd.transaction(["numero"], "readonly");
    const almacen = transaccion.objectStore("numero");
    const cursor = almacen.openCursor();
    cursor.onsuccess = (evento) => {
        const puntero = evento.target.result;
        if (puntero) {
            const div = document.createElement("div");
            div.className = "contenido";
            div.dataset.id = puntero.value.id;
            div.innerHTML = `
                <div class="Flex-space">
                    <strong>Ecuación:</strong> <div class="ecuacionn">${puntero.value.ecuacion}</div>
                </div>
                <div class="Flex-space">
                    <strong>Resultado:</strong> <div class="resultadoo">${puntero.value.resultado}</div>
                </div>
                <div class="Flex">
                    <button class="borrar">Borrar</button>
                    <button class="Mmas">M+</button>
                    <button class="Mmenos">M-</button>
                    <button class="editarr">Editar</button>
                </div>
            `;
            // Asignar listeners a botones internos
            const borrarBtn = div.querySelector(".borrar");
            borrarBtn.addEventListener("click", () => eliminarNumero(puntero.value.id));
            const editarBtn = div.querySelector(".editarr");
            editarBtn.addEventListener("click", () => editarEcuacion(puntero.value.id));
            stateObject.memoryContainer.appendChild(div);
            puntero.continue();
        }
    };
}
// --- Editar ecuación ---
function editarEcuacion(id) {
    const transaccion = stateObject.bd.transaction(["numero"], "readonly");
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
function eliminarNumero(key) {
    const transaccion = stateObject.bd.transaction(["numero"], "readwrite");
    const almacen = transaccion.objectStore("numero");
    almacen.delete(key);
    transaccion.addEventListener("complete", Mostrar);
}
// --- Eliminar todos los registros ---
export function eliminarTodo() {
    const transaccion = stateObject.bd.transaction(["numero"], "readwrite");
    const almacen = transaccion.objectStore("numero");
    almacen.clear();
    transaccion.addEventListener("complete", Mostrar);
}
// --- Manejo de errores ---
function MostrarError(evento) {
    console.error("Error en IndexedDB", evento);
}
// --- Conexión exitosa ---
function Comenzar(evento) {
    stateObject.bd = evento.target.result;
    Mostrar();
    actualizarValorOriginal();
    // Función interna: actualizar M+ / M- individual
    function actualizarMemoria(id, operacion) {
        if (!stateObject.bd)
            return;
        const transaccion = stateObject.bd.transaction(["numero"], "readwrite");
        const almacen = transaccion.objectStore("numero");
        const solicitud = almacen.get(id);
        solicitud.onsuccess = (event) => {
            const registro = event.target.result;
            if (!registro)
                return;
            if (registro.resultadoOriginal === undefined)
                registro.resultadoOriginal = Math.abs(Number(registro.resultado));
            let valorActual = Number(registro.resultado);
            if (operacion === "sumar")
                valorActual += Number(input.value);
            if (operacion === "restar")
                valorActual -= Number(input.value);
            registro.resultado = valorActual;
            const requestUpdate = almacen.put(registro);
            requestUpdate.onsuccess = () => {
                const divContenedor = stateObject.memoryContainer.querySelector(`.contenido[data-id='${id}'] .resultadoo`);
                if (divContenedor)
                    divContenedor.textContent = registro.resultado;
            };
        };
    }
    document.addEventListener("click", (e) => {
        const target = e.target;
        if (target.classList.contains("Mmas")) {
            const contenido = target.closest(".contenido");
            if (!contenido || !contenido.dataset.id)
                return; // Sale si no existe
            const id = Number(contenido.dataset.id);
            actualizarMemoria(id, "sumar");
        }
        if (target.classList.contains("Mmenos")) {
            const contenido = target.closest(".contenido");
            if (!contenido || !contenido.dataset.id)
                return; // Sale si no existe
            const id = Number(contenido.dataset.id);
            actualizarMemoria(id, "restar");
        }
    });
}
// --- Guardar último valor original ---
export function actualizarValorOriginal() {
    const transaccion = stateObject.bd.transaction(["numero"], "readonly");
    const store = transaccion.objectStore("numero");
    const request = store.openCursor(null, "prev");
    request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            stateObject.valorOriginalMemoria = parseFloat(cursor.value.resultado);
            stateObject.idUltimoResultado = cursor.value.id;
        }
        else {
            stateObject.valorOriginalMemoria = 0;
            stateObject.idUltimoResultado = null;
        }
    };
    request.onerror = (event) => {
        console.error("Error al obtener último resultado", event);
        stateObject.valorOriginalMemoria = 0;
        stateObject.idUltimoResultado = null;
    };
}
// --- Memoria global ---
export function memoriaMasGlobal() {
    if (stateObject.idUltimoResultado === null)
        return;
    const transaction = stateObject.bd.transaction(["numero"], "readwrite");
    const store = transaction.objectStore("numero");
    const getRequest = store.get(stateObject.idUltimoResultado);
    getRequest.onsuccess = () => {
        const registro = getRequest.result;
        const nuevoValor = parseFloat(registro.resultado) + Number(input.value);
        store.put({ id: stateObject.idUltimoResultado, ecuacion: registro.ecuacion, resultado: nuevoValor });
        transaction.oncomplete = () => Mostrar();
    };
}
export function memoriaMenosGlobal() {
    if (stateObject.idUltimoResultado === null)
        return;
    const transaction = stateObject.bd.transaction(["numero"], "readwrite");
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
export function restoreMemory() {
    const transaccion = stateObject.bd.transaction(["numero"], "readonly");
    const almacen = transaccion.objectStore("numero");
    const request = almacen.openCursor(null, "prev");
    request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            input.value = cursor.value.resultado;
            console.log("Memoria recuperada:", cursor.value.resultado, "de ecuación:", cursor.value.ecuacion);
        }
        else {
            console.log("No hay memoria en IndexedDB");
        }
    };
    request.onerror = (event) => {
        console.error("Error al recuperar memoria:", event);
    };
}
// --- Inicializar ---
window.addEventListener("load", runbd);
