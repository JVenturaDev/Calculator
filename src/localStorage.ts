import { stateObject } from "./stateObject.js";

// Elementos del DOM
const input = document.querySelector("#input") as HTMLInputElement | null;
const historyContent = document.querySelector("#historyContent") as HTMLDivElement | null;

// Tipado para los items del historial
interface HistoryItem {
    idi: number;
    expression: string;
    result: string | number;
}

// --- Añadir un registro al historial ---
export function addToHistory(idi: number, expression: string, result: string | number): void {
    if (!historyContent) return;

    const historyItem = document.createElement("div") as HTMLDivElement;
    historyItem.className = "history-item";

    // Actualizar stateObject
    stateObject.result = result;
    stateObject.expression = expression;

    // Crear span con la ecuación y resultado
    const span = document.createElement("span") as HTMLSpanElement;
    span.textContent = `${expression} = ${result}`;
    span.style.cursor = "pointer";
    span.dataset.userInput = expression;
    span.dataset.userResult = result.toString();
    span.addEventListener("click", () => {
        if (input) input.value = span.dataset.userInput ?? "";
    });

    historyItem.appendChild(span);

    // Asignar id
    historyItem.dataset.idi = idi.toString();

    // Botón para eliminar del historial
    const deleteBtn = document.createElement("button") as HTMLButtonElement;
    deleteBtn.textContent = "Eliminar";
    deleteBtn.className = "delete-history";
    deleteBtn.addEventListener("click", () => {
        removeFromLocalStorage(Number(historyItem.dataset.idi));
        historyItem.remove();
    });

    historyItem.appendChild(deleteBtn);

    // Añadir al contenedor del historial
    historyContent.appendChild(historyItem);

    // Guardar en localStorage
    saveToLocalStorage(idi, expression, result);
}

// --- Guardar historial en localStorage ---
function saveToLocalStorage(idi: number, expression: string, result: string | number): void {
    const history: HistoryItem[] = JSON.parse(localStorage.getItem("historial") || "[]");
    history.push({ idi, expression, result });
    localStorage.setItem("historial", JSON.stringify(history));
}

// --- Cargar historial desde localStorage ---
function loadHistory(): void {
    const history: HistoryItem[] = JSON.parse(localStorage.getItem("historial") || "[]");
    history.forEach(item => addHistoryFromStorage(item.idi, item.expression, item.result));
}

// --- Añadir historial desde localStorage al DOM ---
function addHistoryFromStorage(idi: number, expression: string, result: string | number): void {
    if (!historyContent) return;

    const historyItem = document.createElement("div") as HTMLDivElement;
    historyItem.className = "history-item";

    // Actualizar stateObject
    stateObject.result = result;
    stateObject.expression = expression;

    const span = document.createElement("span") as HTMLSpanElement;
    span.textContent = `${expression} = ${result}`;
    span.style.cursor = "pointer";
    span.dataset.userInput = expression;
    span.dataset.userResult = result.toString();
    span.addEventListener("click", () => {
        if (input) input.value = span.dataset.userInput ?? "";
    });

    historyItem.appendChild(span);

    const deleteBtn = document.createElement("button") as HTMLButtonElement;
    deleteBtn.textContent = "Eliminar";
    deleteBtn.className = "delete-history";
    deleteBtn.addEventListener("click", () => {
        removeFromLocalStorage(Number(historyItem.dataset.idi));
        historyItem.remove();
    });

    historyItem.appendChild(deleteBtn);

    historyItem.dataset.idi = idi.toString();

    historyContent.appendChild(historyItem);
}

// --- Eliminar un registro de localStorage ---
function removeFromLocalStorage(idi: number): void {
    const history: HistoryItem[] = JSON.parse(localStorage.getItem("historial") || "[]");
    const filtered = history.filter(item => item.idi !== idi);
    localStorage.setItem("historial", JSON.stringify(filtered));
}

// --- Añadir registro con id generado automáticamente ---
export function agregarId(expression: string, result: string | number): void {
    const idi = Date.now() + Math.random();
    addToHistory(idi, expression, result);
}

// --- Reconstruir historial al cargar la página ---
window.addEventListener("load", () => {
    loadHistory();
});
