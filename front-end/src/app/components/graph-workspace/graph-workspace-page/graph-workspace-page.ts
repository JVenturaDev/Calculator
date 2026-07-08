import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { GraphCanvasContainerComponent } from '../graph-canvas-container/graph-canvas-container';
import { GraphWorkspaceInspectorComponent } from '../graph-workspace-inspector/graph-workspace-inspector';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import { GraphWorkspaceSamplingViewModelService } from '../../../services/graph-workspace/graph-workspace-sampling-view-model';
import {
  GraphFunction,
  GraphPlotKind,
} from '../../../services/graph-workspace/graph-workspace-state';

@Component({
  selector: 'app-graph-workspace-page',
  standalone: true,
  imports: [
    CommonModule,
    GraphCanvasContainerComponent,
    GraphWorkspaceInspectorComponent,
  ],
  templateUrl: './graph-workspace-page.html',
  styleUrls: ['./graph-workspace-page.css'],
})
export class GraphWorkspacePageComponent {
  private readonly facade = inject(GraphWorkspaceFacade);
  private readonly viewModel = inject(GraphWorkspaceSamplingViewModelService);

  readonly vm$ = this.viewModel.vm$;

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
