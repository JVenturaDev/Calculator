import { eliminarTodo } from "./indexeddb.js";

const memoryContainer = document.querySelector("#Memory") as HTMLDivElement | null;
const deleteAll = document.querySelector(".style-A") as HTMLAnchorElement | null;

export function toggleMemoryPanel(): void {
    if (!memoryContainer || !deleteAll) return;
    const isHidden = memoryContainer.style.display === "none" || memoryContainer.style.display === '';
    memoryContainer.style.display = isHidden ? "flex" : "none";
    deleteAll.style.display = isHidden ? "flex" : "none";
}

const deleteAllBtn = document.querySelector(".style-A") as HTMLAnchorElement | null;
if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", eliminarTodo);
}

const memoryButtons = ["#btn-mr", "#btn-mr1", "#btn-mr2"];
memoryButtons.forEach(selector => {
    const btn = document.querySelector(selector) as HTMLButtonElement | null;
    if (btn) {
        btn.addEventListener("click", toggleMemoryPanel);
    }
});

const menuCalculator = document.querySelector("#menuHamburger") as HTMLButtonElement;
const sideBar = document.querySelector(".sidebar") as HTMLElement;
menuCalculator.addEventListener("click", (): void => {
    sideBar.style.display = sideBar.style.display === "none" || sideBar.style.display === ''
        ? "flex"
        : "none";
})
document.addEventListener("click", (e): void => {
    const focusClickmenu = menuCalculator.contains(e.target as Node);
    const focusClickside = sideBar.contains(e.target as Node);
    if (!focusClickmenu && !focusClickside) {
        sideBar.style.display = "none";
    }
});

const cientificBlock = document.querySelector(".scientific") as HTMLElement;
const equationsBlock = document.querySelector(".scientific-moreButtons") as HTMLElement;
const Secondbutton = document.getElementById("secondButton") as HTMLDivElement;

Secondbutton.addEventListener("click", () => {
    const isEquationBlockVisible = equationsBlock.style.display === "none";

    equationsBlock.style.display = isEquationBlockVisible ? "flex" : "none";
    cientificBlock.style.display = isEquationBlockVisible ? "none" : "flex";
});

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
const btnFe = document.querySelector("#fBtn") as HTMLButtonElement | null;
let active: boolean = false;

if (btnFe) {
    btnFe.addEventListener("click", (): void => {
        active = !active;
        console.log("F-E activado:", active);
    });
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
