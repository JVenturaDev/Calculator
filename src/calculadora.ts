// ============================
// MÓDULO CALCULADORA
// ============================
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

// Botón de mostrar/ocultar memoria
const bmore = document.querySelector("#clickk") as HTMLButtonElement;
const mMore = document.querySelector("#presionar") as HTMLDivElement;
document.getElementById("equal1")?.addEventListener("click", calcularResultado);
document.getElementById("deleteAll")?.addEventListener("click", eliminarTodo);
document.getElementById("restoreMemory")?.addEventListener("click", restoreMemory);
document.getElementById("memoryM")?.addEventListener("click", memoriaMasGlobal);
document.getElementById("memoryMe")?.addEventListener("click", memoriaMenosGlobal);
document.getElementById("saveMemory")?.addEventListener("click", almacenarNumero);
// Solo le dices a TS que existen, no las defines



// ----------------------------
// Toggle memoria
// ----------------------------
bmore.addEventListener("click", () => {
    mMore.classList.toggle("memoryButton");
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
function calcularResultado(): void {
    try {
        stateObject.equalPressed = 1;
        const inputValue: string = input.value;

        // Guardar expresión actual
        stateObject.expression = inputValue;

        // Validar con parser antes de reemplazos
        if (!parsear(inputValue)) return;

        // Reemplazos matemáticos
        let expresion: string = replaceFunction(inputValue);

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
function evalExpresion(expresion: string): number {
    const result: unknown = Function('"use strict"; return(' + expresion + ')')();
    console.log("Expresión evaluada:", expresion);
    return Number(result);
}
