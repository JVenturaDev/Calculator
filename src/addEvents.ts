import { eliminarTodo, almacenarNumero, memoriaMasGlobal, restoreMemory, memoriaMenosGlobal } from "./buttonsIndexedDB.js";
import { calcularResultado, input } from "./calculadora.js";

// Botones de la memoria en el panel de botones 
declare const globalMPlus: HTMLButtonElement;
declare const globalMMinus: HTMLButtonElement;
declare const btnRecuperarMemoria: HTMLButtonElement;
globalMPlus.addEventListener("click", () => memoriaMasGlobal(input));
globalMMinus.addEventListener("click", () => memoriaMenosGlobal(input));
btnRecuperarMemoria.addEventListener("click", () => restoreMemory(input));

// ----------------------------
// Memory panel buttons
// ----------------------------
const memoryMoreButtons = [
    { btnId: "clickk", panelId: "presionar" },
    { btnId: "clickk1", panelId: "presionar1" },
];

// Toggle memory panel
const memoryContainer = document.querySelector("#Memory") as HTMLDivElement;
const deleteAll = document.querySelector(".style-A") as HTMLAnchorElement;

export function toggleMemoryPanel(): void {
    const isHidden = memoryContainer.style.display === "flex" || memoryContainer.style.display === '';
    memoryContainer.style.display = isHidden ? "none" : "flex";
    deleteAll.style.display = isHidden ? "none" : "flex";
}

// ----------------------------
// Add event listeners
// ----------------------------
memoryMoreButtons.forEach(({ btnId, panelId }) => {
    const btn = document.getElementById(btnId) as HTMLButtonElement;
    const panel = document.getElementById(panelId) as HTMLDivElement;
    btn.addEventListener("click", () => panel.classList.toggle("memoryButton"));
});

// Memory buttons
["#btn-mr", "#btn-mr1", "#btn-mr2"].forEach(selector => {
    const btn = document.querySelector(selector) as HTMLButtonElement;
    btn.addEventListener("click", toggleMemoryPanel);
});

// Delete all

["#deleteAll", "#deleteAll1", "#deleteAll2", ".style-A"].forEach(selector => {
    const buttons = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
    buttons.forEach(btn => {
        btn.addEventListener("click", eliminarTodo);
    });
});


// Calculator main buttons
["equal", "equal1", "equal2"].forEach(id => {
    const btn = document.getElementById(id) as HTMLButtonElement;
    btn.addEventListener("click", calcularResultado);
});

["restoreMemory", "restoreMemory1"].forEach(id => {
    const btn = document.getElementById(id) as HTMLButtonElement;
    btn.addEventListener("click", ()=> restoreMemory(input));
});

["memoryM", "memoryM1"].forEach(id => {
    const btn = document.getElementById(id) as HTMLButtonElement;
    btn.addEventListener("click", ()=> memoriaMasGlobal(input));
});

["memoryMe", "memoryMe1"].forEach(id => {
    const btn = document.getElementById(id) as HTMLButtonElement;
    btn.addEventListener("click", ()=> memoriaMenosGlobal(input));
});

["saveMemory", "saveMemory1"].forEach(id => {
    const btn = document.getElementById(id) as HTMLButtonElement;
    btn.addEventListener("click",  ()=> almacenarNumero(input));
});

// ----------------------------
// Hamburger menu
// ----------------------------
const menuCalculator = document.querySelector("#menuHamburger") as HTMLButtonElement;
const sideBar = document.querySelector(".sidebar") as HTMLElement;

menuCalculator.addEventListener("click", () => {
    sideBar.style.display = sideBar.style.display === "none" || sideBar.style.display === '' ? "flex" : "none";
});

document.addEventListener("click", e => {
    const clickOnMenu = menuCalculator.contains(e.target as Node);
    const clickOnSide = sideBar.contains(e.target as Node);
    if (!clickOnMenu && !clickOnSide) sideBar.style.display = "none";
});

// ----------------------------
// Scientific mode toggle
// ----------------------------
const cientificBlock = document.querySelector(".scientific") as HTMLElement;
const equationsBlock = document.querySelector(".scientific-moreButtons") as HTMLElement;
const Secondbutton = document.getElementById("secondButton") as HTMLDivElement;

Secondbutton.addEventListener("click", () => {
    const showEquations = equationsBlock.style.display === "none";
    equationsBlock.style.display = showEquations ? "flex" : "none";
    cientificBlock.style.display = showEquations ? "none" : "flex";
});

// ----------------------------
// Angle mode button
// ----------------------------
let estado = 0;
const btn = document.getElementById("multiBtn") as HTMLButtonElement;

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

// ----------------------------
// F-E button
// ----------------------------
const btnFe = document.querySelector("#fBtn") as HTMLButtonElement;
let active = false;

btnFe.addEventListener("click", () => {
    active = !active;
    console.log("F-E active:", active);
});

// ----------------------------
// Calculator mode switch
// ----------------------------
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
            break;
    }
}

switchBtnCalculator("basic");
