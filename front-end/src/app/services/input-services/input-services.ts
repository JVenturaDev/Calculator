import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
export type InputTarget =
  | { type: 'calculator' }
  | { type: 'workspace-item'; itemId: string };

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private _target = new BehaviorSubject<InputTarget>({ type: 'calculator' });
  get target$() { return this._target.asObservable(); }

  focusRequest$ = new BehaviorSubject<string | null>(null);

  requestFocus(itemId: string) {
    this.focusRequest$.next(itemId);
  }

  setCalculatorTarget() {
    this._target.next({ type: 'calculator' });
  }

  setWorkspaceItemTarget(itemId: string) {
    this._target.next({ type: 'workspace-item', itemId });
  }


  get target() {
    return this._target.value;
  }

}

