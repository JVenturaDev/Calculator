import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { CalculatorComputationResult } from '../calculator-state/calculator-state';

export interface HistoryItem {
  idi: number;
  expression: string;
  result: string | number;
  calculationResult?: CalculatorComputationResult | null;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private storageKey = 'historial';
  private history: HistoryItem[] = [];

  private readonly changedSource = new BehaviorSubject<void>(undefined);
  readonly changed$ = this.changedSource.asObservable();

  constructor() {
    this.loadHistory();
  }

  private saveToLocalStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    this.changedSource.next();
  }

  private loadHistory(): void {
    const data = localStorage.getItem(this.storageKey);
    this.history = data ? JSON.parse(data) : [];
    this.changedSource.next(); 
  }

  getHistory(): HistoryItem[] {
    return [...this.history];
  }

  addToHistory(
    idi: number,
    expression: string,
    result: string | number,
    calculationResult?: CalculatorComputationResult | null
  ): void {
    this.history.push({
      idi,
      expression,
      result,
      ...(calculationResult ? { calculationResult } : {}),
    });
    this.saveToLocalStorage();
  }

  agregarId(
    expression: string,
    result: string | number,
    calculationResult?: CalculatorComputationResult | null
  ): void {
    this.addToHistory(
      Date.now() + Math.random(),
      expression,
      result,
      calculationResult
    );
  }

  clearHistory(): void {
    this.history = [];
    localStorage.removeItem(this.storageKey);
    this.changedSource.next();
  }

  removeFromLocalStorage(idi: number): void {
    this.history = this.history.filter(item => item.idi !== idi);
    this.saveToLocalStorage();
  }

}
