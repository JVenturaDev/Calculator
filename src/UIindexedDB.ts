import { input } from "./calculadora";
import { actualizarValorOriginal } from "./indexeddb";
import { stateObject } from "./stateObject";

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
// --- Editar ecuación ---
export function editarEcuacion(id: number, input: HTMLInputElement): void {
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
export function eliminarNumero(key: number): void {
    const transaccion = stateObject.bd!.transaction(["numero"], "readwrite");
    const almacen = transaccion.objectStore("numero");
    almacen.delete(key);
    transaccion.addEventListener("complete", Mostrar);
}
// --- Mostrar registros ---
export function Mostrar(): void {
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
            editarBtn.addEventListener("click", () => editarEcuacion(idActual, input));

            stateObject.memoryContainer!.appendChild(div);

            puntero.continue();
        }
    };
}