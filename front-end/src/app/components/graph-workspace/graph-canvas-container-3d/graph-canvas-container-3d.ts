import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';

import { GraphCanvas3DComponent } from '../graph-canvas-3d/graph-canvas-3d';
import { GraphWorkspaceSamplingViewModel3DService } from '../../../services/graph-workspace/graph-workspace-sampling-view-model-3d';

@Component({
  selector: 'app-graph-canvas-container-3d',
  standalone: true,
  imports: [CommonModule, GraphCanvas3DComponent],
  templateUrl: './graph-canvas-container-3d.html',
  styleUrls: ['./graph-canvas-container-3d.css'],
})
export class GraphCanvasContainer3DComponent {
  private readonly viewModel = inject(GraphWorkspaceSamplingViewModel3DService);

  @Input() ariaLabel = 'Graph Workspace 3D canvas';

  readonly vm$ = this.viewModel.vm$;
}
