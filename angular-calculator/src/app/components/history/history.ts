import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HistoryService, HistoryItem } from '../../services/history';
import { StateService } from '../../services/state-object';

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
    private state: StateService
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
    this.state.update({
      expression: item.expression,
      result: item.result,
    });
  }

  deleteItem(idi: number): void {
    this.historyService.removeFromLocalStorage(idi);
  }

  clearAll(): void {
    this.historyService.clearHistory();
  }
}
