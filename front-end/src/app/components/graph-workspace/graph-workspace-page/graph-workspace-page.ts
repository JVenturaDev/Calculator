import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';

import { GraphCanvasContainerComponent } from '../graph-canvas-container/graph-canvas-container';
import { GraphCanvasContainer3DComponent } from '../graph-canvas-container-3d/graph-canvas-container-3d';
import { GraphWorkspaceInspectorComponent } from '../graph-workspace-inspector/graph-workspace-inspector';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import { GraphWorkspaceSamplingViewModelService } from '../../../services/graph-workspace/graph-workspace-sampling-view-model';
import {
  GraphFunction,
  GraphViewMode,
} from '../../../services/graph-workspace/graph-workspace-state';
import { type GraphCanvasHover } from '../graph-canvas/graph-canvas';

@Component({
  selector: 'app-graph-workspace-page',
  standalone: true,
  imports: [
    CommonModule,
    GraphCanvasContainerComponent,
    GraphCanvasContainer3DComponent,
    GraphWorkspaceInspectorComponent,
  ],
  templateUrl: './graph-workspace-page.html',
  styleUrls: ['./graph-workspace-page.css'],
})
export class GraphWorkspacePageComponent {
  private readonly facade = inject(GraphWorkspaceFacade);
  private readonly viewModel = inject(GraphWorkspaceSamplingViewModelService);

  @ViewChild('graphCanvasContainer2d')
  graphCanvasContainer2d?: { hoveredPoint: GraphCanvasHover | null };

  readonly state$ = this.facade.state$;
  readonly vm$ = this.viewModel.vm$;

  addFunction(): void {
    this.facade.addFunction();
  }

  setViewMode(mode: GraphViewMode): void {
    this.facade.setViewMode(mode);
  }

  updateExpression(id: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.facade.updateExpression(id, input?.value ?? '');
  }

  updateLabel(id: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.facade.updateLabel(id, input?.value ?? '');
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

  duplicateFunction(id: string): void {
    this.facade.duplicateFunction(id);
  }

  selectFunction(id: string): void {
    this.facade.selectFunction(id);
  }

  trackFunction(_: number, graphFunction: GraphFunction): string {
    return graphFunction.id;
  }

  lineFunctionCount(functions: readonly GraphFunction[]): number {
    return functions.filter(graphFunction => graphFunction.plotKind === 'line')
      .length;
  }

  visibleFunctionCount(functions: readonly GraphFunction[]): number {
    return functions.filter(graphFunction => graphFunction.visible).length;
  }

  contourFunctionCount(functions: readonly GraphFunction[]): number {
    return functions.filter(
      graphFunction => graphFunction.plotKind === 'contour'
    ).length;
  }
}
