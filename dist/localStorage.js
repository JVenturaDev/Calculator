import { stateObject } from "./stateObject.js";
// Elementos del DOM
const input = document.querySelector("#input");
const historyContent = document.querySelector("#historyContent");
// --- Añadir un registro al historial ---
export function addToHistory(idi, expression, result) {
    if (!historyContent)
        return;
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    // Actualizar stateObject
    stateObject.result = result;
    stateObject.expression = expression;
    // Crear span con la ecuación y resultado
    const span = document.createElement("span");
    span.textContent = `${expression} = ${result}`;
    span.style.cursor = "pointer";
    span.dataset.userInput = expression;
    span.dataset.userResult = result.toString();
    span.addEventListener("click", () => {
        if (input)
            input.value = span.dataset.userInput ?? "";
    });
    historyItem.appendChild(span);
    // Asignar id
    historyItem.dataset.idi = idi.toString();
    // Botón para eliminar del historial
    const deleteBtn = document.createElement("button");
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
function saveToLocalStorage(idi, expression, result) {
    const history = JSON.parse(localStorage.getItem("historial") || "[]");
    history.push({ idi, expression, result });
    localStorage.setItem("historial", JSON.stringify(history));
}
// --- Cargar historial desde localStorage ---
function loadHistory() {
    const history = JSON.parse(localStorage.getItem("historial") || "[]");
    history.forEach(item => addHistoryFromStorage(item.idi, item.expression, item.result));
}
// --- Añadir historial desde localStorage al DOM ---
function addHistoryFromStorage(idi, expression, result) {
    if (!historyContent)
        return;
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    // Actualizar stateObject
    stateObject.result = result;
    stateObject.expression = expression;
    const span = document.createElement("span");
    span.textContent = `${expression} = ${result}`;
    span.style.cursor = "pointer";
    span.dataset.userInput = expression;
    span.dataset.userResult = result.toString();
    span.addEventListener("click", () => {
        if (input)
            input.value = span.dataset.userInput ?? "";
    });
    historyItem.appendChild(span);
    const deleteBtn = document.createElement("button");
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
function removeFromLocalStorage(idi) {
    const history = JSON.parse(localStorage.getItem("historial") || "[]");
    const filtered = history.filter(item => item.idi !== idi);
    localStorage.setItem("historial", JSON.stringify(filtered));
}
// --- Añadir registro con id generado automáticamente ---
export function agregarId(expression, result) {
    const idi = Date.now() + Math.random();
    addToHistory(idi, expression, result);
}
// --- Reconstruir historial al cargar la página ---
window.addEventListener("load", () => {
    loadHistory();
});
