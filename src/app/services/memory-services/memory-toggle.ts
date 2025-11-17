import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MemoryToggleService {
  private _visible$ = new BehaviorSubject<boolean>(true);
  readonly visible$ = this._visible$.asObservable();

  show() {
    this._visible$.next(true);
  }

  hide() {
    this._visible$.next(false);
  }

  toggle() {
    this._visible$.next(!this._visible$.value);
  }
}
