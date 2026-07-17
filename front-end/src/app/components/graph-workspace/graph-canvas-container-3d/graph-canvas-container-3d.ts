import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';

import { type GraphCanvasHover } from '../graph-canvas/graph-canvas';
import { GraphCanvas3DComponent } from '../graph-canvas-3d/graph-canvas-3d';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import { GraphWorkspaceSamplingViewModel3DService } from '../../../services/graph-workspace/graph-workspace-sampling-view-model-3d';
import type { GraphScene3D } from '../../../services/graph-workspace/graph-workspace-state';

@Component({
  selector: 'app-graph-canvas-container-3d',
  standalone: true,
  imports: [CommonModule, GraphCanvas3DComponent],
  templateUrl: './graph-canvas-container-3d.html',
  styleUrls: ['./graph-canvas-container-3d.css'],
})
export class GraphCanvasContainer3DComponent {
  private readonly facade = inject(GraphWorkspaceFacade);
  private readonly viewModel = inject(GraphWorkspaceSamplingViewModel3DService);

  @Input() ariaLabel = 'Graph Workspace 3D canvas';

  readonly vm$ = this.viewModel.vm$;
  hoveredPoint: GraphCanvasHover | null = null;

  onSceneChange(scene: GraphScene3D): void {
    this.facade.setScene3D(scene);
  }

  onFunctionSelect(functionId: string): void {
    this.facade.selectFunction(functionId);
  }

  onHoverChange(point: GraphCanvasHover | null): void {
    this.hoveredPoint = point;
  }

  resetScene3D(): void {
    this.facade.resetScene3D();
  }
}
