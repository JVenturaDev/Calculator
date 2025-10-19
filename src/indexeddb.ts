// --- Módulo IndexedDB con stateObject ---
import { stateObject } from "./stateObject.js";
import { Mostrar } from "./UIindexedDB.js";
import { almacenarNumero } from "./buttonsIndexedDB.js";
import { input } from "./calculadora.js";


// --- Inicializar DB y listeners ---
export function runbd(input: HTMLInputElement): void {
    const btnGuardar = document.querySelector(".btnGuardar") as HTMLButtonElement;
    stateObject.memoryContainer = document.querySelector("#Memory") as HTMLDivElement;
    btnGuardar.addEventListener("click", (ev) => almacenarNumero(input));

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
    function actualizarMemoria(input: HTMLInputElement, id: number, operacion: "sumar" | "restar") {
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

            if (target.classList.contains("Mmas")) actualizarMemoria(input, id, "sumar");
            if (target.classList.contains("Mmenos")) actualizarMemoria(input, id, "restar");
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


