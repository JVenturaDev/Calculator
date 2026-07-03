import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HistoryService,HistoryItem } from '../../services/history-services/history';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';

@Component({
  selector: 'app-history',
  templateUrl: './history.html',
  styleUrls: ['./history.css'],
  standalone: true,
  imports: [CommonModule],
})
export class HistoryComponent implements OnInit, OnDestroy {
  history: HistoryItem[] = [];
  private sub!: Subscription;

  constructor(
    private historyService: HistoryService,
    private calculator: CalculatorFacade
  ) {}

  ngOnInit(): void {
    this.loadHistory();

    this.sub = this.historyService.changed$.subscribe(() => {
      this.loadHistory();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadHistory(): void {
    this.history = this.historyService.getHistory();
  }

  restoreHistory(item: HistoryItem): void {
    this.calculator.restoreCalculation(item.expression, item.result);
  }

  deleteItem(idi: number): void {
    this.historyService.removeFromLocalStorage(idi);
  }

  clearAll(): void {
    this.historyService.clearHistory();
  }
}
