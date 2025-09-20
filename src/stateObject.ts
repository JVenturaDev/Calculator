export interface StateObject {
    bd: IDBDatabase | null,
    result: number | string,
    expression: string,
    equalPressed: number,
    idEnEdicion: number | null,
    memoryContainer: HTMLElement | null,
    valorOriginalMemoria: number,
    idUltimoResultado: number | null,

}
export const stateObject: StateObject = {
    bd: null,
    result: 0,
    expression: "",
    equalPressed: 0,
    idEnEdicion: null,
    memoryContainer: null,
    valorOriginalMemoria: 0,
    idUltimoResultado: null,

};