import { stateObject } from "./stateObject";
import { runbd, cargarHistorialDesdeDB } from "./indexeddb";
import { moveMemory } from "./responsive";

export function initApp(input: HTMLInputElement) {
    if ((window as any).__appInitialized) return;
    (window as any).__appInitialized = true;
    async function bootstrap() {
        input.value = "";
        stateObject.expression = "";
        stateObject.result = "";
        try {
            runbd();
        } catch (err) {
            console.error("Error inicializando DB:", err);
            alert("Error inicializando DB");
        }
        if (stateObject.bd && stateObject.memoryContainer) {
            try {
                cargarHistorialDesdeDB(stateObject);
            } catch (e) {
                console.error("Error cargando historial:", e);
                alert("Error cargando historial:");
            }
        }
        moveMemory();
        window.addEventListener("resize", moveMemory);
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => void bootstrap());
    } else {
        void bootstrap();
    }
}
