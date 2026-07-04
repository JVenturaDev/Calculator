import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService } from '../../services/toggle-services/toggle';
import { GraphicComponentPlot } from '../graphic-plot/graphic-plot';
import { HistoryComponent } from '../history/history';
import { MemoryComponent } from '../memory/memory';

export type InspectorView = 'history' | 'memory' | 'graph';
type PersistentInspectorView = Exclude<InspectorView, 'memory'>;

@Component({
  selector: 'app-inspector-shell',
  standalone: true,
  imports: [CommonModule, HistoryComponent, MemoryComponent, GraphicComponentPlot],
  templateUrl: './inspector-shell.html',
  styleUrls: ['./inspector-shell.css'],
})
export class InspectorShellComponent implements OnInit, OnDestroy {
  activeView: InspectorView = 'history';
  private lastPersistentView: PersistentInspectorView = 'history';
  private readonly subscriptions = new Subscription();

  constructor(
    private toggleService: ToggleService,
    private memoryToggleService: MemoryToggleService
  ) {}

  ngOnInit(): void {
    this.memoryToggleService.hide();

    this.subscriptions.add(
      this.toggleService.state$.subscribe(view => {
        this.lastPersistentView = view;
        if (this.activeView === 'memory') {
          this.memoryToggleService.hide();
        }
        this.activeView = view;
      })
    );
    this.subscriptions.add(
      this.memoryToggleService.visible$.subscribe(visible => {
        if (visible) {
          this.activeView = 'memory';
        } else if (this.activeView === 'memory') {
          this.activeView = this.lastPersistentView;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  selectView(view: InspectorView): void {
    if (view === 'memory') {
      this.memoryToggleService.show();
      return;
    }

    this.memoryToggleService.hide();
    if (this.toggleService.current !== view) {
      this.toggleService.GHtoggle();
    } else {
      this.lastPersistentView = view;
      this.activeView = view;
    }
  }
}
