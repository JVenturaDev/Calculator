import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';

import { GraphCanvasComponent } from '../graph-canvas/graph-canvas';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import { GraphWorkspaceSamplingViewModelService } from '../../../services/graph-workspace/graph-workspace-sampling-view-model';
import {
  type GraphViewport2D,
} from '../../../services/graph-workspace/graph-workspace-state';

@Component({
  selector: 'app-graph-canvas-container',
  standalone: true,
  imports: [CommonModule, GraphCanvasComponent],
  templateUrl: './graph-canvas-container.html',
  styleUrls: ['./graph-canvas-container.css'],
})
export class GraphCanvasContainerComponent {
  private readonly viewModel = inject(GraphWorkspaceSamplingViewModelService);
  private readonly facade = inject(GraphWorkspaceFacade);

  @Input() ariaLabel = 'Graph Workspace canvas';

  readonly vm$ = this.viewModel.vm$;

  resetViewport(): void {
    this.facade.resetViewport();
  }

  selectFunction(functionId: string): void {
    this.facade.selectFunction(functionId);
  }

  onViewportChange(
    viewport: GraphViewport2D,
    currentViewport: GraphViewport2D
  ): void {
    if (this.sameViewport(viewport, currentViewport)) return;
    this.facade.setViewport(viewport);
  }

  private sameViewport(
    left: GraphViewport2D,
    right: GraphViewport2D
  ): boolean {
    const tolerance = 1e-9;
    return (
      Math.abs(left.xMin - right.xMin) <= tolerance &&
      Math.abs(left.xMax - right.xMax) <= tolerance &&
      Math.abs(left.yMin - right.yMin) <= tolerance &&
      Math.abs(left.yMax - right.yMax) <= tolerance
    );
  }
}
