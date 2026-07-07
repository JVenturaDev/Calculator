import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { GraphCanvasContainerComponent } from '../graph-canvas-container/graph-canvas-container';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import {
  GraphFunction,
  GraphPlotKind,
} from '../../../services/graph-workspace/graph-workspace-state';

@Component({
  selector: 'app-graph-workspace-page',
  standalone: true,
  imports: [CommonModule, GraphCanvasContainerComponent],
  templateUrl: './graph-workspace-page.html',
  styleUrls: ['./graph-workspace-page.css'],
})
export class GraphWorkspacePageComponent {
  private readonly facade = inject(GraphWorkspaceFacade);

  readonly state$ = this.facade.state$;

  addFunction(): void {
    this.facade.addFunction();
  }

  updateExpression(id: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.facade.updateExpression(id, input?.value ?? '');
  }

  toggleFunction(id: string): void {
    this.facade.toggleFunction(id);
  }

  setPlotKind(id: string, event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const plotKind = select?.value;
    if (plotKind === 'line' || plotKind === 'contour') {
      this.facade.setPlotKind(id, plotKind);
    }
  }

  removeFunction(id: string): void {
    this.facade.removeFunction(id);
  }

  selectFunction(id: string): void {
    this.facade.selectFunction(id);
  }

  trackFunction(_: number, graphFunction: GraphFunction): string {
    return graphFunction.id;
  }

  plotKindLabel(plotKind: GraphPlotKind): string {
    return plotKind === 'line' ? 'Line' : 'Contour';
  }
}
