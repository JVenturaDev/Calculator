import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, map, Observable } from 'rxjs';

import { GraphCanvasComponent } from '../graph-canvas/graph-canvas';
import { GraphFunctionSamplerService } from '../../../services/graph-workspace/graph-function-sampler';
import {
  GraphFunctionSample,
} from '../../../services/graph-workspace/graph-sampling';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import {
  GraphViewport2D,
  GraphWorkspaceState,
} from '../../../services/graph-workspace/graph-workspace-state';

interface GraphCanvasContainerViewModel {
  readonly samples: readonly GraphFunctionSample[];
  readonly viewport: GraphViewport2D;
  readonly hasFunctions: boolean;
  readonly visibleFunctions: number;
  readonly readyFunctions: number;
  readonly invalidFunctions: number;
  readonly error: string | null;
}

@Component({
  selector: 'app-graph-canvas-container',
  standalone: true,
  imports: [CommonModule, GraphCanvasComponent],
  templateUrl: './graph-canvas-container.html',
  styleUrls: ['./graph-canvas-container.css'],
})
export class GraphCanvasContainerComponent {
  private readonly facade = inject(GraphWorkspaceFacade);
  private readonly sampler = inject(GraphFunctionSamplerService);

  @Input() ariaLabel = 'Graph Workspace canvas';

  readonly vm$: Observable<GraphCanvasContainerViewModel> =
    this.facade.state$.pipe(
      debounceTime(100),
      map(state => this.createViewModel(state))
    );

  private createViewModel(
    state: GraphWorkspaceState
  ): GraphCanvasContainerViewModel {
    try {
      const samples = this.sampler.sampleFunctions(
        state.functions,
        state.viewport
      );

      return {
        samples,
        viewport: state.viewport,
        hasFunctions: state.functions.length > 0,
        visibleFunctions: this.countVisibleFunctions(state),
        readyFunctions: samples.filter(sample => sample.status === 'ready')
          .length,
        invalidFunctions: samples.filter(sample => sample.status === 'invalid')
          .length,
        error: null,
      };
    } catch {
      return {
        samples: [],
        viewport: state.viewport,
        hasFunctions: state.functions.length > 0,
        visibleFunctions: this.countVisibleFunctions(state),
        readyFunctions: 0,
        invalidFunctions: 0,
        error: 'No se pudo muestrear el Workspace gráfico.',
      };
    }
  }

  private countVisibleFunctions(state: GraphWorkspaceState): number {
    return state.functions.filter(graphFunction => graphFunction.visible)
      .length;
  }
}
