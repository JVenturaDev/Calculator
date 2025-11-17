import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CalcType = 'basic' | 'scientific' | 'graphic';
export type AngleMode = 'RAD' | 'DEG' | 'GRAD';

@Injectable({ providedIn: 'root' })
export class ToggleService {
  private toggles: { [key: string]: BehaviorSubject<boolean> } = {};
  private state = new BehaviorSubject<'graph' | 'history'>('history');
  state$ = this.state.asObservable();

  GHtoggle() {
    this.state.next(this.state.value === 'graph' ? 'history' : 'graph');
  }

  get current() {
    return this.state.value;
  }

  getToggle(name: string): BehaviorSubject<boolean> {
    if (!this.toggles[name]) {
      this.toggles[name] = new BehaviorSubject<boolean>(false);
    }
    return this.toggles[name];
  }

  toggle(name: string): void {
    const t = this.getToggle(name);
    t.next(!t.value);
  }

  show(name: string): void {
    this.getToggle(name).next(true);
  }

  hide(name: string): void {
    this.getToggle(name).next(false);
  }

  isVisible(name: string): boolean {
    return this.getToggle(name).value;
  }

  private _activeCalc = new BehaviorSubject<CalcType>('graphic');
  readonly activeCalc$ = this._activeCalc.asObservable();

  setActiveCalc(calc: CalcType) {
    this._activeCalc.next(calc);
  }

  getActiveCalc(): CalcType {
    return this._activeCalc.value;
  }

  private _angleMode = new BehaviorSubject<AngleMode>('RAD');
  readonly angleMode$ = this._angleMode.asObservable();



  cycleAngleMode(): void {
    const current = this._angleMode.value;
    const next =
      current === 'RAD' ? 'GRAD' :
        current === 'GRAD' ? 'DEG' : 'RAD';
    this._angleMode.next(next);
  }
  getAngleMode(): AngleMode { return this._angleMode.value; }
}
