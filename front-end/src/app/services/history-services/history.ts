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
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (error) {
      console.error('Error saving history to localStorage:', error);
    }
    this.changedSource.next();
  }

  private loadHistory(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        this.history = [];
      } else {
        const parsed: unknown = JSON.parse(data);
        if (!Array.isArray(parsed)) {
          throw new TypeError('Stored history must be an array');
        }

        const validItems = parsed.filter(item => this.isHistoryItem(item));
        if (validItems.length !== parsed.length) {
          console.error(
            'Some invalid persisted history entries were ignored.'
          );
        }
        this.history = validItems;
      }
    } catch (error) {
      this.history = [];
      console.error('Error loading history from localStorage:', error);
    }
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
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing history from localStorage:', error);
    }
    this.changedSource.next();
  }

  removeFromLocalStorage(idi: number): void {
    this.history = this.history.filter(item => item.idi !== idi);
    this.saveToLocalStorage();
  }

  private isHistoryItem(value: unknown): value is HistoryItem {
    if (typeof value !== 'object' || value === null) return false;

    const item = value as Record<string, unknown>;
    return (
      typeof item['idi'] === 'number' &&
      Number.isFinite(item['idi']) &&
      typeof item['expression'] === 'string' &&
      (typeof item['result'] === 'string' ||
        (typeof item['result'] === 'number' && Number.isFinite(item['result'])))
    );
  }

}
