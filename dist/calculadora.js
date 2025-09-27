// ============================
// MÓDULO CALCULADORA
// ============================
//  _______ _                  _____      _            _      _______   
// |__   __| |                / ____|    | |          | |    |__   __|  
//    | |  | |__   ___       | |     __ _| | ___ _   _| | __ _  | |  ___   _ ___
//    | |  | '_ \ / _ \      | |    / _` | |/ __| | | | |/ _` | | | / _ \ | ' __|
//    | |  | | | |  __/      | |___| (_| | | (__| |_| | | (_| | | || (_) ||  |
//    |_|  |_| |_|\___|       \_____\__,_|_|\___|\__,_|_|\__,_| |_| \___/ |__|
import { switchBtnCalculator, parentesisMulti } from "./buttonFunctions.js";
// import { symbolMap,parseSymbols } from "./parser.js";
import { calcularInverso, invertirUltimoNumero, replaceFunction, evalExpresion } from "./buttonFunctions.js";
import { parsear } from "./parser.js";
import { stateObject } from "./stateObject.js";
import { agregarId } from "./localStorage.js";
import { cargarHistorialDesdeDB, restoreMemory, eliminarTodo, memoriaMasGlobal, memoriaMenosGlobal, almacenarNumero, runbd } from "./indexeddb.js";
// ----------------------------
// Variables principales del DOM
// ----------------------------
const buttons = document.querySelectorAll(".button"); // Todos los botones de la calculadora
const input = document.getElementById("input"); // Pantalla principal
const equal = document.getElementById("equal"); // Botón "="
const clear = document.getElementById("clear"); // Botón "AC"
const erase = document.getElementById("erase"); // Botón "DEL"
const historyContent = document.getElementById("historyContent"); // Contenedor del historial
const bntMr = document.querySelector("#btn-mr"); // Botón M/R
const memoryContainer = document.querySelector("#Memory"); // Panel memoria
const btn = document.getElementById("multiBtn"); // Botón modo ángulo
const btnFe = document.querySelector("#fBtn"); // Botón F-E
const globalMPlus = document.querySelector("#globalMPlus"); // Botón M+ global
const globalMMinus = document.querySelector("#globalMMinus"); // Botón M- global
const btnRecuperarMemoria = document.querySelector("#btnRecuperarMemoria"); // Recuperar memoria
const menuCalculator = document.querySelector("#menuHamburger");
const sideBar = document.querySelector(".sidebar");
const btnBasic = document.querySelector("#btnBasic");
const btnScientific = document.querySelector("#btnScientific");
const btnGraphic = document.querySelector("#btnGraphic");
menuCalculator.addEventListener("click", () => {
    sideBar.style.display = sideBar.style.display === "none" || sideBar.style.display === ''
        ? "flex"
        : "none";
});
btnBasic.addEventListener("click", () => switchBtnCalculator("basic"));
btnScientific.addEventListener("click", () => switchBtnCalculator("sci"));
btnGraphic.addEventListener("click", () => switchBtnCalculator("graphic"));
// ----------------------------
// Botones con paneles de memoria
// ----------------------------
const memoryButtons = [
    { btnId: "clickk", panelId: "presionar" },
    { btnId: "clickk1", panelId: "presionar1" },
];
// ----------------------------
// Listeners de botones
// ----------------------------
const listeners = [
    { id: "equal", handler: calcularResultado },
    { id: "equal1", handler: calcularResultado },
    { id: "deleteAll", handler: eliminarTodo },
    { id: "restoreMemory", handler: restoreMemory },
    { id: "memoryM", handler: memoriaMasGlobal },
    { id: "memoryMe", handler: memoriaMenosGlobal },
    { id: "saveMemory", handler: almacenarNumero },
    { id: "equal2", handler: calcularResultado },
    { id: "deleteAll1", handler: eliminarTodo },
    { id: "restoreMemory1", handler: restoreMemory },
    { id: "memoryM1", handler: memoriaMasGlobal },
    { id: "memoryMe1", handler: memoriaMenosGlobal },
    { id: "saveMemory1", handler: almacenarNumero },
];
// ----------------------------
// Registrar listeners
// ----------------------------
listeners.forEach((listener) => {
    const el = document.getElementById(listener.id);
    if (el)
        el.addEventListener("click", listener.handler);
});
// ----------------------------
// Toggle memoria
// ----------------------------
memoryButtons.forEach((button) => {
    const btn = document.getElementById(button.btnId);
    const panel = document.getElementById(button.panelId);
    if (btn && panel) {
        btn.addEventListener("click", () => panel.classList.toggle("memoryButton"));
    }
});
// ----------------------------
// Inicialización de la calculadora al cargar la página
// ----------------------------
window.onload = () => {
    input.value = "";
    stateObject.expression = "";
    stateObject.result = "";
    // Actualizar historial en el DOM, asegurándonos que bd y memoryContainer existan
    if (stateObject.bd && stateObject.memoryContainer) {
        cargarHistorialDesdeDB(stateObject);
    }
};
// Inicialización de la calculadora
window.addEventListener("load", () => {
    input.value = "";
    stateObject.expression = "";
    stateObject.result = "";
    if (stateObject.bd && stateObject.memoryContainer) {
        cargarHistorialDesdeDB(stateObject);
    }
});
// Abrir IndexedDB
window.addEventListener("load", () => {
    runbd();
});
// ----------------------------
// Manejo de botones numéricos y operadores
// ----------------------------
buttons.forEach((button) => {
    button.addEventListener("click", (event) => {
        if (stateObject.equalPressed)
            stateObject.equalPressed = 0;
        const target = event.target;
        const value = target.dataset.number ?? ""; // si no existe, queda ""
        switch (value) {
            case "AC":
                input.value = "";
                stateObject.expression = "";
                break;
            case "DEL":
                input.value = input.value.slice(0, -1);
                stateObject.expression = input.value;
                break;
            case "+/-":
                invertirUltimoNumero();
                stateObject.expression = input.value;
                break;
            case "1/":
                calcularInverso();
                stateObject.expression = input.value;
                break;
            default:
                input.value += value;
                stateObject.expression = input.value;
        }
    });
});
// ----------------------------
// Función principal: calcular resultado
// ----------------------------
if (typeof Math.log10 !== "function") {
    Math.log10 = function (x) {
        return Math.log(x) / Math.log(10);
    };
}
function calcularResultado() {
    try {
        stateObject.equalPressed = 1;
        const inputValue = input.value;
        let expresion = inputValue;
        // Guardar expresión actual
        stateObject.expression = inputValue;
        // Validar con parser antes de reemplazos
        if (!parsear(inputValue))
            return;
        expresion = replaceFunction(inputValue);
        expresion = parentesisMulti(expresion);
        // Evaluar la expresión final
        const result = evalExpresion(expresion);
        // Guardar resultado
        stateObject.result = result;
        // Mostrar en pantalla
        showOnInput(result);
        // Guardar en historial/memoria
        agregarId(stateObject.expression, stateObject.result);
        // Guardar en IndexedDB solo si bd existe
    }
    catch (error) {
        if (error instanceof Error) {
            alert("Error: " + error.message);
        }
        else {
            alert("Error desconocido");
        }
    }
}
// ----------------------------
// Función auxiliar: mostrar resultado en pantalla
// ----------------------------
function showOnInput(result) {
    if (typeof result === "string") {
        input.value = result;
    }
    else {
        // Si es número → mostrar entero o con 2 decimales
        input.value = Number.isInteger(result) ? result.toString() : result.toFixed(2);
    }
}
// ----------------------------
// Función auxiliar: evaluar expresión matemática
// ----------------------------
