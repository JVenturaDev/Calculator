// buttonFunctions.ts
import { stateObject } from "./stateObject.js";
// ----------------------------
// Toggle panel memoria
// ----------------------------
const bntMr = document.querySelector("#btn-mr");
const memoryContainer = document.querySelector("#Memory");
if (bntMr && memoryContainer) {
    bntMr.addEventListener("click", () => {
        memoryContainer.style.display =
            memoryContainer.style.display === "none" || memoryContainer.style.display === ''
                ? "flex"
                : "none";
    });
}
const bntMr1 = document.querySelector("#btn-mr1");
if (bntMr1 && memoryContainer) {
    bntMr1.addEventListener("click", () => {
        memoryContainer.style.display =
            memoryContainer.style.display === "none" || memoryContainer.style.display === ''
                ? "flex"
                : "none";
    });
}
const bntMr2 = document.querySelector("#btn-mr2");
if (bntMr2 && memoryContainer) {
    bntMr2.addEventListener("click", () => {
        memoryContainer.style.display =
            memoryContainer.style.display === "none" || memoryContainer.style.display === ''
                ? "flex"
                : "none";
    });
}
Math.sec = (x) => 1 / Math.cos(x);
Math.cot = (x) => 1 / Math.tan(x);
Math.csc = (x) => 1 / Math.sin(x);
Math.asec = (x) => Math.acos(1 / x);
Math.acot = (x) => Math.atan(1 / x);
Math.acsc = (x) => Math.asin(1 / x);
Math.sech = (x) => 1 / Math.cosh(x);
Math.coth = (x) => 1 / Math.tanh(x);
Math.csch = (x) => 1 / Math.sinh(x);
Math.acoth = (x) => 0.5 * Math.log((x + 1) / (x - 1));
Math.asech = (x) => Math.log((1 + Math.sqrt(1 - x * x)) / x);
Math.acsch = (x) => Math.log((1 / x) + Math.sqrt(1 + 1 / (x * x)));
// ----------------------------
// Funciones matemáticas auxiliares
// ----------------------------
Math.logxy = (x, y) => Math.log(x) / Math.log(y);
Math.EXPT = (a, b) => a * Math.pow(10, b);
Math.mod = (a, b) => ((a % b) + b) % b;
Math.DEG = (g, m, s) => g + m / 60 + s / 3600;
Math.DMS = (x) => {
    const grados = Math.floor(x);
    const minutosDecimal = (x - grados) * 60;
    const minutos = Math.floor(minutosDecimal);
    const segundos = (minutosDecimal - minutos) * 60;
    return `${grados}° ${minutos}' ${segundos.toFixed(2)}"`;
};
if (typeof Math.ln !== "function") {
    Math.ln = (x) => Math.log(x);
}
function factorial(n) {
    if (n <= 1)
        return 1;
    return n * factorial(n - 1);
}
export function parentesisMulti(expression) {
    let result = expression.replace(/(\d)(\()/g, "$1*$2");
    result = result.replace(/(\))(\d)/g, "$1*$2");
    return result;
}
// ----------------------------
// Manejo de modos de ángulo
// ----------------------------
let estado = 0;
const btn = document.getElementById("multiBtn");
if (btn) {
    btn.addEventListener("click", () => {
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
export function obtenerModoAngulo() {
    return document.getElementById("multiBtn")?.textContent ?? null;
}
export function transformarArgumentosTrigo(expresion) {
    const modo = obtenerModoAngulo();
    return expresion.replace(/\b(sin|cos|tan|sec|csc|cot|asin|acos|atan|asec|acsc|acot)\s*\(([^)]+)\)/g, (_match, func, arg) => {
        let nuevoArg = arg;
        let conversionResultado = "";
        if (!func.startsWith("a")) {
            if (modo === "DEG")
                nuevoArg = `(${arg})*Math.PI/180`;
            if (modo === "GRAD")
                nuevoArg = `(${arg})*Math.PI/200`;
        }
        if (func.startsWith("a")) {
            if (modo === "DEG")
                conversionResultado = `*180/Math.PI`;
            if (modo === "GRAD")
                conversionResultado = `*200/Math.PI`;
        }
        return `${func}(${nuevoArg})${conversionResultado}`;
    });
}
// ----------------------------
// Botón F-E
// ----------------------------
const btnFe = document.querySelector("#fBtn");
let active = false;
if (btnFe) {
    btnFe.addEventListener("click", () => {
        active = !active;
        console.log("F-E activado:", active);
    });
}
// ----------------------------
// Reemplazos de expresiones
// ----------------------------
export function replaceFunction(expresion) {
    let output = expresion;
    output = output
        .replaceAll("pow(", "Math.pow(")
        .replaceAll("xylog(", "Math.logxy(")
        .replace(/(\d+\.?\d*)→dms/g, "Math.DMS($1)")
        .replace(/(\d+),(\d+),(\d+)→deg/g, "Math.DEG($1,$2,$3)")
        .replace(/∛(\d+(\.\d+)?|\([^()]+\))/g, "Math.cbrt($1)")
        .replace(/²√(\d+(\.\d+)?|\([^()]+\))/g, "Math.sqrt($1)")
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
        // Logs y exponenciales
        .replace(/log\(/g, "Math.log10(")
        .replace(/(^|[^a-zA-Z0-9_])e\^(\([^)]+\)|\d+(\.\d+)?)/g, (_, pre, val) => `${pre}Math.exp(${val})`)
        .replace(/(^|[^a-zA-Z0-9_])\be\b/g, (_, pre) => `${pre}Math.E`)
        .replaceAll("10^", "10**")
        // Otros
        .replaceAll("|x|", "Math.abs(")
        .replaceAll("⌊x⌋(", "Math.floor(")
        .replaceAll("⌈x⌉(", "Math.ceil(")
        .replace(/(\d+)!/g, (_, num) => factorial(Number(num)).toString());
    output = transformarArgumentosTrigo(output);
    return output;
}
// ----------------------------
// Funciones de memoria
// ----------------------------
export function calcularInverso() {
    const input = document.querySelector("#input");
    if (input && input.value !== "" && parseFloat(input.value) !== 0) {
        input.value = (1 / parseFloat(input.value)).toString();
        stateObject.expression = input.value;
    }
    else {
        alert("Error: División entre 0");
    }
}
export function invertirUltimoNumero() {
    const input = document.querySelector("#input");
    if (!input)
        return;
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
const containerBasic = document.querySelector(".basic");
const containerScientific = document.querySelector(".show-nt");
const containerGraphic = document.querySelector(".show-nt-grapic");
const containerspe = document.querySelector(".specialButtons");
export function switchBtnCalculator(mode) {
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
            break;
    }
}
switchBtnCalculator("basic");
