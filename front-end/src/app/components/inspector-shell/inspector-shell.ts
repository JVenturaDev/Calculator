import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
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
  @ViewChildren('inspectorTab')
  private inspectorTabs!: QueryList<ElementRef<HTMLButtonElement>>;

  activeView: InspectorView = 'history';
  private readonly tabOrder: readonly InspectorView[] = ['history', 'memory', 'graph'];
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

  onTabKeydown(event: KeyboardEvent, currentView: InspectorView): void {
    const currentIndex = this.tabOrder.indexOf(currentView);
    let targetView: InspectorView;

    switch (event.key) {
      case 'ArrowRight':
        targetView = this.tabOrder[(currentIndex + 1) % this.tabOrder.length];
        break;
      case 'ArrowLeft':
        targetView = this.tabOrder[
          (currentIndex - 1 + this.tabOrder.length) % this.tabOrder.length
        ];
        break;
      case 'Home':
        targetView = this.tabOrder[0];
        break;
      case 'End':
        targetView = this.tabOrder[this.tabOrder.length - 1];
        break;
      default:
        return;
    }

    event.preventDefault();
    this.selectView(targetView);
    this.inspectorTabs
      .find(({ nativeElement }) => nativeElement.dataset['view'] === targetView)
      ?.nativeElement.focus();
  }
}
