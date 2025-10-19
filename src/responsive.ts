
export function moveMemory() {
    const memoryContainer = document.querySelector<HTMLDivElement>(".scroll1");
    const containerMemory = document.querySelector<HTMLDivElement>(".memory-mobile");
    const originalContainerMemory = document.querySelector<HTMLDivElement>(".workspace");
    if (window.innerWidth <= 500) {
        if (containerMemory && memoryContainer && !containerMemory.contains(memoryContainer)) {
            containerMemory.appendChild(memoryContainer);
        }
    } else {
        if (originalContainerMemory && memoryContainer && !originalContainerMemory.contains(memoryContainer)) {
            originalContainerMemory.appendChild(memoryContainer);

        }
    }
}

