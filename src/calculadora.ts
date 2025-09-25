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
import {
    calcularInverso,
    invertirUltimoNumero,
    replaceFunction
} from "./buttonFunctions.js";
import { parsear } from "./parser.js";
import { StateObject, stateObject } from "./stateObject.js";
import { agregarId, addToHistory } from "./localStorage.js";
import { cargarHistorialDesdeDB, restoreMemory, eliminarTodo, memoriaMasGlobal, memoriaMenosGlobal, almacenarNumero, runbd } from "./indexeddb.js";


// ----------------------------
// Variables principales del DOM
// ----------------------------
const buttons: NodeListOf<HTMLButtonElement> = document.querySelectorAll(".button"); // Todos los botones de la calculadora
const input = document.getElementById("input")! as HTMLInputElement;       // Pantalla principal
const equal = document.getElementById("equal") as HTMLButtonElement;       // Botón "="
const clear = document.getElementById("clear") as HTMLButtonElement;       // Botón "AC"
const erase = document.getElementById("erase") as HTMLButtonElement;       // Botón "DEL"
const historyContent = document.getElementById("historyContent") as HTMLDivElement; // Contenedor del historial
const bntMr = document.querySelector("#btn-mr") as HTMLButtonElement;      // Botón M/R
const memoryContainer = document.querySelector("#Memory") as HTMLDivElement; // Panel memoria
const btn = document.getElementById("multiBtn") as HTMLButtonElement;      // Botón modo ángulo
const btnFe = document.querySelector("#fBtn") as HTMLButtonElement;        // Botón F-E
const globalMPlus = document.querySelector("#globalMPlus") as HTMLButtonElement;   // Botón M+ global
const globalMMinus = document.querySelector("#globalMMinus") as HTMLButtonElement; // Botón M- global
const btnRecuperarMemoria = document.querySelector("#btnRecuperarMemoria") as HTMLButtonElement; // Recuperar memoria
const menuCalculator = document.querySelector("#menuHamburger") as HTMLButtonElement;
const sideBar = document.querySelector(".sidebar") as HTMLElement;
const btnBasic = document.querySelector("#btnBasic") as HTMLAnchorElement;
const btnScientific = document.querySelector("#btnScientific") as HTMLAnchorElement;
const btnGraphic = document.querySelector("#btnGraphic") as HTMLAnchorElement;

menuCalculator.addEventListener("click", (): void => {
    sideBar.style.display = sideBar.style.display === "none" || sideBar.style.display === ''
        ? "flex"
        : "none";
})
btnBasic.addEventListener("click", () => switchBtnCalculator("basic"));
btnScientific.addEventListener("click", () => switchBtnCalculator("sci"));
btnGraphic.addEventListener("click", () => switchBtnCalculator("graphic"));
// ----------------------------
// Tipos
// ----------------------------
type ButtonPanel = {
    btnId: string;
    panelId: string;
};
type ListenerConfig = {
    id: string;
    handler: (this: HTMLElement, ev: MouseEvent) => any;
};
// ----------------------------
// Botones con paneles de memoria
// ----------------------------
const memoryButtons: ButtonPanel[] = [
    { btnId: "clickk", panelId: "presionar" },
    { btnId: "clickk1", panelId: "presionar1" },
];
// ----------------------------
// Listeners de botones
// ----------------------------
const listeners: ListenerConfig[] = [
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
listeners.forEach((listener: ListenerConfig) => {
    const el = document.getElementById(listener.id);
    if (el) el.addEventListener("click", listener.handler);
});
// ----------------------------
// Toggle memoria
// ----------------------------
memoryButtons.forEach((button: ButtonPanel) => {
    const btn = document.getElementById(button.btnId) as HTMLButtonElement | null;
    const panel = document.getElementById(button.panelId) as HTMLDivElement | null;

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
buttons.forEach((button: HTMLButtonElement) => {
    button.addEventListener("click", (event: MouseEvent) => {
        if (stateObject.equalPressed) stateObject.equalPressed = 0;

        const target = event.target as HTMLButtonElement;
        const value: string = target.dataset.number ?? ""; // si no existe, queda ""

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

            case "%":
                if (input.value !== "") {
                    input.value = (parseFloat(input.value) / 100).toString();
                    stateObject.expression = input.value;
                }
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
    Math.log10 = function (x: number): number {
        return Math.log(x) / Math.log(10);
    };
}
function calcularResultado(): void {
    try {
        stateObject.equalPressed = 1;
        const inputValue: string = input.value;
        let expresion: string = inputValue

        // Guardar expresión actual
        stateObject.expression = inputValue;

        // Validar con parser antes de reemplazos
        if (!parsear(inputValue)) return;

        expresion = replaceFunction(inputValue);
        expresion = parentesisMulti(expresion);
        // Evaluar la expresión final
        const result: number = evalExpresion(expresion);

        // Guardar resultado
        stateObject.result = result;

        // Mostrar en pantalla
        showOnInput(result);

        // Guardar en historial/memoria
        agregarId(stateObject.expression, stateObject.result);

        // Guardar en IndexedDB solo si bd existe


    } catch (error) {
        if (error instanceof Error) {
            alert("Error: " + error.message);
        } else {
            alert("Error desconocido");
        }
    }
}
function evalExpresion(expresion: string): number {
    const result: unknown = Function('"use strict"; return(' + expresion + ')')();
    console.log("Expresión evaluada:", expresion);
    return Number(result);
}
// ----------------------------
// Función auxiliar: mostrar resultado en pantalla
// ----------------------------
function showOnInput(result: string | number): void {
    if (typeof result === "string") {
        input.value = result;
    } else {
        // Si es número → mostrar entero o con 2 decimales
        input.value = Number.isInteger(result) ? result.toString() : result.toFixed(2);
    }
}

// ----------------------------
// Función auxiliar: evaluar expresión matemática
// ----------------------------
