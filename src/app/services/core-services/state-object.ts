import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface StateObject {
  bd: IDBDatabase | null;
  result: number | string;
  expression: string;
  equalPressed: number;
  idEnEdicion: number | null;
  memoryContainer: HTMLElement | null;
  valorOriginalMemoria: number;
  idUltimoResultado: number | null;
}

@Injectable({ providedIn: 'root' })
export class StateService {
private _state = new BehaviorSubject<StateObject>({
  bd: null,
  result: 0,
  expression: '',
  equalPressed: 0,
  idEnEdicion: null,
  memoryContainer: null,
  valorOriginalMemoria: 0,
  idUltimoResultado: null,
});

  state$ = this._state.asObservable();

  get value(): StateObject {
    return this._state.value;
  }

  update(partial: Partial<StateObject>): void {
    this._state.next({ ...this._state.value, ...partial });
  }

  reset(): void {
    this._state.next({
      bd: null,
      result: 0,
      expression: '',
      equalPressed: 0,
      idEnEdicion: null,
      memoryContainer: null,
      valorOriginalMemoria: 0,
      idUltimoResultado: null,
    });
  }
}
