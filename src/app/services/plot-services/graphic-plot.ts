import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GraphicPlotService {
  private expressionSubject = new BehaviorSubject<string>('');
  expression$ = this.expressionSubject.asObservable();
  setExpression(expr: string) {
    this.expressionSubject.next(expr);
  }
}
