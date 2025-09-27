// buttonFunctions.ts

import Complex from "complex.js";

import { stateObject } from "./stateObject.js";

// ----------------------------
// Toggle panel memoria
// ----------------------------
const bntMr = document.querySelector("#btn-mr") as HTMLButtonElement | null;
const memoryContainer = document.querySelector("#Memory") as HTMLDivElement | null;

if (bntMr && memoryContainer) {
    bntMr.addEventListener("click", (): void => {
        memoryContainer.style.display =
            memoryContainer.style.display === "none" || memoryContainer.style.display === ''
                ? "flex"
                : "none";
    });
}
const bntMr1 = document.querySelector("#btn-mr1") as HTMLButtonElement | null;
if (bntMr1 && memoryContainer) {
    bntMr1.addEventListener("click", (): void => {
        memoryContainer.style.display =
            memoryContainer.style.display === "none" || memoryContainer.style.display === ''
                ? "flex"
                : "none";
    });
}
const bntMr2 = document.querySelector("#btn-mr2") as HTMLButtonElement | null;
if (bntMr2 && memoryContainer) {
    bntMr2.addEventListener("click", (): void => {
        memoryContainer.style.display =
            memoryContainer.style.display === "none" || memoryContainer.style.display === ''
                ? "flex"
                : "none";
    });
}

// ----------------------------
// Extensión de Math
// ----------------------------
declare global {
    interface Math {
        ln(x: number): number;
        sec(x: number): number;
        cot(x: number): number;
        csc(x: number): number;
        asec(x: number): number;
        acot(x: number): number;
        acsc(x: number): number;
        sech(x: number): number;
        coth(x: number): number;
        csch(x: number): number;
        acoth(x: number): number;
        asech(x: number): number;
        acsch(x: number): number;
        logxy(x: number, y: number): number;
        EXPT(a: number, b: number): number;
        mod(a: number, b: number): number;
        DMS(x: number): string;
        DEG(g: number, m: number, s: number): number;
    }
}
declare global {
    var raizCompleja: (x: number) => Complex | number;
    var raizCubicaCompleja: (x: number) => number | Complex;
}


Math.sec = (x: number) => 1 / Math.cos(x);
Math.cot = (x: number) => 1 / Math.tan(x);
Math.csc = (x: number) => 1 / Math.sin(x);

Math.asec = (x: number) => Math.acos(1 / x);
Math.acot = (x: number) => Math.atan(1 / x);
Math.acsc = (x: number) => Math.asin(1 / x);

Math.sech = (x: number) => 1 / Math.cosh(x);
Math.coth = (x: number) => 1 / Math.tanh(x);
Math.csch = (x: number) => 1 / Math.sinh(x);

Math.acoth = (x: number) => 0.5 * Math.log((x + 1) / (x - 1));
Math.asech = (x: number) => Math.log((1 + Math.sqrt(1 - x * x)) / x);
Math.acsch = (x: number) => Math.log((1 / x) + Math.sqrt(1 + 1 / (x * x)));

