import { stateObject } from "./stateObject";
import { Mostrar } from "./UIindexedDB";

// --- Eliminar todos los registros ---
export function eliminarTodo(): void {
    const transaccion = stateObject.bd!.transaction(["numero"], "readwrite");
    const almacen = transaccion.objectStore("numero");
    almacen.clear();
    transaccion.addEventListener("complete", Mostrar);
}
// --- Guardar o actualizar un registro ---
export function almacenarNumero(input:HTMLInputElement): void {
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

    request.onsuccess = (event) => {
        stateObject.idUltimoResultado = (event.target as IDBRequest<number>).result;
        Mostrar();
    };

    input.value = "";
    stateObject.expression = "";
    stateObject.result = "";
}

// --- Memoria global ---
export function memoriaMasGlobal(input:HTMLInputElement): void {
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

export function memoriaMenosGlobal(input:HTMLInputElement): void {
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
// --- Recuperar memoria ---
export function restoreMemory(input:HTMLInputElement): void {
    const transaccion = stateObject.bd!.transaction(["numero"], "readonly");
    const almacen = transaccion.objectStore("numero");
    const request = almacen.openCursor(null, "prev");

    request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
            input.value = cursor.value.resultado;
            console.log("Memoria recuperada:", cursor.value.resultado, "de ecuación:", cursor.value.ecuacion);
        } else {
            alert("No hay memoria en IndexedDB");
        }
    };

    request.onerror = (event: any) => {
        console.error("Error al recuperar memoria:", event);
    };
}
