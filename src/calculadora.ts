import { initApp } from "./initApp.js";
import { calcularInverso, invertirUltimoNumero, replaceFunction, evalExpresion, parentesisMulti } from "./buttonFunctions.js";
import { parsear } from "./parser.js";
import { stateObject } from "./stateObject.js";
import { agregarId } from "./localStorage.js";
import { switchBtnCalculator } from "./addEvents.js";


// DOM elements

export const input = document.getElementById("input")! as HTMLInputElement;
const buttons: NodeListOf<HTMLButtonElement> = document.querySelectorAll(".button");
const btnBasic = document.querySelector("#btnBasic") as HTMLAnchorElement;
const btnScientific = document.querySelector("#btnScientific") as HTMLAnchorElement;
const btnGraphic = document.querySelector("#btnGraphic") as HTMLAnchorElement;
btnBasic.addEventListener("click", () => switchBtnCalculator("basic"));
btnScientific.addEventListener("click", () => switchBtnCalculator("sci"));
btnGraphic.addEventListener("click", () => switchBtnCalculator("graphic"));

// Init app
initApp(input);

// Calculator buttons

function handleButtonClick(event: MouseEvent) {
    if (stateObject.equalPressed) stateObject.equalPressed = 0;
    const target = event.target as HTMLButtonElement;
    const value: string = target.dataset.number ?? "";

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
}

function handleKeyDown(event: KeyboardEvent) {
    if (!input) return;
    if ((event.target as HTMLElement).tagName === "button") return;

    switch (event.key) {
        case "Backspace":
            input.value = input.value.slice(0, -1);
            stateObject.expression = input.value;
            event.preventDefault();
            break;
        case "Enter":
            calcularResultado();
            event.preventDefault();
            break;
        default:
            input.focus();
            break;
    }
}
// Main calculation function
if (typeof Math.log10 !== "function") {
    Math.log10 = function (x: number): number { return Math.log(x) / Math.log(10); };
}
export function calcularResultado(): void {
    try {
        stateObject.equalPressed = 1;
        const inputValue: string = input.value;
        stateObject.expression = inputValue;

        if (!parsear(inputValue)) return;

        let expresion = replaceFunction(inputValue);
        expresion = parentesisMulti(expresion);

        const result: number | string = evalExpresion(expresion);
        stateObject.result = result;
        showOnInput(result);
        agregarId(stateObject.expression, stateObject.result);
    } catch (error) {
        alert(error instanceof Error ? `Error: ${error.message}` : "Unknown error");
    }
}

// Show result
function showOnInput(result: string | number): void {
    input.value = typeof result === "string" ? result : (Number.isInteger(result) ? result.toString() : result.toFixed(2));
}
// Register listeners once
if (!(window as any).__listenersRegistered) {
    buttons.forEach(btn => btn.addEventListener("click", handleButtonClick));
    document.addEventListener("keydown", handleKeyDown);
    (window as any).__listenersRegistered = true;
}