// ----------------------------
// Funciones matemáticas auxiliares
// ----------------------------
Math.logxy = (x: number, y: number) => Math.log(x) / Math.log(y);
Math.EXPT = (a: number, b: number) => a * Math.pow(10, b);
Math.mod = (a: number, b: number) => ((a % b) + b) % b;
Math.DEG = (g: number, m: number, s: number): number => g + m / 60 + s / 3600;
Math.DMS = (x: number): string => {
    const grados = Math.floor(x);
    const minutosDecimal = (x - grados) * 60;
    const minutos = Math.floor(minutosDecimal);
    const segundos = (minutosDecimal - minutos) * 60;
    return `${grados}° ${minutos}' ${segundos.toFixed(2)}"`;
};
if (typeof Math.ln !== "function") {
    Math.ln = (x: number): number => Math.log(x);
}
function factorial(n: number): number {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
export function parentesisMulti(expression: string): string {
    let result = expression.replace(/(\d)(\()/g, "$1*$2");
    result = result.replace(/(\))(\d)/g, "$1*$2");
    return result;
}
// ----------------------------
// Manejo de modos de ángulo
// ----------------------------
let estado: number = 0;
const btn = document.getElementById("multiBtn") as HTMLButtonElement | null;

if (btn) {
    btn.addEventListener("click", (): void => {
        switch (estado) {
            case 0:
                btn.textContent = "GRAD";
                estado = 1;
                break;
            case 1:
                btn.textContent = "DEG";
                estado = 2;
                break;
            case 2:
                btn.textContent = "RAD";
                estado = 0;
                break;
        }
    });
}

export function obtenerModoAngulo(): string | null {
    return document.getElementById("multiBtn")?.textContent ?? null;
}

export function transformarArgumentosTrigo(expresion: string): string {
    const modo = obtenerModoAngulo();

    return expresion.replace(/\b(sin|cos|tan|sec|csc|cot|asin|acos|atan|asec|acsc|acot)\s*\(([^)]+)\)/g,
        (_match, func: string, arg: string) => {
            let nuevoArg = arg;
            let conversionResultado = "";

            if (!func.startsWith("a")) {
                if (modo === "DEG") nuevoArg = `(${arg})*Math.PI/180`;
                if (modo === "GRAD") nuevoArg = `(${arg})*Math.PI/200`;
            }

            if (func.startsWith("a")) {
                if (modo === "DEG") conversionResultado = `*180/Math.PI`;
                if (modo === "GRAD") conversionResultado = `*200/Math.PI`;
            }

            return `${func}(${nuevoArg})${conversionResultado}`;
        });
}

// ----------------------------
// Botón F-E
// ----------------------------
const btnFe = document.querySelector("#fBtn") as HTMLButtonElement | null;
let active: boolean = false;

if (btnFe) {
    btnFe.addEventListener("click", (): void => {
        active = !active;
        console.log("F-E activado:", active);
    });
}




window.raizCompleja = (x: number) => {
    if (x >= 0) return x ** 0.5;
    return new Complex(0, Math.sqrt(-x));
};
window.raizCubicaCompleja = (x: number): number | Complex => {
    if (x >= 0) return Math.cbrt(x);
    return new Complex(x, 0).pow(1 / 3);
};


export function evalExpresion(expresion: string): string {
    try {
        const result: unknown = Function('"use strict"; return (' + expresion + ')')();
        console.log("Expresión evaluada:", expresion);
        if (result instanceof Complex) return result.toString();
        return String(result);
    } catch (error) {
        console.error("Error evaluando expresión:", error);
        return "Syntax ERROR";
    }
}

