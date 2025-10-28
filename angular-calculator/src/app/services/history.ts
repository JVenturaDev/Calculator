import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StateService } from './state-object';

export interface HistoryItem {
  idi: number;
  expression: string;
  result: string | number;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private storageKey = 'historial';
  private history: HistoryItem[] = [];

  private changedSource = new BehaviorSubject<void>(undefined);
  changed$ = this.changedSource.asObservable();

  constructor(private state: StateService) {
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

  addToHistory(idi: number, expression: string, result: string | number): void {
    this.state.update({ expression, result });
    this.history.push({ idi, expression, result });
    this.saveToLocalStorage();
  }

  agregarId(expression: string, result: string | number): void {
    const idi = Date.now() + Math.random();
    this.history.push({ idi, expression, result });
    localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    this.changedSource.next();
  }

  clearHistory(): void {
    this.history = [];
    localStorage.removeItem(this.storageKey);
    this.changedSource.next();
  }

  removeFromLocalStorage(idi: number): void {
    this.history = this.history.filter(item => item.idi !== idi);
    localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    this.changedSource.next();
  }

}
