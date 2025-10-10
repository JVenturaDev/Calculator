const memoryContainer = document.querySelector<HTMLDivElement>("#Memory");
const containerMemory = document.querySelector<HTMLDivElement>(".memory-mobile");
const originalContainerMemory = document.querySelector<HTMLDivElement>(".scroll1");
export function moveMemory() {
    if (window.innerWidth <= 500) {
        if (containerMemory && memoryContainer && !containerMemory.contains(memoryContainer)) {
            containerMemory.appendChild(memoryContainer);
        }
    }else{
        if (originalContainerMemory && memoryContainer && !originalContainerMemory.contains(memoryContainer)) {
            originalContainerMemory.appendChild(memoryContainer);
            
        }
    }
}