// ----------------------------
// Reemplazos de expresiones
// ----------------------------
export function replaceFunction(expresion: string): string {
    let output: string = expresion;
    output = output

        .replaceAll("pow(", "Math.pow(")
        .replaceAll("xylog(", "Math.logxy(")
        .replace(/(\d+\.?\d*)→dms/g, "Math.DMS($1)")
        .replace(/(\d+),(\d+),(\d+)→deg/g, "Math.DEG($1,$2,$3)")
        .replace(/²√(-?\d+(\.\d+)?)/g, (_m, num) => `raizCompleja(${num})`)
        .replace(/∛(-?\d+(\.\d+)?)/g, (_m, num) => `raizCubicaCompleja(${num})`)
        .replace(/yroot(\d+(\.\d+)?|\([^()]+\))/g, "Math.pow($1)")
        .replaceAll("MOD(", "Math.mod(")

        // Trigonometría y logaritmos
        .replace(/\bacoth\b/g, "Math.acoth")
        .replace(/\bacsch\b/g, "Math.acsch")
        .replace(/\basech\b/g, "Math.asech")
        .replace(/\basin\b/g, "Math.asin")
        .replace(/\bacos\b/g, "Math.acos")
        .replace(/\batan\b/g, "Math.atan")
        .replace(/\basec\b/g, "Math.asec")
        .replace(/\bacsc\b/g, "Math.acsc")
        .replace(/\bacot\b/g, "Math.acot")
        .replace(/\basinh\b/g, "Math.asinh")
        .replace(/\bacosh\b/g, "Math.acosh")
        .replace(/\batanh\b/g, "Math.atanh")
        .replace(/\bsinh\b/g, "Math.sinh")
        .replace(/\bcosh\b/g, "Math.cosh")
        .replace(/\btanh\b/g, "Math.tanh")
        .replace(/\bcoth\b/g, "Math.coth")
        .replace(/\bcsch\b/g, "Math.csch")
        .replace(/\bsech\b/g, "Math.sech")
        .replace(/\bsin\b/g, "Math.sin")
        .replace(/\bcos\b/g, "Math.cos")
        .replace(/\btan\b/g, "Math.tan")
        .replace(/\bsec\b/g, "Math.sec")
        .replace(/\bcot\b/g, "Math.cot")
        .replaceAll("exp(", "Math.EXPT(")


        // Potencias y raíces
        .replaceAll("²", "**2")
        .replaceAll("³", "**3")
        .replaceAll("^", "**")
        .replace(/-(\d+(\.\d+)?)\*\*/g, "(-$1)**")

        // Logs y exponenciales

        .replace(/log\(/g, "Math.log10(")

        .replace(/(^|[^a-zA-Z0-9_])e\^(\([^)]+\)|\d+(\.\d+)?)/g, (_, pre, val) => `${pre}Math.exp(${val})`)
        .replace(/(^|[^a-zA-Z0-9_])\be\b/g, (_, pre) => `${pre}Math.E`)

        .replaceAll("10^", "10**")

        // Otros
        .replaceAll("|x|", "Math.abs(")
        .replaceAll("⌊x⌋(", "Math.floor(")
        .replaceAll("⌈x⌉(", "Math.ceil(")

        .replace(/(\d+(\.\d+)?)%/g, (_m, num) => {
            return `(${num}*0.01)`;
        })
        .replace(/(\d+(\.\d+)?)%(\d+(\.\d+)?)/g,
            (_m, a, _dec, b) => `((${a}/${b})*100)`

        )
        .replace(/(\d+)!/g, (_: string, num: string) => factorial(Number(num)).toString());



    output = transformarArgumentosTrigo(output);
    return output;
}



// ----------------------------
// Funciones de memoria
// ----------------------------
export function calcularInverso(): void {
    const input = document.querySelector("#input") as HTMLInputElement | null;
    if (input && input.value !== "" && parseFloat(input.value) !== 0) {
        input.value = (1 / parseFloat(input.value)).toString();
        stateObject.expression = input.value;
    } else {
        alert("Error: División entre 0");
    }
}

export function invertirUltimoNumero(): void {
    const input = document.querySelector("#input") as HTMLInputElement | null;
    if (!input) return;

    const expr = input.value;
    const regex = /(-?\d+(\.\d+)?)(?!.*\d)/;
    const match = expr.match(regex);

    if (match && match.index !== undefined) {
        const numero = match[0];
        const numeroInvertido = numero.startsWith("-") ? numero.slice(1) : "-" + numero;

        input.value =
            expr.slice(0, match.index) +
            numeroInvertido +
            expr.slice(match.index + numero.length);

        stateObject.expression = input.value;
    }
}
const containerBasic = document.querySelector(".basic") as HTMLElement;
const containerScientific = document.querySelector(".show-nt") as HTMLElement;
const containerGraphic = document.querySelector(".show-nt-grapic") as HTMLElement;
const containerspe = document.querySelector(".specialButtons") as HTMLElement;
export function switchBtnCalculator(mode: string): void {
    containerBasic.style.display = "none";
    containerScientific.style.display = "none";
    containerGraphic.style.display = "none";
    containerspe.style.display = "none";

    switch (mode) {
        case "basic":
            containerBasic.style.display = "flex";

            break;
        case "sci":
            containerScientific.style.display = "flex";
            containerspe.style.display = "flex";


            break;
        case "graphic":
            containerGraphic.style.display = "flex";
            break


    }

}
switchBtnCalculator("basic");
